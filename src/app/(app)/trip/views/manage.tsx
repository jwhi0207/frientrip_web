"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeToTrip,
  subscribeToMembers,
  subscribeToPaymentHistory,
  updateMember,
  recordPayment,
  rejectPendingPayment,
  deactivateMember,
  reactivateMember,
} from "@/lib/repositories";
import {
  calculateMemberShares,
  calculateBalance,
} from "@/lib/costCalculator";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format } from "date-fns";
import {
  HiPencilSquare,
  HiBanknotes,
  HiXCircle,
  HiArrowPath,
  HiCheckCircle,
  HiXMark,
} from "react-icons/hi2";

import type { Trip, TripMember, PaymentEvent } from "@/lib/models";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    val
  );

export default function ManageView() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id") ?? "";
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [editNightsModal, setEditNightsModal] = useState<TripMember | null>(null);
  const [editNightsValue, setEditNightsValue] = useState(0);
  const [recordPaymentModal, setRecordPaymentModal] = useState<TripMember | null>(null);
  const [recordPaymentAmount, setRecordPaymentAmount] = useState("");

  // Payment history
  const [historyMember, setHistoryMember] = useState<TripMember | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const unsubTrip = subscribeToTrip(tripId, (t: Trip | null) => {
      setTrip(t);
      setLoading(false);
    });
    const unsubMembers = subscribeToMembers(tripId, (m: TripMember[]) => {
      setMembers(m);
    });
    return () => {
      unsubTrip();
      unsubMembers();
    };
  }, [tripId]);

  useEffect(() => {
    if (!historyMember) {
      setPaymentHistory([]);
      return;
    }
    setHistoryLoading(true);
    const unsub = subscribeToPaymentHistory(
      tripId,
      historyMember.uid,
      (events: PaymentEvent[]) => {
        setPaymentHistory(events);
        setHistoryLoading(false);
      }
    );
    return () => unsub();
  }, [tripId, historyMember]);

  const isOwner = trip?.ownerId === user?.uid;

  const activeMembers = members.filter((m) => m.status === "active");
  const deactivatedMembers = members.filter((m) => m.status === "deactivated");

  const shares = trip
    ? calculateMemberShares(trip.totalCost, trip.totalNights, activeMembers)
    : new Map<string, number>();

  const handleEditNights = async () => {
    if (!editNightsModal) return;
    await updateMember(tripId, editNightsModal.uid, {
      nightsStayed: editNightsValue,
    });
    setEditNightsModal(null);
  };

  const handleRecordPayment = async () => {
    if (!recordPaymentModal || !user) return;
    const amount = parseFloat(recordPaymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    await recordPayment(tripId, recordPaymentModal.uid, amount, user.displayName ?? "Owner");
    setRecordPaymentModal(null);
    setRecordPaymentAmount("");
  };

  const handleAcceptPending = async (member: TripMember) => {
    if (!user) return;
    await recordPayment(
      tripId,
      member.uid,
      member.pendingPaymentAmount,
      user.displayName ?? "Owner"
    );
  };

  const handleRejectPending = async (member: TripMember) => {
    if (!user) return;
    await rejectPendingPayment(tripId, member.uid, user.displayName ?? "Owner");
  };

  const handleDeactivate = async (member: TripMember) => {
    if (!confirm(`Deactivate ${member.displayName}?`)) return;
    await deactivateMember(tripId, member.uid);
  };

  const handleReactivate = async (member: TripMember) => {
    await reactivateMember(tripId, member.uid);
  };

  if (loading) return <LoadingSpinner />;

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-gray-500 text-lg">
          Only the trip owner can manage the group.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Active Members */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Active Members</h2>
        {activeMembers.length === 0 ? (
          <p className="text-gray-500">No active members.</p>
        ) : (
          <div className="space-y-3">
            {activeMembers.map((member) => {
              const share = shares.get(member.uid) ?? 0;
              const balance = calculateBalance(share, member.amountPaid);
              const isMemberOwner = member.uid === trip?.ownerId;

              return (
                <div
                  key={member.uid}
                  className="bg-white rounded-lg border p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setHistoryMember(member)}
                >
                  <Avatar
                    displayName={member.displayName}
                    avatarColor={member.avatarColor}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {member.displayName}
                      {isMemberOwner && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Owner
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {member.email}
                    </p>
                    <div className="flex gap-4 mt-1 text-sm text-gray-600">
                      <span>{member.nightsStayed} nights</span>
                      <span>Paid: {formatCurrency(member.amountPaid)}</span>
                      <span
                        className={
                          balance < 0
                            ? "text-red-600 font-medium"
                            : balance > 0
                            ? "text-green-600 font-medium"
                            : ""
                        }
                      >
                        Balance: {formatCurrency(balance)}
                      </span>
                    </div>

                    {/* Pending Payment */}
                    {member.pendingPaymentStatus === "pending" && (
                      <div className="mt-2 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 text-sm">
                        <span className="text-yellow-700 font-medium">
                          Pending: {formatCurrency(member.pendingPaymentAmount)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptPending(member);
                          }}
                          className="ml-auto flex items-center gap-1 text-green-700 hover:text-green-800 font-medium"
                        >
                          <HiCheckCircle className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectPending(member);
                          }}
                          className="flex items-center gap-1 text-red-700 hover:text-red-800 font-medium"
                        >
                          <HiXMark className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions (non-owner only) */}
                  {!isMemberOwner && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditNightsValue(member.nightsStayed);
                          setEditNightsModal(member);
                        }}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Nights"
                      >
                        <HiPencilSquare className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecordPaymentModal(member);
                        }}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Record Payment"
                      >
                        <HiBanknotes className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeactivate(member);
                        }}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deactivate"
                      >
                        <HiXCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Deactivated Members */}
      {deactivatedMembers.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-500">
            Deactivated Members
          </h2>
          <div className="space-y-3">
            {deactivatedMembers.map((member) => (
              <div
                key={member.uid}
                className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex items-center gap-4 opacity-70"
              >
                <Avatar
                  displayName={member.displayName}
                  avatarColor={member.avatarColor}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-gray-500">
                    {member.displayName}
                  </p>
                  <p className="text-sm text-gray-400 truncate">
                    {member.email}
                  </p>
                </div>
                <button
                  onClick={() => handleReactivate(member)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <HiArrowPath className="w-4 h-4" />
                  Reactivate
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edit Nights Modal */}
      {editNightsModal && (
        <Modal open={!!editNightsModal} onClose={() => setEditNightsModal(null)} title={`Edit Nights for ${editNightsModal.displayName}`}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nights Stayed
              </label>
              <input
                type="number"
                min={0}
                value={editNightsValue}
                onChange={(e) => setEditNightsValue(parseInt(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditNightsModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleEditNights}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {recordPaymentModal && (
        <Modal open={!!recordPaymentModal} onClose={() => setRecordPaymentModal(null)} title={`Record Payment for ${recordPaymentModal.displayName}`}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={recordPaymentAmount}
                onChange={(e) => setRecordPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRecordPaymentModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
              >
                Record
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment History Modal */}
      {historyMember && (
        <Modal open={!!historyMember} onClose={() => setHistoryMember(null)} title={`Payment History: ${historyMember.displayName}`}>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : paymentHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No payment history.
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {paymentHistory.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div>
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 mr-2">
                      {event.type}
                    </span>
                    <span className="text-sm text-gray-600">
                      by {event.actorName}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(event.amount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(event.timestamp), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
