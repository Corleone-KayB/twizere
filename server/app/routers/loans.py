from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..db import get_session
from ..loan_utils import build_schedule
from ..models import Loan
from ..schemas import CreateLoanRequest, DecisionRequest, RepayRequest, loan_to_dict
from ..scoring import score_seed
from ..ws_manager import manager

router = APIRouter()


def _now():
    return datetime.now(timezone.utc)


@router.post("/loans")
async def create_loan(body: CreateLoanRequest, session: Session = Depends(get_session)):
    # Never trust a client-submitted score: re-derive the full profile
    # server-side from (phone, telco), exactly like /api/prequalify does.
    seed = f"{body.phone}|{body.telco}"
    profile, result = score_seed(seed)

    loan = Loan(
        applicant_name=body.name,
        phone=body.phone,
        telco=body.telco,
        requested_amount=body.requested_amount,
        status="pending_review",
        band=result["band"],
        recommendation=result["recommendation"],
        score=result["score"],
        affordable_installment=result["affordableInstallment"],
        max_amount=result["maxAmount"],
        evidence=result["evidence"],
        monthly=result["monthly"],
        sample_txns=profile.txns[-10:],
        schedule=build_schedule(body.requested_amount),
        sample=False,
        requested_at=_now(),
    )
    session.add(loan)
    session.commit()
    session.refresh(loan)

    payload = loan_to_dict(loan)
    await manager.broadcast({"type": "loan_created", "loan": payload})
    return payload


@router.get("/loans")
def list_loans(status: Optional[str] = None, session: Session = Depends(get_session)):
    stmt = select(Loan)
    if status:
        stmt = stmt.where(Loan.status == status)
    loans = session.exec(stmt).all()
    loans = sorted(loans, key=lambda l: l.requested_at, reverse=True)
    return [loan_to_dict(l) for l in loans]


@router.get("/loans/{loan_id}")
def get_loan(loan_id: str, session: Session = Depends(get_session)):
    loan = session.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan_to_dict(loan)


@router.post("/loans/{loan_id}/decision")
async def decide_loan(loan_id: str, body: DecisionRequest, session: Session = Depends(get_session)):
    loan = session.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "pending_review":
        raise HTTPException(status_code=400, detail="Loan is not pending review")
    if body.decision == "declined" and not (body.reason and body.reason.strip()):
        raise HTTPException(status_code=400, detail="A reason is required to decline a loan")

    loan.status = "approved" if body.decision == "approved" else "declined"
    loan.officer_name = body.officer_name
    loan.officer_reason = body.reason
    loan.decision_at = _now()

    session.add(loan)
    session.commit()
    session.refresh(loan)

    payload = loan_to_dict(loan)
    await manager.broadcast({"type": "loan_updated", "loan": payload})
    return payload


@router.post("/loans/{loan_id}/disburse")
async def disburse_loan(loan_id: str, session: Session = Depends(get_session)):
    loan = session.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "approved":
        raise HTTPException(status_code=400, detail="Loan is not approved")

    loan.status = "disbursed"
    loan.disbursed_at = _now()

    session.add(loan)
    session.commit()
    session.refresh(loan)

    payload = loan_to_dict(loan)
    await manager.broadcast({"type": "loan_updated", "loan": payload})
    return payload


@router.post("/loans/{loan_id}/repay")
async def repay_loan(loan_id: str, body: RepayRequest, session: Session = Depends(get_session)):
    loan = session.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status not in ("disbursed", "repaying"):
        raise HTTPException(status_code=400, detail="Loan is not disbursed/repaying")
    if body.installment_index < 0 or body.installment_index >= len(loan.schedule):
        raise HTTPException(status_code=400, detail="installmentIndex out of range")

    schedule = list(loan.schedule)
    schedule[body.installment_index] = {
        **schedule[body.installment_index],
        "status": "paid",
    }
    loan.schedule = schedule

    if all(item["status"] == "paid" for item in schedule):
        loan.status = "closed"
        loan.closed_at = _now()
    elif loan.status == "disbursed":
        loan.status = "repaying"

    session.add(loan)
    session.commit()
    session.refresh(loan)

    payload = loan_to_dict(loan)
    await manager.broadcast({"type": "loan_updated", "loan": payload})
    return payload
