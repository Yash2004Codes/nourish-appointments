"use client";
import Link from "next/link";
import { useState } from "react";
import { api, saveProfile } from "@/lib/client";
import { normalizePhone } from "@/lib/normalize";
import { Icon, Spinner, btnGhost, btnPrimary, inputCls } from "./ui";

/** No logins: a client is recognised by their mobile number. */
export default function PhoneGate({ heading, sub }: { heading: string; sub: string }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = normalizePhone(phone);
    if (!p) return setError("Please enter a valid 10 digit mobile number.");
    setBusy(true);
    setError(null);
    try {
      const mine = await api.list(p);
      if (!mine.length) {
        setError("We couldn't find any visits for this number yet. Book your first one below!");
        return;
      }
      saveProfile({ phone: p, name: mine[mine.length - 1].name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rise mx-auto max-w-lg rounded-[2rem] bg-white p-7 text-center shadow-lift md:p-10">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-sage-100 text-sage-600">
        <Icon name="leaf" className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold leading-tight">{heading}</h1>
      <p className="mt-2 text-muted">{sub}</p>
      <form onSubmit={submit} className="mt-6 space-y-3 text-left">
        <label htmlFor="gate-phone" className="text-sm font-semibold text-muted">
          Your mobile number
        </label>
        <input
          id="gate-phone"
          className={inputCls}
          inputMode="tel"
          autoComplete="tel"
          placeholder="98200 11111"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-st-noshow">
            {error}
          </p>
        )}
        <button className={`${btnPrimary} w-full`} disabled={busy}>
          {busy ? <Spinner className="border-white/40 border-t-white" /> : "Show my visits"}
        </button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> new here? <span className="h-px flex-1 bg-line" />
      </div>
      <Link href="/book" className={`${btnGhost} w-full`}>
        Book your first consultation
      </Link>
    </section>
  );
}
