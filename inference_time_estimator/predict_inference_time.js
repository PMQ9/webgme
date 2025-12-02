/**
 * Predict inference time with the fitted linear model:
 *   T = 0.02791429 + 0.01657143 * active_k + 0.00951429 * total_experts
 *
 * Usage:
 *   node predict_inference_time.js --total 4 --active 3
 *   node predict_inference_time.js --table
 */

const COEFFICIENTS = {
  intercept: 0.02791429,
  perActive: 0.01657143,
  perTotal: 0.00951429,
};

function predict(total, active) {
  if (total < 1 || total > 5) {
    throw new Error("total_experts must be between 1 and 5");
  }
  if (active < 1 || active > total) {
    throw new Error("active_experts must be between 1 and total_experts");
  }
  const { intercept, perActive, perTotal } = COEFFICIENTS;
  return intercept + perActive * active + perTotal * total;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--table") {
      args.table = true;
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

function printTable() {
  console.log("Predicted inference time (same units as training data):");
  for (let total = 1; total <= 5; total++) {
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
    printTable();
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
