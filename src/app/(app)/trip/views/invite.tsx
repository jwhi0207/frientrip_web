"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeToTrip,
  inviteMemberByEmail,
  updateTrip,
  removePendingInviteEmail,
} from "@/lib/repositories";
import { Trip } from "@/lib/models";
import {
  HiEnvelope,
  HiPaperAirplane,
  HiXMark,
  HiClipboard,
  HiLink,
  HiLockClosed,
  HiLockOpen,
  HiExclamationTriangle,
} from "react-icons/hi2";

export default function InviteView() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id") ?? "";
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [email, setEmail] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsub = subscribeToTrip(tripId, (data: Trip | null) => setTrip(data));
    return () => unsub();
  }, [tripId]);

  const isOwner = trip?.ownerId === user?.uid;

  const handleSendInvite = async () => {
    if (!email.trim() || sending) return;
    setSending(true);
    try {
      await inviteMemberByEmail(tripId, email.trim());
      setEmail("");
    } finally {
      setSending(false);
    }
  };

  const handleRemovePendingEmail = async (emailToRemove: string) => {
    await removePendingInviteEmail(tripId, emailToRemove);
  };

  const handleToggleInviteCode = async () => {
    if (!trip) return;
    await updateTrip(tripId, {
      inviteCodeEnabled: !trip.inviteCodeEnabled,
    });
  };

  const handleCopyCode = async () => {
    if (!trip?.inviteCode) return;
    await navigator.clipboard.writeText(trip.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    if (!trip?.inviteCode) return;
    const link = `${window.location.origin}/join?code=${trip.inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!trip) return null;

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <HiExclamationTriangle className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">
          Only the trip owner can manage invites
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Invite by Email */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Invite by Email
        </h3>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <HiEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
              placeholder="friend@example.com"
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            onClick={handleSendInvite}
            disabled={!email.trim() || sending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <HiPaperAirplane className="w-4 h-4" />
            Send
          </button>
        </div>

        {/* Pending Invites */}
        {trip.pendingInviteEmails && trip.pendingInviteEmails.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Pending Invites
            </p>
            <div className="space-y-2">
              {trip.pendingInviteEmails.map((pendingEmail) => (
                <div
                  key={pendingEmail}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <span className="text-sm text-gray-700">{pendingEmail}</span>
                  <button
                    onClick={() => handleRemovePendingEmail(pendingEmail)}
                    className="rounded-lg p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Cancel invite"
                  >
                    <HiXMark className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Invite Code */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Invite Code
          </h3>
          <button
            onClick={handleToggleInviteCode}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              trip.inviteCodeEnabled
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {trip.inviteCodeEnabled ? (
              <>
                <HiLockOpen className="w-3.5 h-3.5" />
                Enabled
              </>
            ) : (
              <>
                <HiLockClosed className="w-3.5 h-3.5" />
                Disabled
              </>
            )}
          </button>
        </div>

        {trip.inviteCodeEnabled && trip.inviteCode && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <span className="flex-1 text-center text-2xl font-mono font-bold tracking-widest text-gray-900">
                {trip.inviteCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                title="Copy code"
              >
                <HiClipboard className="w-5 h-5" />
              </button>
            </div>
            {copiedCode && (
              <p className="text-xs text-green-600 text-center">
                Code copied to clipboard!
              </p>
            )}

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <HiLink className="w-4 h-4" />
              {copiedLink ? "Link Copied!" : "Copy Share Link"}
            </button>
          </div>
        )}

        {!trip.inviteCodeEnabled && (
          <p className="text-sm text-gray-500 text-center py-4">
            Enable the invite code to allow others to join with a code or link.
          </p>
        )}
      </section>
    </div>
  );
}
