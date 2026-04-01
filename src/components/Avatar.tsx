"use client";

import { AVATAR_COLORS } from "@/lib/models";

interface AvatarProps {
  displayName: string;
  avatarColor: number;
  size?: "sm" | "md" | "lg";
}

export default function Avatar({ displayName, avatarColor, size = "md" }: AvatarProps) {
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const color = AVATAR_COLORS[avatarColor % AVATAR_COLORS.length];
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
