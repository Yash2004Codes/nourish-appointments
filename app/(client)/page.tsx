"use client";
import Link from "next/link";
import { useState } from "react";
import PhoneGate from "@/components/PhoneGate";
import { Icon, Spinner, btnGhost, btnPrimary, cx } from "@/components/ui";
import { api, saveProfile, upcoming, useLive, useProfile } from "@/lib/client";
import { formatLongDay, formatTime, greeting, relativeDay } from "@/lib/time";
import type { Appointment } from "@/lib/types";

export default function Home() {
  const { profile, ready } = useProfile();
  if (!ready) return <Loading />;
  if (!profile)
    return (
      <div className="pt-4 md:pt-10">
        <PhoneGate heading="Welcome to Nourish" sub="Enter your number to see your next consultation, or book a new one." />
      </div>
    );
  return <Dashboard name={profile.name} phone={profile.phone} />;
}

const Loading = () => (
  <div className="grid place-items-center py-32">
    <Spinner className="size-7" />
  </div>
);

function Dashboard({ name, phone }: { name: string; phone: string }) {
  const { data, setData } = useLive(() => api.list(phone), phone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = name.split(" ")[0];

  const next = data ? upcoming(data)[0] : undefined;
  const more = data ? upcoming(data).length - 1 : 0;

  const replace = (a: Appointment) => setData((d) => (d ? d.map((x) => (x.id === a.id ? a : x)) : d));

  async function confirm(a: Appointment) {
    setBusy(true);
    setError(null);
    try {
      replace(await api.patch(a.id, { action: "confirm" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1.35fr_1fr] md:items-start md:gap-12 md:pt-4">
      <div>
        <p className="rise text-sm font-semibold text-sage-600">{greeting()}</p>
        <h1 className="rise font-display text-4xl font-semibold leading-tight md:text-5xl" style={{ animationDelay: "40ms" }}>
          {first ? `Hi ${first}` : "Hello"}, <span className="text-sage-600">ready to feel your best?</span>
        </h1>

        <div className="mt-8">
          {!data && <Loading />}
          {data && next && <NextCard appt={next} busy={busy} onConfirm={() => confirm(next)} />}
          {data && !next && (
            <section className="rise rounded-[2rem] bg-white p-8 text-center shadow-lift">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-clay-50 text-clay">
                <Icon name="calendar" className="size-7" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold">Nothing booked just yet</h2>
              <p className="mx-auto mt-1 max-w-xs text-muted">A short consultation is the easiest first step. Pick a time that suits you.</p>
              <Link href="/book" className={`${btnPrimary} mt-6`}>
                Book a consultation
              </Link>
            </section>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-st-noshow">
              {error}
            </p>
          )}
          {more > 0 && (
            <Link href="/appointments" className="mt-4 inline-block text-sm font-semibold text-sage-700 underline-offset-4 hover:underline">
              + {more} more upcoming visit{more > 1 ? "s" : ""}
            </Link>
          )}
        </div>
      </div>

      <aside className="rise space-y-4" style={{ animationDelay: "120ms" }}>
        <div className="rounded-3xl bg-sage-600 p-6 text-white shadow-lift">
          <p className="font-display text-xl font-semibold">Need a new slot?</p>
          <p className="mt-1 text-sm text-sage-100">Consultations take 30 minutes. Pick a day and time that works for you.</p>
          <Link href="/book" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-sage-700 transition active:scale-[0.98]">
            <Icon name="plus" className="size-4" /> Book a visit
          </Link>
        </div>
        <div className="rounded-3xl border border-line bg-white/70 p-5 text-sm text-muted">
          <p className="font-semibold text-ink">Little reminder</p>
          <p className="mt-1">Tapping &quot;I&apos;ll be there&quot; helps your nutritionist plan her day - and keeps your spot safe.</p>
        </div>
        <button
          className="text-xs text-muted underline-offset-2 hover:underline"
          onClick={() => saveProfile(null)}
        >
          Not {first || "you"}? Use a different number
        </button>
      </aside>
    </div>
  );
}

function NextCard({ appt, busy, onConfirm }: { appt: Appointment; busy: boolean; onConfirm: () => void }) {
  const rel = relativeDay(appt.date);
  return (
    <section className="rise relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-lift md:p-8">
      <div aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-sage-100/70" />
      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sage-700">
          <Icon name="leaf" className="size-4" /> Your next visit · {rel}
        </p>
        <p className="mt-5 font-display text-4xl font-semibold leading-none md:text-5xl">{formatTime(appt.time)}</p>
        <p className="mt-2 text-lg text-muted">{formatLongDay(appt.date)}</p>
        <p className="mt-1 text-sm text-muted">30 min · Nutrition consultation</p>

        <div className={cx("mt-6 rounded-2xl p-4", appt.confirmed ? "bg-st-done-bg" : "bg-clay-50")}>
          {appt.confirmed ? (
            <p className="pop flex items-center gap-2 font-semibold text-st-done">
              <Icon name="check" /> You&apos;re confirmed - see you there!
            </p>
          ) : (
            <>
              <p className="font-semibold">Will you be able to make it?</p>
              <p className="mt-0.5 text-sm text-muted">One tap lets your nutritionist know to expect you.</p>
              <button className={`${btnPrimary} mt-3 w-full sm:w-auto`} disabled={busy} onClick={onConfirm}>
                {busy ? <Spinner className="border-white/40 border-t-white" /> : <Icon name="check" className="size-5" />} Yes, I&apos;ll be there
              </button>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/book?reschedule=${appt.id}`} className={btnGhost}>
            <Icon name="refresh" className="size-4" /> Reschedule
          </Link>
          <Link href="/appointments" className={btnGhost}>
            Manage visits
          </Link>
        </div>
      </div>
    </section>
  );
}
