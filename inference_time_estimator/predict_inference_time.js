/**
 * Predict inference time with the fitted quadratic model:
 *   T = b0 + b1*k + b2*N + b3*kN + b4*k^2 + b5*N^2
 *
 * Usage:
 *   node predict_inference_time.js --total 4 --active 3
 *   node predict_inference_time.js --table --table-max 10
 */

const COEFFICIENTS = {
  b0: 0.05348109,
  b1: 0.00532143,
  b2: 0.00173004,
  b3: 0.00803571,
  b4: -0.00446429,
  b5: -0.00092752,
};

function predict(total, active) {
  if (total < 1) {
    throw new Error("total_experts must be at least 1");
  }
  if (active < 1 || active > total) {
    throw new Error("active_experts must be between 1 and total_experts");
  }
  const { b0, b1, b2, b3, b4, b5 } = COEFFICIENTS;
  return (
    b0 +
    b1 * active +
    b2 * total +
    b3 * active * total +
    b4 * active * active +
    b5 * total * total
  );
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--table") {
      args.table = true;
    } else if (arg === "--table-max") {
      args.tableMax = Number(argv[++i]);
    } else if (arg === "--total") {
      args.total = Number(argv[++i]);
    } else if (arg === "--active") {
      args.active = Number(argv[++i]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printTable(maxTotal = 10) {
  console.log("Predicted inference time (same units as training data):");
  for (let total = 1; total <= maxTotal; total++) {
    for (let active = 1; active <= total; active++) {
      const pred = predict(total, active);
      console.log(`total=${total} active=${active} -> ${pred.toFixed(5)}`);
    }
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (args.table) {
    const maxTotal = args.tableMax ?? 10;
    if (!Number.isFinite(maxTotal) || maxTotal < 1) {
      console.error("--table-max must be a positive integer");
      process.exit(1);
    }
    printTable(maxTotal);
    return;
  }

  if (args.total == null || args.active == null) {
    console.error("Usage: node predict_inference_time.js --total N --active K");
    console.error("   or: node predict_inference_time.js --table");
    process.exit(1);
  }

  try {
    const prediction = predict(args.total, args.active);
    console.log(
      `Predicted inference time for total=${args.total}, active=${args.active}: ${prediction.toFixed(
        5
      )}`
    );
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
