# Inference Time Regression Summary

## Model
\[
T = b_0 + b_1 k + b_2 N + b_3 kN + b_4 k^2 + b_5 N^2
\]

Coefficients:
- \(b_0 = 0.05348109\)
- \(b_1 = 0.00532143\)
- \(b_2 = 0.00173004\)
- \(b_3 = 0.00803571\)
- \(b_4 = -0.00446429\)
- \(b_5 = -0.00092752\)
- \(R^2 \approx 0.9888\)

## Data and Error Check
See `scenario_results.md` for the full table and `scenario_plot.png` for the visualization. Errors (predicted - actual) across all measured points:
- Min error: -0.005914
- Max error: +0.004431

## Quick Reference (examples)
- \(N=5, k=3\): predicted \(0.135265\) vs actual \(0.132\)
- \(N=5, k=5\): predicted \(0.154836\) vs actual \(0.156\)
- \(N=2, k=2\): predicted \(0.078160\) vs actual \(0.079\)

## Files
- `scenario_results.csv`, `scenario_results.md`: actual vs predicted table
- `scenario_plot.png`: actual vs predicted scatter with residual segments
- `inference_time_regression.png`: fit visualization by k across N
