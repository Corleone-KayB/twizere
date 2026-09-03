import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ApplicantInfo, PrequalifyResponse } from "../lib/types";

// Transient, tab-scoped applicant flow state. Deliberately sessionStorage (not
// localStorage) — this is scratch state for a single application attempt, not
// something that should survive a browser restart.

const APPLICANT_KEY = "twizere_applicant";
const PREQUALIFY_KEY = "twizere_prequalify";

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage unavailable (private mode edge cases) — degrade silently,
    // the in-memory React state still works for the current page life.
  }
}

interface ApplicantContextValue {
  applicant: ApplicantInfo | null;
  prequalify: PrequalifyResponse | null;
  setApplicant: (info: ApplicantInfo) => void;
  setPrequalify: (result: PrequalifyResponse) => void;
  clear: () => void;
}

const ApplicantContext = createContext<ApplicantContextValue | null>(null);

export function ApplicantProvider({ children }: { children: ReactNode }) {
  const [applicant, setApplicantState] = useState<ApplicantInfo | null>(() =>
    readJson<ApplicantInfo>(APPLICANT_KEY)
  );
  const [prequalify, setPrequalifyState] = useState<PrequalifyResponse | null>(() =>
    readJson<PrequalifyResponse>(PREQUALIFY_KEY)
  );

  const value = useMemo<ApplicantContextValue>(
    () => ({
      applicant,
      prequalify,
      setApplicant: (info) => {
        writeJson(APPLICANT_KEY, info);
        setApplicantState(info);
      },
      setPrequalify: (result) => {
        writeJson(PREQUALIFY_KEY, result);
        setPrequalifyState(result);
      },
      clear: () => {
        writeJson(APPLICANT_KEY, null);
        writeJson(PREQUALIFY_KEY, null);
        setApplicantState(null);
        setPrequalifyState(null);
      },
    }),
    [applicant, prequalify]
  );

  return <ApplicantContext.Provider value={value}>{children}</ApplicantContext.Provider>;
}

export function useApplicant(): ApplicantContextValue {
  const ctx = useContext(ApplicantContext);
  if (!ctx) throw new Error("useApplicant must be used within an ApplicantProvider");
  return ctx;
}
