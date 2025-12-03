"""
Fit a simple linear regression for inference time based on the provided
experiments and visualize the fit.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple

import matplotlib.pyplot as plt
import numpy as np


@dataclass(frozen=True)
class InferenceRecord:
    total_experts: int
    active_experts: int
    time: float  # same units as the collected measurements


# Extracted from inference_time_data.png
DATA: List[InferenceRecord] = [
    InferenceRecord(total_experts=2, active_experts=1, time=0.071),
    InferenceRecord(total_experts=2, active_experts=2, time=0.079),
    InferenceRecord(total_experts=3, active_experts=1, time=0.074),
    InferenceRecord(total_experts=3, active_experts=2, time=0.092),
    InferenceRecord(total_experts=3, active_experts=3, time=0.094),
    InferenceRecord(total_experts=4, active_experts=1, time=0.077),
    InferenceRecord(total_experts=4, active_experts=2, time=0.106),
    InferenceRecord(total_experts=4, active_experts=3, time=0.117),
    InferenceRecord(total_experts=4, active_experts=4, time=0.128),
    InferenceRecord(total_experts=5, active_experts=1, time=0.078),
    InferenceRecord(total_experts=5, active_experts=2, time=0.118),
    InferenceRecord(total_experts=5, active_experts=3, time=0.132),
    InferenceRecord(total_experts=5, active_experts=4, time=0.146),
    InferenceRecord(total_experts=5, active_experts=5, time=0.156),
]


def fit_linear_model(records: Iterable[InferenceRecord]) -> Tuple[np.ndarray, float]:
    """
    Fit quadratic-in-features linear model:
    y = b0 + b1 * k + b2 * N + b3 * (k*N) + b4 * k^2 + b5 * N^2.

    Returns coefficients [b0, b1, b2, b3, b4, b5] and R^2.
    """
    data = list(records)
    X = np.array(
        [
            [
                1.0,
                r.active_experts,
                r.total_experts,
                r.active_experts * r.total_experts,
                r.active_experts ** 2,
                r.total_experts ** 2,
            ]
            for r in data
        ],
        dtype=float,
    )
    y = np.array([r.time for r in data], dtype=float)
    coef, _, _, _ = np.linalg.lstsq(X, y, rcond=None)
    pred = X @ coef
    ss_res = np.sum((y - pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r2 = 1.0 - ss_res / ss_tot
    return coef, r2


def plot_fit(records: Iterable[InferenceRecord], coef: np.ndarray, output: Path) -> None:
    intercept, b_active, b_total, b_kn, b_k2, b_n2 = coef
    data = list(records)
    fig, ax = plt.subplots(figsize=(8, 5))

    palette = {
        1: "#2563eb",
        2: "#dc2626",
        3: "#f59e0b",
        4: "#10b981",
        5: "#8b5cf6",
    }

    # Actual points grouped by active experts.
    for active in sorted({r.active_experts for r in data}):
        xs = [r.total_experts for r in data if r.active_experts == active]
        ys = [r.time for r in data if r.active_experts == active]
        color = palette.get(active, "gray")
        ax.plot(xs, ys, "o", label=f"actual k={active}", color=color)

        # Predicted line for the same k across feasible totals.
        totals = np.arange(max(active, 1), 5 + 1)
        preds = (
            intercept
            + b_active * active
            + b_total * totals
            + b_kn * active * totals
            + b_k2 * (active ** 2)
            + b_n2 * (totals ** 2)
        )
        ax.plot(
            totals,
            preds,
            "-",
            color=color,
            alpha=0.7,
            label=f"pred k={active}",
        )

    equation = (
        f"T = {intercept:.6f}"
        f" + {b_active:.6f}*k"
        f" + {b_total:.6f}*N"
        f" + {b_kn:.6f}*kN"
        f" + {b_k2:.6f}*k^2"
        f" + {b_n2:.6f}*N^2"
    )
    ax.set_title("Inference Time Linear Fit")
    ax.set_xlabel("Total Experts")
    ax.set_ylabel("Inference Time (units from data)")
    ax.grid(True, linestyle="--", alpha=0.4)
    ax.legend(loc="upper left", fontsize=9, ncol=2)
    ax.text(
        0.02,
        0.02,
        equation,
        transform=ax.transAxes,
        fontsize=9,
        verticalalignment="bottom",
        bbox=dict(facecolor="white", alpha=0.7, edgecolor="none"),
    )
    fig.tight_layout()
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output, dpi=200)
    plt.close(fig)


def main() -> None:
    coef, r2 = fit_linear_model(DATA)
    intercept, b_active, b_total, b_kn, b_k2, b_n2 = coef
    print("Coefficients for T = b0 + b1*k + b2*N + b3*kN + b4*k^2 + b5*N^2")
    print(f"  b0  = {intercept:.8f}")
    print(f"  b1  = {b_active:.8f}")
    print(f"  b2  = {b_total:.8f}")
    print(f"  b3  = {b_kn:.8f}")
    print(f"  b4  = {b_k2:.8f}")
    print(f"  b5  = {b_n2:.8f}")
    print(f"R^2 = {r2:.4f}")

    output_path = Path("inference_time_regression.png")
    plot_fit(DATA, coef, output_path)
    print(f"Plot saved to {output_path}")


if __name__ == "__main__":
    main()
