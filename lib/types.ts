export type Status = "Booked" | "Done" | "No-show" | "Cancelled";

export interface Appointment {
  id: string;
  name: string;
  /** 10 digit Indian mobile number, digits only. null when we were never given one. */
  phone: string | null;
  /** ISO date, YYYY-MM-DD (clinic time, IST) */
  date: string;
  /** 24h time, HH:MM (clinic time, IST) */
  time: string;
  status: Status;
  /** Client tapped "I'll be there" - the main no-show guard. */
  confirmed: boolean;
  source: "client" | "dashboard" | "sample";
  createdAt: string;
}

export interface SlotInfo {
  time: string;
  available: boolean;
}

export class SlotTakenError extends Error {
  constructor() {
    super("That time was just taken. Please pick another slot.");
    this.name = "SlotTakenError";
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("Appointment not found.");
    this.name = "NotFoundError";
  }
}

export class InvalidStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStateError";
  }
}
