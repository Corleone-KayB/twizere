import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import {
  fmtDate,
  fmtRWF,
  recPillClass,
  statusPillClass,
  STATE_LABELS,
  telcoLabel,
  maskPhone,
} from "../lib/format";
import { EvidenceTable } from "../components/EvidenceTable";
import { Sparkline } from "../components/Sparkline";
import { ScheduleList } from "../components/ScheduleList";
import { LoadingState } from "../components/LoadingState";
import { ErrorState, InlineAlert } from "../components/ErrorState";
import { useLoansSocket } from "../hooks/useLoansSocket";
import type { Loan, LoanSocketMessage } from "../lib/types";

const DEFAULT_OFFICER_NAME = "K. Uwase — Loan Officer";

export function LoanDetail() {
  const { loanId } = useParams<{ loanId: string }>();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoan = useCallback(() => {
    if (!loanId) return;
    setLoading(true);
    setError(null);
    api
      .getLoan(loanId)
      .then(setLoan)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load this application.");
      })
      .finally(() => setLoading(false));
  }, [loanId]);

  useEffect(() => {
    fetchLoan();
  }, [fetchLoan]);

  const handleSocketMessage = useCallback(
    (msg: LoanSocketMessage) => {
      if (msg.loan.id === loanId) setLoan(msg.loan);
    },
    [loanId]
  );
  useLoansSocket(handleSocketMessage);

  if (loading) return <LoadingState label="Loading application…" />;
  if (error && !loan) return <ErrorState message={error} onRetry={fetchLoan} />;
  if (!loan) return <ErrorState message="Application not found." />;

  return (
    <div>
      <Link to="/dashboard" className="back-link">
        ← Back to queue
      </Link>

      {error && <InlineAlert message={error} />}

      <div className="detail-head">
        <div>
          <h2>{loan.applicantName}</h2>
          <div className="sub">
            {maskPhone(loan.phone)} · {telcoLabel(loan.telco)} · submitted {fmtDate(loan.requestedAt)}
            {loan.sample ? " · sample application" : ""}
          </div>
        </div>
        <span className={`pill ${statusPillClass(loan.status)}`}>
          {STATE_LABELS[loan.status].toUpperCase()}
        </span>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="val">{loan.band}</div>
          <div className="lbl">Risk band</div>
        </div>
        <div className="kpi">
          <div className="val">{fmtRWF(loan.requestedAmount)}</div>
          <div className="lbl">Requested</div>
        </div>
        <div className="kpi">
          <div className="val">{fmtRWF(loan.affordableInstallment)}/mo</div>
          <div className="lbl">Max affordable installment</div>
        </div>
        <div className="kpi">
          <div className="val">{fmtRWF(loan.maxAmount)}</div>
          <div className="lbl">Pre-qualified limit</div>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="panel-title">Evidence</div>
          <EvidenceTable evidence={loan.evidence} />

          <div className="panel-title">Monthly net inflow (12mo)</div>
          <div className="spark-wrap">
            <Sparkline monthly={loan.monthly} />
          </div>

          <div className="panel-title">Recent transactions</div>
          <div className="txn-list">
            {loan.sampleTxns.length === 0 ? (
              <div className="txn-row">
                <span className="cat">No sample transactions stored</span>
              </div>
            ) : (
              [...loan.sampleTxns]
                .reverse()
                .map((t, i) => (
                  <div className="txn-row" key={i}>
                    <span className="cat">
                      {t.label} · {t.cat}
                      {t.flag ? " ⚠" : ""}
                    </span>
                    <span className={`amt ${t.dir === "in" ? "in" : "out"}`}>
                      {t.dir === "in" ? "+" : "−"}
                      {fmtRWF(t.amt)}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>

        <div>
          <div className="panel-title">Decision</div>
          <DecisionBox loan={loan} onLoanChange={setLoan} onError={setError} />
        </div>
      </div>
    </div>
  );
}

function DecisionBox({
  loan,
  onLoanChange,
  onError,
}: {
  loan: Loan;
  onLoanChange: (loan: Loan) => void;
  onError: (message: string | null) => void;
}) {
  const recNote = (
    <div className="rec-line">
      <span className={`pill ${recPillClass(loan.recommendation)}`}>
        MODEL RECOMMENDS: {loan.recommendation}
      </span>
    </div>
  );

  if (loan.status === "pending_review") {
    return <PendingReviewBox loan={loan} recNote={recNote} onLoanChange={onLoanChange} onError={onError} />;
  }

  if (loan.status === "approved") {
    return (
      <ApprovedBox loan={loan} recNote={recNote} onLoanChange={onLoanChange} onError={onError} />
    );
  }

  if (loan.status === "disbursed" || loan.status === "repaying") {
    return <ActiveScheduleBox loan={loan} onLoanChange={onLoanChange} onError={onError} />;
  }

  if (loan.status === "closed") {
    return (
      <div className="decision-box">
        <h3>Closed</h3>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
          Fully repaid on {fmtDate(loan.closedAt)}. This outcome now strengthens the model's
          training data.
        </p>
      </div>
    );
  }

  if (loan.status === "declined") {
    return (
      <div className="decision-box">
        {recNote}
        <h3>Declined</h3>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
          {loan.officerReason || "No notes recorded."}
        </p>
      </div>
    );
  }

  // defaulted
  return (
    <div className="decision-box">
      <h3>Defaulted</h3>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
        Repayment stalled after disbursement. Outcome recorded for the scoring model.
      </p>
    </div>
  );
}

function PendingReviewBox({
  loan,
  recNote,
  onLoanChange,
  onError,
}: {
  loan: Loan;
  recNote: ReactNode;
  onLoanChange: (loan: Loan) => void;
  onError: (message: string | null) => void;
}) {
  const [officerName, setOfficerName] = useState(DEFAULT_OFFICER_NAME);
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [busy, setBusy] = useState<"approved" | "declined" | null>(null);

  const reasonInvalid = reasonTouched && reason.trim().length === 0;

  async function decide(decision: "approved" | "declined") {
    if (decision === "declined" && !reason.trim()) {
      setReasonTouched(true);
      return;
    }
    setBusy(decision);
    onError(null);
    try {
      const updated = await api.decide(loan.id, {
        officerName: officerName.trim() || DEFAULT_OFFICER_NAME,
        decision,
        reason: reason.trim(),
      });
      onLoanChange(updated);
    } catch (err) {
      onError(
        err instanceof ApiError ? err.message : "Could not record that decision. Please try again."
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="decision-box">
      {recNote}
      <h3>Review &amp; decide</h3>
      <div className="field">
        <label htmlFor="officerName">Officer</label>
        <input
          id="officerName"
          type="text"
          value={officerName}
          onChange={(e) => setOfficerName(e.target.value)}
        />
      </div>
      <div className={`field ${reasonInvalid ? "invalid" : ""}`}>
        <label htmlFor="officerReason">Notes (required to decline)</label>
        <textarea
          id="officerReason"
          placeholder="Reasoning for the record…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setReasonTouched(true)}
        />
        {reasonInvalid && <div className="field-error">A reason is required to decline.</div>}
      </div>
      <div className="btn-row">
        <button
          className="btn btn-approve"
          type="button"
          disabled={busy !== null}
          onClick={() => decide("approved")}
        >
          {busy === "approved" ? "Approving…" : "Approve"}
        </button>
        <button
          className="btn btn-decline"
          type="button"
          disabled={busy !== null}
          onClick={() => decide("declined")}
        >
          {busy === "declined" ? "Declining…" : "Decline"}
        </button>
      </div>
    </div>
  );
}

function ApprovedBox({
  loan,
  recNote,
  onLoanChange,
  onError,
}: {
  loan: Loan;
  recNote: ReactNode;
  onLoanChange: (loan: Loan) => void;
  onError: (message: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDisburse() {
    setBusy(true);
    onError(null);
    try {
      const updated = await api.disburse(loan.id);
      onLoanChange(updated);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not disburse this loan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="decision-box">
      {recNote}
      <h3>Ready to disburse</h3>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 0 }}>
        Approved by {loan.officerName || "officer"}. Send funds to the applicant's wallet to open
        the loan account.
      </p>
      <div className="btn-row">
        <button className="btn btn-gold" type="button" disabled={busy} onClick={handleDisburse}>
          {busy ? "Disbursing…" : "Disburse now"}
        </button>
      </div>
    </div>
  );
}

function ActiveScheduleBox({
  loan,
  onLoanChange,
  onError,
}: {
  loan: Loan;
  onLoanChange: (loan: Loan) => void;
  onError: (message: string | null) => void;
}) {
  const [payingIndex, setPayingIndex] = useState<number | null>(null);

  async function handlePay(idx: number) {
    setPayingIndex(idx);
    onError(null);
    try {
      const updated = await api.repay(loan.id, { installmentIndex: idx as 0 | 1 | 2 });
      onLoanChange(updated);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not record that payment.");
    } finally {
      setPayingIndex(null);
    }
  }

  return (
    <div className="decision-box">
      <h3>Repayment progress</h3>
      <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
        Disbursed {loan.disbursedAt ? fmtDate(loan.disbursedAt) : ""}.
      </p>
      <ScheduleList
        schedule={loan.schedule}
        variant="bank"
        buttonLabel="Mark paid"
        showActions
        payingIndex={payingIndex}
        onPay={handlePay}
      />
    </div>
  );
}
