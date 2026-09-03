import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApplicant } from "../context/ApplicantContext";
import { api, ApiError } from "../lib/api";
import { telcoLabel } from "../lib/format";
import { InlineAlert } from "../components/ErrorState";

const ANALYZING_LINES = [
  "Connecting to telco API…",
  "Pulling 12 months of transactions…",
  "Normalizing transaction categories…",
  "Running risk scorecard…",
];

const PIN_KEYS: { k: string; label: string; wide?: boolean }[] = [
  { k: "1", label: "1" },
  { k: "2", label: "2" },
  { k: "3", label: "3" },
  { k: "4", label: "4" },
  { k: "5", label: "5" },
  { k: "6", label: "6" },
  { k: "7", label: "7" },
  { k: "8", label: "8" },
  { k: "9", label: "9" },
  { k: "clear", label: "CLEAR", wide: true },
  { k: "0", label: "0" },
  { k: "back", label: "←", wide: true },
];

export function Consent() {
  const navigate = useNavigate();
  const { applicant, setPrequalify } = useApplicant();
  const [pin, setPin] = useState("");
  const [phase, setPhase] = useState<"pin" | "analyzing">("pin");
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  if (!applicant) {
    // No in-progress applicant state (e.g. direct link, refresh after clearing storage).
    return <Navigate to="/" replace />;
  }

  function handleKey(k: string) {
    if (phase !== "pin") return;
    if (k === "clear") {
      setPin("");
      return;
    }
    if (k === "back") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      timers.current.push(setTimeout(runAnalysis, 260));
    }
  }

  async function runAnalysis() {
    setError(null);
    setPhase("analyzing");
    setVisibleLines([]);
    ANALYZING_LINES.forEach((line, i) => {
      timers.current.push(
        setTimeout(() => {
          setVisibleLines((prev) => [...prev, line]);
        }, 220 * i)
      );
    });

    const minDelay = new Promise((resolve) =>
      timers.current.push(setTimeout(resolve, 220 * ANALYZING_LINES.length + 260))
    );

    if (!applicant) return;

    try {
      const [result] = await Promise.all([
        api.prequalify({ name: applicant.name, phone: applicant.phone, telco: applicant.telco }),
        minDelay,
      ]);
      setPrequalify(result);
      navigate("/apply/prequalify");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong reaching the Twizere API.";
      setError(message);
      setPhase("pin");
      setPin("");
    }
  }

  if (phase === "analyzing") {
    return (
      <section className="step">
        <div className="card step-card" style={{ textAlign: "center" }}>
          <div className="eyebrow step-eyebrow">READING YOUR HISTORY</div>
          <h2>Analyzing 12 months of activity…</h2>
          <div className="spinner" />
          <div className="analyzing-lines">
            {visibleLines.map((l, i) => (
              <div key={i}>✓ {l.replace("…", "")}</div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="step">
      <div className="card step-card">
        <div className="eyebrow step-eyebrow">CONSENT &amp; AUTHORIZATION</div>
        <h2>Authorize Twizere</h2>
        <div className="telco-banner">
          <b>{telcoLabel(applicant.telco)}</b> says: Twizere wants to view your last 12 months of
          transaction history to check what you can safely borrow. Allow?
        </div>
        {error && <InlineAlert message={error} />}
        <p className="lede" style={{ marginBottom: 14 }}>
          Enter any 4 digits to simulate your MoMo PIN.
        </p>
        <div className="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`pin-dot ${i < pin.length ? "filled" : ""}`} />
          ))}
        </div>
        <div className="pin-pad">
          {PIN_KEYS.map(({ k, label, wide }) => (
            <button
              key={k}
              type="button"
              className={`pin-key ${wide ? "wide" : ""}`}
              onClick={() => handleKey(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="demo-note">
          Simulated for this demo — no PIN is collected or sent anywhere. In production this
          screen is the telco's own, not Twizere's.
        </p>
      </div>
    </section>
  );
}
