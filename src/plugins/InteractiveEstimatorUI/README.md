## InteractiveEstimatorUI Plugin

Generic client-side estimator with an in-UI modal. Configure coefficients in the dialog:
\[
T = b_0 + b_1 k + b_2 N + b_3 kN + b_4 k^2 + b_5 N^2
\]

### Usage
1. Select a node and run `InteractiveEstimatorUI` from the Plugins menu.
2. Inputs:
   - `Total Experts` (0 = auto-count children named "Experts" under the selected node)
   - `Active Experts`
   - Coefficients `b0..b5`
   - `Output Attribute` (default `estimate`)
3. Run. It updates attributes on the node (`meta_top_k`, `total_experts_estimate`, and the chosen output attribute) and shows a WebGME-styled modal with the predicted value.

### Notes
- Runs browser-side only (so it can render the modal).
- Safe to coexist with other plugins; this is independent of the inference-time estimator. Teammates can drop in their own coefficients.
