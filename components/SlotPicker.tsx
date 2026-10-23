"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { BOOKING_WINDOW_DAYS, addDays, formatDay, formatTime, todayISO } from "@/lib/time";
import type { SlotInfo } from "@/lib/types";
import { Icon, Spinner, cx } from "./ui";

interface Props {
  date: string;
  time: string | null;
  onChange: (date: string, time: string | null) => void;
  /** bump to force a slot refetch (e.g. after a "slot taken" error) */
  refreshKey?: number;
}

export default function SlotPicker({ date, time, onChange, refreshKey = 0 }: Props) {
  const [slots, setSlots] = useState<SlotInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const days = useMemo(() => {
    const t = todayISO();
    return Array.from({ length: BOOKING_WINDOW_DAYS + 1 }, (_, i) => addDays(t, i));
  }, []);
  const activeDay = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let live = true;
    const load = () =>
      api
        .slots(date)
        .then((s) => {
          if (!live) return;
          setSlots(s);
          setError(null);
        })
        .catch((e) => live && setError(e.message));
    setSlots(null);
    load();
    const t = setInterval(load, 10000); // keep availability fresh while they decide
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [date, refreshKey]);

  // if the chosen slot got taken by someone else while we were looking, drop it
  useEffect(() => {
    if (time && slots && !slots.find((s) => s.time === time)?.available) onChange(date, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  useEffect(() => {
    activeDay.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  const morning = slots?.filter((s) => s.time < "12:00") ?? [];
  const afternoon = slots?.filter((s) => s.time >= "12:00") ?? [];
  const anyFree = slots?.some((s) => s.available);
  const today = todayISO();

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted">Pick a day</h3>
      <div role="radiogroup" aria-label="Day" className="no-scrollbar -mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-2 md:-mx-1 md:px-1">
        {days.map((d) => {
          const on = d === date;
          return (
            <button
              key={d}
              ref={on ? activeDay : undefined}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(d, null)}
              className={cx(
                "flex min-w-[4.2rem] shrink-0 snap-start flex-col items-center rounded-2xl border px-3 py-3 transition active:scale-95",
                on ? "border-sage-600 bg-sage-600 text-white shadow-card" : "border-line bg-white hover:border-sage-400",
              )}
            >
              <span className={cx("text-[11px] font-semibold uppercase tracking-wide", on ? "text-sage-100" : "text-muted")}>
                {d === today ? "Today" : formatDay(d, { weekday: "short", day: undefined, month: undefined })}
              </span>
              <span className="font-display text-2xl font-semibold leading-tight">{Number(d.slice(8))}</span>
              <span className={cx("text-[11px]", on ? "text-sage-100" : "text-muted")}>{formatDay(d, { weekday: undefined, day: undefined, month: "short" })}</span>
            </button>
          );
        })}
      </div>

      <h3 className="mb-3 mt-7 text-sm font-semibold text-muted">Pick a time</h3>
      {error && <p className="rounded-2xl bg-st-noshow-bg px-4 py-3 text-sm text-st-noshow">{error}</p>}
      {!slots && !error && (
        <div className="grid place-items-center py-10">
          <Spinner />
        </div>
      )}
      {slots && !anyFree && (
        <div className="rounded-2xl border border-dashed border-line bg-white/60 px-4 py-8 text-center text-sm text-muted">
          <Icon name="calendar" className="mx-auto mb-2 size-6 text-sage-400" />
          Nothing free on this day - try the next one.
        </div>
      )}
      {slots && anyFree && (
        <div className="space-y-5">
          {[
            ["Morning", morning],
            ["Afternoon", afternoon],
          ].map(([label, list]) =>
            (list as SlotInfo[]).length ? (
              <div key={label as string}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted/80">{label as string}</p>
                <div role="radiogroup" aria-label={label as string} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {(list as SlotInfo[]).map((s) => {
                    const on = s.time === time;
                    return (
                      <button
                        key={s.time}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={!s.available}
                        onClick={() => onChange(date, s.time)}
                        className={cx(
                          "rounded-2xl border px-2 py-3 text-sm font-semibold transition active:scale-95",
                          on && "border-sage-600 bg-sage-600 text-white shadow-card",
                          !on && s.available && "border-line bg-white hover:border-sage-400 hover:bg-sage-50",
                          !s.available && "cursor-not-allowed border-transparent bg-sand/60 text-muted/50 line-through",
                        )}
                      >
                        {formatTime(s.time)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
