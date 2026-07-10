import { getStore, uuid } from "./store";

export function audit(params: {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  correlationId?: string;
}) {
  const store = getStore();
  const entry = {
    id: uuid(),
    actor: params.actor,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    previousValue: params.previousValue,
    newValue: params.newValue,
    reason: params.reason,
    correlationId: params.correlationId ?? uuid(),
    createdAt: new Date().toISOString(),
  };
  store.auditLogs.unshift(entry);
  return entry;
}

export function notify(params: {
  recipientType: "hotel" | "tour_operator" | "superadmin" | "tourist";
  recipientId: string;
  title: string;
  body: string;
  orderId?: string;
}) {
  const store = getStore();
  const n = {
    id: uuid(),
    ...params,
    read: false,
    createdAt: new Date().toISOString(),
  };
  store.notifications.unshift(n);
  return n;
}

export function checkIdempotency(key: string): boolean {
  const store = getStore();
  if (store.idempotencyKeys.has(key)) return false;
  store.idempotencyKeys.add(key);
  return true;
}
