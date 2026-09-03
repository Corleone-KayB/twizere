"""SQLModel table model(s)."""
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


def _uuid_hex() -> str:
    return uuid4().hex


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Loan(SQLModel, table=True):
    __tablename__ = "loans"

    id: str = Field(default_factory=_uuid_hex, primary_key=True)
    applicant_name: str
    phone: str
    telco: str  # "MTN" | "AIRTEL"
    requested_amount: int

    status: str = "pending_review"
    band: str
    recommendation: str
    score: int
    affordable_installment: int
    max_amount: int

    evidence: list = Field(default_factory=list, sa_column=Column(JSON))
    monthly: list = Field(default_factory=list, sa_column=Column(JSON))
    sample_txns: list = Field(default_factory=list, sa_column=Column(JSON))
    schedule: list = Field(default_factory=list, sa_column=Column(JSON))

    officer_name: Optional[str] = None
    officer_reason: Optional[str] = None

    sample: bool = False

    requested_at: datetime = Field(default_factory=_utcnow)
    decision_at: Optional[datetime] = None
    disbursed_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
