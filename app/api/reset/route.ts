import { handle } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// Puts the demo back to the five sample appointments.
export async function POST() {
  try {
    await getStore().reset();
    return Response.json({ ok: true });
  } catch (e) {
    return handle(e);
  }
}
