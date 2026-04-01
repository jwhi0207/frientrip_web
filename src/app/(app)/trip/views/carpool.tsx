"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeToRides,
  subscribeToRideRequests,
  subscribeToMembers,
  joinRide,
  leaveRide,
  addRide,
  updateRide,
  deleteRide,
  addRideRequest,
  removeRideRequest,
} from "@/lib/repositories";
import { VEHICLE_OPTIONS, Ride, RideRequest, TripMember } from "@/lib/models";
import Modal from "@/components/Modal";
import Avatar from "@/components/Avatar";
import { format } from "date-fns";
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineMapPin,
  HiOutlineClock,
  HiOutlineUserGroup,
  HiOutlineHandRaised,
  HiOutlineXMark,
  HiOutlineArrowRightOnRectangle,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineTruck,
  HiOutlineChatBubbleLeftEllipsis,
} from "react-icons/hi2";

export default function CarpoolView() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id") ?? "";
  const { user, profile } = useAuth();

  const [rides, setRides] = useState<Ride[]>([]);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);

  const [showAddRideModal, setShowAddRideModal] = useState(false);
  const [showEditRideModal, setShowEditRideModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);

  // Add ride form state
  const [selectedVehicle, setSelectedVehicle] = useState<{ emoji: string; label: string }>(
    VEHICLE_OPTIONS[0]
  );
  const [departureLocation, setDepartureLocation] = useState("");
  const [totalSeats, setTotalSeats] = useState("4");
  const [departureTime, setDepartureTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [rideNotes, setRideNotes] = useState("");

  // Edit ride form state
  const [editVehicle, setEditVehicle] = useState<{ emoji: string; label: string }>(
    VEHICLE_OPTIONS[0]
  );
  const [editDepartureLocation, setEditDepartureLocation] = useState("");
  const [editTotalSeats, setEditTotalSeats] = useState("4");
  const [editDepartureTime, setEditDepartureTime] = useState("");
  const [editReturnTime, setEditReturnTime] = useState("");
  const [editRideNotes, setEditRideNotes] = useState("");

  // Request form state
  const [requestNotes, setRequestNotes] = useState("");

  useEffect(() => {
    const unsubRides = subscribeToRides(tripId, (r) => setRides(r));
    const unsubRequests = subscribeToRideRequests(tripId, (r) =>
      setRideRequests(r)
    );
    const unsubMembers = subscribeToMembers(tripId, (m) => setMembers(m));
    return () => {
      unsubRides();
      unsubRequests();
      unsubMembers();
    };
  }, [tripId]);

  const getMemberByUid = (uid: string) => members.find((m) => m.uid === uid);

  const formatTime = (millis: number) => {
    if (!millis) return "";
    return format(new Date(millis), "EEE, MMM d 'at' h:mm a");
  };

  const toDatetimeLocal = (millis: number) => {
    if (!millis) return "";
    return format(new Date(millis), "yyyy-MM-dd'T'HH:mm");
  };

  const hasExistingRequest = user
    ? rideRequests.some((r) => r.uid === user.uid)
    : false;

  // Add ride
  const handleAddRide = async () => {
    if (!user || !profile || !departureLocation.trim()) return;
    await addRide(tripId, {
      driverUid: user.uid,
      driverName: profile.displayName,
      vehicleEmoji: selectedVehicle.emoji,
      vehicleLabel: selectedVehicle.label,
      departureLocation: departureLocation.trim(),
      totalSeats: parseInt(totalSeats) || 4,
      departureTime: departureTime ? new Date(departureTime).getTime() : 0,
      returnTime: returnTime ? new Date(returnTime).getTime() : 0,
      notes: rideNotes.trim(),
      passengerUids: [],
      passengerNames: [],
    });
    resetAddForm();
    setShowAddRideModal(false);
  };

  const resetAddForm = () => {
    setSelectedVehicle(VEHICLE_OPTIONS[0]);
    setDepartureLocation("");
    setTotalSeats("4");
    setDepartureTime("");
    setReturnTime("");
    setRideNotes("");
  };

  // Edit ride
  const openEditRide = (ride: Ride) => {
    setEditingRide(ride);
    const matchedVehicle = (VEHICLE_OPTIONS as readonly { emoji: string; label: string }[]).find(
      (v) => v.emoji === ride.vehicleEmoji && v.label === ride.vehicleLabel
    );
    setEditVehicle(matchedVehicle || VEHICLE_OPTIONS[0]);
    setEditDepartureLocation(ride.departureLocation);
    setEditTotalSeats(String(ride.totalSeats));
    setEditDepartureTime(toDatetimeLocal(ride.departureTime));
    setEditReturnTime(toDatetimeLocal(ride.returnTime));
    setEditRideNotes(ride.notes);
    setShowEditRideModal(true);
  };

  const handleEditRide = async () => {
    if (!editingRide || !editDepartureLocation.trim() || !profile) return;
    await updateRide(tripId, editingRide.id, {
      vehicleEmoji: editVehicle.emoji,
      vehicleLabel: editVehicle.label,
      departureLocation: editDepartureLocation.trim(),
      totalSeats: parseInt(editTotalSeats) || 4,
      departureTime: editDepartureTime ? new Date(editDepartureTime).getTime() : 0,
      returnTime: editReturnTime ? new Date(editReturnTime).getTime() : 0,
      notes: editRideNotes.trim(),
    });
    setShowEditRideModal(false);
    setEditingRide(null);
  };

  const handleDeleteRide = async (ride: Ride) => {
    if (!profile) return;
    await deleteRide(tripId, ride.id);
  };

  // Join / Leave ride
  const handleJoinRide = async (ride: Ride) => {
    if (!user || !profile) return;
    await joinRide(tripId, ride.id, user.uid, profile.displayName);
  };

  const handleLeaveRide = async (ride: Ride) => {
    if (!user || !profile) return;
    await leaveRide(tripId, ride, user.uid);
  };

  // Ride requests
  const handleAddRequest = async () => {
    if (!user || !profile) return;
    await addRideRequest(tripId, {
      uid: user.uid,
      displayName: profile.displayName,
      notes: requestNotes.trim(),
    });
    setRequestNotes("");
    setShowRequestModal(false);
  };

  const handleCancelRequest = async () => {
    if (!user || !profile) return;
    await removeRideRequest(tripId, user.uid);
  };

  return (
    <div className="space-y-6">
      {/* Rides Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <HiOutlineTruck className="w-5 h-5" />
            Rides
          </h2>
          <button
            onClick={() => setShowAddRideModal(true)}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Offer Ride
          </button>
        </div>

        {rides.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <HiOutlineTruck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No rides offered yet.</p>
            <p className="text-xs text-gray-400 mt-1">Be the first to offer a ride!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((ride) => {
              const isDriver = user?.uid === ride.driverUid;
              const isPassenger = user ? ride.passengerUids.includes(user.uid) : false;
              const seatsFilled = ride.passengerUids.length;
              const seatsAvailable = ride.totalSeats - seatsFilled;

              return (
                <div
                  key={ride.id}
                  className="rounded-xl bg-white border border-gray-200 p-4 space-y-3"
                >
                  {/* Header: vehicle + driver */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{ride.vehicleEmoji}</span>
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {ride.vehicleLabel}
                        </span>
                        <p className="text-xs text-gray-500">
                          Driven by {ride.driverName}
                        </p>
                      </div>
                    </div>
                    {isDriver && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditRide(ride)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRide(ride)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-sm text-gray-600">
                    {ride.departureLocation && (
                      <div className="flex items-center gap-2">
                        <HiOutlineMapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{ride.departureLocation}</span>
                      </div>
                    )}
                    {ride.departureTime > 0 && (
                      <div className="flex items-center gap-2">
                        <HiOutlineClock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>Depart: {formatTime(ride.departureTime)}</span>
                      </div>
                    )}
                    {ride.returnTime > 0 && (
                      <div className="flex items-center gap-2">
                        <HiOutlineClock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>Return: {formatTime(ride.returnTime)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <HiOutlineUserGroup className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>
                        {seatsFilled}/{ride.totalSeats} seats filled
                      </span>
                    </div>
                  </div>

                  {/* Passengers */}
                  {ride.passengerUids.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ride.passengerUids.map((uid, idx) => {
                        const member = getMemberByUid(uid);
                        const name = member?.displayName || ride.passengerNames[idx] || "Unknown";
                        const color = member?.avatarColor ?? 0;
                        return (
                          <div key={uid} className="flex items-center gap-1">
                            <Avatar displayName={name} avatarColor={color} size="sm" />
                            <span className="text-xs text-gray-600">{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Notes */}
                  {ride.notes && (
                    <div className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-2">
                      <HiOutlineChatBubbleLeftEllipsis className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{ride.notes}</span>
                    </div>
                  )}

                  {/* Actions */}
                  {!isDriver && (
                    <div>
                      {isPassenger ? (
                        <button
                          onClick={() => handleLeaveRide(ride)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <HiOutlineArrowLeftOnRectangle className="w-4 h-4" />
                          Leave Ride
                        </button>
                      ) : seatsAvailable > 0 ? (
                        <button
                          onClick={() => handleJoinRide(ride)}
                          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                          Join Ride
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">No seats available</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Need a Ride Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <HiOutlineHandRaised className="w-5 h-5" />
            Need a Ride
          </h2>
          {!hasExistingRequest ? (
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Request Ride
            </button>
          ) : (
            <button
              onClick={handleCancelRequest}
              className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <HiOutlineXMark className="w-4 h-4" />
              Cancel Request
            </button>
          )}
        </div>

        {rideRequests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No ride requests at the moment.
          </p>
        ) : (
          <div className="space-y-2">
            {rideRequests.map((req) => {
              const member = getMemberByUid(req.uid);
              return (
                <div
                  key={req.uid}
                  className="flex items-center gap-3 rounded-xl bg-white border border-gray-200 p-3"
                >
                  <Avatar
                    displayName={req.displayName}
                    avatarColor={member?.avatarColor ?? 0}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{req.displayName}</p>
                    {req.notes && (
                      <p className="text-xs text-gray-500 truncate">{req.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Ride Modal */}
      <Modal
        open={showAddRideModal}
        onClose={() => setShowAddRideModal(false)}
        title="Offer a Ride"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select
              value={`${selectedVehicle.emoji}|${selectedVehicle.label}`}
              onChange={(e) => {
                const [emoji, label] = e.target.value.split("|");
                setSelectedVehicle({ emoji, label });
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {(VEHICLE_OPTIONS as readonly { emoji: string; label: string }[]).map((v) => (
                <option key={`${v.emoji}|${v.label}`} value={`${v.emoji}|${v.label}`}>
                  {v.emoji} {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departure Location
            </label>
            <input
              type="text"
              value={departureLocation}
              onChange={(e) => setDepartureLocation(e.target.value)}
              placeholder="e.g. Downtown parking lot"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Seats</label>
            <input
              type="number"
              min="1"
              value={totalSeats}
              onChange={(e) => setTotalSeats(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departure Time</label>
            <input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Return Time</label>
            <input
              type="datetime-local"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={rideNotes}
              onChange={(e) => setRideNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowAddRideModal(false)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRide}
              disabled={!departureLocation.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Offer Ride
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Ride Modal */}
      <Modal
        open={showEditRideModal}
        onClose={() => setShowEditRideModal(false)}
        title="Edit Ride"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select
              value={`${editVehicle.emoji}|${editVehicle.label}`}
              onChange={(e) => {
                const [emoji, label] = e.target.value.split("|");
                setEditVehicle({ emoji, label });
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {(VEHICLE_OPTIONS as readonly { emoji: string; label: string }[]).map((v) => (
                <option key={`${v.emoji}|${v.label}`} value={`${v.emoji}|${v.label}`}>
                  {v.emoji} {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departure Location
            </label>
            <input
              type="text"
              value={editDepartureLocation}
              onChange={(e) => setEditDepartureLocation(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Seats</label>
            <input
              type="number"
              min="1"
              value={editTotalSeats}
              onChange={(e) => setEditTotalSeats(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departure Time</label>
            <input
              type="datetime-local"
              value={editDepartureTime}
              onChange={(e) => setEditDepartureTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Return Time</label>
            <input
              type="datetime-local"
              value={editReturnTime}
              onChange={(e) => setEditReturnTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={editRideNotes}
              onChange={(e) => setEditRideNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowEditRideModal(false)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditRide}
              disabled={!editDepartureLocation.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Request Ride Modal */}
      <Modal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Request a Ride"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              placeholder="Where are you coming from, preferred times, etc."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowRequestModal(false)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRequest}
              className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              Submit Request
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
