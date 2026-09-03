"""Ported from `_demo_reference.html` (functions generateProfile / scoreProfile /
mean / stddev / clamp / roundTo, and the PERSONAS / CATS_IN / CATS_OUT constants).

We don't need bit-identical random numbers to the original mulberry32 PRNG — a
Python `random.Random(seed_string)` is used instead — but the statistical
logic, thresholds and rounding rules match the JS exactly. Persona selection
is deterministic from a sha256 hash of the seed string (phone|telco), mod 4,
so the same phone+telco always regenerates the identical profile. This is
important: POST /api/loans re-derives the profile server-side from
(phone, telco) rather than trusting anything the client submits.
"""
from __future__ import annotations

import hashlib
import math
import random
from dataclasses import dataclass, field
from typing import Optional

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

PERSONAS = {
    "vendor": {"base": 130000, "variance": 0.15, "outRatio": 0.55, "repay": "regular", "dormant": 0, "gamble": 0.00},
    "boda": {"base": 95000, "variance": 0.35, "outRatio": 0.75, "repay": "none", "dormant": 1, "gamble": 0.015},
    "salaried": {"base": 160000, "variance": 0.10, "outRatio": 0.50, "repay": "regular", "dormant": 0, "gamble": 0.00},
    "risky": {"base": 100000, "variance": 0.55, "outRatio": 0.95, "repay": "irregular", "dormant": 2, "gamble": 0.13},
}
PERSONA_KEYS = ["vendor", "boda", "salaried", "risky"]

CATS_IN = ["P2P received", "Merchant sales", "Salary-style transfer"]
# Categories used for the "remaining outflow" line items (excludes "Loan
# repayment", which always gets its own dedicated txn when it occurs).
CATS_OUT_MISC = ["Airtime", "Merchant payment", "P2P sent", "Bill payment", "Restock / supplies"]


def mean(arr):
    return sum(arr) / len(arr)


def stddev(arr):
    m = mean(arr)
    return math.sqrt(mean([(x - m) ** 2 for x in arr]))


def clamp(n, lo, hi):
    return max(lo, min(hi, n))


def round_to(n, step):
    return round(n / step) * step


@dataclass
class Profile:
    persona: str
    inflow: list
    outflow: list
    txns: list
    repay_months: int
    dormant_count: int
    gamble_rate: float
    has_repay: bool


def generate_profile(seed_str: str, persona_override: Optional[str] = None) -> Profile:
    rng = random.Random(seed_str)

    if persona_override:
        persona = persona_override
    else:
        h = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16)
        persona = PERSONA_KEYS[h % len(PERSONA_KEYS)]
    p = PERSONAS[persona]

    dormant_months = set()
    for _ in range(p["dormant"]):
        dormant_months.add(math.floor(rng.random() * 12))

    inflow, outflow, txns = [], [], []

    repay_months = set()
    if p["repay"] == "regular":
        repay_months = set(range(12))
    elif p["repay"] == "irregular":
        for rm in range(12):
            if rng.random() < 0.4:
                repay_months.add(rm)

    for m_idx in range(12):
        is_dormant = m_idx in dormant_months
        if is_dormant:
            inflow_amt = p["base"] * 0.08 * (0.5 + rng.random())
        else:
            inflow_amt = p["base"] * (1 + p["variance"] * (rng.random() * 2 - 1))
        inflow_amt = max(4000, round(inflow_amt / 500) * 500)

        outflow_amt = inflow_amt * p["outRatio"] * (0.85 + rng.random() * 0.3)
        outflow_amt = max(0, round(outflow_amt / 500) * 500)

        inflow.append(inflow_amt)
        outflow.append(outflow_amt)

        n_in_tx = 1 if is_dormant else 2 + math.floor(rng.random() * 3)
        remaining_in = inflow_amt
        for i in range(n_in_tx):
            if i == n_in_tx - 1:
                amt = remaining_in
            else:
                amt = round(remaining_in * (0.3 + rng.random() * 0.4) / 500) * 500
            remaining_in -= amt
            if amt <= 0:
                continue
            txns.append({
                "month": m_idx,
                "label": MONTH_NAMES[m_idx],
                "dir": "in",
                "cat": CATS_IN[math.floor(rng.random() * len(CATS_IN))],
                "amt": int(amt),
            })

        gamble_amt = 0
        if p["gamble"] > 0 and rng.random() < 0.7:
            gamble_amt = round(outflow_amt * p["gamble"] * (0.6 + rng.random() * 0.8) / 500) * 500
        repay_amt = 0
        if m_idx in repay_months:
            repay_amt = round(outflow_amt * 0.18 / 500) * 500

        remaining_out = max(0, outflow_amt - gamble_amt - repay_amt)
        n_out_tx = 2 + math.floor(rng.random() * 3)
        for j in range(n_out_tx):
            if j == n_out_tx - 1:
                oamt = remaining_out
            else:
                oamt = round(remaining_out * (0.25 + rng.random() * 0.35) / 500) * 500
            remaining_out -= oamt
            if oamt <= 0:
                continue
            txns.append({
                "month": m_idx,
                "label": MONTH_NAMES[m_idx],
                "dir": "out",
                "cat": CATS_OUT_MISC[math.floor(rng.random() * len(CATS_OUT_MISC))],
                "amt": int(oamt),
            })

        if gamble_amt > 0:
            txns.append({
                "month": m_idx,
                "label": MONTH_NAMES[m_idx],
                "dir": "out",
                "cat": "Betting / gaming merchant",
                "amt": int(gamble_amt),
                "flag": True,
            })
        if repay_amt > 0:
            txns.append({
                "month": m_idx,
                "label": MONTH_NAMES[m_idx],
                "dir": "out",
                "cat": "Loan repayment",
                "amt": int(repay_amt),
            })

    return Profile(
        persona=persona,
        inflow=[int(x) for x in inflow],
        outflow=[int(x) for x in outflow],
        txns=txns,
        repay_months=len(repay_months),
        dormant_count=p["dormant"],
        gamble_rate=p["gamble"],
        has_repay=p["repay"] != "none",
    )


def _fmt_rwf(n) -> str:
    return f"RWF {round(n):,}"


def score_profile(profile: Profile) -> dict:
    in_mean = mean(profile.inflow)
    cv = (stddev(profile.inflow) / in_mean) if in_mean > 0 else 1
    stability = clamp(100 - cv * 140, 0, 100)

    total_in = sum(profile.inflow)
    total_out = sum(profile.outflow)
    spend_ratio = (total_out / total_in) if total_in > 0 else 1.5
    spend_score = clamp(100 - max(0, spend_ratio - 0.4) * 160, 0, 100)

    if not profile.has_repay:
        repay_score = 55
    elif profile.repay_months >= 9:
        repay_score = 88
    elif profile.repay_months >= 4:
        repay_score = 60
    else:
        repay_score = 28

    activity_score = clamp(100 - profile.dormant_count * 22, 0, 100)
    redflag_component = clamp(100 - profile.gamble_rate * 500, 0, 100)

    score = round(
        0.30 * stability
        + 0.25 * spend_score
        + 0.20 * repay_score
        + 0.15 * activity_score
        + 0.10 * redflag_component
    )
    band = "LOW" if score >= 72 else ("MEDIUM" if score >= 48 else "HIGH")
    recommendation = "APPROVE" if band == "LOW" else ("DECLINE" if band == "HIGH" else "REVIEW")

    net = [profile.inflow[i] - profile.outflow[i] for i in range(12)]
    avg_net = max(0, mean(net))
    factor = 0.35 if band == "LOW" else (0.25 if band == "MEDIUM" else 0.12)
    affordable_installment = max(2000, round_to(avg_net * factor, 1000))
    max_amount = max(5000, round_to(affordable_installment * 3, 1000))

    evidence = [
        {
            "label": "12-month inflow stability",
            "detail": f"{_fmt_rwf(round(in_mean))}/mo average, {round(cv * 100)}% variation",
            "signal": "pos" if stability >= 70 else ("neu" if stability >= 45 else "neg"),
        },
        {
            "label": "Spending-to-income ratio",
            "detail": f"{round(spend_ratio * 100)}% of inflow spent",
            "signal": "pos" if spend_score >= 70 else ("neu" if spend_score >= 45 else "neg"),
        },
        {
            "label": "Existing repayment behaviour",
            "detail": (
                "No repayment history observed"
                if not profile.has_repay
                else (
                    f"Regular, {profile.repay_months}/12 months"
                    if profile.repay_months >= 9
                    else f"Irregular, {profile.repay_months}/12 months"
                )
            ),
            "signal": "pos" if repay_score >= 70 else ("neu" if repay_score >= 45 else "neg"),
        },
        {
            "label": "Account activity",
            "detail": (
                "Active all 12 months"
                if profile.dormant_count == 0
                else f"{profile.dormant_count} dormant month(s) of 12"
            ),
            "signal": "pos" if activity_score >= 70 else ("neu" if activity_score >= 45 else "neg"),
        },
        {
            "label": "Red-flag spending",
            "detail": (
                "None detected"
                if profile.gamble_rate <= 0.02
                else f"{round(profile.gamble_rate * 100)}% of outflow to high-risk merchants"
            ),
            "signal": "pos" if redflag_component >= 80 else ("neu" if redflag_component >= 55 else "neg"),
        },
    ]

    return {
        "score": int(score),
        "band": band,
        "recommendation": recommendation,
        "affordableInstallment": int(affordable_installment),
        "maxAmount": int(max_amount),
        "evidence": evidence,
        "monthly": net,
    }


def score_seed(seed_str: str, persona_override: Optional[str] = None) -> tuple[Profile, dict]:
    """Convenience: generate a profile and score it in one call."""
    profile = generate_profile(seed_str, persona_override)
    result = score_profile(profile)
    return profile, result
