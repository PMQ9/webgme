## InteractiveEstimatorUI (UI-only)

UI-only plugin that reads precomputed values from node attributes and displays them in a WebGME modal. No coefficients or compute are bundled.

Defaults (configurable in the dialog):
- `estimateAttribute`: `inference_time_estimate`
- `totalAttribute`: `total_experts_estimate`
- `activeAttribute`: `meta_top_k`

Usage:
1. Select a node and run `InteractiveEstimatorUI`.
2. It reads the configured attributes, posts a message, and shows a modal with the values.
3. Use this as a reusable UI shell; task-specific plugins should write the estimate/attributes beforehand.
