export type HoldRequest = {
  tourOperatorAggregatorId: string;
  tourId: string;
  participants: number;
  serviceDate: string;
};

export type HoldResponse = {
  holdId: string;
  expiresAt: string;
  status: "held" | "unavailable";
};

export type ConfirmRequest = {
  holdId: string;
  tourOperatorAggregatorId: string;
};

export type ConfirmResponse = {
  bookingId: string;
  status: "confirmed" | "failed";
};

const activeHolds = new Map<string, { expiresAt: Date; aggregatorId: string }>();

export async function placeSoftHold(req: HoldRequest): Promise<HoldResponse> {
  await delay(200);

  if (req.tourOperatorAggregatorId === "AGG-FAIL-HOLD") {
    return { holdId: "", expiresAt: "", status: "unavailable" };
  }

  const holdId = `HOLD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  activeHolds.set(holdId, { expiresAt, aggregatorId: req.tourOperatorAggregatorId });

  return { holdId, expiresAt: expiresAt.toISOString(), status: "held" };
}

export async function confirmBooking(req: ConfirmRequest): Promise<ConfirmResponse> {
  await delay(300);
  const hold = activeHolds.get(req.holdId);
  if (!hold) return { bookingId: "", status: "failed" };
  if (req.tourOperatorAggregatorId === "AGG-FAIL-CONFIRM") {
    return { bookingId: "", status: "failed" };
  }
  activeHolds.delete(req.holdId);
  return { bookingId: `BK-${Date.now()}`, status: "confirmed" };
}

export async function releaseHold(holdId: string): Promise<void> {
  await delay(100);
  activeHolds.delete(holdId);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
