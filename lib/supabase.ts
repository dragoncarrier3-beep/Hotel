import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase env vars");
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export type Hotel = {
  id: string;
  organization_id: string;
  city_id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  qr_token: string;
  stripe_account_id: string | null;
  is_active: boolean;
};

export type Tour = {
  id: string;
  city_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  duration_hours: number;
};

export type TourOperator = {
  id: string;
  organization_id: string;
  name: string;
  stripe_account_id: string | null;
  aggregator_id: string | null;
};

export type Order = {
  id: string;
  hotel_id: string;
  tour_operator_id: string;
  tour_id: string;
  gross_amount_cents: number;
  booking_status: string;
  payment_status: string;
  transfer_status: string;
  hold_id: string | null;
  stripe_payment_intent_id: string | null;
  captured_at: string | null;
  transfer_eligible_at: string | null;
  stripe_fee_cents: number | null;
  to_share_cents: number | null;
  hotel_share_cents: number | null;
  tsb_share_cents: number | null;
  created_at: string;
};

const DEMO_HOTELS: Hotel[] = [
  {
    id: "h1111111-1111-1111-1111-111111111111",
    organization_id: "22222222-2222-2222-2222-222222222222",
    city_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Grand Hotel Roma",
    logo_url: null,
    brand_color: "#8B4513",
    qr_token: "H8kX2mRomaA1bC3dE5fG7h",
    stripe_account_id: "acct_hotel_roma_test",
    is_active: true,
  },
  {
    id: "h2222222-2222-2222-2222-222222222222",
    organization_id: "33333333-3333-3333-3333-333333333333",
    city_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Boutique Venezia",
    logo_url: null,
    brand_color: "#1e40af",
    qr_token: "V9nY4pVenB2cD4eF6gH8i",
    stripe_account_id: "acct_hotel_venezia_test",
    is_active: true,
  },
];

const DEMO_TOURS: Tour[] = [
  {
    id: "tour0001-0000-0000-0000-000000000001",
    city_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    title: "Colosseum & Roman Forum",
    description: "Skip-the-line guided tour of ancient Rome",
    price_cents: 8900,
    duration_hours: 3,
  },
  {
    id: "tour0002-0000-0000-0000-000000000002",
    city_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    title: "Vatican Museums & Sistine Chapel",
    description: "Expert-guided Vatican experience",
    price_cents: 12500,
    duration_hours: 4,
  },
];

const DEMO_TOS: TourOperator[] = [
  {
    id: "t1111111-1111-1111-1111-111111111111",
    organization_id: "44444444-4444-4444-4444-444444444444",
    name: "Roma Tours SRL",
    stripe_account_id: "acct_to_roma_test",
    aggregator_id: "AGG-ROMA-001",
  },
  {
    id: "t2222222-2222-2222-2222-222222222222",
    organization_id: "55555555-5555-5555-5555-555555555555",
    name: "Vatican Experiences",
    stripe_account_id: "acct_to_vatican_test",
    aggregator_id: "AGG-VAT-002",
  },
];

const demoOrders: (Order & Record<string, unknown>)[] = [];
const demoSagaEvents: Array<{
  id: string;
  order_id: string;
  step: string;
  status: string;
  payload: Record<string, unknown>;
  error_message?: string;
  created_at: string;
}> = [];
const demoLedger: Array<{
  id: string;
  order_id: string;
  entry_type: string;
  recipient_type: string;
  amount_cents: number;
  status: string;
  stripe_transfer_id?: string;
  created_at: string;
}> = [];

export async function getHotelByToken(token: string): Promise<Hotel | null> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("hotels")
      .select("*")
      .eq("qr_token", token)
      .eq("is_active", true)
      .single();
    return data;
  }
  return DEMO_HOTELS.find((h) => h.qr_token === token) ?? null;
}

export async function getTours(): Promise<Tour[]> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("tours")
      .select("*")
      .eq("is_active", true);
    return data ?? [];
  }
  return DEMO_TOURS;
}

export async function getTourById(id: string): Promise<Tour | null> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("tours")
      .select("*")
      .eq("id", id)
      .single();
    return data;
  }
  return DEMO_TOURS.find((t) => t.id === id) ?? null;
}

export async function getTourOperator(id: string): Promise<TourOperator | null> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("tour_operators")
      .select("*")
      .eq("id", id)
      .single();
    return data;
  }
  return DEMO_TOS.find((t) => t.id === id) ?? null;
}

export async function createOrder(
  order: Record<string, unknown>
): Promise<Order> {
  const record = {
    ...order,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from("orders")
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  demoOrders.push(record as Order & Record<string, unknown>);
  return record as Order;
}

export async function updateOrder(
  id: string,
  updates: Partial<Order>
): Promise<Order> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from("orders")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const idx = demoOrders.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error("Order not found");
  demoOrders[idx] = { ...demoOrders[idx], ...updates };
  return demoOrders[idx] as Order;
}

export async function getOrder(id: string): Promise<Order | null> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();
    return data;
  }
  return (demoOrders.find((o) => o.id === id) as Order) ?? null;
}

export async function logSagaEvent(
  orderId: string,
  step: string,
  status: string,
  payload: Record<string, unknown> = {},
  errorMessage?: string
) {
  const event = {
    id: crypto.randomUUID(),
    order_id: orderId,
    step,
    status,
    payload,
    error_message: errorMessage,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    await getSupabaseAdmin().from("saga_events").insert(event);
  } else {
    demoSagaEvents.push(event);
  }
  return event;
}

export async function getSagaEvents(orderId: string) {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("saga_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at");
    return data ?? [];
  }
  return demoSagaEvents.filter((e) => e.order_id === orderId);
}

export async function createLedgerEntry(entry: {
  order_id: string;
  entry_type: string;
  recipient_type: string;
  amount_cents: number;
  stripe_transfer_id?: string;
  status?: string;
}) {
  const record = {
    id: crypto.randomUUID(),
    ...entry,
    status: entry.status ?? "pending",
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    await getSupabaseAdmin().from("ledger_entries").insert(record);
  } else {
    demoLedger.push(record);
  }
  return record;
}

export async function getLedgerEntries(orderId?: string) {
  if (isSupabaseConfigured()) {
    let q = getSupabaseAdmin().from("ledger_entries").select("*");
    if (orderId) q = q.eq("order_id", orderId);
    const { data } = await q.order("created_at");
    return data ?? [];
  }
  return orderId
    ? demoLedger.filter((e) => e.order_id === orderId)
    : demoLedger;
}

export async function getOrdersForHotel(hotelId: string): Promise<Order[]> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("orders")
      .select("*")
      .eq("hotel_id", hotelId);
    return data ?? [];
  }
  return demoOrders.filter((o) => o.hotel_id === hotelId) as Order[];
}

export async function getOrdersForTO(toId: string): Promise<Order[]> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("orders")
      .select("*")
      .eq("tour_operator_id", toId);
    return data ?? [];
  }
  return demoOrders.filter((o) => o.tour_operator_id === toId) as Order[];
}

export async function getEligibleOrders(): Promise<Order[]> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("orders")
      .select("*")
      .eq("transfer_status", "escrowed")
      .eq("payment_status", "captured")
      .lte("transfer_eligible_at", now);
    return data ?? [];
  }
  return demoOrders.filter(
    (o) =>
      o.transfer_status === "escrowed" &&
      o.payment_status === "captured" &&
      o.transfer_eligible_at &&
      o.transfer_eligible_at <= now
  ) as Order[];
}

export function getDemoState() {
  return { orders: demoOrders, sagaEvents: demoSagaEvents, ledger: demoLedger };
}

export function getDemoHotels() {
  return DEMO_HOTELS;
}

export function getDemoTOs() {
  return DEMO_TOS;
}

export async function makeOrdersEligibleForDemo() {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()
      .from("orders")
      .update({ transfer_eligible_at: now })
      .eq("transfer_status", "escrowed")
      .eq("payment_status", "captured");
  } else {
    for (const o of demoOrders) {
      if (o.transfer_status === "escrowed" && o.payment_status === "captured") {
        o.transfer_eligible_at = now;
      }
    }
  }
}

export async function getHotelById(id: string): Promise<Hotel | null> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("hotels")
      .select("*")
      .eq("id", id)
      .single();
    return data;
  }
  return DEMO_HOTELS.find((h) => h.id === id) ?? null;
}
