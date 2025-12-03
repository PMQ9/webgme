## InferenceTimeEstimator Plugin

Uses the fitted linear model
```
T = 0.02791429 + 0.01657143 * active_k + 0.00951429 * total_experts
```
to predict inference time and writes the value to an attribute on the active node.

### How to run (GUI)
1. Open your project and select a node (e.g., `MetaMoE_Model_UI`).
2. Right-click -> **Plugins** -> **InferenceTimeEstimator** (or use the Plugins tab).
3. Fill in:
   - `Total Experts` (>=1)
   - `Active Experts` (1..Total)
   - `Output Attribute` (defaults to `inference_time_estimate`)
4. Run. The predicted value appears as an attribute on the selected node in the Property Editor.

### How to run (CLI)
```
node node_modules/webgme-engine/src/bin/run_plugin.js \
  -p guest+MoE_UI -a guest -n MetaMoE_Model_UI \
  -i InferenceTimeEstimator \
  --activeExperts 3 --totalExperts 7 --outputAttributeName inference_time_estimate
```

### Notes
- Validation: activeExperts must be between 1 and totalExperts; totalExperts must be >=1.
- Coefficients match the regression from `inference_time_estimator` scripts.
