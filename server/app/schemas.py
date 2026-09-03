"""Request/response models not covered by the Loan table model directly.

The wire contract is camelCase; incoming request bodies use Pydantic aliases
so clients can send camelCase JSON, and `loan_to_dict` hand-maps a Loan row
into the exact camelCase shape documented in the API contract.
"""
from datetime import datetime
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from .models import Loan


class PrequalifyRequest(BaseModel):
    name: str
    phone: str
    telco: Literal["MTN", "AIRTEL"]


class CreateLoanRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    phone: str
    telco: Literal["MTN", "AIRTEL"]
    requested_amount: Annotated[int, Field(alias="requestedAmount")]


class DecisionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    officer_name: Annotated[str, Field(alias="officerName")]
    decision: Literal["approved", "declined"]
    reason: Optional[str] = ""


class RepayRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    installment_index: Annotated[int, Field(alias="installmentIndex")]


def _iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.isoformat() + "Z"
    return dt.isoformat().replace("+00:00", "Z")


def loan_to_dict(loan: Loan) -> dict:
    return {
        "id": loan.id,
        "applicantName": loan.applicant_name,
        "phone": loan.phone,
        "telco": loan.telco,
        "requestedAmount": loan.requested_amount,
        "status": loan.status,
        "band": loan.band,
        "recommendation": loan.recommendation,
        "score": loan.score,
        "affordableInstallment": loan.affordable_installment,
        "maxAmount": loan.max_amount,
        "evidence": loan.evidence,
        "monthly": loan.monthly,
        "sampleTxns": loan.sample_txns,
        "schedule": loan.schedule,
        "officerName": loan.officer_name,
        "officerReason": loan.officer_reason,
        "sample": loan.sample,
        "requestedAt": _iso(loan.requested_at),
        "decisionAt": _iso(loan.decision_at),
        "disbursedAt": _iso(loan.disbursed_at),
        "closedAt": _iso(loan.closed_at),
    }
