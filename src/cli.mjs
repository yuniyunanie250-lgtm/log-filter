#!/usr/bin/env node
import { build } from "./logfilter.mjs";

const HELP = `log-filter -- build an eth_getLogs filter

usage:
  log-filter <address> [topic0] [topic1] [topic2] [topic3]

a topic may be a comma-separated list of alternatives, or "-" for a wildcard.
the output is a JSON object you can paste into an eth_getLogs call.

example:
  log-filter 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
    0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef -
`;

function main(argv) {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    process.stdout.write(HELP);
    return;
  }
  const [address, ...topics] = argv;
  const spec = {
    address,
    topics: topics.map((t) => {
      if (t === "-") return null;
      return t.includes(",") ? t.split(",") : t;
    }),
  };
  console.log(JSON.stringify(build(spec), null, 2));
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`log-filter: ${err.message}`);
  process.exit(1);
}
