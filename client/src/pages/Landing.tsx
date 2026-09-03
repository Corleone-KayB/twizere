import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApplicant } from "../context/ApplicantContext";
import type { Telco } from "../lib/types";

export function Landing() {
  const navigate = useNavigate();
  const { setApplicant } = useApplicant();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [telco, setTelco] = useState<Telco | null>(null);

  const canContinue = name.trim().length > 1 && phone.replace(/\D/g, "").length >= 8 && !!telco;

  function handleContinue() {
    if (!canContinue || !telco) return;
    setApplicant({ name: name.trim(), phone: phone.trim(), telco });
    navigate("/apply/consent");
  }

  return (
    <section className="step">
      <div className="card step-card">
        <div className="eyebrow step-eyebrow">GET A DECISION IN MINUTES</div>
        <h2>Borrow against your own MoMo history</h2>
        <p className="lede">
          Twizere reads your consented MTN MoMo or Airtel Money transactions to show what a bank
          can safely lend you — before you fill in a single paper form.
        </p>

        <div className="field">
          <label htmlFor="inName">Your name</label>
          <input
            id="inName"
            type="text"
            placeholder="e.g. Alphonsine Uwase"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="inPhone">Phone number</label>
          <input
            id="inPhone"
            type="tel"
            placeholder="078X XXX XXX"
            autoComplete="off"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Wallet</label>
          <div className="telco-row">
            <button
              type="button"
              className={`telco-btn ${telco === "MTN" ? "selected" : ""}`}
              data-telco="MTN"
              onClick={() => setTelco("MTN")}
            >
              <span className="sw" />
              MTN MoMo
            </button>
            <button
              type="button"
              className={`telco-btn ${telco === "AIRTEL" ? "selected" : ""}`}
              data-telco="AIRTEL"
              onClick={() => setTelco("AIRTEL")}
            >
              <span className="sw" />
              Airtel Money
            </button>
          </div>
        </div>
        <button
          className="btn btn-primary btn-block"
          disabled={!canContinue}
          type="button"
          onClick={handleContinue}
        >
          Continue
        </button>
      </div>
    </section>
  );
}
