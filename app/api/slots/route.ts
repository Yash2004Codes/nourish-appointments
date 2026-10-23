import type { NextRequest } from "next/server";
import { fail, handle } from "@/lib/api";
import { getStore } from "@/lib/store";
import { SLOT_TIMES, isPast, isValidISODate } from "@/lib/time";
import type { SlotInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!isValidISODate(date)) return fail("Invalid date.");
  try {
    const taken = new Set(await getStore().takenTimes(date));
    const slots: SlotInfo[] = SLOT_TIMES.map((time) => ({
      time,
      available: !taken.has(time) && !isPast(date, time),
    }));
    return Response.json({ date, slots });
  } catch (e) {
    return handle(e);
  }
}
