"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Trip } from "@/lib/models";
import {
  subscribeToTrips,
  subscribeToPendingInvites,
  createTrip,
  joinTripByCode,
} from "@/lib/repositories";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format } from "date-fns";
import {
  HiPlus,
  HiTicket,
  HiMapPin,
  HiCalendarDays,
  HiUserGroup,
  HiCheck,
  HiXMark,
} from "react-icons/hi2";

const EMOJI_OPTIONS = [
  "🏖️", "🏔️", "🏕️", "🎿", "🏄", "🚗",
  "🎉", "🏠", "⛺", "🌴", "🎭", "🍕",
];

export default function TripsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  void profile; // used for createTrip

  const [trips, setTrips] = useState<Trip[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tripName, setTripName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🏖️");
  const [creating, setCreating] = useState(false);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;

    const unsubTrips = subscribeToTrips(user.uid, (data) => {
      setTrips(data);
      setLoading(false);
    });

    const unsubInvites = subscribeToPendingInvites(user.email!, (data) => {
      setPendingInvites(data);
    });

    return () => {
      unsubTrips();
      unsubInvites();
    };
  }, [user, authLoading]);

  const handleCreateTrip = async () => {
    if (!tripName.trim() || !user) return;
    setCreating(true);
    try {
      const tripId = await createTrip(tripName.trim(), selectedEmoji, user.uid, profile!);
      setShowCreateModal(false);
      setTripName("");
      setSelectedEmoji("🏖️");
      router.push(`/trip?id=${tripId}`);
    } catch (err) {
      console.error("Failed to create trip:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim() || !user) return;
    setJoining(true);
    setJoinError("");
    try {
      const tripId = await joinTripByCode(inviteCode.trim(), profile!);
      if (tripId) {
        setShowJoinModal(false);
        setInviteCode("");
        router.push(`/trip?id=${tripId}`);
      } else {
        setJoinError("Invalid invite code. Please try again.");
      }
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : "Invalid invite code. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const formatDateRange = (trip: Trip) => {
    if (!trip.checkInMillis || !trip.checkOutMillis) return null;
    return `${format(new Date(trip.checkInMillis), "MMM d")} - ${format(new Date(trip.checkOutMillis), "MMM d")}`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        <button
          onClick={() => setShowJoinModal(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <HiTicket className="w-4 h-4" />
          Join by Code
        </button>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Pending Invites
          </h2>
          <div className="space-y-3">
            {pendingInvites.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-xl shadow-sm border border-indigo-100 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{trip.emoji || "🏖️"}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{trip.name}</p>
                      {trip.address && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <HiMapPin className="w-3.5 h-3.5" />
                          {trip.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/trip?id=${trip.id}`)}
                      className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      <HiCheck className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {}}
                      className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <HiXMark className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trip List */}
      {trips.length === 0 && pendingInvites.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">🧳</span>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            No trips yet
          </h2>
          <p className="text-gray-500 mb-6">
            Create a trip or join one with an invite code to get started.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <HiPlus className="w-5 h-5" />
            Create Trip
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => router.push(`/trip?id=${trip.id}`)}
              className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-indigo-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{trip.emoji || "🏖️"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {trip.name}
                  </p>
                  {trip.address && (
                    <p className="text-sm text-gray-500 truncate flex items-center gap-1 mt-0.5">
                      <HiMapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {trip.address}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {formatDateRange(trip) && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <HiCalendarDays className="w-3.5 h-3.5" />
                        {formatDateRange(trip)}
                      </span>
                    )}
                    {trip.memberIds.length > 0 && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <HiUserGroup className="w-3.5 h-3.5" />
                        {trip.memberIds.length} {trip.memberIds.length === 1 ? "member" : "members"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FAB */}
      {trips.length > 0 && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
        >
          <HiPlus className="w-7 h-7" />
        </button>
      )}

      {/* Create Trip Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Trip"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trip Name
            </label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g., Beach Weekend"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pick an Emoji
            </label>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl p-2 rounded-lg transition-all ${
                    selectedEmoji === emoji
                      ? "bg-indigo-100 ring-2 ring-indigo-500 scale-110"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleCreateTrip}
            disabled={!tripName.trim() || creating}
            className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? "Creating..." : "Create Trip"}
          </button>
        </div>
      </Modal>

      {/* Join by Code Modal */}
      <Modal
        open={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setInviteCode("");
          setJoinError("");
        }}
        title="Join by Code"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => {
                let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
                if (val.length === 4 && !val.includes("-")) {
                  val = val + "-";
                }
                if (val.length > 9) val = val.slice(0, 9);
                setInviteCode(val);
              }}
              placeholder="XXXX-XXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              maxLength={9}
            />
          </div>
          {joinError && (
            <p className="text-sm text-red-600">{joinError}</p>
          )}
          <button
            onClick={handleJoinByCode}
            disabled={inviteCode.length < 9 || joining}
            className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {joining ? "Joining..." : "Join Trip"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
