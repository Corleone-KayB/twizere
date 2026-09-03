import type { LoanStatus } from "./types";

export const STEPPER_ORDER = [
  "requested",
  "scored",
  "pending_review",
  "approved",
  "disbursed",
  "repaying",
  "closed",
] as const;

export type StepperNodeKey = (typeof STEPPER_ORDER)[number];

export type StepperNodeState = "upcoming" | "done" | "current" | "bad";

/**
 * Ported from the reference prototype's `stepperStatesFor` / node-class logic:
 * declined branches off after pending_review (shown red/"bad" there), defaulted
 * branches off during repaying; every other status walks the linear path.
 */
export function stepperNodeStates(status: LoanStatus): Record<StepperNodeKey, StepperNodeState> {
  const result = {} as Record<StepperNodeKey, StepperNodeState>;

  if (status === "declined") {
    const path: StepperNodeKey[] = ["requested", "scored", "pending_review"];
    for (const s of STEPPER_ORDER) {
      if (s === "pending_review") result[s] = "bad";
      else if (path.includes(s)) result[s] = "done";
      else result[s] = "upcoming";
    }
    return result;
  }

  if (status === "defaulted") {
    const path: StepperNodeKey[] = [
      "requested",
      "scored",
      "pending_review",
      "approved",
      "disbursed",
      "repaying",
    ];
    for (const s of STEPPER_ORDER) {
      if (s === "repaying") result[s] = "bad";
      else if (path.includes(s)) result[s] = "done";
      else result[s] = "upcoming";
    }
    return result;
  }

  const idx = STEPPER_ORDER.indexOf(status as StepperNodeKey);
  const path = STEPPER_ORDER.slice(0, idx + 1);
  for (const s of STEPPER_ORDER) {
    if (s === status) result[s] = "current";
    else if (path.includes(s)) result[s] = "done";
    else result[s] = "upcoming";
  }
  return result;
}
