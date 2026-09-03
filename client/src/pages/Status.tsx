import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { fmtDate, fmtRWF, telcoLabel } from "../lib/format";
import { Stepper } from "../components/Stepper";
import { ScheduleList } from "../components/ScheduleList";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { useLoansSocket } from "../hooks/useLoansSocket";
import type { Loan, LoanSocketMessage } from "../lib/types";

export function Status() {
  const { loanId } = useParams<{ loanId: string }>();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingIndex, setPayingIndex] = useState<number | null>(null);

  const fetchLoan = useCallback(() => {
    if (!loanId) return;
    setLoading(true);
    setError(null);
    api
      .getLoan(loanId)
      .then(setLoan)
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Could not load your application right now."
        );
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

  async function handlePay(idx: number) {
    if (!loan) return;
    setPayingIndex(idx);
    try {
      const updated = await api.repay(loan.id, { installmentIndex: idx as 0 | 1 | 2 });
      setLoan(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not record that payment. Please try again."
      );
    } finally {
      setPayingIndex(null);
    }
  }

  if (loading) return <LoadingState label="Loading your application…" />;
  if (error && !loan) return <ErrorState message={error} onRetry={fetchLoan} />;
  if (!loan) return <ErrorState message="Application not found." />;

  return (
    <section className="step">
      <div className="card step-card">
        <div className="eyebrow step-eyebrow">YOUR APPLICATION</div>
        <h2 style={{ marginBottom: 20 }}>{fmtRWF(loan.requestedAmount)} requested</h2>
        <Stepper status={loan.status} />
        {error && (
          <div className="alert" role="alert">
            <p>{error}</p>
          </div>
        )}
        <StatusPanel loan={loan} payingIndex={payingIndex} onPay={handlePay} />
      </div>
    </section>
  );
}

function StatusPanel({
  loan,
  payingIndex,
  onPay,
}: {
  loan: Loan;
  payingIndex: number | null;
  onPay: (idx: number) => void;
}) {
  if (loan.status === "pending_review") {
    return (
      <div className="status-panel">
        <h3>An officer is reviewing your application</h3>
        <p>You'll see this update the moment a decision is made — no need to refresh.</p>
      </div>
    );
  }

  if (loan.status === "declined") {
    const weak = loan.evidence.filter((e) => e.signal === "neg").slice(0, 2);
    return (
      <div className="status-panel">
        <h3>Not approved this time</h3>
        <p>{loan.officerReason ? loan.officerReason : "The officer's notes are below."}</p>
        {weak.length > 0 && (
          <ul>
            {weak.map((e, i) => (
              <li key={i}>
                {e.label}: {e.detail}
              </li>
            ))}
          </ul>
        )}
        <p style={{ marginTop: 10 }}>
          You're welcome to reapply once your MoMo activity changes — Twizere re-scores fresh
          each time.
        </p>
      </div>
    );
  }

  if (loan.status === "approved") {
    return (
      <div className="status-panel">
        <h3>Approved</h3>
        <p>
          Your loan of {fmtRWF(loan.requestedAmount)} is being prepared for disbursement to your{" "}
          {telcoLabel(loan.telco)} wallet.
        </p>
      </div>
    );
  }

  if (loan.status === "disbursed" || loan.status === "repaying" || loan.status === "closed") {
    const head = loan.status === "closed" ? "Fully repaid" : "Funds disbursed";
    const sub =
      loan.status === "closed"
        ? "Nice work — this repayment history will strengthen your next application."
        : `${fmtRWF(loan.requestedAmount)} was sent to your wallet${
            loan.disbursedAt ? " on " + fmtDate(loan.disbursedAt) : ""
          }.`;
    return (
      <div className="status-panel">
        <h3>{head}</h3>
        <p>{sub}</p>
        <ScheduleList
          schedule={loan.schedule}
          variant="applicant"
          buttonLabel="Simulate: I paid this"
          showActions={loan.status !== "closed"}
          payingIndex={payingIndex}
          onPay={onPay}
        />
      </div>
    );
  }

  if (loan.status === "defaulted") {
    return (
      <div className="status-panel">
        <h3>Repayment stalled</h3>
        <p>
          Your repayments on this loan fell behind and it's been recorded as defaulted. Contact
          your bank branch to discuss next steps.
        </p>
      </div>
    );
  }

  return null;
}
