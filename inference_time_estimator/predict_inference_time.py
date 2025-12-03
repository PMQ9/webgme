"""
Estimate inference time using the fitted linear model:
T = 0.02791429 + 0.01657143 * active_k + 0.00951429 * total_experts

total_experts can be any positive integer; active_k must be <= total_experts.
"""

from __future__ import annotations

import argparse
from typing import List, Tuple


# Quadratic-in-features regression:
# T = b0 + b1*k + b2*N + b3*kN + b4*k^2 + b5*N^2
COEFFICIENTS = {
    "b0": 0.05348109,
    "b1": 0.00532143,
    "b2": 0.00173004,
    "b3": 0.00803571,
    "b4": -0.00446429,
    "b5": -0.00092752,
}


def predict_inference_time(total_experts: int, active_experts: int) -> float:
    if total_experts < 1:
        raise ValueError("total_experts must be at least 1")
    if active_experts < 1 or active_experts > total_experts:
        raise ValueError("active_experts must be between 1 and total_experts")

    b0 = COEFFICIENTS["b0"]
    b1 = COEFFICIENTS["b1"]
    b2 = COEFFICIENTS["b2"]
    b3 = COEFFICIENTS["b3"]
    b4 = COEFFICIENTS["b4"]
    b5 = COEFFICIENTS["b5"]
    return (
        b0
        + b1 * active_experts
        + b2 * total_experts
        + b3 * active_experts * total_experts
        + b4 * (active_experts ** 2)
        + b5 * (total_experts ** 2)
    )


def build_table(max_total: int = 5) -> List[Tuple[int, int, float]]:
    rows: List[Tuple[int, int, float]] = []
    for total in range(1, max_total + 1):
        for active in range(1, total + 1):
            rows.append((total, active, predict_inference_time(total, active)))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict inference time (linear model)")
    parser.add_argument("--total", type=int, help="total experts (>=1)")
    parser.add_argument("--active", type=int, help="active experts (1 <= k <= total)")
    parser.add_argument(
        "--table",
        action="store_true",
        help="print a table of predictions for valid (total, active) pairs",
    )
    parser.add_argument(
        "--table-max",
        type=int,
        default=10,
        help="maximum total experts to include when using --table (default: 10)",
    )
    args = parser.parse_args()

    if args.table:
        print("Predicted inference time (same units as training data):")
        for total, active, pred in build_table(max_total=args.table_max):
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
