"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import SlotPicker from "@/components/SlotPicker";
import { Icon, Logo, Spinner, StatusChip, btnGhost, btnPrimary, cx, inputCls, statusClasses } from "@/components/ui";
import { api, useLive } from "@/lib/client";
import { formatPhone, normalizePhone } from "@/lib/normalize";
import { formatDay, formatLongDay, formatTime, isPast, todayISO } from "@/lib/time";
import type { Appointment, Status } from "@/lib/types";

type Range = "today" | "upcoming" | "all";
const STATUS_OPTIONS: Exclude<Status, "Cancelled">[] = ["Booked", "Done", "No-show"];

export default function Dashboard() {
  const { data, error, refresh, setData } = useLive(() => api.list(), "all", 6000);
  const [range, setRange] = useState<Range>("all");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const today = todayISO();

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  // clients with earlier no-shows get a heads-up badge
  const noShows = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of data ?? []) if (a.status === "No-show") m.set(a.phone ?? a.name, (m.get(a.phone ?? a.name) ?? 0) + 1);
    return m;
  }, [data]);

  const live = (data ?? []).filter((a) => a.status !== "Cancelled");
  const stats = {
    today: live.filter((a) => a.date === today).length,
    upcoming: live.filter((a) => a.status === "Booked" && !isPast(a.date, a.time)).length,
    unconfirmed: live.filter((a) => a.status === "Booked" && !a.confirmed && !isPast(a.date, a.time)).length,
    rate: (() => {
      const closed = live.filter((a) => a.status === "Done" || a.status === "No-show");
      return closed.length ? Math.round((closed.filter((a) => a.status === "No-show").length / closed.length) * 100) : 0;
    })(),
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    return (data ?? [])
      .filter((a) => (statusFilter === "All" ? a.status !== "Cancelled" : a.status === statusFilter))
      .filter((a) => (range === "today" ? a.date === today : range === "upcoming" ? a.date >= today : true))
      .filter((a) => !needle || a.name.toLowerCase().includes(needle) || (!!digits && !!a.phone && a.phone.includes(digits)));
  }, [data, range, statusFilter, q, today]);

  async function setStatus(a: Appointment, status: Status) {
    const prev = data;
    setData((d) => d && d.map((x) => (x.id === a.id ? { ...x, status } : x)));
    try {
      await api.patch(a.id, { action: "status", status });
    } catch (e) {
      setData(prev);
      flash(e instanceof Error ? e.message : "Could not update.");
    }
  }

  async function resetDemo() {
    if (!confirm("Reset the demo? This removes everything and reloads the 5 sample appointments.")) return;
    await api.reset();
    await refresh();
    flash("Demo data reset.");
  }

  const ranges: [Range, string, number | null][] = [
    ["today", "Today", stats.today],
    ["upcoming", "Upcoming", null],
    ["all", "All", null],
  ];

  return (
    <div className="min-h-dvh bg-cream">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-full bg-sand px-3 py-1 text-xs font-semibold text-muted sm:inline">Practice dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex" title="Refreshes automatically">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sage-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-sage-500" />
              </span>
              Live
            </span>
            <Link href="/" className={`${btnGhost} !px-4 !py-2.5`}>
              Client app
            </Link>
            <button className={`${btnPrimary} !px-5 !py-2.5`} onClick={() => setAdding(true)}>
              <Icon name="plus" className="size-4" /> <span className="hidden sm:inline">Add appointment</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-6 md:pt-10">
        <div className="rise">
          <p className="text-sm font-semibold text-sage-600">{formatLongDay(today)}</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            {stats.today ? `${stats.today} consultation${stats.today > 1 ? "s" : ""} today` : "A clear day today"}
          </h1>
        </div>

        <section aria-label="Summary" className="rise mt-6 grid grid-cols-2 gap-3 md:grid-cols-4" style={{ animationDelay: "60ms" }}>
          <Stat label="Today" value={stats.today} hint="on the schedule" />
          <Stat label="Upcoming" value={stats.upcoming} hint="still to come" />
          <Stat label="Not confirmed" value={stats.unconfirmed} hint="clients yet to tap confirm" tone={stats.unconfirmed ? "warn" : undefined} />
          <Stat label="No-show rate" value={`${stats.rate}%`} hint="of finished visits" tone={stats.rate >= 25 ? "bad" : undefined} />
        </section>

        <section aria-label="Filters" className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div role="tablist" aria-label="Date range" className="inline-flex self-start rounded-full bg-sand p-1">
            {ranges.map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={range === k}
                onClick={() => setRange(k)}
                className={cx("rounded-full px-4 py-2 text-sm font-semibold transition", range === k ? "bg-white text-sage-700 shadow-card" : "text-muted")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {(["All", ...STATUS_OPTIONS, "Cancelled"] as const).map((s) => (
                <button
                  key={s}
                  aria-pressed={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                  className={cx(
                    "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
                    statusFilter === s ? (s === "All" ? "border-ink bg-ink text-white" : `border-transparent ${statusClasses[s]}`) : "border-line bg-white text-muted hover:text-ink",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              className={`${inputCls} !rounded-full !py-2.5 text-sm sm:w-56`}
              placeholder="Search name or phone"
              aria-label="Search name or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </section>

        {error && !data && <p className="mt-6 rounded-2xl bg-st-noshow-bg p-4 text-sm text-st-noshow">{error}</p>}
        {!data && !error && (
          <div className="grid place-items-center py-24">
            <Spinner className="size-7" />
          </div>
        )}

        {data && rows.length === 0 && (
          <div className="mt-6 rounded-3xl border border-dashed border-line bg-white/60 p-12 text-center">
            <p className="font-display text-2xl font-semibold">{range === "today" ? "Nothing on today" : "No appointments match"}</p>
            <p className="mt-1 text-muted">{range === "today" ? "Enjoy the breathing room - or add a walk-in." : "Try a different filter."}</p>
          </div>
        )}

        {data && rows.length > 0 && (
          <>
            {/* desktop table */}
            <div className="rise mt-6 hidden overflow-hidden rounded-3xl bg-white shadow-card md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-sand/50 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Client</th>
                    <th className="px-5 py-3.5 font-semibold">Phone</th>
                    <th className="px-5 py-3.5 font-semibold">Date</th>
                    <th className="px-5 py-3.5 font-semibold">Time</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Remind</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {rows.map((a) => (
                    <tr key={a.id} className={cx("transition hover:bg-sage-50/50", a.date === today && "bg-sage-50/40")}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{a.name}</p>
                        <Flags a={a} noShows={noShows} />
                      </td>
                      <td className="px-5 py-4 tabular-nums text-muted">{formatPhone(a.phone)}</td>
                      <td className="px-5 py-4">
                        {formatDay(a.date)}
                        {a.date === today && <span className="ml-2 rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sage-700">Today</span>}
                      </td>
                      <td className="px-5 py-4 tabular-nums">{formatTime(a.time)}</td>
                      <td className="px-5 py-4">
                        <StatusSelect a={a} onChange={(s) => setStatus(a, s)} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Remind a={a} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <ul className="mt-6 space-y-3 md:hidden">
              {rows.map((a) => (
                <li key={a.id} className={cx("rise rounded-3xl bg-white p-4 shadow-card", a.date === today && "ring-2 ring-sage-200")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{a.name}</p>
                      <p className="text-sm tabular-nums text-muted">{formatPhone(a.phone)}</p>
                    </div>
                    <StatusSelect a={a} onChange={(s) => setStatus(a, s)} />
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-sm">
                    <Icon name="calendar" className="size-4 text-sage-500" /> {formatDay(a.date)}
                    {a.date === today && <span className="rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sage-700">Today</span>}
                    <Icon name="clock" className="ml-2 size-4 text-sage-500" /> {formatTime(a.time)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Flags a={a} noShows={noShows} />
                    <Remind a={a} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-10 text-center text-xs text-muted">
          Changes sync with the client app instantly. ·{" "}
          <button className="underline-offset-2 hover:underline" onClick={resetDemo}>
            Reset demo data
          </button>
        </p>
      </main>

      {adding && (
        <AddModal
          onClose={() => setAdding(false)}
          onAdded={(a) => {
            setAdding(false);
            setData((d) => (d ? [...d, a].sort((x, y) => `${x.date}${x.time}`.localeCompare(`${y.date}${y.time}`)) : d));
            flash(`Added ${a.name} - ${formatDay(a.date)}, ${formatTime(a.time)}`);
          }}
        />
      )}

      {toast && (
        <div role="status" className="pop fixed inset-x-4 bottom-6 z-50 mx-auto w-fit max-w-sm rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-white shadow-lift">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: number | string; hint: string; tone?: "warn" | "bad" }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-card md:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cx("mt-1 font-display text-4xl font-semibold leading-none", tone === "warn" && "text-clay", tone === "bad" && "text-st-noshow")}>{value}</p>
      <p className="mt-1.5 text-xs text-muted">{hint}</p>
    </div>
  );
}

function StatusSelect({ a, onChange }: { a: Appointment; onChange: (s: Status) => void }) {
  if (a.status === "Cancelled") return <StatusChip status="Cancelled" />;
  return (
    <label className="relative inline-block">
      <span className="sr-only">Status for {a.name}</span>
      <select
        value={a.status}
        onChange={(e) => onChange(e.target.value as Status)}
        className={cx("cursor-pointer appearance-none rounded-full py-1.5 pl-3.5 pr-8 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-sage-500", statusClasses[a.status])}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 opacity-70" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 4.5 3 3 3-3" />
      </svg>
    </label>
  );
}

/** Confirmation state + repeat no-show warning (the no-show helpers). */
function Flags({ a, noShows }: { a: Appointment; noShows: Map<string, number> }) {
  const prior = noShows.get(a.phone ?? a.name) ?? 0;
  const upcomingBooked = a.status === "Booked" && !isPast(a.date, a.time);
  const risky = prior > (a.status === "No-show" ? 1 : 0);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {upcomingBooked &&
        (a.confirmed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-st-done-bg px-2 py-0.5 text-[11px] font-semibold text-st-done">
            <Icon name="check" className="size-3" /> Confirmed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-clay-50 px-2 py-0.5 text-[11px] font-semibold text-clay">
            <Icon name="clock" className="size-3" /> Not confirmed
          </span>
        ))}
      {(upcomingBooked ? prior > 0 : risky) && (
        <span className="inline-flex items-center gap-1 rounded-full bg-st-noshow-bg px-2 py-0.5 text-[11px] font-semibold text-st-noshow">
          <Icon name="warn" className="size-3" /> {prior} past no-show{prior > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function Remind({ a }: { a: Appointment }) {
  if (a.status !== "Booked" || isPast(a.date, a.time) || !a.phone) return <span className="text-xs text-muted/60">-</span>;
  const link = typeof window === "undefined" ? "" : window.location.origin;
  const text = `Hi ${a.name.split(" ")[0]}, a gentle reminder of your nutrition consultation on ${formatDay(a.date)} at ${formatTime(a.time)}. Please confirm with one tap${link ? `: ${link}` : "."} Can't make it? Reschedule there so someone else can have the slot. Thank you!`;
  return (
    <a
      href={`https://wa.me/91${a.phone}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3.5 py-2 text-xs font-bold text-sage-700 transition hover:bg-sage-200 active:scale-95"
    >
      <Icon name="chat" className="size-4" /> WhatsApp
    </a>
  );
}

function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: (a: Appointment) => void }) {
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const phoneBad = !!phone && !normalizePhone(phone);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!time) return;
    setBusy(true);
    setError(null);
    try {
      onAdded(await api.create({ name: name.trim(), phone, date, time, source: "dashboard" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setTime(null);
      setRefreshKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Add appointment" className="fixed inset-0 z-40 grid place-items-end bg-ink/40 backdrop-blur-sm sm:place-items-center" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="pop max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-cream p-6 shadow-lift sm:rounded-[2rem]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Add an appointment</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-sand">
            <Icon name="x" />
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="a-name" className="text-sm font-semibold">Client name</label>
            <input id="a-name" className={`${inputCls} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meera Iyer" maxLength={60} autoFocus />
          </div>
          <div>
            <label htmlFor="a-phone" className="text-sm font-semibold">Phone <span className="font-normal text-muted">(optional)</span></label>
            <input id="a-phone" className={`${inputCls} mt-1.5`} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98200 11111" />
            {phoneBad && <p className="mt-1 text-xs text-st-noshow">Enter a 10 digit mobile number.</p>}
          </div>
        </div>
        <div className="mt-6 rounded-3xl bg-white p-4 shadow-card">
          <SlotPicker date={date} time={time} onChange={(d, t) => (setDate(d), setTime(t))} refreshKey={refreshKey} />
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-st-noshow-bg px-3 py-2 text-sm text-st-noshow">{error}</p>}
        <button className={`${btnPrimary} mt-5 w-full`} disabled={busy || !time || name.trim().length < 2 || phoneBad}>
          {busy ? <Spinner className="border-white/40 border-t-white" /> : time ? `Add for ${formatDay(date)}, ${formatTime(time)}` : "Pick a time to add"}
        </button>
      </form>
    </div>
  );
}
