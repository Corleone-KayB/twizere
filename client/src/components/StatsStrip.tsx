import { fmtRWF } from "../lib/format";
import { isActiveStatus } from "../lib/filters";
import type { Loan } from "../lib/types";

export function StatsStrip({ loans }: { loans: Loan[] }) {
  const total = loans.length;
  const pending = loans.filter((l) => l.status === "pending_review").length;
  const active = loans.filter((l) => isActiveStatus(l.status)).length;
  const closed = loans.filter((l) => l.status === "closed").length;
  const disbursedTotal = loans
    .filter((l) => ["disbursed", "repaying", "closed"].includes(l.status))
    .reduce((sum, l) => sum + l.requestedAmount, 0);

  const stats: { val: string | number; lbl: string }[] = [
    { val: total, lbl: "Total applications" },
    { val: pending, lbl: "Pending review" },
    { val: active, lbl: "Active loans" },
    { val: closed, lbl: "Closed" },
    { val: fmtRWF(disbursedTotal), lbl: "Total disbursed" },
  ];

  return (
    <div className="stats-strip">
      {stats.map((s) => (
        <div className="stat" key={s.lbl}>
          <div className="val">{s.val}</div>
          <div className="lbl">{s.lbl}</div>
        </div>
      ))}
    </div>
  );
}
