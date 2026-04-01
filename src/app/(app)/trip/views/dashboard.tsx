"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { subscribeToTrip, subscribeToMembers } from "@/lib/repositories";
import { calculateMemberShares, calculateBalance } from "@/lib/costCalculator";
import type { Trip, TripMember } from "@/lib/models";
import Avatar from "@/components/Avatar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format } from "date-fns";
import {
  HiOutlineHome,
  HiOutlineCalendarDays,
  HiOutlineMoon,
  HiOutlineBanknotes,
  HiOutlineShoppingBag,
  HiOutlineTruck,
  HiOutlineReceiptPercent,
  HiOutlineEnvelope,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineChevronRight,
} from "react-icons/hi2";

export default function DashboardView() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id") ?? "";
  const router = useRouter();
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;

    const unsubTrip = subscribeToTrip(tripId, (t) => {
      setTrip(t);
      setLoading(false);
    });

    const unsubMembers = subscribeToMembers(tripId, (m) => {
      setMembers(m);
    });

    return () => {
      unsubTrip();
      unsubMembers();
    };
  }, [tripId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Trip not found.</p>
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.status === "active");
  const shares = calculateMemberShares(
    trip.totalCost,
    trip.totalNights,
    activeMembers
  );

  const checkInStr = trip.checkInMillis
    ? format(new Date(trip.checkInMillis), "MMM d")
    : "TBD";
  const checkOutStr = trip.checkOutMillis
    ? format(new Date(trip.checkOutMillis), "MMM d")
    : "TBD";

  const isOwner = trip.ownerId === user?.uid;

  const navItems = [
    {
      label: "Supplies",
      icon: HiOutlineShoppingBag,
      path: "supplies",
    },
    {
      label: "Carpool",
      icon: HiOutlineTruck,
      path: "carpool",
    },
    {
      label: "Expenses",
      icon: HiOutlineReceiptPercent,
      path: "expenses",
    },
    {
      label: "Invite",
      icon: HiOutlineEnvelope,
      path: "invite",
    },
    ...(isOwner
      ? [
          {
            label: "Manage Group",
            icon: HiOutlineUserGroup,
            path: "manage-group",
          },
        ]
      : []),
    {
      label: "History",
      icon: HiOutlineClock,
      path: "history",
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <span className="text-4xl">{trip.emoji}</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{trip.name}</h1>
      </div>

      {/* House Details Card */}
      <button
        onClick={() => router.push(`/trip?id=${tripId}&view=house-details`)}
        className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            House Details
          </h2>
          <HiOutlineChevronRight className="w-4 h-4 text-gray-400" />
        </div>
        <div className="space-y-2">
          {trip.address && (
            <div className="flex items-center gap-2 text-gray-700">
              <HiOutlineHome className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span className="text-sm truncate">{trip.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-700">
            <HiOutlineCalendarDays className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span className="text-sm">
              {checkInStr} &ndash; {checkOutStr}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <HiOutlineMoon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span className="text-sm">
                {trip.totalNights} night{trip.totalNights !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <HiOutlineBanknotes className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span className="text-sm">
                ${trip.totalCost?.toLocaleString() ?? "0"}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Cost Summary */}
      <div className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl p-4 text-white">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-80">
          Total Cost
        </h2>
        <p className="text-3xl font-bold mt-1">
          ${trip.totalCost?.toLocaleString() ?? "0"}
        </p>
        <p className="text-sm opacity-80 mt-1">
          Split across {activeMembers.length} member
          {activeMembers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Members List */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Members
        </h2>
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {activeMembers.map((member) => {
            const share = shares.get(member.uid) ?? 0;
            const balance = calculateBalance(share, member.amountPaid);
            const isPositive = balance >= 0;

            return (
              <div
                key={member.uid}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    displayName={member.displayName}
                    avatarColor={member.avatarColor}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.displayName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.nightsStayed} night
                      {member.nightsStayed !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    isPositive ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {isPositive ? "+" : ""}${Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
          {activeMembers.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-400">
              No active members yet.
            </div>
          )}
        </div>
      </div>

      {/* Navigation Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(`/trip?id=${tripId}&view=${item.path}`)}
              className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
            >
              <item.icon className="w-6 h-6 text-indigo-500" />
              <span className="text-xs font-medium text-gray-700 text-center">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
