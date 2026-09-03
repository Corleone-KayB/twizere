import { fmtRWF } from "../lib/format";
import type { ScheduleInstallment } from "../lib/types";

interface ScheduleListProps {
  schedule: ScheduleInstallment[];
  /** "applicant" always shows a PAID/PENDING pill; "bank" shows the pill only when paid. */
  variant: "applicant" | "bank";
  buttonLabel: string;
  /** Whether pay buttons should render at all (e.g. hidden once the loan is closed). */
  showActions: boolean;
  payingIndex: number | null;
  onPay: (index: number) => void;
}

export function ScheduleList({
  schedule,
  variant,
  buttonLabel,
  showActions,
  payingIndex,
  onPay,
}: ScheduleListProps) {
  return (
    <div className="schedule-list">
      {schedule.map((s, idx) => {
        const isPaid = s.status === "paid";
        const showButton = showActions && !isPaid;
        return (
          <div className="sched-row" key={s.n}>
            <div className="l">
              <span className="amt mono">{fmtRWF(s.amount)}</span>
              <span className="due">{s.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {(variant === "applicant" || isPaid) && (
                <span className={`pill ${isPaid ? "pos" : "neu"}`}>
                  {isPaid ? "PAID" : "PENDING"}
                </span>
              )}
              {showButton && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={payingIndex === idx}
                  onClick={() => onPay(idx)}
                >
                  {payingIndex === idx ? "Recording…" : buttonLabel}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
