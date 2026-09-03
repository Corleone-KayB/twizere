import type { Loan, LoanStatus } from "./types";

export type FilterKey = "all" | "pending_review" | "active" | "closed" | "declined" | "defaulted";

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_review", label: "Pending review" },
  { key: "active", label: "Active loans" },
  { key: "closed", label: "Closed" },
  { key: "declined", label: "Declined" },
  { key: "defaulted", label: "Defaulted" },
];

const ACTIVE_STATUSES: LoanStatus[] = ["approved", "disbursed", "repaying"];

export function matchesFilter(loan: Loan, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "active") return ACTIVE_STATUSES.includes(loan.status);
  return loan.status === filter;
}

export function isActiveStatus(status: LoanStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}
