import { normalizeDate, normalizePhone, normalizeTime } from "./normalize";
import type { Appointment, Status } from "./types";

// The sample data exactly as it was given in the brief: mixed date formats,
// mixed time formats, inconsistent phone spacing and one missing phone number.
const RAW: { client: string; phone: string; date: string; time: string; status: Status }[] = [
  { client: "Riya Shah", phone: "98200 11111", date: "24/10/2026", time: "10:00", status: "Booked" },
  { client: "Arjun Mehta", phone: "98200 22222", date: "2026-10-24", time: "11:30am", status: "Booked" },
  { client: "Riya Shah", phone: "9820011111", date: "25-10-2026", time: "4 pm", status: "Booked" },
  { client: "Meera Iyer", phone: "", date: "23/10/2026", time: "09:00", status: "Done" },
  { client: "Kabir Rao", phone: "98200 33333", date: "22/10/2026", time: "14:00", status: "No-show" },
];

export function sampleAppointments(): Appointment[] {
  return RAW.map((r, i) => {
    const date = normalizeDate(r.date);
    const time = normalizeTime(r.time);
    if (!date || !time) throw new Error(`Bad sample row ${i}: ${r.date} ${r.time}`);
    return {
      id: `sample-${i + 1}`,
      name: r.client,
      phone: normalizePhone(r.phone), // Meera has none -> stays null, we do not invent one
      date,
      time,
      status: r.status,
      confirmed: r.status !== "Booked" ? true : false,
      source: "sample",
      createdAt: "2026-10-20T09:00:00.000Z",
    };
  });
}
