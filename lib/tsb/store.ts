import type { TSBStore, DemoUser, DemoRole } from "./types";
import { createSeedStore } from "./seed";

declare global {
  // eslint-disable-next-line no-var
  var __tsbStore: TSBStore | undefined;
}

export function getStore(): TSBStore {
  if (!global.__tsbStore) {
    global.__tsbStore = createSeedStore();
  }
  return global.__tsbStore;
}

export function resetStore() {
  global.__tsbStore = createSeedStore();
}

export function getDemoUserByEmail(email: string): DemoUser | undefined {
  return getStore().demoUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}

export function getCurrentDemoUser(role?: DemoRole): DemoUser | null {
  const users = getStore().demoUsers;
  if (role) return users.find((u) => u.role === role) ?? null;
  return null;
}

export function nowWithDemoClock(): Date {
  const store = getStore();
  return new Date(
    Date.now() + store.simulation.demoClockOffsetHours * 60 * 60 * 1000
  );
}

export function uuid(): string {
  return crypto.randomUUID();
}
