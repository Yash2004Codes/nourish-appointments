import type { NextRequest } from "next/server";
import { checkSlot, fail, handle } from "@/lib/api";
import { normalizePhone } from "@/lib/normalize";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// Clients pass ?phone= to see only their own appointments; the dashboard calls without it.
export async function GET(req: NextRequest) {
  try {
    const phoneParam = req.nextUrl.searchParams.get("phone");
    let all = await getStore().list();
    if (phoneParam !== null) {
      const phone = normalizePhone(phoneParam);
      if (!phone) return fail("Please enter a valid 10 digit mobile number.");
      all = all.filter((a) => a.phone === phone);
    }
    all.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    return Response.json({ appointments: all });
  } catch (e) {
    return handle(e);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid request.");
  const source = body.source === "dashboard" ? "dashboard" : "client";

  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 60) return fail("Please enter the full name (2-60 characters).");

  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const phone = normalizePhone(rawPhone);
  if (rawPhone && !phone) return fail("Please enter a valid 10 digit mobile number.");
  if (!phone && source === "client") return fail("A phone number is needed so we can remind you.");

  const slotErr = checkSlot(body.date, body.time);
  if (slotErr) return fail(slotErr);

  try {
    const appointment = await getStore().create({ name, phone, date: body.date, time: body.time, source });
    return Response.json({ appointment }, { status: 201 });
  } catch (e) {
    return handle(e);
  }
}
