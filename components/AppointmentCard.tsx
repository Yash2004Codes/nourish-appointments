"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { isPast, formatDay, formatTime, relativeDay } from "@/lib/time";
import type { Appointment } from "@/lib/types";
import { Icon, Spinner, StatusChip, btnGhost, btnSoft, chipFor, cx } from "./ui";

interface Props {
  appt: Appointment;
  onChange: (a: Appointment) => void;
}

export default function AppointmentCard({ appt, onChange }: Props) {
  const past = isPast(appt.date, appt.time);
  const upcoming = appt.status === "Booked" && !past;
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chip = chipFor(appt, past);

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      onChange(await api.patch(appt.id, body));
      setAsking(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={cx("rise rounded-3xl bg-white p-5 shadow-card", !upcoming && "bg-white/70")}>
      <div className="flex items-start gap-4">
        <div className={cx("grid w-16 shrink-0 place-items-center rounded-2xl py-2.5 text-center", upcoming ? "bg-sage-100 text-sage-700" : "bg-sand text-muted")}>
          <span className="text-[11px] font-semibold uppercase">{formatDay(appt.date, { weekday: undefined, day: undefined, month: "short" })}</span>
          <span className="font-display text-2xl font-semibold leading-none">{Number(appt.date.slice(8))}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {formatDay(appt.date, { day: undefined, month: undefined, weekday: "long" })}, {formatTime(appt.time)}
            </p>
            <StatusChip status={chip.status} label={chip.label} />
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Nutrition consultation{upcoming && ` · ${relativeDay(appt.date)}`}
          </p>
          {upcoming && (
            <p className={cx("mt-2 inline-flex items-center gap-1.5 text-xs font-semibold", appt.confirmed ? "text-st-done" : "text-clay")}>
              <Icon name={appt.confirmed ? "check" : "clock"} className="size-4" />
              {appt.confirmed ? "You're confirmed" : "Waiting for your confirmation"}
            </p>
          )}
        </div>
      </div>

      {upcoming && !asking && (
        <div className="mt-4 flex flex-wrap gap-2">
          {!appt.confirmed && (
            <button className={btnSoft} disabled={busy} onClick={() => run({ action: "confirm" })}>
              {busy ? <Spinner /> : <Icon name="check" className="size-4" />} I&apos;ll be there
            </button>
          )}
          <Link href={`/book?reschedule=${appt.id}`} className={btnGhost}>
            <Icon name="refresh" className="size-4" /> Reschedule
          </Link>
          <button className="rounded-full px-4 py-3 text-sm font-semibold text-st-noshow transition hover:bg-st-noshow-bg" onClick={() => setAsking(true)}>
            Cancel
          </button>
        </div>
      )}

      {asking && (
        <div role="alertdialog" aria-label="Confirm cancellation" className="mt-4 rounded-2xl bg-clay-50 p-4">
          <p className="text-sm font-semibold">Cancel this visit?</p>
          <p className="mt-1 text-sm text-muted">Your slot will be released for someone else. You can always book again.</p>
          <div className="mt-3 flex gap-2">
            <button className="rounded-full bg-st-noshow px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50" disabled={busy} onClick={() => run({ action: "cancel" })}>
              {busy ? "Cancelling..." : "Yes, cancel"}
            </button>
            <button className={btnGhost} disabled={busy} onClick={() => setAsking(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-st-noshow">
          {error}
        </p>
      )}
    </li>
  );
}
