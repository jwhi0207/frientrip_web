import { TripMember } from "./models";

/**
 * Calculates each member's share of the trip cost based on nights stayed.
 * Matches the Android CostCalculator logic exactly:
 *
 * For each night:
 *   nightly_cost = totalCost / totalNights
 *   For each member present that night:
 *     member_share += nightly_cost / count_of_members_present_that_night
 *
 * Members with nightsStayed=0 owe nothing.
 */
export function calculateMemberShares(
  totalCost: number,
  totalNights: number,
  members: TripMember[]
): Map<string, number> {
  const shares = new Map<string, number>();

  if (totalNights <= 0 || totalCost <= 0 || members.length === 0) {
    members.forEach((m) => shares.set(m.uid, 0));
    return shares;
  }

  // Initialize all members to 0
  members.forEach((m) => shares.set(m.uid, 0));

  const nightlyCost = totalCost / totalNights;

  // For each night, split cost among members present
  for (let night = 1; night <= totalNights; night++) {
    const presentMembers = members.filter(
      (m) => m.status !== "deactivated" && m.nightsStayed >= night
    );

    if (presentMembers.length === 0) continue;

    const perPersonCost = nightlyCost / presentMembers.length;
    presentMembers.forEach((m) => {
      shares.set(m.uid, (shares.get(m.uid) ?? 0) + perPersonCost);
    });
  }

  return shares;
}

/**
 * Calculates how much a member still owes (share - amountPaid).
 */
export function calculateBalance(share: number, amountPaid: number): number {
  return Math.round((share - amountPaid) * 100) / 100;
}
