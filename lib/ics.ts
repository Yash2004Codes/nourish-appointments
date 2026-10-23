import type { Appointment } from "./types";

/** A single-event .ics file (30 min, IST) as a data URL, so clients can add it to their calendar. */
export function icsHref(a: Appointment) {
  const d = a.date.replaceAll("-", "");
  const t = a.time.replace(":", "");
  const [h, m] = a.time.split(":").map(Number);
  const end = h * 60 + m + 30;
  const e = `${String(Math.floor(end / 60)).padStart(2, "0")}${String(end % 60).padStart(2, "0")}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nourish//Appointments//EN",
    "BEGIN:VEVENT",
    `UID:${a.id}@nourish`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Asia/Kolkata:${d}T${t}00`,
    `DTEND;TZID=Asia/Kolkata:${d}T${e}00`,
    "SUMMARY:Nutrition consultation",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Your nutrition consultation is in 2 hours",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
