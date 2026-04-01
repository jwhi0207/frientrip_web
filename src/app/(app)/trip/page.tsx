"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import TripDashboardPage from "./views/dashboard";
import HouseDetailsPage from "./views/house-details";
import SuppliesPage from "./views/supplies";
import CarpoolPage from "./views/carpool";
import ExpensesPage from "./views/expenses";
import InvitePage from "./views/invite";
import ManageGroupPage from "./views/manage";
import MemberPaymentPage from "./views/member-payment";
import HistoryPage from "./views/history";
import LoadingSpinner from "@/components/LoadingSpinner";
import { HiArrowLeft } from "react-icons/hi2";

const VIEW_MAP: Record<string, React.ComponentType> = {
  "": TripDashboardPage,
  "house-details": HouseDetailsPage,
  supplies: SuppliesPage,
  carpool: CarpoolPage,
  expenses: ExpensesPage,
  invite: InvitePage,
  manage: ManageGroupPage,
  "member-payment": MemberPaymentPage,
  history: HistoryPage,
};

function TripPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tripId = searchParams.get("id") ?? "";
  const view = searchParams.get("view") ?? "";

  if (!tripId) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No trip selected.</p>
      </div>
    );
  }

  const Component = VIEW_MAP[view];

  if (!Component) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Page not found.</p>
      </div>
    );
  }

  return (
    <div>
      {view && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <button
            onClick={() => router.push(`/trip?id=${tripId}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors mb-2"
          >
            <HiArrowLeft className="w-4 h-4" />
            Back to Trip
          </button>
        </div>
      )}
      <Component />
    </div>
  );
}

export default function TripPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TripPageContent />
    </Suspense>
  );
}
