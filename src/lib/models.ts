// ── Firestore data models matching Android app schema ──

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  avatarSeed: number;
  avatarColor: number;
  role: "user" | "admin";
}

export interface Trip {
  id: string;
  name: string;
  ownerId: string;
  houseURL: string;
  thumbnailURL: string;
  address: string;
  totalNights: number;
  totalCost: number;
  checkInMillis: number;
  checkOutMillis: number;
  memberIds: string[];
  deactivatedMemberIds: string[];
  pendingInviteEmails: string[];
  inviteCode: string;
  inviteCodeEnabled: boolean;
  description: string;
  emoji: string;
}

export interface TripMember {
  uid: string;
  displayName: string;
  email: string;
  avatarSeed: number;
  avatarColor: number;
  nightsStayed: number;
  amountPaid: number;
  pendingPaymentAmount: number;
  pendingPaymentStatus: "none" | "pending" | "rejected";
  status: "active" | "deactivated";
}

export interface SupplyItem {
  id: string;
  name: string;
  category: string;
  quantity: string;
  claimedByUids: string[];
  claimedByName: string;
  sortOrder: number;
}

export interface Ride {
  id: string;
  driverUid: string;
  driverName: string;
  vehicleEmoji: string;
  vehicleLabel: string;
  departureLocation: string;
  totalSeats: number;
  departureTime: number;
  returnTime: number;
  notes: string;
  passengerUids: string[];
  passengerNames: string[];
}

export interface RideRequest {
  uid: string;
  displayName: string;
  notes: string;
}

export interface SharedExpense {
  id: string;
  description: string;
  amount: number;
  category: "supply" | "misc";
  splitMethod: "even" | "byNights";
  submittedByUid: string;
  submittedByName: string;
  approved: boolean;
  linkedSupplyId: string;
  createdAt: number;
}

export interface HouseDetails {
  houseURL: string;
  address: string;
  totalNights: number;
  totalCost: number;
  checkInMillis: number;
  checkOutMillis: number;
}

export interface PaymentEvent {
  id: string;
  type: string;
  amount: number;
  actorName: string;
  timestamp: number;
}

export interface TripHistoryEvent {
  id: string;
  category: "expenses" | "supplies" | "payments";
  description: string;
  timestamp: number;
}

// Supply categories matching Android app
export const SUPPLY_CATEGORIES = [
  "Food",
  "Disposables",
  "Entertainment",
  "Outdoor & Games",
  "Other",
] as const;

// Vehicle options matching Android app
export const VEHICLE_OPTIONS = [
  { emoji: "🚗", label: "Car" },
  { emoji: "🚐", label: "Van" },
  { emoji: "🛻", label: "Truck" },
  { emoji: "🚌", label: "Bus" },
  { emoji: "🏎️", label: "Sports Car" },
] as const;

// Avatar colors matching Android Material3 palette
export const AVATAR_COLORS = [
  "#E57373", "#F06292", "#BA68C8", "#9575CD",
  "#7986CB", "#64B5F6", "#4FC3F7", "#4DD0E1",
  "#4DB6AC", "#81C784", "#AED581", "#DCE775",
  "#FFD54F", "#FFB74D", "#FF8A65", "#A1887F",
];
