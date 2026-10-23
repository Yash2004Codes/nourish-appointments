import { InvalidStateError, NotFoundError, SlotTakenError } from "./types";
import { BOOKING_WINDOW_DAYS, SLOT_TIMES, addDays, isPast, isValidISODate, todayISO } from "./time";

export function fail(message: string, status = 400, code = "bad_request") {
  return Response.json({ error: message, code }, { status });
}

export function handle(e: unknown) {
  if (e instanceof SlotTakenError) return fail(e.message, 409, "slot_taken");
  if (e instanceof NotFoundError) return fail(e.message, 404, "not_found");
  if (e instanceof InvalidStateError) return fail(e.message, 409, "invalid_state");
  console.error(e);
  return fail("Something went wrong on our side. Please try again.", 500, "server_error");
}

/** Returns an error message, or null when date+time is a bookable slot. */
export function checkSlot(date: unknown, time: unknown): string | null {
  if (typeof date !== "string" || !isValidISODate(date)) return "Please choose a valid date.";
  if (typeof time !== "string" || !SLOT_TIMES.includes(time)) return "Please choose a valid time slot.";
  if (isPast(date, time)) return "That time has already passed.";
  if (date > addDays(todayISO(), BOOKING_WINDOW_DAYS)) return `Bookings open up to ${BOOKING_WINDOW_DAYS} days ahead.`;
  return null;
}
