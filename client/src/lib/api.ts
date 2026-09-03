import type {
  CreateLoanRequest,
  DecisionRequest,
  Loan,
  LoanStatus,
  PrequalifyRequest,
  PrequalifyResponse,
  RepayRequest,
} from "./types";

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:8000";

export const API_ROOT = `${API_BASE_URL}/api`;

/** Derive the ws:// (or wss://) URL for the shared loans socket from the API base URL. */
export function deriveWsUrl(apiBaseUrl: string = API_BASE_URL): string {
  const url = new URL(apiBaseUrl);
  const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${url.host}/ws`;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_ROOT}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (err) {
    throw new ApiError(
      `Could not reach the Twizere API at ${API_ROOT}${path}. Is the backend running?`,
      0,
      err
    );
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // no JSON body — leave null
    }
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : res.statusText;
    throw new ApiError(detail || `Request failed with status ${res.status}`, res.status, body);
  }

  // 204 / empty body safety
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  prequalify(body: PrequalifyRequest): Promise<PrequalifyResponse> {
    return request<PrequalifyResponse>("/prequalify", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  createLoan(body: CreateLoanRequest): Promise<Loan> {
    return request<Loan>("/loans", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  listLoans(status?: LoanStatus): Promise<Loan[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<Loan[]>(`/loans${qs}`);
  },

  getLoan(id: string): Promise<Loan> {
    return request<Loan>(`/loans/${encodeURIComponent(id)}`);
  },

  decide(id: string, body: DecisionRequest): Promise<Loan> {
    return request<Loan>(`/loans/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  disburse(id: string): Promise<Loan> {
    return request<Loan>(`/loans/${encodeURIComponent(id)}/disburse`, {
      method: "POST",
    });
  },

  repay(id: string, body: RepayRequest): Promise<Loan> {
    return request<Loan>(`/loans/${encodeURIComponent(id)}/repay`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
