import { useNavigate } from "react-router-dom";
import {
  bandPillClass,
  fmtDate,
  fmtRWF,
  maskPhone,
  recPillClass,
  STATE_LABELS,
  statusPillClass,
  telcoLabel,
} from "../lib/format";
import type { Loan } from "../lib/types";

export function QueueTable({ loans }: { loans: Loan[] }) {
  const navigate = useNavigate();
  const rows = [...loans].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );

  return (
    <div className="queue-wrap">
      <table className="queue-table">
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Requested</th>
            <th>Band</th>
            <th>Recommendation</th>
            <th>Status</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="empty-row">
              <td colSpan={6}>No applications in this filter yet.</td>
            </tr>
          )}
          {rows.map((l) => (
            <tr key={l.id} onClick={() => navigate(`/dashboard/loans/${l.id}`)}>
              <td>
                <div className="qname">{l.applicantName}</div>
                <div className="qsub">
                  {maskPhone(l.phone)} · {telcoLabel(l.telco)}
                  {l.sample ? " · sample" : ""}
                </div>
              </td>
              <td className="mono">{fmtRWF(l.requestedAmount)}</td>
              <td>
                <span className={`pill ${bandPillClass(l.band)}`}>{l.band}</span>
              </td>
              <td>
                <span className={`pill ${recPillClass(l.recommendation)}`}>{l.recommendation}</span>
              </td>
              <td>
                <span className={`pill ${statusPillClass(l.status)}`}>
                  {STATE_LABELS[l.status].toUpperCase()}
                </span>
              </td>
              <td className="qsub">{fmtDate(l.requestedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
