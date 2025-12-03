"""
Generate analysis assets for the inference-time regression:
- scenario_results.csv : actual vs predicted table for all measured points
- scenario_results.md  : markdown table
- scenario_plot.png    : scatter of actual vs predicted with residual bars
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Tuple

import matplotlib.pyplot as plt
import numpy as np

DATA = [
    (2, 1, 0.071),
    (2, 2, 0.079),
    (3, 1, 0.074),
    (3, 2, 0.092),
    (3, 3, 0.094),
    (4, 1, 0.077),
    (4, 2, 0.106),
    (4, 3, 0.117),
    (4, 4, 0.128),
    (5, 1, 0.078),
    (5, 2, 0.118),
    (5, 3, 0.132),
    (5, 4, 0.146),
    (5, 5, 0.156),
]

# Quadratic model coefficients (updated fit)
COEF = {
    "b0": 0.05348109,
    "b1": 0.00532143,
    "b2": 0.00173004,
    "b3": 0.00803571,
    "b4": -0.00446429,
    "b5": -0.00092752,
}


def predict(total: int, active: int) -> float:
    b0 = COEF["b0"]
    b1 = COEF["b1"]
    b2 = COEF["b2"]
    b3 = COEF["b3"]
    b4 = COEF["b4"]
    b5 = COEF["b5"]
    return (
        b0
        + b1 * active
        + b2 * total
        + b3 * active * total
        + b4 * active * active
        + b5 * total * total
    )


def main() -> None:
    rows: List[Tuple[int, int, float, float, float]] = []
    for N, k, actual in DATA:
        pred = predict(N, k)
        err = pred - actual
        rows.append((N, k, actual, pred, err))

    # CSV
    csv_path = Path("inference_time_estimator/scenario_results.csv")
    with csv_path.open("w", encoding="utf-8") as f:
        f.write("total,active,actual,predicted,error\n")
        for N, k, actual, pred, err in rows:
            f.write(f"{N},{k},{actual:.6f},{pred:.6f},{err:.6f}\n")

    # Markdown
    md_path = Path("inference_time_estimator/scenario_results.md")
    with md_path.open("w", encoding="utf-8") as f:
        f.write("| Total | Active | Actual | Predicted | Error |\n")
        f.write("|---|---|---|---|---|\n")
        for N, k, actual, pred, err in rows:
            f.write(
                f"| {N} | {k} | {actual:.6f} | {pred:.6f} | {err:+.6f} |\n"
            )

    # Plot
    fig, ax = plt.subplots(figsize=(8, 5))
    actual_vals = [r[2] for r in rows]
    pred_vals = [r[3] for r in rows]
    labels = [f"N={r[0]},k={r[1]}" for r in rows]
    idx = np.arange(len(rows))

    ax.scatter(idx, actual_vals, label="Actual", color="#2563eb")
    ax.scatter(idx, pred_vals, label="Predicted", color="#dc2626", marker="x")
    for i, (a, p) in enumerate(zip(actual_vals, pred_vals)):
        ax.vlines(i, min(a, p), max(a, p), color="#6b7280", linestyle="--", alpha=0.6)

    ax.set_xticks(idx)
    ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=8)
    ax.set_ylabel("Inference Time (units from data)")
    ax.set_title("Actual vs Predicted Inference Time (quadratic model)")
    ax.legend()
    fig.tight_layout()
    plot_path = Path("inference_time_estimator/scenario_plot.png")
    fig.savefig(plot_path, dpi=200)
    plt.close(fig)

    print(f"Wrote {csv_path}, {md_path}, {plot_path}")


if __name__ == "__main__":
    main()
