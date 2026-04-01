"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { updateUserProfile } from "@/lib/repositories";
import { AVATAR_COLORS } from "@/lib/models";
import Avatar from "@/components/Avatar";
import {
  HiArrowRightOnRectangle,
  HiCheck,
  HiArrowPath,
  HiShieldCheck,
} from "react-icons/hi2";

export default function ProfilePage() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState(0);
  const [avatarSeed, setAvatarSeed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setAvatarColor(profile.avatarColor ?? 0);
      setAvatarSeed(profile.avatarSeed ?? 0);
    }
  }, [profile]);

  if (!user || !profile) {
    return null;
  }

  const hasChanges =
    displayName !== (profile.displayName || "") ||
    avatarColor !== (profile.avatarColor ?? 0) ||
    avatarSeed !== (profile.avatarSeed ?? 0);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updates: Partial<{ displayName: string; avatarColor: number; avatarSeed: number }> = {};
      if (displayName !== profile.displayName) updates.displayName = displayName;
      if (avatarColor !== profile.avatarColor) updates.avatarColor = avatarColor;
      if (avatarSeed !== profile.avatarSeed) updates.avatarSeed = avatarSeed;

      if (Object.keys(updates).length > 0) {
        await updateUserProfile(user.uid, updates);
        await refreshProfile();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRandomizeSeed = () => {
    setAvatarSeed(Math.floor(Math.random() * 1000000));
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Avatar & Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center space-y-3">
        <Avatar displayName={displayName || profile.displayName} avatarColor={avatarColor} size="lg" />
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {profile.displayName}
          </p>
          <p className="text-sm text-gray-500">{profile.email || user.email}</p>
          {profile.role === "admin" && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-medium">
              <HiShieldCheck className="text-sm" />
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Edit Display Name */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Your name"
        />
      </div>

      {/* Avatar Color */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Avatar Color
        </label>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
          {AVATAR_COLORS.map((color, index) => (
            <button
              key={color}
              onClick={() => setAvatarColor(index)}
              className={`w-10 h-10 rounded-full transition-all ${
                avatarColor === index
                  ? "ring-2 ring-offset-2 ring-indigo-500 scale-110"
                  : "hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
            >
              {avatarColor === index && (
                <HiCheck className="mx-auto text-white text-lg drop-shadow" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Avatar Seed */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Avatar Style
        </label>
        <button
          onClick={handleRandomizeSeed}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
        >
          <HiArrowPath className="text-base" />
          Randomize Avatar
        </button>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
          saved
            ? "bg-green-600 text-white"
            : hasChanges
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
      >
        <HiArrowRightOnRectangle className="text-lg" />
        Log Out
      </button>
    </div>
  );
}
