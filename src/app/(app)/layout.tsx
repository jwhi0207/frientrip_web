"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  HiHome,
  HiUserCircle,
  HiArrowRightOnRectangle,
} from "react-icons/hi2";

const navItems = [
  { href: "/trips", label: "Trips", icon: HiHome },
  { href: "/profile", label: "Profile", icon: HiUserCircle },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600">Frientrip</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition w-full"
          >
            <HiArrowRightOnRectangle className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between md:px-6 md:py-4">
          <h1 className="text-lg font-bold text-indigo-600 md:hidden">Frientrip</h1>
          <h1 className="hidden md:block text-lg font-semibold text-gray-800">
            {navItems.find((item) => pathname.startsWith(item.href))?.label || "Frientrip"}
          </h1>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700 transition md:flex items-center gap-2 text-sm"
            title="Logout"
          >
            <HiArrowRightOnRectangle className="w-5 h-5" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex md:hidden z-10">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                isActive ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? "text-indigo-600" : ""}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
