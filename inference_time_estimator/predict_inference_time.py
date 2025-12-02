"""
Estimate inference time using the fitted linear model:
T = 0.02791429 + 0.01657143 * active_k + 0.00951429 * total_experts

total_experts is capped at 5 in the current data; active_k must be <= total_experts.
"""

from __future__ import annotations

import argparse
from typing import List, Tuple


COEFFICIENTS = {
    "intercept": 0.02791429,
    "per_active": 0.01657143,
    "per_total": 0.00951429,
}


def predict_inference_time(total_experts: int, active_experts: int) -> float:
    if total_experts < 1 or total_experts > 5:
        raise ValueError("total_experts must be between 1 and 5")
    if active_experts < 1 or active_experts > total_experts:
        raise ValueError("active_experts must be between 1 and total_experts")

    b0 = COEFFICIENTS["intercept"]
    b_active = COEFFICIENTS["per_active"]
    b_total = COEFFICIENTS["per_total"]
    return b0 + b_active * active_experts + b_total * total_experts


def build_table() -> List[Tuple[int, int, float]]:
    rows: List[Tuple[int, int, float]] = []
    for total in range(1, 5 + 1):
        for active in range(1, total + 1):
            rows.append((total, active, predict_inference_time(total, active)))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict inference time (linear model)")
    parser.add_argument("--total", type=int, help="total experts (1-5)")
    parser.add_argument("--active", type=int, help="active experts (1 <= k <= total)")
    parser.add_argument(
        "--table",
        action="store_true",
        help="print a table of predictions for all valid (total, active) pairs",
    )
    args = parser.parse_args()

    if args.table:
        print("Predicted inference time (same units as training data):")
        for total, active, pred in build_table():
            print(f"total={total} active={active} -> {pred:.5f}")
        return

    if args.total is None or args.active is None:
        parser.error("either --table or both --total and --active are required")

    prediction = predict_inference_time(args.total, args.active)
    print(
        f"Predicted inference time for total={args.total}, active={args.active}: "
        f"{prediction:.5f}"
    )


if __name__ == "__main__":
    main()
