import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApplicant } from "../context/ApplicantContext";
import { api, ApiError } from "../lib/api";
import { fmtRWF } from "../lib/format";
import { EvidenceList } from "../components/EvidenceList";
import { InlineAlert } from "../components/ErrorState";

export function Prequalify() {
  const navigate = useNavigate();
  const { applicant, prequalify } = useApplicant();
  const [amount, setAmount] = useState(prequalify?.maxAmount ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!applicant || !prequalify) {
    return <Navigate to="/" replace />;
  }

  const minAmt = Math.min(5000, prequalify.maxAmount);

  async function handleSubmit() {
    if (!applicant) return;
    setSubmitting(true);
    setError(null);
    try {
      const loan = await api.createLoan({
        name: applicant.name,
        phone: applicant.phone,
        telco: applicant.telco,
        requestedAmount: amount,
      });
      navigate(`/apply/status/${loan.id}`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not submit your application. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  }

  const headline = prequalify.maxAmount >= 15000 ? "You're pre-qualified" : "Here's what we can see so far";

  return (
    <section className="step">
      <div className="card step-card">
        <div className="eyebrow step-eyebrow">PRE-QUALIFICATION</div>
        <h2>{headline}</h2>
        <div className="limit-tile">
          <div className="amt mono">{fmtRWF(prequalify.maxAmount)}</div>
          <div className="cap">indicative — not yet a formal offer</div>
        </div>
        <EvidenceList evidence={prequalify.evidence.slice(0, 4)} />

        {error && <InlineAlert message={error} />}

        <div className="field">
          <label htmlFor="amountRange">How much would you like to request?</label>
          <div className="amount-row">
            <input
              type="range"
              id="amountRange"
              min={minAmt}
              max={prequalify.maxAmount}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <span className="amt-display mono">{fmtRWF(amount)}</span>
          </div>
        </div>
        <button
          className="btn btn-gold btn-block"
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting…" : "Request this amount"}
        </button>
      </div>
    </section>
  );
}
