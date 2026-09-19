# Twizere

**Consented mobile-money credit scoring for Rwanda's underbanked.**

Twizere lets an MTN Mobile Money or Airtel Money user turn their own transaction history into a loan pre-qualification, and gives a bank or MFI's loan officers a dashboard to review the model's evidence and approve, decline, disburse, and track repayment — end to end.

### ▶ Live demo — **[twizere.vercel.app](https://twizere.vercel.app)**

No sign-in. Two roles, both open — try them in two tabs side by side:

| | |
|---|---|
| **Applicant** | Enter any name and phone number, pick a telco, "authorize", and get a pre-qualification with the full scorecard behind it |
| **Bank dashboard** | [`/dashboard`](https://twizere.vercel.app/dashboard) — review the queue, open an application, approve or decline with a reason, disburse, record repayments |

**Put them side by side.** Apply in one tab, then approve in the other — the
applicant's status page updates over a WebSocket the moment the officer
decides. No polling, no refresh.

The phone number you enter *is* the input: the same number always reproduces
the same synthetic transaction history and therefore the same score, so you
can retry a profile and get a consistent result. Try a few to land in
different risk bands.

<sub>Frontend on Vercel, FastAPI backend on Render's free tier — the first
request after an idle period may take ~30s while the container wakes.</sub>


<p align="center">
  <img src="docs/screenshots/applicant-landing.png" width="49%" alt="Applicant landing screen" />
  <img src="docs/screenshots/dashboard.png" width="49%" alt="Bank officer dashboard" />
</p>
<p align="center">
  <img src="docs/screenshots/status-tracker.png" width="49%" alt="Applicant status tracker" />
  <img src="docs/screenshots/loan-detail.png" width="49%" alt="Loan detail view with evidence and scoring" />
</p>

## What it does

An applicant picks MTN MoMo or Airtel Money, "authorizes" Twizere with a simulated PIN (no real credential is ever collected), and within seconds sees an indicative amount they're pre-qualified to borrow — backed by a transparent, explainable risk scorecard rather than a black-box model. If they apply, a bank officer sees the same evidence on a dashboard, approves or declines with a reason, disburses the funds, and tracks repayment through to close. Every state change pushes live over a WebSocket, so an applicant watching their status page sees a decision the moment an officer makes it — no polling, no refresh.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11, FastAPI, SQLModel (SQLAlchemy + Pydantic), PostgreSQL |
| Realtime | Native FastAPI WebSockets — no message broker needed at this scale |
| Frontend | React 18 + TypeScript, Vite, React Router — hand-rolled CSS design system, no UI kit |
| Infra | Docker Compose (Postgres + FastAPI + Vite dev server) |

## Quick start (Docker)

```bash
git clone <this-repo-url> twizere && cd twizere
docker compose up --build
```

- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:8000** (interactive docs at `/docs`)
- Postgres: `localhost:5432` (`postgres` / `postgres`, database `twizere`)

The database seeds itself with four sample applications on first boot (one pending review, one mid-repayment, one fully repaid, one declined) so the dashboard is never an empty screen — open `/dashboard` right after `up` finishes and there's already something to look at.

Source is bind-mounted into both containers, so editing `server/app/**` or `client/src/**` on your host hot-reloads inside the running containers — no rebuild needed for day-to-day changes.

## Quick start (without Docker)

Useful for faster local iteration. Requires Python 3.11+, Node 18+, and a running PostgreSQL instance.

```bash
# 1. Database
createdb twizere   # or: psql -c "CREATE DATABASE twizere;"

# 2. Backend
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/twizere" uvicorn app.main:app --reload

# 3. Frontend (new terminal)
cd client
cp .env.example .env       # VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

## How scoring works

The scoring engine is a **transparent, weighted scorecard**, not a trained ML model — deliberately. There's no historical loan-outcome data to train one on yet, and a bank's risk committee (and, in Rwanda, the law) expects a human-reviewable explanation behind a lending recommendation, not a black box. Every score ships with the evidence behind it.

Five weighted signals, computed from twelve months of (synthetic) transaction history:

| Signal | Weight | What it captures |
|---|---|---|
| Inflow stability | 30% | Average monthly inflow and its coefficient of variation |
| Spending-to-income ratio | 25% | Share of inflow consumed by outflows |
| Existing repayment behaviour | 20% | Regularity of any loan-repayment-shaped transactions already in the history |
| Account activity | 15% | Dormant months out of twelve |
| Red-flag spending | 10% (penalty) | Share of outflow to high-risk merchant categories |

The weighted score maps to a risk band (`LOW` / `MEDIUM` / `HIGH`), a model recommendation (`APPROVE` / `REVIEW` / `DECLINE`), and a conservative maximum affordable installment — but **the model only ever recommends**. Every loan requires a human officer's decision; nothing auto-approves.

## Synthetic data & scoring

There is no MTN or Airtel integration in this repository. When an applicant "authorizes" Twizere, the backend deterministically generates a full synthetic transaction history from a hash of their phone number and telco choice — the same phone number always reproduces the same profile, which is what lets the pre-qualification screen and the final loan record agree with each other without the backend ever trusting a client-submitted score. Four archetypal spending personas (steady market vendor, volatile daily-wage worker, salaried-style regular earner, and a higher-risk profile with irregular repayments and flagged spending) drive realistic-looking but entirely fake monthly cash flow, transaction categories, and amounts. See `server/app/scoring.py` for the full generation and scoring logic.

## API

All endpoints are under `/api`; full interactive docs (via FastAPI's built-in OpenAPI UI) are at `http://localhost:8000/docs` once the server is running.

| Method & path | Purpose |
|---|---|
| `POST /api/prequalify` | Score an applicant from `{name, phone, telco}` without creating a record |
| `POST /api/loans` | Submit a loan application; re-derives the score server-side |
| `GET /api/loans` | List all applications (optional `?status=`) |
| `GET /api/loans/{id}` | Fetch one application |
| `POST /api/loans/{id}/decision` | Officer approves or declines (`{officerName, decision, reason}`) |
| `POST /api/loans/{id}/disburse` | Marks an approved loan as disbursed |
| `POST /api/loans/{id}/repay` | Marks one of the three repayment installments paid |
| `WS /ws` | Live push of every create/update, consumed by both the applicant status page and the dashboard |

## Project structure

```
twizere/
├── docker-compose.yml
├── server/                 # FastAPI backend
│   └── app/
│       ├── main.py         # app setup, CORS, routers, WS mount
│       ├── models.py       # SQLModel Loan table
│       ├── scoring.py      # synthetic transaction generator + scorecard
│       ├── ws_manager.py   # WebSocket broadcast
│       ├── seed.py         # seeds 4 sample applications on first boot
│       └── routers/        # prequalify, loans, ws
└── client/                 # React + TypeScript frontend
    └── src/
        ├── pages/          # Landing, Consent, Prequalify, Status, Dashboard, LoanDetail
        ├── components/     # Stepper, Sparkline, QueueTable, EvidenceTable, …
        ├── context/        # applicant scratch state, theme, shared WebSocket
        └── styles/         # the design system (tokens, light + dark)
```

## Scope & honesty

Built in a hackathon and deliberately scoped as a demonstrator, not a
production lender.

- **All applicant and transaction data is synthetically generated.** No real
  MTN or Airtel API is called anywhere in this codebase — see
  [Synthetic data & scoring](#synthetic-data--scoring) for exactly how the data
  is produced.
- **No real credential is ever collected.** The "authorize" step is a simulated
  PIN screen; there is no field, column or log line for a mobile-money PIN.
- **The scoring engine is a transparent weighted scorecard, not a trained
  model** — a deliberate choice, explained in
  [How scoring works](#how-scoring-works).
- **The model only ever recommends.** Every loan requires a human officer's
  decision; nothing auto-approves.

The API, data model and scoring interface were designed for the production path
described below — see [From here to production](#from-here-to-production).

## From here to production

This repo is deliberately scoped to what a hackathon demo needs: synthetic data, a dev-mode Docker setup, no auth. Turning it into the real thing means, roughly in order — real MTN MoMo / Airtel Money API integration behind actual applicant consent (not a simulated PIN screen), a regulatory sandbox pilot with a licensed bank or MFI, a production frontend build served behind a real web server instead of the Vite dev server, and proper secrets/auth instead of an open dev CORS policy. None of that is in scope here, but the API and data model were designed with that path in mind — see `server/app/scoring.py`'s docstrings and the trade-offs called out throughout this README before treating any part of this as production-ready.

## License

MIT — see [LICENSE](LICENSE).
