"use client";
import Link from "next/link";
import { useState } from "react";
import AppointmentCard from "@/components/AppointmentCard";
import PhoneGate from "@/components/PhoneGate";
import { Spinner, btnPrimary, cx } from "@/components/ui";
import { api, history, upcoming, useLive, useProfile } from "@/lib/client";
import type { Appointment } from "@/lib/types";

export default function Appointments() {
  const { profile, ready } = useProfile();
  if (!ready)
    return (
      <div className="grid place-items-center py-32">
        <Spinner className="size-7" />
      </div>
    );
  if (!profile) return <PhoneGate heading="Your visits" sub="Enter your number to see your upcoming and past consultations." />;
  return <List phone={profile.phone} />;
}

function List({ phone }: { phone: string }) {
  const { data, error, setData } = useLive(() => api.list(phone), phone);
  const [tab, setTab] = useState<"up" | "past">("up");
  const replace = (a: Appointment) => setData((d) => (d ? d.map((x) => (x.id === a.id ? a : x)) : d));

  const up = data ? upcoming(data) : [];
  const past = data ? history(data) : [];
  const shown = tab === "up" ? up : past;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl font-semibold">Your visits</h1>
      <div role="tablist" aria-label="Visits" className="mt-6 grid grid-cols-2 rounded-full bg-sand p-1">
        {(
          [
            ["up", `Upcoming${data ? ` (${up.length})` : ""}`],
            ["past", `Past${data ? ` (${past.length})` : ""}`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cx("rounded-full py-2.5 text-sm font-semibold transition", tab === k ? "bg-white text-sage-700 shadow-card" : "text-muted")}
          >
            {label}
          </button>
        ))}
      </div>

      {error && !data && <p className="mt-6 rounded-2xl bg-st-noshow-bg p-4 text-sm text-st-noshow">{error}</p>}
      {!data && !error && (
        <div className="grid place-items-center py-20">
          <Spinner className="size-7" />
        </div>
      )}

      {data && shown.length === 0 && (
        <div className="rise mt-6 rounded-3xl border border-dashed border-line bg-white/60 p-10 text-center">
          <p className="font-display text-2xl font-semibold">{tab === "up" ? "No upcoming visits" : "No past visits yet"}</p>
          <p className="mt-1 text-muted">{tab === "up" ? "Your calendar is clear - book a time that suits you." : "Once you've had a consultation it will show up here."}</p>
          {tab === "up" && (
            <Link href="/book" className={`${btnPrimary} mt-5`}>
              Book a consultation
            </Link>
          )}
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {shown.map((a) => (
          <AppointmentCard key={a.id} appt={a} onChange={replace} />
        ))}
      </ul>

      <p className="mt-8 text-center text-xs text-muted md:hidden">
        <Link href="/dashboard" className="underline-offset-2 hover:underline">
          Practice dashboard
        </Link>
      </p>
    </div>
  );
}
