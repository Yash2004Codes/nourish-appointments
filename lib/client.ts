"use client";
import { useCallback, useEffect, useState } from "react";
import type { Appointment, SlotInfo } from "./types";
import { isPast } from "./time";

export class ApiError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong.", data.code ?? "error");
  return data as T;
}

export const api = {
  list: (phone?: string) =>
    call<{ appointments: Appointment[] }>(`/api/appointments${phone ? `?phone=${phone}` : ""}`).then((r) => r.appointments),
  slots: (date: string) => call<{ slots: SlotInfo[] }>(`/api/slots?date=${date}`).then((r) => r.slots),
  create: (body: { name: string; phone: string; date: string; time: string; source?: "client" | "dashboard" }) =>
    call<{ appointment: Appointment }>("/api/appointments", { method: "POST", body: JSON.stringify(body) }).then((r) => r.appointment),
  patch: (id: string, body: Record<string, unknown>) =>
    call<{ appointment: Appointment }>(`/api/appointments/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then((r) => r.appointment),
  reset: () => call<{ ok: true }>("/api/reset", { method: "POST" }),
};

/** Loads a list and keeps it fresh (poll + refetch when the tab regains focus). */
export function useLive<T>(load: () => Promise<T>, key: string, everyMs = 8000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await load());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, everyMs);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh, everyMs]);

  return { data, error, refresh, setData };
}

/* ----- who is using this phone (no login: the phone number is the key) ----- */

export interface Profile {
  name: string;
  phone: string;
}
const KEY = "nourish.profile";

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}
export function saveProfile(p: Profile | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event("nourish-profile"));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      setProfile(loadProfile());
      setReady(true);
    };
    sync();
    window.addEventListener("nourish-profile", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("nourish-profile", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { profile, ready };
}

export const upcoming = (list: Appointment[]) =>
  list.filter((a) => a.status === "Booked" && !isPast(a.date, a.time));
export const history = (list: Appointment[]) =>
  list.filter((a) => !(a.status === "Booked" && !isPast(a.date, a.time))).reverse();
