import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { matchesFilter, type FilterKey } from "../lib/filters";
import { StatsStrip } from "../components/StatsStrip";
import { FilterTabs } from "../components/FilterTabs";
import { QueueTable } from "../components/QueueTable";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { useLoansSocket } from "../hooks/useLoansSocket";
import type { Loan, LoanSocketMessage } from "../lib/types";

export function Dashboard() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const fetchLoans = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .listLoans()
      .then(setLoans)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load the loan queue.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleSocketMessage = useCallback((msg: LoanSocketMessage) => {
    setLoans((prev) => {
      const idx = prev.findIndex((l) => l.id === msg.loan.id);
      if (idx === -1) return [msg.loan, ...prev];
      const next = prev.slice();
      next[idx] = msg.loan;
      return next;
    });
  }, []);
  useLoansSocket(handleSocketMessage);

  if (loading) return <LoadingState label="Loading applications…" />;
  if (error && loans.length === 0) return <ErrorState message={error} onRetry={fetchLoans} />;

  const filtered = loans.filter((l) => matchesFilter(l, filter));

  return (
    <div>
      {error && (
        <div className="alert" role="alert">
          <p>{error}</p>
        </div>
      )}
      <StatsStrip loans={loans} />
      <FilterTabs active={filter} onChange={setFilter} />
      <QueueTable loans={filtered} />
    </div>
  );
}
