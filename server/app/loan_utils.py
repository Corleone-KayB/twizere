"""Shared helpers for building loan records (used by the loans router and seed.py)."""


def build_schedule(requested_amount: int) -> list[dict]:
    """3-installment repayment plan, amounts split evenly from requested_amount
    with the remainder folded into the last installment."""
    base = requested_amount // 3
    remainder = requested_amount - base * 3
    amounts = [base, base, base + remainder]
    return [
        {"n": i + 1, "amount": amounts[i], "status": "pending", "label": f"Installment {i + 1} of 3"}
        for i in range(3)
    ]
