import type { MatchingAudit, TourOperator } from "./types";
import { getStore, uuid } from "./store";

const TIMEOUT_MS = 1500;
const circuitBreaker = new Map<string, { failures: number; openUntil?: number }>();

export type MatchInput = {
  tourId: string;
  cityId: string;
  date: string;
  time: string;
  language: string;
  participants: { adults: number; children: number };
};

export type MatchResult = {
  winner: TourOperator | null;
  audit: MatchingAudit;
  allExcluded: boolean;
};

async function queryProvider(
  op: TourOperator,
  input: MatchInput
): Promise<{ available: boolean; reason?: string; timedOut?: boolean }> {
  const store = getStore();
  const sim = store.simulation;
  const cb = circuitBreaker.get(op.id);
  if (cb?.openUntil && Date.now() < cb.openUntil) {
    return { available: false, reason: "circuit_breaker_open" };
  }

  if (op.status === "suspended") {
    return { available: false, reason: "suspended" };
  }
  if (op.status !== "active") {
    return { available: false, reason: `status_${op.status}` };
  }
  if (!op.stripeAccountId) {
    return { available: false, reason: "stripe_ineligible" };
  }
  if (!op.aggregatorId) {
    return { available: false, reason: "invalid_mapping" };
  }

  const mapping = store.operatorTourMappings.find(
    (m) => m.tourOperatorId === op.id && m.tourId === input.tourId && m.isActive
  );
  if (!mapping) {
    return { available: false, reason: "not_mapped" };
  }

  if (sim.providerUnavailable) {
    return { available: false, reason: "unavailable" };
  }

  const delay =
    sim.providerTimeout || op.simulateTimeout ? TIMEOUT_MS + 500 : 200 + Math.random() * 300;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ available: false, reason: "timeout", timedOut: true });
      const entry = circuitBreaker.get(op.id) ?? { failures: 0 };
      entry.failures += 1;
      if (entry.failures >= 2) entry.openUntil = Date.now() + 60_000;
      circuitBreaker.set(op.id, entry);
    }, TIMEOUT_MS);

    setTimeout(() => {
      clearTimeout(timer);
      resolve({ available: true });
    }, delay);
  });
}

function scoreOperator(op: TourOperator, available: boolean): number {
  if (!available) return -1;
  return (
    (100 - op.priorityRank * 10) * 0.4 +
    op.reliabilityScore * 0.4 +
    op.allocationWeight * 0.2
  );
}

export async function matchTourOperator(
  input: MatchInput,
  orderId: string
): Promise<MatchResult> {
  const store = getStore();
  const eligible = store.tourOperators.filter((op) => op.cityId === input.cityId);

  const results = await Promise.allSettled(
    eligible.map(async (op) => {
      const result = await queryProvider(op, input);
      return { op, ...result };
    })
  );

  const candidates = results.map((r, i) => {
    const op = eligible[i];
    if (r.status === "rejected") {
      return {
        operatorId: op.id,
        operatorName: op.name,
        available: false,
        excludedReason: "error",
        score: -1,
      };
    }
    const val = r.value;
    const available = val.available;
    return {
      operatorId: op.id,
      operatorName: op.name,
      available,
      excludedReason: available ? undefined : val.reason,
      score: scoreOperator(op, available),
    };
  });

  const sorted = candidates
    .filter((c) => c.available)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const winnerId = sorted[0]?.operatorId ?? "";
  const winner = store.tourOperators.find((o) => o.id === winnerId) ?? null;

  const audit: MatchingAudit = {
    id: uuid(),
    orderId,
    candidates,
    winnerId: winner?.id ?? "",
    winnerName: winner?.name ?? "none",
    timestamp: new Date().toISOString(),
  };

  return { winner, audit, allExcluded: !winner };
}
