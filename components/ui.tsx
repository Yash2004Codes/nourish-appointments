import type { Appointment, Status } from "@/lib/types";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const CHIP: Record<Status, string> = {
  Booked: "bg-st-booked-bg text-st-booked",
  Done: "bg-st-done-bg text-st-done",
  "No-show": "bg-st-noshow-bg text-st-noshow",
  Cancelled: "bg-st-cancel-bg text-st-cancel",
};
const DOT: Record<Status, string> = {
  Booked: "bg-st-booked",
  Done: "bg-st-done",
  "No-show": "bg-st-noshow",
  Cancelled: "bg-st-cancel",
};
export const statusClasses = CHIP;

export function StatusChip({ status, label, className }: { status: Status; label?: string; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", CHIP[status], className)}>
      <span className={cx("size-1.5 rounded-full", DOT[status])} />
      {label ?? status}
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-sage-700", className)}>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#dfeae2" />
        <path d="M16 25c-5-1-8-5-8-10 5 0 8 2.5 8 6 0-6 2-9 8-10 0 7-3 13-8 14z" fill="#5f8f6e" />
        <path d="M16 25c0-5 1-8 4-11" stroke="#fbf8f3" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      Nourish
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx("inline-block size-5 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600", className)}
    />
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-sage-600 px-6 py-3.5 text-[15px] font-semibold text-white shadow-card transition hover:bg-sage-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-sage-200 disabled:shadow-none";
export const btnSoft =
  "inline-flex items-center justify-center gap-2 rounded-full bg-sage-100 px-5 py-3 text-sm font-semibold text-sage-700 transition hover:bg-sage-200 active:scale-[0.98] disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-sand active:scale-[0.98] disabled:opacity-50";
export const inputCls =
  "w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-muted/60 transition focus:border-sage-500 focus:outline-none focus:ring-4 focus:ring-sage-100";

/** A booked appointment whose time has passed but was never marked. */
export function chipFor(a: Appointment, past: boolean): { status: Status; label?: string } {
  if (a.status === "Booked" && past) return { status: "Cancelled", label: "Awaiting update" };
  return { status: a.status };
}

type IconName = "home" | "plus" | "list" | "check" | "calendar" | "clock" | "phone" | "chat" | "x" | "leaf" | "refresh" | "warn";

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path {...p} d="M4 11.5 12 5l8 6.5" /><path {...p} d="M6 10.5V19h12v-8.5" /></>,
    plus: <path {...p} d="M12 5v14M5 12h14" />,
    list: <><path {...p} d="M8 7h11M8 12h11M8 17h11" /><path {...p} d="M4.5 7h.01M4.5 12h.01M4.5 17h.01" /></>,
    check: <path {...p} d="m5 12.5 4.5 4.5L19 7.5" />,
    calendar: <><rect {...p} x="4" y="5.5" width="16" height="14" rx="3" /><path {...p} d="M8 3.5v4M16 3.5v4M4 10h16" /></>,
    clock: <><circle {...p} cx="12" cy="12" r="8" /><path {...p} d="M12 7.5V12l3 2" /></>,
    phone: <path {...p} d="M6 4h3l1.5 4-2 1.3a10 10 0 0 0 5.2 5.2L15 12.5l4 1.5v3a2 2 0 0 1-2 2A13 13 0 0 1 4 6a2 2 0 0 1 2-2z" />,
    chat: <path {...p} d="M5 18.5 6 15a7.5 7.5 0 1 1 3 3z" />,
    x: <path {...p} d="m6 6 12 12M18 6 6 18" />,
    leaf: <path {...p} d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19c2-4 5-7 8-9" />,
    refresh: <path {...p} d="M19 8a7.5 7.5 0 0 0-13-1.5M5 4v3h3M5 16a7.5 7.5 0 0 0 13 1.5M19 20v-3h-3" />,
    warn: <><path {...p} d="M12 4 3 19h18z" /><path {...p} d="M12 10v4M12 17h.01" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" className={cx("size-5", className)} aria-hidden>
      {paths[name]}
    </svg>
  );
}
