import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Trip,
  TripMember,
  SupplyItem,
  Ride,
  RideRequest,
  SharedExpense,
  TripHistoryEvent,
  PaymentEvent,
  UserProfile,
} from "./models";

// ── Trip Repository ──

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createTrip(
  name: string,
  emoji: string,
  ownerId: string,
  ownerProfile: UserProfile
): Promise<string> {
  const tripRef = doc(collection(db, "trips"));
  const trip: Trip = {
    id: tripRef.id,
    name,
    ownerId,
    houseURL: "",
    thumbnailURL: "",
    address: "",
    totalNights: 0,
    totalCost: 0,
    checkInMillis: 0,
    checkOutMillis: 0,
    memberIds: [ownerId],
    deactivatedMemberIds: [],
    pendingInviteEmails: [],
    inviteCode: generateInviteCode(),
    inviteCodeEnabled: true,
    description: "",
    emoji,
  };
  await setDoc(tripRef, trip);

  // Add owner as first member
  const memberRef = doc(db, "trips", tripRef.id, "members", ownerId);
  await setDoc(memberRef, {
    uid: ownerId,
    displayName: ownerProfile.displayName,
    email: ownerProfile.email,
    avatarSeed: ownerProfile.avatarSeed,
    avatarColor: ownerProfile.avatarColor,
    nightsStayed: 0,
    amountPaid: 0,
    pendingPaymentAmount: 0,
    pendingPaymentStatus: "none",
    status: "active",
  } as TripMember);

  return tripRef.id;
}

export function subscribeToTrips(
  userId: string,
  callback: (trips: Trip[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "trips"),
    where("memberIds", "array-contains", userId)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trip)));
  });
}

export function subscribeToPendingInvites(
  email: string,
  callback: (trips: Trip[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "trips"),
    where("pendingInviteEmails", "array-contains", email)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trip)));
  });
}

export function subscribeToTrip(
  tripId: string,
  callback: (trip: Trip | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "trips", tripId),
    (snap) => {
      callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Trip) : null);
    },
    (error) => {
      console.error("subscribeToTrip error:", error);
      onError?.(error);
    }
  );
}

export function subscribeToMembers(
  tripId: string,
  callback: (members: TripMember[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "trips", tripId, "members"),
    (snap) => {
      callback(
        snap.docs.map((d) => ({
          status: "active",
          pendingPaymentAmount: 0,
          pendingPaymentStatus: "none",
          ...d.data(),
        } as TripMember))
      );
    },
    (error) => {
      console.error("subscribeToMembers error:", error);
      onError?.(error);
    }
  );
}

export function subscribeToSupplies(
  tripId: string,
  callback: (items: SupplyItem[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "trips", tripId, "supplies"),
    orderBy("sortOrder")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupplyItem)));
  });
}

export function subscribeToRides(
  tripId: string,
  callback: (rides: Ride[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, "trips", tripId, "rides"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ride)));
  });
}

export function subscribeToRideRequests(
  tripId: string,
  callback: (requests: RideRequest[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, "trips", tripId, "rideRequests"), (snap) => {
    callback(snap.docs.map((d) => d.data() as RideRequest));
  });
}

export function subscribeToExpenses(
  tripId: string,
  callback: (expenses: SharedExpense[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, "trips", tripId, "expenses"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SharedExpense)));
  });
}

export function subscribeToHistory(
  tripId: string,
  callback: (events: TripHistoryEvent[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "trips", tripId, "history"),
    orderBy("timestamp", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TripHistoryEvent)));
  });
}

export function subscribeToPaymentHistory(
  tripId: string,
  memberId: string,
  callback: (events: PaymentEvent[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "trips", tripId, "members", memberId, "paymentHistory"),
    orderBy("timestamp", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentEvent)));
  });
}

// ── Trip mutations ──

export async function updateTrip(tripId: string, data: Partial<Trip>) {
  await updateDoc(doc(db, "trips", tripId), data);
}

export async function removePendingInviteEmail(tripId: string, email: string) {
  await updateDoc(doc(db, "trips", tripId), {
    pendingInviteEmails: arrayRemove(email),
  });
}

export async function updateHouseDetails(
  tripId: string,
  details: {
    houseURL?: string;
    address?: string;
    totalNights?: number;
    totalCost?: number;
    checkInMillis?: number;
    checkOutMillis?: number;
    thumbnailURL?: string;
  }
) {
  await updateDoc(doc(db, "trips", tripId), details);
}

// ── Member mutations ──

export async function updateMember(
  tripId: string,
  memberId: string,
  data: Partial<TripMember>
) {
  await updateDoc(doc(db, "trips", tripId, "members", memberId), data);
}

export async function inviteMemberByEmail(tripId: string, email: string) {
  await updateDoc(doc(db, "trips", tripId), {
    pendingInviteEmails: arrayUnion(email.toLowerCase().trim()),
  });
}

export async function joinTripByCode(
  inviteCode: string,
  userProfile: UserProfile
): Promise<string | null> {
  const q = query(
    collection(db, "trips"),
    where("inviteCode", "==", inviteCode.toUpperCase().trim()),
    where("inviteCodeEnabled", "==", true)
  );
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const tripDoc = snap.docs[0];
  const trip = { id: tripDoc.id, ...tripDoc.data() } as Trip;

  if (trip.memberIds.includes(userProfile.uid)) return trip.id;

  await updateDoc(doc(db, "trips", trip.id), {
    memberIds: arrayUnion(userProfile.uid),
  });

  const memberRef = doc(db, "trips", trip.id, "members", userProfile.uid);
  await setDoc(memberRef, {
    uid: userProfile.uid,
    displayName: userProfile.displayName,
    email: userProfile.email,
    avatarSeed: userProfile.avatarSeed,
    avatarColor: userProfile.avatarColor,
    nightsStayed: 0,
    amountPaid: 0,
    pendingPaymentAmount: 0,
    pendingPaymentStatus: "none",
    status: "active",
  } as TripMember);

  return trip.id;
}

export async function deactivateMember(tripId: string, memberId: string) {
  // Update trip-level arrays
  await updateDoc(doc(db, "trips", tripId), {
    memberIds: arrayRemove(memberId),
    deactivatedMemberIds: arrayUnion(memberId),
  });

  // Mark member as deactivated
  await updateMember(tripId, memberId, { status: "deactivated" });

  // Unclaim supplies
  const suppliesSnap = await getDocs(collection(db, "trips", tripId, "supplies"));
  for (const supDoc of suppliesSnap.docs) {
    const item = { id: supDoc.id, ...supDoc.data() } as SupplyItem;
    if (item.claimedByUids.includes(memberId)) {
      const newUids = item.claimedByUids.filter((u) => u !== memberId);
      // Rebuild claimed names
      const membersSnap = await getDocs(collection(db, "trips", tripId, "members"));
      const membersMap = new Map(
        membersSnap.docs.map((d) => [d.id, (d.data() as TripMember).displayName])
      );
      const newNames = newUids.map((u) => membersMap.get(u) ?? "").filter(Boolean);
      await updateDoc(doc(db, "trips", tripId, "supplies", item.id), {
        claimedByUids: newUids,
        claimedByName: newNames.join(", "),
      });
    }
  }

  // Remove ride request
  await deleteDoc(doc(db, "trips", tripId, "rideRequests", memberId));

  // Remove from rides as passenger, handle driven rides
  const ridesSnap = await getDocs(collection(db, "trips", tripId, "rides"));
  for (const rideDoc of ridesSnap.docs) {
    const ride = { id: rideDoc.id, ...rideDoc.data() } as Ride;
    if (ride.driverUid === memberId) {
      // Move passengers to ride requests
      for (let i = 0; i < ride.passengerUids.length; i++) {
        await setDoc(doc(db, "trips", tripId, "rideRequests", ride.passengerUids[i]), {
          uid: ride.passengerUids[i],
          displayName: ride.passengerNames[i],
          notes: "Moved from deactivated driver's ride",
        });
      }
      await deleteDoc(doc(db, "trips", tripId, "rides", ride.id));
    } else if (ride.passengerUids.includes(memberId)) {
      const idx = ride.passengerUids.indexOf(memberId);
      const newUids = ride.passengerUids.filter((u) => u !== memberId);
      const newNames = [...ride.passengerNames];
      newNames.splice(idx, 1);
      await updateDoc(doc(db, "trips", tripId, "rides", ride.id), {
        passengerUids: newUids,
        passengerNames: newNames,
      });
    }
  }
}

export async function reactivateMember(tripId: string, memberId: string) {
  await updateDoc(doc(db, "trips", tripId), {
    memberIds: arrayUnion(memberId),
    deactivatedMemberIds: arrayRemove(memberId),
  });
  await updateMember(tripId, memberId, { status: "active" });
}

// ── Supply mutations ──

export async function addSupplyItem(
  tripId: string,
  item: Omit<SupplyItem, "id">
): Promise<string> {
  const ref = doc(collection(db, "trips", tripId, "supplies"));
  await setDoc(ref, { ...item, id: ref.id });
  return ref.id;
}

export async function updateSupplyItem(
  tripId: string,
  itemId: string,
  data: Partial<SupplyItem>
) {
  await updateDoc(doc(db, "trips", tripId, "supplies", itemId), data);
}

export async function deleteSupplyItem(tripId: string, itemId: string) {
  await deleteDoc(doc(db, "trips", tripId, "supplies", itemId));
}

export async function claimSupplyItem(
  tripId: string,
  itemId: string,
  userId: string,
  displayName: string,
  currentItem: SupplyItem
) {
  const alreadyClaimed = currentItem.claimedByUids.includes(userId);
  const newUids = alreadyClaimed
    ? currentItem.claimedByUids.filter((u) => u !== userId)
    : [...currentItem.claimedByUids, userId];

  // Rebuild names
  const newNames = alreadyClaimed
    ? currentItem.claimedByName
        .split(", ")
        .filter((n) => n !== displayName)
        .join(", ")
    : currentItem.claimedByName
    ? `${currentItem.claimedByName}, ${displayName}`
    : displayName;

  await updateDoc(doc(db, "trips", tripId, "supplies", itemId), {
    claimedByUids: newUids,
    claimedByName: newNames,
  });
}

// ── Ride mutations ──

export async function addRide(tripId: string, ride: Omit<Ride, "id">): Promise<string> {
  const ref = doc(collection(db, "trips", tripId, "rides"));
  await setDoc(ref, { ...ride, id: ref.id });
  return ref.id;
}

export async function updateRide(tripId: string, rideId: string, data: Partial<Ride>) {
  await updateDoc(doc(db, "trips", tripId, "rides", rideId), data);
}

export async function deleteRide(tripId: string, rideId: string) {
  await deleteDoc(doc(db, "trips", tripId, "rides", rideId));
}

export async function joinRide(
  tripId: string,
  rideId: string,
  userId: string,
  displayName: string
) {
  await updateDoc(doc(db, "trips", tripId, "rides", rideId), {
    passengerUids: arrayUnion(userId),
    passengerNames: arrayUnion(displayName),
  });
  // Remove ride request if exists
  await deleteDoc(doc(db, "trips", tripId, "rideRequests", userId));
}

export async function leaveRide(
  tripId: string,
  ride: Ride,
  userId: string,
) {
  const idx = ride.passengerUids.indexOf(userId);
  const newUids = ride.passengerUids.filter((u) => u !== userId);
  const newNames = [...ride.passengerNames];
  newNames.splice(idx, 1);
  await updateDoc(doc(db, "trips", tripId, "rides", ride.id), {
    passengerUids: newUids,
    passengerNames: newNames,
  });
}

export async function addRideRequest(tripId: string, request: RideRequest) {
  await setDoc(doc(db, "trips", tripId, "rideRequests", request.uid), request);
}

export async function removeRideRequest(tripId: string, uid: string) {
  await deleteDoc(doc(db, "trips", tripId, "rideRequests", uid));
}

// ── Expense mutations ──

export async function addExpense(
  tripId: string,
  expense: Omit<SharedExpense, "id">
): Promise<string> {
  const ref = doc(collection(db, "trips", tripId, "expenses"));
  await setDoc(ref, { ...expense, id: ref.id });
  return ref.id;
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  data: Partial<SharedExpense>
) {
  await updateDoc(doc(db, "trips", tripId, "expenses", expenseId), data);
}

export async function deleteExpense(tripId: string, expenseId: string) {
  await deleteDoc(doc(db, "trips", tripId, "expenses", expenseId));
}

// ── Payment mutations ──

export async function recordPayment(
  tripId: string,
  memberId: string,
  amount: number,
  actorName: string
) {
  // Update member's amountPaid
  const memberRef = doc(db, "trips", tripId, "members", memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;

  const member = memberSnap.data() as TripMember;
  await updateDoc(memberRef, {
    amountPaid: member.amountPaid + amount,
    pendingPaymentAmount: 0,
    pendingPaymentStatus: "none",
  });

  // Add to payment history
  const histRef = doc(
    collection(db, "trips", tripId, "members", memberId, "paymentHistory")
  );
  await setDoc(histRef, {
    id: histRef.id,
    type: "payment_accepted",
    amount,
    actorName,
    timestamp: Date.now(),
  } as PaymentEvent);

  // Add to trip history
  await addHistoryEvent(tripId, {
    category: "payments",
    description: `${actorName} recorded $${amount.toFixed(2)} payment for ${member.displayName}`,
    timestamp: Date.now(),
  });
}

export async function submitPendingPayment(
  tripId: string,
  memberId: string,
  amount: number
) {
  await updateDoc(doc(db, "trips", tripId, "members", memberId), {
    pendingPaymentAmount: amount,
    pendingPaymentStatus: "pending",
  });
}

export async function rejectPendingPayment(
  tripId: string,
  memberId: string,
  actorName: string
) {
  const memberRef = doc(db, "trips", tripId, "members", memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;
  const member = memberSnap.data() as TripMember;

  await updateDoc(memberRef, {
    pendingPaymentAmount: 0,
    pendingPaymentStatus: "rejected",
  });

  const histRef = doc(
    collection(db, "trips", tripId, "members", memberId, "paymentHistory")
  );
  await setDoc(histRef, {
    id: histRef.id,
    type: "payment_rejected",
    amount: member.pendingPaymentAmount,
    actorName,
    timestamp: Date.now(),
  } as PaymentEvent);
}

// ── History ──

export async function addHistoryEvent(
  tripId: string,
  event: Omit<TripHistoryEvent, "id">
) {
  const ref = doc(collection(db, "trips", tripId, "history"));
  await setDoc(ref, { ...event, id: ref.id });
}

// ── User Profile ──

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
) {
  await updateDoc(doc(db, "users", uid), data);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}
