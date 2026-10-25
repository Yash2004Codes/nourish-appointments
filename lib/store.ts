import { randomUUID } from "node:crypto";
import {
  DynamoDBClient,
  TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { sampleAppointments } from "./seed";
import {
  type Appointment,
  type Status,
  InvalidStateError,
  NotFoundError,
  SlotTakenError,
} from "./types";
import { isPast } from "./time";

/**
 * One interface, two backends:
 *  - DynamoDB when DYNAMODB_TABLE is set (production on AWS)
 *  - in-memory when it is not (zero-setup local dev)
 *
 * Double booking is prevented with a "slot lock" item per date+time that can only be
 * created if it does not exist yet. Creating the lock and the appointment happen in one
 * transaction, so two people clicking the same slot at the same instant cannot both win.
 */
export interface NewAppointment {
  name: string;
  phone: string | null;
  date: string;
  time: string;
  source: Appointment["source"];
}

export interface Store {
  list(): Promise<Appointment[]>;
  takenTimes(date: string): Promise<string[]>;
  create(a: NewAppointment): Promise<Appointment>;
  setStatus(id: string, status: Exclude<Status, "Cancelled">): Promise<Appointment>;
  confirm(id: string): Promise<Appointment>;
  reschedule(id: string, date: string, time: string): Promise<Appointment>;
  cancel(id: string): Promise<Appointment>;
  reset(): Promise<void>;
}

const build = (a: NewAppointment): Appointment => ({
  id: randomUUID(),
  name: a.name,
  phone: a.phone,
  date: a.date,
  time: a.time,
  status: "Booked",
  confirmed: false,
  source: a.source,
  createdAt: new Date().toISOString(),
});

/* ------------------------------------------------------------------ memory */

function memoryStore(): Store {
  const g = globalThis as unknown as { __kayro?: Map<string, Appointment> };
  if (!g.__kayro) g.__kayro = new Map(sampleAppointments().map((a) => [a.id, a]));
  const db = g.__kayro;

  const slotOwner = (date: string, time: string, ignoreId?: string) =>
    [...db.values()].find(
      (a) => a.date === date && a.time === time && a.status !== "Cancelled" && a.id !== ignoreId,
    );
  const need = (id: string) => {
    const a = db.get(id);
    if (!a) throw new NotFoundError();
    return a;
  };

  return {
    async list() {
      return [...db.values()];
    },
    async takenTimes(date) {
      return [...db.values()].filter((a) => a.date === date && a.status !== "Cancelled").map((a) => a.time);
    },
    async create(n) {
      if (slotOwner(n.date, n.time)) throw new SlotTakenError();
      const a = build(n);
      db.set(a.id, a);
      return a;
    },
    async setStatus(id, status) {
      const a = need(id);
      if (a.status === "Cancelled") throw new InvalidStateError("This appointment was cancelled.");
      a.status = status;
      return a;
    },
    async confirm(id) {
      const a = need(id);
      if (a.status !== "Booked") throw new InvalidStateError("Only booked appointments can be confirmed.");
      a.confirmed = true;
      return a;
    },
    async reschedule(id, date, time) {
      const a = need(id);
      if (a.status !== "Booked") throw new InvalidStateError("Only booked appointments can be rescheduled.");
      if (slotOwner(date, time, id)) throw new SlotTakenError();
      a.date = date;
      a.time = time;
      a.confirmed = false; // new time -> ask them to confirm again
      return a;
    },
    async cancel(id) {
      const a = need(id);
      if (a.status !== "Booked") throw new InvalidStateError("Only booked appointments can be cancelled.");
      a.status = "Cancelled";
      return a;
    },
    async reset() {
      db.clear();
      sampleAppointments().forEach((a) => db.set(a.id, a));
    },
  };
}

/* ---------------------------------------------------------------- dynamodb */

// Table: pk (S) + sk (S)
//   APPT / <id>            the appointment
//   SLOT#<date> / <time>   the lock for that slot (attribute apptId)
//   META / seeded          marker so sample data is loaded exactly once
function dynamoStore(table: string): Store {
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({
      region: process.env.NOURISH_AWS_REGION || process.env.AWS_REGION_NAME || undefined,
      // Netlify reserves AWS_* names, so hosted keys come in under NOURISH_*; on AWS/local the default chain is used
      credentials: process.env.NOURISH_AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.NOURISH_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.NOURISH_AWS_SECRET_ACCESS_KEY ?? "",
          }
        : undefined,
    }), {
    marshallOptions: { removeUndefinedValues: true },
  });
  const slotKey = (date: string, time: string) => ({ pk: `SLOT#${date}`, sk: time });
  const apptKey = (id: string) => ({ pk: "APPT", sk: id });
  const toAppt = (i: Record<string, unknown>): Appointment => {
    const { pk: _pk, sk, ...rest } = i;
    void _pk;
    return { id: sk as string, ...rest } as unknown as Appointment;
  };
  const toItem = (a: Appointment) => {
    const { id, ...rest } = a;
    return { ...apptKey(id), ...rest };
  };

  const getAppt = async (id: string) => {
    const r = await doc.send(new GetCommand({ TableName: table, Key: apptKey(id), ConsistentRead: true }));
    if (!r.Item) throw new NotFoundError();
    return toAppt(r.Item);
  };

  const lockFailed = (e: unknown) =>
    e instanceof TransactionCanceledException &&
    // TransactionConflict = another request is claiming the very same slot right now
    (e.CancellationReasons ?? []).some((r) => r.Code === "ConditionalCheckFailed" || r.Code === "TransactionConflict");

  async function queryAll(pk: string) {
    const items: Record<string, unknown>[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const r = await doc.send(
        new QueryCommand({
          TableName: table,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": pk },
          ConsistentRead: true,
          ExclusiveStartKey,
        }),
      );
      items.push(...(r.Items ?? []));
      ExclusiveStartKey = r.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  }

  async function writeSamples() {
    const samples = sampleAppointments();
    const reqs = samples.flatMap((a) => [
      { PutRequest: { Item: toItem(a) } },
      { PutRequest: { Item: { ...slotKey(a.date, a.time), apptId: a.id } } },
    ]);
    await doc.send(new BatchWriteCommand({ RequestItems: { [table]: reqs } }));
  }

  let seeded: Promise<void> | null = null;
  const ensureSeeded = () =>
    (seeded ??= (async () => {
      try {
        await doc.send(
          new PutCommand({
            TableName: table,
            Item: { pk: "META", sk: "seeded", at: new Date().toISOString() },
            ConditionExpression: "attribute_not_exists(pk)",
          }),
        );
      } catch (e) {
        if ((e as { name?: string }).name === "ConditionalCheckFailedException") return; // someone else seeded
        seeded = null;
        throw e;
      }
      await writeSamples();
    })());

  return {
    async list() {
      await ensureSeeded();
      return (await queryAll("APPT")).map(toAppt);
    },
    async takenTimes(date) {
      await ensureSeeded();
      return (await queryAll(`SLOT#${date}`)).map((i) => i.sk as string);
    },
    async create(n) {
      await ensureSeeded();
      const a = build(n);
      try {
        await doc.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  TableName: table,
                  Item: { ...slotKey(a.date, a.time), apptId: a.id },
                  ConditionExpression: "attribute_not_exists(pk)",
                },
              },
              { Put: { TableName: table, Item: toItem(a) } },
            ],
          }),
        );
      } catch (e) {
        if (lockFailed(e)) throw new SlotTakenError();
        throw e;
      }
      return a;
    },
    async setStatus(id, status) {
      await ensureSeeded();
      try {
        await doc.send(
          new UpdateCommand({
            TableName: table,
            Key: apptKey(id),
            UpdateExpression: "SET #s = :s",
            ConditionExpression: "attribute_exists(pk) AND #s <> :c",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":s": status, ":c": "Cancelled" },
          }),
        );
      } catch (e) {
        if ((e as { name?: string }).name === "ConditionalCheckFailedException") {
          await getAppt(id); // throws NotFound if missing
          throw new InvalidStateError("This appointment was cancelled.");
        }
        throw e;
      }
      return getAppt(id);
    },
    async confirm(id) {
      await ensureSeeded();
      try {
        await doc.send(
          new UpdateCommand({
            TableName: table,
            Key: apptKey(id),
            UpdateExpression: "SET confirmed = :t",
            ConditionExpression: "attribute_exists(pk) AND #s = :b",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":t": true, ":b": "Booked" },
          }),
        );
      } catch (e) {
        if ((e as { name?: string }).name === "ConditionalCheckFailedException") {
          await getAppt(id);
          throw new InvalidStateError("Only booked appointments can be confirmed.");
        }
        throw e;
      }
      return getAppt(id);
    },
    async reschedule(id, date, time) {
      await ensureSeeded();
      const cur = await getAppt(id);
      if (cur.status !== "Booked") throw new InvalidStateError("Only booked appointments can be rescheduled.");
      if (cur.date === date && cur.time === time) return cur;
      try {
        await doc.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  TableName: table,
                  Item: { ...slotKey(date, time), apptId: id },
                  ConditionExpression: "attribute_not_exists(pk)",
                },
              },
              { Delete: { TableName: table, Key: slotKey(cur.date, cur.time) } },
              {
                Update: {
                  TableName: table,
                  Key: apptKey(id),
                  UpdateExpression: "SET #d = :d, #t = :t, confirmed = :f",
                  ConditionExpression: "#s = :b AND #d = :od AND #t = :ot",
                  ExpressionAttributeNames: { "#d": "date", "#t": "time", "#s": "status" },
                  ExpressionAttributeValues: {
                    ":d": date,
                    ":t": time,
                    ":f": false,
                    ":b": "Booked",
                    ":od": cur.date,
                    ":ot": cur.time,
                  },
                },
              },
            ],
          }),
        );
      } catch (e) {
        if (lockFailed(e)) throw new SlotTakenError();
        throw e;
      }
      return getAppt(id);
    },
    async cancel(id) {
      await ensureSeeded();
      const cur = await getAppt(id);
      if (cur.status !== "Booked") throw new InvalidStateError("Only booked appointments can be cancelled.");
      try {
        await doc.send(
          new TransactWriteCommand({
            TransactItems: [
              { Delete: { TableName: table, Key: slotKey(cur.date, cur.time) } },
              {
                Update: {
                  TableName: table,
                  Key: apptKey(id),
                  UpdateExpression: "SET #s = :c",
                  ConditionExpression: "#s = :b",
                  ExpressionAttributeNames: { "#s": "status" },
                  ExpressionAttributeValues: { ":c": "Cancelled", ":b": "Booked" },
                },
              },
            ],
          }),
        );
      } catch (e) {
        if (e instanceof TransactionCanceledException) throw new InvalidStateError("Already changed - refresh and try again.");
        throw e;
      }
      return getAppt(id);
    },
    async reset() {
      // Delete every appointment + lock, then reload the sample rows.
      const appts = await queryAll("APPT");
      const locks = await Promise.all(
        [...new Set(appts.map((a) => (a as { date: string }).date))].map((d) => queryAll(`SLOT#${d}`)),
      );
      const keys = [
        ...appts.map((a) => ({ pk: a.pk, sk: a.sk })),
        ...locks.flat().map((l) => ({ pk: l.pk, sk: l.sk })),
      ];
      for (let i = 0; i < keys.length; i += 25) {
        await doc.send(
          new BatchWriteCommand({
            RequestItems: { [table]: keys.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } })) },
          }),
        );
      }
      await doc.send(
        new PutCommand({ TableName: table, Item: { pk: "META", sk: "seeded", at: new Date().toISOString() } }),
      );
      seeded = Promise.resolve();
      await writeSamples();
    },
  };
}

let _store: Store | null = null;
export function getStore(): Store {
  if (_store) return _store;
  const table = process.env.DYNAMODB_TABLE;
  _store = table ? dynamoStore(table) : memoryStore();
  return _store;
}

/** Past or not a Booked appointment -> the client may no longer change it. */
export const isUpcoming = (a: Appointment) => a.status === "Booked" && !isPast(a.date, a.time);
