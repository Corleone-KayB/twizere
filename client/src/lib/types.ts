// Types mirrored exactly from the Twizere API contract (camelCase JSON on the wire).
// Keep this file in sync with the backend — every fetch call's request/response
// shape should trace back to a type declared here.

export type Signal = "pos" | "neu" | "neg";

export type Telco = "MTN" | "AIRTEL";

export type LoanStatus =
  | "pending_review"
  | "approved"
  | "disbursed"
  | "repaying"
  | "closed"
  | "declined"
  | "defaulted";

export type Band = "LOW" | "MEDIUM" | "HIGH";

export type Recommendation = "APPROVE" | "REVIEW" | "DECLINE";

export interface Evidence {
  label: string;
  detail: string;
  signal: Signal;
}

export interface SampleTxn {
  month: number;
  label: string;
  dir: "in" | "out";
  cat: string;
  amt: number;
  flag?: boolean;
}

export interface ScheduleInstallment {
  n: number;
  amount: number;
  status: "pending" | "paid";
  label: string;
}

export interface Loan {
  id: string;
  applicantName: string;
  phone: string;
  telco: Telco;
  requestedAmount: number;
  status: LoanStatus;
  band: Band;
  recommendation: Recommendation;
  score: number;
  affordableInstallment: number;
  maxAmount: number;
  evidence: Evidence[];
  monthly: number[];
  sampleTxns: SampleTxn[];
  schedule: ScheduleInstallment[];
  officerName: string | null;
  officerReason: string | null;
  sample: boolean;
  requestedAt: string;
  decisionAt: string | null;
  disbursedAt: string | null;
  closedAt: string | null;
}

// ---------- request/response payload shapes ----------

export interface PrequalifyRequest {
  name: string;
  phone: string;
  telco: Telco;
}

export interface PrequalifyResponse {
  band: Band;
  recommendation: Recommendation;
  score: number;
  affordableInstallment: number;
  maxAmount: number;
  evidence: Evidence[];
  monthly: number[];
}

export interface CreateLoanRequest {
  name: string;
  phone: string;
  telco: Telco;
  requestedAmount: number;
}

export interface DecisionRequest {
  officerName: string;
  decision: "approved" | "declined";
  reason: string;
}

export interface RepayRequest {
  installmentIndex: 0 | 1 | 2;
}

// ---------- WebSocket messages ----------

export interface LoanSocketMessage {
  type: "loan_created" | "loan_updated";
  loan: Loan;
}

// ---------- applicant-side transient state (sessionStorage) ----------

export interface ApplicantInfo {
  name: string;
  phone: string;
  telco: Telco;
}
