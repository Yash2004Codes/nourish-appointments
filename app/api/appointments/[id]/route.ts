import type { NextRequest } from "next/server";
import { checkSlot, fail, handle } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const STATUSES = ["Booked", "Done", "No-show"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid request.");
  const store = getStore();

  try {
    switch (body.action) {
      case "status":
        if (!STATUSES.includes(body.status)) return fail("Invalid status.");
        return Response.json({ appointment: await store.setStatus(id, body.status) });
      case "confirm":
        return Response.json({ appointment: await store.confirm(id) });
      case "cancel":
        return Response.json({ appointment: await store.cancel(id) });
      case "reschedule": {
        const err = checkSlot(body.date, body.time);
        if (err) return fail(err);
        return Response.json({ appointment: await store.reschedule(id, body.date, body.time) });
      }
      default:
        return fail("Unknown action.");
    }
  } catch (e) {
    return handle(e);
  }
}
