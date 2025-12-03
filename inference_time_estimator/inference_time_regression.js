/**
 * Fit a quadratic-feature regression for inference time:
 *   T = b0 + b1 * k + b2 * N + b3 * kN + b4 * k^2 + b5 * N^2
 * Generate an HTML plot comparing actual points vs. predictions.
 */

const fs = require("fs");
const path = require("path");

const DATA = [
  { total: 2, active: 1, time: 0.071 },
  { total: 2, active: 2, time: 0.079 },
  { total: 3, active: 1, time: 0.074 },
  { total: 3, active: 2, time: 0.092 },
  { total: 3, active: 3, time: 0.094 },
  { total: 4, active: 1, time: 0.077 },
  { total: 4, active: 2, time: 0.106 },
  { total: 4, active: 3, time: 0.117 },
  { total: 4, active: 4, time: 0.128 },
  { total: 5, active: 1, time: 0.078 },
  { total: 5, active: 2, time: 0.118 },
  { total: 5, active: 3, time: 0.132 },
  { total: 5, active: 4, time: 0.146 },
  { total: 5, active: 5, time: 0.156 },
];

function fitLinearModel(data) {
  // X: [1, k, N, kN, k^2, N^2]
  const X = data.map((d) => [
    1,
    d.active,
    d.total,
    d.active * d.total,
    d.active * d.active,
    d.total * d.total,
  ]);
  const y = data.map((d) => d.time);

  // Compute (X^T X)^{-1} X^T y via normal equations
  const Xt = transpose(X);
  const XtX = multiply(Xt, X);
  const XtY = multiplyVector(Xt, y);
  const XtXInv = invertMatrix(XtX);
  const coef = multiplyVector(XtXInv, XtY); // [b0..b5]

  const predictions = X.map((row) =>
    row.reduce((sum, val, idx) => sum + val * coef[idx], 0)
  );
  const r2 = computeR2(y, predictions);
  return { coef, r2 };
}

function transpose(m) {
  return m[0].map((_, col) => m.map((row) => row[col]));
}

function multiply(A, B) {
  const rows = A.length;
  const cols = B[0].length;
  const out = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      for (let k = 0; k < B.length; k++) {
        out[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return out;
}

function multiplyVector(A, v) {
  return A.map((row) => row.reduce((sum, val, idx) => sum + val * v[idx], 0));
}

function invertMatrix(m) {
  // Gauss-Jordan inversion for small matrices
  const n = m.length;
  const a = m.map((row) => row.slice());
  const inv = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__2, j) => (i === j ? 1 : 0))
  );
  for (let i = 0; i < n; i++) {
    let pivot = a[i][i];
    if (Math.abs(pivot) < 1e-12) {
      throw new Error("Matrix not invertible");
    }
    const invPivot = 1 / pivot;
    for (let j = 0; j < n; j++) {
      a[i][j] *= invPivot;
      inv[i][j] *= invPivot;
    }
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = a[k][i];
      for (let j = 0; j < n; j++) {
        a[k][j] -= factor * a[i][j];
        inv[k][j] -= factor * inv[i][j];
      }
    }
  }
  return inv;
}

function computeR2(yTrue, yPred) {
  const mean = yTrue.reduce((s, v) => s + v, 0) / yTrue.length;
  const ssTot = yTrue.reduce((s, v) => s + (v - mean) ** 2, 0);
  const ssRes = yTrue.reduce((s, v, idx) => s + (v - yPred[idx]) ** 2, 0);
  return 1 - ssRes / ssTot;
}

function predict(coef, total, active) {
  const [b0, b1, b2, b3, b4, b5] = coef;
  return (
    b0 +
    b1 * active +
    b2 * total +
    b3 * active * total +
    b4 * active * active +
    b5 * total * total
  );
}

function uniqueKs(data) {
  return [...new Set(data.map((d) => d.active))].sort((a, b) => a - b);
}

function buildHtmlPlot(coef) {
  const palette = {
    1: "#2563eb",
    2: "#dc2626",
    3: "#f59e0b",
    4: "#10b981",
    5: "#8b5cf6",
  };
  const traces = [];
  const ks = uniqueKs(DATA);
  const totals = [1, 2, 3, 4, 5];
  ks.forEach((k) => {
    const actual = DATA.filter((d) => d.active === k);
    if (actual.length > 0) {
      traces.push({
        x: actual.map((d) => d.total),
        y: actual.map((d) => d.time),
        mode: "markers",
        name: `actual k=${k}`,
        marker: { color: palette[k] || "gray", size: 8 },
      });
    }
    const feasibleTotals = totals.filter((t) => t >= k);
    traces.push({
      x: feasibleTotals,
      y: feasibleTotals.map((t) => predict(coef, t, k)),
      mode: "lines",
      name: `pred k=${k}`,
      line: { color: palette[k] || "gray" },
    });
  });

  const equation = `T = ${coef[0].toFixed(6)} + ${coef[1].toFixed(
    6
  )}*k + ${coef[2].toFixed(6)}*N + ${coef[3].toFixed(
    6
  )}*kN + ${coef[4].toFixed(6)}*k^2 + ${coef[5].toFixed(6)}*N^2`;

  const layout = {
    title: "Inference Time Linear Fit (JS)",
    xaxis: { title: "Total Experts", dtick: 1 },
    yaxis: { title: "Inference Time (units from data)" },
    legend: { orientation: "h" },
    annotations: [
      {
        text: equation,
        xref: "paper",
        yref: "paper",
        x: 0,
        y: -0.2,
        showarrow: false,
        font: { size: 12 },
      },
    ],
    margin: { b: 90 },
  };

  const plotScript = `
    const traces = ${JSON.stringify(traces)};
    const layout = ${JSON.stringify(layout)};
    Plotly.newPlot('plot', traces, layout);
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Inference Time Regression (JS)</title>
  <script src="https://cdn.plot.ly/plotly-2.24.1.min.js"></script>
</head>
<body>
  <div id="plot" style="width: 900px; height: 600px;"></div>
  <script>${plotScript}</script>
</body>
</html>`;
}

function main() {
  const { coef, r2 } = fitLinearModel(DATA);
  console.log(
    "Coefficients (T = b0 + b1*k + b2*N + b3*kN + b4*k^2 + b5*N^2):"
  );
  console.log(`  b0 = ${coef[0].toFixed(8)}`);
  console.log(`  b1 = ${coef[1].toFixed(8)}`);
  console.log(`  b2 = ${coef[2].toFixed(8)}`);
  console.log(`  b3 = ${coef[3].toFixed(8)}`);
  console.log(`  b4 = ${coef[4].toFixed(8)}`);
  console.log(`  b5 = ${coef[5].toFixed(8)}`);
  console.log(`R^2 = ${r2.toFixed(4)}`);

  const html = buildHtmlPlot(coef);
  const outPath = path.join(__dirname, "inference_time_regression.html");
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`Plot HTML saved to ${outPath}`);
}

if (require.main === module) {
  main();
}
