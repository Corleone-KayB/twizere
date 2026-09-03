import type { Evidence } from "../lib/types";

export function EvidenceTable({ evidence }: { evidence: Evidence[] }) {
  return (
    <table className="evtable">
      <tbody>
        {evidence.map((ev, i) => (
          <tr key={i}>
            <td className="f">
              <span className={`pill ${ev.signal}`} style={{ marginRight: 8 }}>
                &nbsp;
              </span>
              {ev.label}
            </td>
            <td className="d">{ev.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
