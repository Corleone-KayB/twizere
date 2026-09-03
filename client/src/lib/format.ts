import type { Band, LoanStatus, Recommendation, Signal } from "./types";

export function fmtRWF(n: number): string {
  try {
    return "RWF " + new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 }).format(n);
  } catch {
    return "RWF " + Math.round(n);
  }
}

export function maskPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 6) return phone || "07•• ••• •••";
  return digits.slice(0, 3) + "•• ••• " + digits.slice(-3);
}

export function fmtDate(ts: string | number | null | undefined): string {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export const STATE_LABELS: Record<LoanStatus | "requested" | "scored", string> = {
  requested: "Requested",
  scored: "Scored",
  pending_review: "Pending review",
  approved: "Approved",
  disbursed: "Disbursed",
  repaying: "Repaying",
  closed: "Closed",
  declined: "Declined",
  defaulted: "Defaulted",
};

export function telcoLabel(telco: "MTN" | "AIRTEL"): string {
  return telco === "MTN" ? "MTN MoMo" : "Airtel Money";
}

export function bandPillClass(band: Band): "pos" | "neu" | "neg" {
  return band === "LOW" ? "pos" : band === "MEDIUM" ? "neu" : "neg";
}

export function statusPillClass(status: LoanStatus): "pos" | "neu" | "neg" {
  if (["closed", "approved", "disbursed", "repaying"].includes(status)) return "pos";
  if (status === "pending_review") return "neu";
  return "neg";
}

export function recPillClass(rec: Recommendation): "pos" | "neu" | "neg" {
  return rec === "APPROVE" ? "pos" : rec === "REVIEW" ? "neu" : "neg";
}

export function signalPillClass(signal: Signal): "pos" | "neu" | "neg" {
  return signal;
}
