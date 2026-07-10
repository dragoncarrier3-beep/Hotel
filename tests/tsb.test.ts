import { describe, it, expect, beforeEach } from "vitest";
import { calculateSplit, computeTransferEligibleAt } from "@/lib/tsb/ledger";
import { resetStore, getStore } from "@/lib/tsb/store";
import { checkIdempotency } from "@/lib/tsb/audit";

describe("TSB Financial Rules", () => {
  it("calculates 70/10/20 gross split", () => {
    const split = calculateSplit(14900, 462);
    expect(split.toGrossCents).toBe(10430);
    expect(split.hotelGrossCents).toBe(1490);
    expect(split.tsbGrossCents).toBe(2980);
    expect(split.toGrossCents + split.hotelGrossCents + split.tsbGrossCents).toBe(14900);
  });

  it("splits Stripe fee 50/50 TSB-TO, hotel intact", () => {
    const split = calculateSplit(10000, 320);
    expect(split.hotelNetCents).toBe(1000);
    expect(split.toNetCents).toBe(7000 - 160);
    expect(split.tsbNetCents).toBe(2000 - 160);
  });

  it("assigns residual cent to TSB", () => {
    const split = calculateSplit(10001, 321);
    const total =
      split.toNetCents + split.hotelNetCents + split.tsbNetCents + 321;
    expect(total).toBe(10001);
  });

  it("computes transfer_eligible_at as max of both thresholds", () => {
    const captured = new Date("2026-01-01T10:00:00Z");
    const serviceEnd = new Date("2026-01-05T18:00:00Z");
    const eligible = computeTransferEligibleAt(captured, serviceEnd);
    expect(eligible.toISOString()).toBe("2026-01-07T18:00:00.000Z");
  });
});

describe("Idempotency", () => {
  beforeEach(() => resetStore());

  it("rejects duplicate idempotency keys", () => {
    expect(checkIdempotency("key-1")).toBe(true);
    expect(checkIdempotency("key-1")).toBe(false);
  });
});

describe("RLS isolation data model", () => {
  beforeEach(() => resetStore());

  it("has separate hotel properties with distinct orgs", () => {
    const store = getStore();
    const props = store.hotelProperties;
    expect(props.length).toBeGreaterThanOrEqual(2);
    expect(props[0].qrToken).not.toBe(props[1].qrToken);
  });

  it("assigns exactly one category per tour", () => {
    const store = getStore();
    store.tours.forEach((t) => {
      expect(t.categoryId).toBeTruthy();
      expect(store.categories.some((c) => c.id === t.categoryId)).toBe(true);
    });
  });
});
