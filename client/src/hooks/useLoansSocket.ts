import { useEffect } from "react";
import { useLoansSocketContext, type SocketStatus } from "../context/LoansSocketContext";
import type { LoanSocketMessage } from "../lib/types";

/**
 * Subscribe to the shared loans WebSocket. `onMessage` is called for every
 * loan_created/loan_updated push while this component is mounted; pass a
 * stable-enough callback (this hook re-subscribes whenever the reference
 * changes, so wrap it in useCallback if it closes over changing state you
 * don't want to trigger extra churn).
 */
export function useLoansSocket(onMessage: (msg: LoanSocketMessage) => void): SocketStatus {
  const { status, subscribe } = useLoansSocketContext();

  useEffect(() => {
    const unsubscribe = subscribe(onMessage);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMessage, subscribe]);

  return status;
}
