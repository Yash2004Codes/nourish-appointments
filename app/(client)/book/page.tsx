"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import SlotPicker from "@/components/SlotPicker";
import { Icon, Spinner, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { ApiError, api, saveProfile, useProfile } from "@/lib/client";
import { icsHref } from "@/lib/ics";
import { formatPhone, normalizePhone } from "@/lib/normalize";
import { formatLongDay, formatTime, todayISO } from "@/lib/time";
import type { Appointment } from "@/lib/types";

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="grid place-items-center py-32">
          <Spinner className="size-7" />
        </div>
      }
    >
      <Book />
    </Suspense>
  );
}

function Book() {
  const rescheduleId = useSearchParams().get("reschedule");
  const { profile, ready } = useProfile();

  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [done, setDone] = useState<{ appt: Appointment; moved: boolean } | null>(null);

  // rescheduling: find the visit being moved
  const [current, setCurrent] = useState<Appointment | null | undefined>(undefined);
  useEffect(() => {
    if (!rescheduleId || !ready) return;
    if (!profile) return setCurrent(null);
    api
      .list(profile.phone)
      .then((l) => setCurrent(l.find((a) => a.id === rescheduleId && a.status === "Booked") ?? null))
      .catch(() => setCurrent(null));
  }, [rescheduleId, ready, profile]);

  useEffect(() => {
    if (profile && !name && !phone) {
      setName(profile.name);
      setPhone(profile.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const rescheduling = !!rescheduleId;
  const phoneOk = !!normalizePhone(phone);
  const nameOk = name.trim().length >= 2;
  const canSubmit = !!time && !busy && (rescheduling ? !!current : nameOk && phoneOk);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!time) return;
    setBusy(true);
    setError(null);
    try {
      if (rescheduling) {
        const appt = await api.patch(rescheduleId, { action: "reschedule", date, time });
        setDone({ appt, moved: true });
      } else {
        const appt = await api.create({ name: name.trim(), phone, date, time });
        saveProfile({ name: appt.name, phone: appt.phone! });
        setDone({ appt, moved: false });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      if (err instanceof ApiError && err.code === "slot_taken") {
        setTime(null);
        setRefreshKey((k) => k + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Success {...done} />;

  if (rescheduling && ready && current === null)
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-card">
        <p className="font-display text-2xl font-semibold">We couldn&apos;t find that visit</p>
        <p className="mt-1 text-muted">It may have been cancelled or already happened.</p>
        <Link href="/appointments" className={`${btnPrimary} mt-5`}>
          Back to my visits
        </Link>
      </div>
    );

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">{rescheduling ? "Pick a new time" : "Book a consultation"}</h1>
      <p className="mt-1 text-muted">
        {rescheduling && current
          ? `Currently ${formatLongDay(current.date)} at ${formatTime(current.time)}.`
          : "30 minutes with your nutritionist. Choose what suits you."}
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-start md:gap-12">
        <section className="min-w-0 rounded-[2rem] bg-white p-5 shadow-card md:p-7">
          <SlotPicker date={date} time={time} onChange={(d, t) => (setDate(d), setTime(t))} refreshKey={refreshKey} />
        </section>

        <section className="min-w-0 space-y-5 md:sticky md:top-24">
          {!rescheduling && (
            <div className="rounded-[2rem] bg-white p-5 shadow-card md:p-7">
              <h3 className="mb-4 text-sm font-semibold text-muted">Your details</h3>
              <label className="text-sm font-semibold" htmlFor="name">
                Full name
              </label>
              <input id="name" className={`${inputCls} mb-4 mt-1.5`} autoComplete="name" placeholder="e.g. Riya Shah" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              <label className="text-sm font-semibold" htmlFor="phone">
                Mobile number
              </label>
              <input id="phone" className={`${inputCls} mt-1.5`} inputMode="tel" autoComplete="tel" placeholder="98200 11111" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <p className="mt-1.5 text-xs text-muted">We&apos;ll use this to remind you, and to find your visits next time.</p>
              {phone && !phoneOk && <p className="mt-1 text-xs text-st-noshow">Enter a 10 digit mobile number.</p>}
            </div>
          )}

          <div className="rounded-[2rem] bg-sage-50 p-5 md:p-6">
            {time ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">Your choice</p>
                <p className="mt-1 font-display text-2xl font-semibold">{formatTime(time)}</p>
                <p className="text-muted">{formatLongDay(date)}</p>
              </>
            ) : (
              <p className="text-sm text-muted">Pick a day and a time to continue.</p>
            )}
            {error && (
              <p role="alert" className="mt-3 rounded-xl bg-st-noshow-bg px-3 py-2 text-sm text-st-noshow">
                {error}
              </p>
            )}
            <button className={`${btnPrimary} mt-4 w-full`} disabled={!canSubmit}>
              {busy ? <Spinner className="border-white/40 border-t-white" /> : rescheduling ? "Confirm new time" : "Confirm booking"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

function Success({ appt, moved }: { appt: Appointment; moved: boolean }) {
  return (
    <div className="mx-auto max-w-lg pt-4 text-center md:pt-10">
      <span className="pop mx-auto grid size-20 place-items-center rounded-full bg-sage-600 text-white shadow-lift">
        <Icon name="check" className="size-10" />
      </span>
      <h1 className="rise mt-6 font-display text-4xl font-semibold">{moved ? "Moved - all set!" : "You're booked!"}</h1>
      <p className="rise mt-1 text-muted" style={{ animationDelay: "60ms" }}>
        {appt.phone ? `We'll keep ${formatPhone(appt.phone)} for reminders.` : ""}
      </p>
      <div className="rise mt-7 rounded-[2rem] bg-white p-7 shadow-lift" style={{ animationDelay: "120ms" }}>
        <p className="font-display text-4xl font-semibold">{formatTime(appt.time)}</p>
        <p className="mt-1 text-lg text-muted">{formatLongDay(appt.date)}</p>
        <p className="mx-auto mt-4 max-w-xs rounded-2xl bg-clay-50 p-3 text-sm text-muted">
          Plans change - if you can&apos;t make it, please reschedule so someone else can have the slot. We&apos;ll also ask you to confirm with one tap.
        </p>
      </div>
      <div className="rise mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center" style={{ animationDelay: "180ms" }}>
        <a href={icsHref(appt)} download="nourish-consultation.ics" className={btnGhost}>
          <Icon name="calendar" className="size-4" /> Add to calendar
        </a>
        <Link href="/" className={btnPrimary}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
