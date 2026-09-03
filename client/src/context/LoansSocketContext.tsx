import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { deriveWsUrl } from "../lib/api";
import type { LoanSocketMessage } from "../lib/types";

export type SocketStatus = "connecting" | "open" | "closed";

type Listener = (msg: LoanSocketMessage) => void;

interface LoansSocketContextValue {
  status: SocketStatus;
  /** Register a callback invoked on every loan_created/loan_updated message. Returns an unsubscribe fn. */
  subscribe: (listener: Listener) => () => void;
}

const LoansSocketContext = createContext<LoansSocketContextValue | null>(null);

const MAX_BACKOFF_MS = 15000;
const BASE_BACKOFF_MS = 1000;

export function LoansSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const listenersRef = useRef<Set<Listener>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUsRef = useRef(false);

  useEffect(() => {
    closedByUsRef.current = false;

    function connect() {
      if (closedByUsRef.current) return;
      setStatus("connecting");
      let ws: WebSocket;
      try {
        ws = new WebSocket(deriveWsUrl());
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setStatus("open");
      };

      ws.onmessage = (event) => {
        let parsed: LoanSocketMessage | null = null;
        try {
          parsed = JSON.parse(event.data as string) as LoanSocketMessage;
        } catch {
          return;
        }
        if (!parsed || (parsed.type !== "loan_created" && parsed.type !== "loan_updated")) return;
        listenersRef.current.forEach((listener) => listener(parsed as LoanSocketMessage));
      };

      ws.onclose = () => {
        setStatus("closed");
        wsRef.current = null;
        if (!closedByUsRef.current) scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose fires right after in browsers — reconnect handled there.
        ws.close();
      };
    }

    function scheduleReconnect() {
      if (closedByUsRef.current) return;
      const attempt = attemptRef.current;
      attemptRef.current = attempt + 1;
      const delay = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      reconnectTimerRef.current = setTimeout(connect, delay);
    }

    connect();

    return () => {
      closedByUsRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const subscribe = (listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  };

  return (
    <LoansSocketContext.Provider value={{ status, subscribe }}>
      {children}
    </LoansSocketContext.Provider>
  );
}

export function useLoansSocketContext(): LoansSocketContextValue {
  const ctx = useContext(LoansSocketContext);
  if (!ctx) throw new Error("useLoansSocketContext must be used within a LoansSocketProvider");
  return ctx;
}
