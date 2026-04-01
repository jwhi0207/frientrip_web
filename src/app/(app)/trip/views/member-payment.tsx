"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeToTrip,
  subscribeToMembers,
  submitPendingPayment,
} from "@/lib/repositories";
import {
  calculateMemberShares,
  calculateBalance,
} from "@/lib/costCalculator";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  HiCurrencyDollar,
  HiCheckCircle,
  HiExclamationCircle,
  HiClock,
} from "react-icons/hi2";

import type { Trip, TripMember } from "@/lib/models";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    val
  );

export default function MemberPaymentView() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id") ?? "";
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const activeMembers = members.filter((m) => m.status === "active");
  const currentMember = members.find((m) => m.uid === user?.uid);

  const shares =
    trip && activeMembers.length > 0
      ? calculateMemberShares(trip.totalCost, trip.totalNights, activeMembers)
      : new Map<string, number>();

  const share = user ? (shares.get(user.uid) ?? 0) : 0;
  const balance = currentMember
    ? calculateBalance(share, currentMember.amountPaid)
    : 0;

  const handleSubmit = async () => {
    if (!user || submitting) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    setSubmitting(true);
    try {
      await submitPendingPayment(tripId, user.uid, amount);
      setPaymentAmount("");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!currentMember) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-gray-500">You are not a member of this trip.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Your Share
          </p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(share)}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Paid
          </p>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(currentMember.amountPaid)}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Balance
          </p>
          <p
            className={`text-lg font-semibold ${
              balance < 0
                ? "text-red-600"
                : balance > 0
                ? "text-green-600"
                : "text-gray-900"
            }`}
          >
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Pending / Rejected Status */}
      {currentMember.pendingPaymentStatus === "pending" && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <HiClock className="w-6 h-6 text-yellow-600 shrink-0" />
          <div>
            <p className="font-medium text-yellow-800">Payment Pending</p>
            <p className="text-sm text-yellow-600">
              You submitted {formatCurrency(currentMember.pendingPaymentAmount)}.
              Waiting for the owner to review.
            </p>
          </div>
        </div>
      )}

      {currentMember.pendingPaymentStatus === "rejected" && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <HiExclamationCircle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <p className="font-medium text-red-800">Payment Rejected</p>
            <p className="text-sm text-red-600">
              Your payment of{" "}
              {formatCurrency(currentMember.pendingPaymentAmount)} was rejected.
              Please submit a new payment or contact the trip owner.
            </p>
          </div>
        </div>
      )}

      {/* Submit Payment */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <HiCurrencyDollar className="w-5 h-5 text-green-600" />
          Submit Payment
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="0.00"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || !paymentAmount}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {submitting ? (
            <>
              <LoadingSpinner /> Submitting...
            </>
          ) : (
            <>
              <HiCheckCircle className="w-5 h-5" />
              Submit Payment
            </>
          )}
        </button>
      </div>
    </div>
  );
}
