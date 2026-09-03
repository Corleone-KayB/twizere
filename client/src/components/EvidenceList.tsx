import type { Evidence } from "../lib/types";

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return (
    <div className="evidence-list">
      {evidence.map((ev, i) => (
        <div className="ev-row" key={i}>
          <span className={`ev-dot ${ev.signal}`} />
          <span>
            {ev.label} — {ev.detail}
          </span>
        </div>
      ))}
    </div>
  );
}
