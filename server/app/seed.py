"""Idempotent seed of 4 sample loans on startup, if the table is empty."""
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from .loan_utils import build_schedule
from .models import Loan
from .scoring import score_seed


def _now():
    return datetime.now(timezone.utc)


def _make_loan(name, phone, telco, persona_override, requested_amount_ratio=1.0) -> Loan:
    seed = f"{phone}|{telco}"
    profile, result = score_seed(seed, persona_override)
    requested_amount = round(result["maxAmount"] * requested_amount_ratio / 1000) * 1000
    return Loan(
        applicant_name=name,
        phone=phone,
        telco=telco,
        requested_amount=requested_amount,
        status="pending_review",
        band=result["band"],
        recommendation=result["recommendation"],
        score=result["score"],
        affordable_installment=result["affordableInstallment"],
        max_amount=result["maxAmount"],
        evidence=result["evidence"],
        monthly=result["monthly"],
        sample_txns=profile.txns[-10:],
        schedule=build_schedule(requested_amount),
        sample=True,
    )


def seed_if_empty(session: Session) -> None:
    if session.exec(select(Loan)).first():
        return  # already seeded

    now = _now()

    # 1. Alphonsine Uwase — vendor persona, pending review.
    l1 = _make_loan("Alphonsine Uwase", "0788112233", "MTN", "vendor", requested_amount_ratio=0.85)
    l1.status = "pending_review"
    l1.requested_at = now - timedelta(days=6)

    # 2. Eric Nshimiyimana — salaried persona, repaying (installment 1 paid).
    l2 = _make_loan("Eric Nshimiyimana", "0722334455", "AIRTEL", "salaried")
    schedule2 = list(l2.schedule)
    schedule2[0] = {**schedule2[0], "status": "paid"}
    l2.schedule = schedule2
    l2.status = "repaying"
    l2.officer_name = "K. Uwase — Loan Officer"
    l2.officer_reason = "Strong salary-linked inflow, approved at requested amount."
    l2.requested_at = now - timedelta(days=6)
    l2.decision_at = now - timedelta(days=5)
    l2.disbursed_at = now - timedelta(days=5)

    # 3. Divine Keza — vendor persona, closed (all installments paid).
    l3 = _make_loan("Divine Keza", "0788556677", "MTN", "vendor")
    schedule3 = [{**item, "status": "paid"} for item in l3.schedule]
    l3.schedule = schedule3
    l3.status = "closed"
    l3.officer_name = "K. Uwase — Loan Officer"
    l3.officer_reason = "Approved — consistent merchant inflow."
    l3.requested_at = now - timedelta(days=41)
    l3.decision_at = now - timedelta(days=40)
    l3.disbursed_at = now - timedelta(days=40)
    l3.closed_at = now - timedelta(days=3)

    # 4. Patrick Habimana — risky persona, declined.
    l4 = _make_loan("Patrick Habimana", "0733889900", "AIRTEL", "risky")
    l4.status = "declined"
    l4.officer_name = "K. Uwase — Loan Officer"
    l4.officer_reason = (
        "High share of spend to flagged merchants and irregular repayment "
        "history on existing obligations."
    )
    l4.requested_at = now - timedelta(days=3)
    l4.decision_at = now - timedelta(days=2)

    for loan in (l1, l2, l3, l4):
        session.add(loan)
    session.commit()
