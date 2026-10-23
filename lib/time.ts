// Everything in the app is clinic time (IST) so server (UTC) and phone agree.
export const TZ = "Asia/Kolkata";

/** Consultation slots: 30 min, 09:00 - 16:30 start. */
export const SLOT_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let m = 9 * 60; m <= 16 * 60 + 30; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
})();

export const BOOKING_WINDOW_DAYS = 30;

function nowParts() {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export const todayISO = () => nowParts().date;
export const nowTime = () => nowParts().time;

/** Is this date+time already behind us? */
export function isPast(date: string, time: string) {
  const n = nowParts();
  return `${date}T${time}` <= `${n.date}T${n.time}`;
}

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function isValidISODate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const utc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...opts,
  }).format(utc(iso));
}

export function formatLongDay(iso: string) {
  return formatDay(iso, { weekday: "long", day: "numeric", month: "long" });
}

export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}

/** "today", "tomorrow", "in 3 days", "2 days ago" */
export function relativeDay(iso: string) {
  const t = todayISO();
  const diff = Math.round((utc(iso).getTime() - utc(t).getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}

export function greeting() {
  const h = Number(nowTime().slice(0, 2));
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
