"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeToTrip,
  updateHouseDetails,
  addHistoryEvent,
} from "@/lib/repositories";
import type { Trip } from "@/lib/models";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format } from "date-fns";
import {
  HiOutlineLink,
  HiOutlineHome,
  HiOutlineMoon,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlinePencilSquare,
  HiOutlineArrowLeft,
  HiOutlineCheck,
  HiOutlineXMark,
} from "react-icons/hi2";

export default function HouseDetailsView() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id") ?? "";
  const router = useRouter();
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [houseURL, setHouseURL] = useState("");
  const [address, setAddress] = useState("");
  const [totalNights, setTotalNights] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");

  useEffect(() => {
    if (!tripId) return;

    const unsub = subscribeToTrip(tripId, (t) => {
      setTrip(t);
      setLoading(false);
    });

    return () => unsub();
  }, [tripId]);

  const populateForm = (t: Trip) => {
    setHouseURL(t.houseURL ?? "");
    setAddress(t.address ?? "");
    setTotalNights(t.totalNights ?? 0);
    setTotalCost(t.totalCost ?? 0);
    setCheckInDate(
      t.checkInMillis
        ? format(new Date(t.checkInMillis), "yyyy-MM-dd")
        : ""
    );
    setCheckOutDate(
      t.checkOutMillis
        ? format(new Date(t.checkOutMillis), "yyyy-MM-dd")
        : ""
    );
  };

  const handleEdit = () => {
    if (trip) populateForm(trip);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!tripId) return;
    setSaving(true);

    try {
      const checkInMillis = checkInDate
        ? new Date(checkInDate + "T12:00:00").getTime()
        : 0;
      const checkOutMillis = checkOutDate
        ? new Date(checkOutDate + "T12:00:00").getTime()
        : 0;

      await updateHouseDetails(tripId, {
        houseURL,
        address,
        totalNights,
        totalCost,
        checkInMillis,
        checkOutMillis,
      });

      await addHistoryEvent(tripId, {
        category: "expenses",
        description: "updated house details",
        timestamp: Date.now(),
      });

      setEditing(false);
    } catch (err) {
      console.error("Failed to save house details:", err);
    } finally {
      setSaving(false);
    }
  };

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

  const isOwner = trip.ownerId === user?.uid;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          Back
        </button>
        {isOwner && !editing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
            Edit
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              <HiOutlineXMark className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <HiOutlineCheck className="w-4 h-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <h1 className="text-xl font-bold text-gray-900">House Details</h1>

      {/* Thumbnail */}
      {trip.thumbnailURL && (
        <div className="rounded-xl overflow-hidden shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trip.thumbnailURL}
            alt="House thumbnail"
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {editing ? (
        /* Edit Mode */
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-5">
          {/* House URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              House URL
            </label>
            <input
              type="url"
              value={houseURL}
              onChange={(e) => setHouseURL(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Total Nights */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Nights
            </label>
            <input
              type="number"
              value={totalNights}
              onChange={(e) => setTotalNights(Number(e.target.value))}
              min={0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Total Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Cost
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                $
              </span>
              <input
                type="number"
                value={totalCost}
                onChange={(e) => setTotalCost(Number(e.target.value))}
                min={0}
                step={0.01}
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Check-in Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-in Date
            </label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Check-out Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-out Date
            </label>
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      ) : (
        /* Read-Only Mode */
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {/* House URL */}
          <div className="flex items-center gap-3 p-4">
            <HiOutlineLink className="w-5 h-5 text-indigo-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">House URL</p>
              {trip.houseURL ? (
                <a
                  href={trip.houseURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline truncate block"
                >
                  {trip.houseURL}
                </a>
              ) : (
                <p className="text-sm text-gray-400">Not set</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="flex items-center gap-3 p-4">
            <HiOutlineHome className="w-5 h-5 text-indigo-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">Address</p>
              <p className="text-sm text-gray-900">
                {trip.address || "Not set"}
              </p>
            </div>
          </div>

          {/* Total Nights */}
          <div className="flex items-center gap-3 p-4">
            <HiOutlineMoon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Nights</p>
              <p className="text-sm text-gray-900">
                {trip.totalNights ?? 0} night
                {trip.totalNights !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Total Cost */}
          <div className="flex items-center gap-3 p-4">
            <HiOutlineBanknotes className="w-5 h-5 text-indigo-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Cost</p>
              <p className="text-sm text-gray-900">
                ${trip.totalCost?.toLocaleString() ?? "0"}
              </p>
            </div>
          </div>

          {/* Check-in */}
          <div className="flex items-center gap-3 p-4">
            <HiOutlineCalendarDays className="w-5 h-5 text-indigo-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Check-in</p>
              <p className="text-sm text-gray-900">
                {trip.checkInMillis
                  ? format(new Date(trip.checkInMillis), "MMM d, yyyy")
                  : "Not set"}
              </p>
            </div>
          </div>

          {/* Check-out */}
          <div className="flex items-center gap-3 p-4">
            <HiOutlineCalendarDays className="w-5 h-5 text-violet-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Check-out</p>
              <p className="text-sm text-gray-900">
                {trip.checkOutMillis
                  ? format(new Date(trip.checkOutMillis), "MMM d, yyyy")
                  : "Not set"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
