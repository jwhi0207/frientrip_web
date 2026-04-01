"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { subscribeToHistory } from "@/lib/repositories";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  HiBanknotes,
  HiShoppingBag,
  HiCurrencyDollar,
} from "react-icons/hi2";

interface TripHistoryEvent {
  id: string;
  category: "expenses" | "supplies" | "payments";
  description: string;
  timestamp: number;
}

const categoryConfig: Record<
  TripHistoryEvent["category"],
  { icon: typeof HiBanknotes; colorClass: string; bgClass: string }
> = {
  expenses: {
    icon: HiCurrencyDollar,
    colorClass: "text-green-600",
    bgClass: "bg-green-100",
  },
  supplies: {
    icon: HiShoppingBag,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-100",
  },
  payments: {
    icon: HiBanknotes,
    colorClass: "text-yellow-600",
    bgClass: "bg-yellow-100",
  },
};

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

export default function HistoryView() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id") ?? "";

  const [events, setEvents] = useState<TripHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToHistory(tripId, (data: TripHistoryEvent[]) => {
      setEvents(data);
      setLoading(false);
    });
    return () => unsub();
  }, [tripId]);

  const groupedEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
    const groups: { label: string; events: TripHistoryEvent[] }[] = [];

    for (const event of sorted) {
      const date = new Date(event.timestamp);
      const label = getDateLabel(date);
      const existing = groups.find((g) => g.label === label);
      if (existing) {
        existing.events.push(event);
      } else {
        groups.push({ label, events: [event] });
      }
    }

    return groups;
  }, [events]);

  if (loading) return <LoadingSpinner />;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400">
        <HiBanknotes className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">No history yet</p>
        <p className="text-sm">Activity will appear here as it happens.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedEvents.map((group) => (
        <section key={group.label}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {group.label}
          </h3>
          <div className="space-y-2">
            {group.events.map((event) => {
              const config = categoryConfig[event.category];
              const Icon = config.icon;
              const eventDate = new Date(event.timestamp);

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 bg-white rounded-lg border p-3"
                >
                  <div
                    className={`p-2 rounded-full ${config.bgClass} ${config.colorClass}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {event.description}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(eventDate, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
