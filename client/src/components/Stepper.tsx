import { STEPPER_ORDER, stepperNodeStates } from "../lib/stepper";
import { STATE_LABELS } from "../lib/format";
import type { LoanStatus } from "../lib/types";

export function Stepper({ status }: { status: LoanStatus }) {
  const states = stepperNodeStates(status);
  return (
    <div className="stepper">
      {STEPPER_ORDER.map((s, i) => {
        const state = states[s];
        const cls = ["sp-node", state !== "upcoming" ? state : ""].filter(Boolean).join(" ");
        return (
          <div className={cls} key={s}>
            <span className="line" />
            <span className="dot">{i + 1}</span>
            <span className="lbl">{STATE_LABELS[s]}</span>
          </div>
        );
      })}
    </div>
  );
}
