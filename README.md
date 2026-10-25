# Nourish - appointments for a nutrition practice

A small two-sided appointments product: a **client app** (mobile first) and a **nutritionist dashboard**,
both reading and writing the same data.

- Client app: `/` (home, book, my visits)
- Nutritionist dashboard: `/dashboard`

No logins, as the brief asks. Clients are recognised by their mobile number.

## Features

**Client**
- Home screen with the next appointment, a countdown ("tomorrow") and a one-tap *"Yes, I'll be there"* confirmation
- Book: choose a day (next 30 days) and an available 30-minute slot, enter name + phone
- No double booking: a slot can only be claimed once (see below)
- Upcoming / past visits, reschedule, cancel (with a confirm step), add to calendar (.ics)

**Nutritionist**
- All appointments with client, phone, date, time, status
- Status dropdown: **Booked** (blue), **Done** (green), **No-show** (red); cancelled visits show grey
- Add an appointment by hand, filter **Today / Upcoming / All**, filter by status, search by name or phone
- Anything booked on either side appears on the other (the dashboard polls every few seconds)
- Loaded with the sample data from the brief

**Against no-shows**
- Clients confirm with one tap; the dashboard shows *Confirmed / Not confirmed* per visit and how many are unconfirmed
- Repeat no-show warning next to clients who have missed before, plus a running no-show rate
- One-click WhatsApp reminder, pre-written, per client (she already lives in WhatsApp)
- Rescheduling is as easy as cancelling, so a slot is freed instead of wasted

**Added beyond the brief:** phone-number lookup for returning clients (so "my appointments" works with no login) - see docs.

## How double booking is prevented

Every booked slot owns a "lock" row keyed by date + time, created in **one DynamoDB transaction** together with the
appointment, with the condition `attribute_not_exists`. If two people press *Book* on the same slot at the same instant,
exactly one transaction succeeds and the other gets a friendly "just taken" message (HTTP 409). Rescheduling swaps locks
and cancelling releases them, also transactionally. The in-memory dev store enforces the same rule.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, API routes as route handlers, **Amazon DynamoDB** for data,
hosted on **Netlify**.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000 - uses an in-memory store, pre-loaded with the sample data
```

To run against real DynamoDB instead, set `DYNAMODB_TABLE` (and AWS credentials/region):

```bash
DYNAMODB_TABLE=<your-table> AWS_REGION=<your-region> npm run dev
```

Table: partition key `pk` (S), sort key `sk` (S), on-demand billing. Sample data is loaded automatically on first use.
`POST /api/reset` (or the *Reset demo data* link on the dashboard) restores the five sample appointments.

## Deploy (Netlify + DynamoDB)

1. Create the DynamoDB table (partition key `pk` S, sort key `sk` S, on-demand) in your region.
2. Create an IAM user limited to that one table (GetItem, PutItem, UpdateItem, DeleteItem, Query, BatchWriteItem) and an access key for it.
3. Import the repo in Netlify (it detects Next.js; `netlify.toml` is included).
4. Add environment variables in Netlify: `DYNAMODB_TABLE`, `NOURISH_AWS_REGION`, `NOURISH_AWS_ACCESS_KEY_ID`, `NOURISH_AWS_SECRET_ACCESS_KEY`
   (Netlify reserves names starting with `AWS_`, hence the `NOURISH_` prefix). Never commit these values.
5. Deploy.

## Sample data handling

The five sample rows have mixed date formats (`24/10/2026`, `2026-10-24`, `25-10-2026`), mixed time formats
(`11:30am`, `4 pm`, `14:00`) and inconsistent phone spacing. They are normalised on load (`lib/normalize.ts`,
`lib/seed.ts`) to ISO dates, 24h times and digits-only phones. Meera Iyer has no phone number: it stays empty
("No phone on file") rather than being invented.

## Project layout

```
app/(client)/      client app pages          app/dashboard/   nutritionist dashboard
app/api/           REST route handlers       lib/store.ts     DynamoDB + in-memory store
lib/normalize.ts   date/time/phone cleaning  lib/seed.ts      sample data
components/        shared UI
```
