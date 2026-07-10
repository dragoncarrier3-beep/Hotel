export type DemoRole =
  | "superadmin"
  | "to_owner"
  | "to_staff"
  | "hotel_group"
  | "hotel_property"
  | "hotel_reception"
  | "support"
  | "tourist";

export type CityStatus = "active" | "preview" | "inactive";
export type TOStatus =
  | "application_started"
  | "application_submitted"
  | "approved"
  | "rejected"
  | "contract_signed"
  | "stripe_incomplete"
  | "provider_verifying"
  | "provider_invalid"
  | "active"
  | "suspended"
  | "stripe_restricted"
  | "provider_interrupted"
  | "contract_terminated";

export type OrderOverallStatus =
  | "draft"
  | "awaiting_hold"
  | "awaiting_payment"
  | "processing"
  | "confirmed"
  | "manual_review"
  | "completed"
  | "cancelled"
  | "closed";

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  role: DemoRole;
  name: string;
  organizationId?: string;
  hotelPropertyId?: string;
  tourOperatorId?: string;
}

export interface City {
  id: string;
  name: string;
  country: string;
  slug: string;
  timezone: string;
  currency: string;
  languages: string[];
  status: CityStatus;
  isActive: boolean;
}

export interface Category {
  id: string;
  cityId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Tour {
  id: string;
  cityId: string;
  categoryId: string;
  title: string;
  description: string;
  meetingPoint: string;
  restrictions: string;
  imageUrl: string;
  durationHours: number;
  status: "draft" | "published" | "inactive";
  adultPriceCents: number;
  childPriceCents: number;
}

export interface HotelGroup {
  id: string;
  name: string;
  organizationId: string;
}

export interface HotelProperty {
  id: string;
  groupId: string;
  cityId: string;
  organizationId: string;
  name: string;
  brandColor: string;
  logoInitial: string;
  qrToken: string;
  stripeAccountId: string;
  status: "preview" | "active" | "suspended" | "inactive";
}

export interface TourOperator {
  id: string;
  organizationId: string;
  cityId: string;
  name: string;
  aggregatorId: string;
  stripeAccountId: string;
  status: TOStatus;
  priorityRank: number;
  reliabilityScore: number;
  allocationWeight: number;
  simulateTimeout?: boolean;
  simulateHoldFail?: boolean;
  simulateConfirmFail?: boolean;
  simulateAmbiguous?: boolean;
}

export interface OperatorTourMapping {
  id: string;
  tourOperatorId: string;
  tourId: string;
  isActive: boolean;
}

export interface Order {
  id: string;
  correlationId: string;
  cityId: string;
  hotelPropertyId: string;
  tourOperatorId: string;
  tourId: string;
  hotelOrgId: string;
  toOrgId: string;
  touristEmail?: string;
  participants: { adults: number; children: number };
  selectedDate: string;
  selectedTime: string;
  selectedLanguage: string;
  grossAmountCents: number;
  currency: string;
  serviceEndAt: string;
  overallStatus: OrderOverallStatus;
  availabilityStatus: string;
  holdStatus: string;
  bookingStatus: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  transferStatus: string;
  holdId?: string;
  holdExpiresAt?: string;
  stripePaymentIntentId?: string;
  providerBookingId?: string;
  voucherCode?: string;
  capturedAt?: string;
  transferEligibleAt?: string;
  stripeFeeCents?: number;
  toShareCents?: number;
  hotelShareCents?: number;
  tsbShareCents?: number;
  matchingAudit?: MatchingAudit;
  createdAt: string;
  updatedAt: string;
}

export interface MatchingAudit {
  id: string;
  orderId: string;
  candidates: Array<{
    operatorId: string;
    operatorName: string;
    available: boolean;
    excludedReason?: string;
    score?: number;
  }>;
  winnerId: string;
  winnerName: string;
  timestamp: string;
}

export interface SagaEvent {
  id: string;
  orderId: string;
  step: string;
  status: string;
  payload: Record<string, unknown>;
  errorMessage?: string;
  correlationId: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  orderId: string;
  partnerId?: string;
  entryType: string;
  direction: "debit" | "credit";
  amountCents: number;
  currency: string;
  stripeRef?: string;
  correlationId: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  correlationId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientType: "hotel" | "tour_operator" | "superadmin" | "tourist";
  recipientId: string;
  title: string;
  body: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
}

export interface PartnerDebt {
  id: string;
  tourOperatorId: string;
  orderId: string;
  amountCents: number;
  reason: string;
  status: "open" | "offset" | "paid";
  createdAt: string;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  orderId: string;
  status: "sent" | "failed";
  createdAt: string;
}

export interface SplitResult {
  grossCents: number;
  stripeFeeCents: number;
  toGrossCents: number;
  hotelGrossCents: number;
  tsbGrossCents: number;
  toNetCents: number;
  hotelNetCents: number;
  tsbNetCents: number;
}

export interface DemoSimulation {
  providerTimeout: boolean;
  providerUnavailable: boolean;
  holdFail: boolean;
  authFail: boolean;
  confirmFail: boolean;
  confirmAmbiguous: boolean;
  captureFail: boolean;
  transferFail: boolean;
  demoClockOffsetHours: number;
}

export interface TSBStore {
  cities: City[];
  categories: Category[];
  tours: Tour[];
  hotelGroups: HotelGroup[];
  hotelProperties: HotelProperty[];
  tourOperators: TourOperator[];
  operatorTourMappings: OperatorTourMapping[];
  orders: Order[];
  sagaEvents: SagaEvent[];
  ledgerEntries: LedgerEntry[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  partnerDebts: PartnerDebt[];
  emailLogs: EmailLog[];
  demoUsers: DemoUser[];
  simulation: DemoSimulation;
  processedWebhookIds: Set<string>;
  idempotencyKeys: Set<string>;
}
