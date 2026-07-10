-- TSB POC: Multi-tenant schema with Row Level Security

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tsb', 'hotel_group', 'tour_operator')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  currency TEXT DEFAULT 'EUR',
  timezone TEXT DEFAULT 'Europe/Rome',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  city_id UUID NOT NULL REFERENCES cities(id),
  name TEXT NOT NULL,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#1e3a5f',
  qr_token TEXT UNIQUE NOT NULL,
  stripe_account_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tour_operators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  city_id UUID NOT NULL REFERENCES cities(id),
  name TEXT NOT NULL,
  stripe_account_id TEXT,
  aggregator_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES cities(id),
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  duration_hours INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  hotel_id UUID REFERENCES hotels(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id, hotel_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  tour_operator_id UUID NOT NULL REFERENCES tour_operators(id),
  tour_id UUID NOT NULL REFERENCES tours(id),
  organization_hotel_id UUID NOT NULL,
  organization_to_id UUID NOT NULL,
  gross_amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'EUR',
  participants INTEGER DEFAULT 1,
  service_end_at TIMESTAMPTZ NOT NULL,
  booking_status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  transfer_status TEXT DEFAULT 'escrowed',
  stripe_payment_intent_id TEXT,
  hold_id TEXT,
  hold_expires_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  transfer_eligible_at TIMESTAMPTZ,
  stripe_fee_cents INTEGER,
  to_share_cents INTEGER,
  hotel_share_cents INTEGER,
  tsb_share_cents INTEGER,
  attribution_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saga_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  entry_type TEXT NOT NULL,
  recipient_type TEXT,
  amount_cents INTEGER NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION auth_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM partner_memberships WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_hotel_ids()
RETURNS SETOF UUID AS $$
  SELECT COALESCE(hotel_id, h.id)
  FROM partner_memberships pm
  LEFT JOIN hotels h ON h.organization_id = pm.organization_id
  WHERE pm.user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE saga_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY hotels_select_own ON hotels
  FOR SELECT USING (organization_id IN (SELECT auth_user_org_ids()));

CREATE POLICY to_select_own ON tour_operators
  FOR SELECT USING (organization_id IN (SELECT auth_user_org_ids()));

CREATE POLICY orders_hotel_select ON orders
  FOR SELECT USING (
    hotel_id IN (SELECT auth_user_hotel_ids())
    OR organization_hotel_id IN (SELECT auth_user_org_ids())
  );

CREATE POLICY orders_to_select ON orders
  FOR SELECT USING (organization_to_id IN (SELECT auth_user_org_ids()));

CREATE POLICY ledger_hotel_select ON ledger_entries
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE hotel_id IN (SELECT auth_user_hotel_ids()))
  );

CREATE POLICY ledger_to_select ON ledger_entries
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE organization_to_id IN (SELECT auth_user_org_ids()))
  );

CREATE POLICY tours_public_read ON tours FOR SELECT USING (is_active = true);
CREATE POLICY cities_public_read ON cities FOR SELECT USING (is_active = true);
