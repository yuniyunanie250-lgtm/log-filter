import { test } from "node:test";
import assert from "node:assert/strict";
import { build, filter, matches, topic } from "../src/logfilter.mjs";

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const pair = (a) => "0x" + a.slice(2).padStart(64, "0");

test("topics are normalised and length-checked", () => {
  assert.equal(topic("0X" + TRANSFER.slice(2).toUpperCase()), TRANSFER);
  assert.throws(() => topic("0x1234"), /32 bytes/);
  assert.throws(() => topic("0x" + "zz".repeat(32)), /non-hex/);
});

test("build lowercases the address and keeps topics", () => {
  const f = build({ address: USDC, topics: [TRANSFER, null] });
  assert.equal(f.address, USDC.toLowerCase());
  assert.deepEqual(f.topics, [TRANSFER, null]);
});

test("too many topics is rejected", () => {
  assert.throws(() => build({ topics: [TRANSFER, TRANSFER, TRANSFER, TRANSFER, TRANSFER] }),
    /at most 4/);
});

test("block numbers convert to tags and named tags pass through", () => {
  assert.equal(build({ fromBlock: 19000000 }).fromBlock, "0x121eac0");
  assert.equal(build({ toBlock: "latest" }).toBlock, "latest");
  assert.throws(() => build({ fromBlock: -1 }), /bad block number/);
  assert.throws(() => build({ toBlock: "soon" }), /bad block tag/);
});

test("matches a real-shaped transfer log", () => {
  const f = build({ address: USDC, topics: [TRANSFER] });
  const log = {
    address: USDC.toLowerCase(),
    topics: [TRANSFER, pair("0x1111111111111111111111111111111111111111"),
             pair("0x2222222222222222222222222222222222222222")],
  };
  assert.equal(matches(f, log), true);
});

test("a wildcard slot matches any topic at that position", () => {
  // note the filter's non-wildcard slots must be the SAME normalised values the
  // log carries: pair("0x2222") and pair("0x2222222222222222222222222222222222222222")
  // are different 32-byte words, and comparing them is a test bug, not a code bug
  const f = build({ topics: [TRANSFER, null, pair("0x2222")] });
  const log = { address: USDC.toLowerCase(), topics: [TRANSFER, pair("0x9999"), pair("0x2222")] };
  assert.equal(matches(f, log), true);

  // the wildcard is doing the work: a wrong value in slot 2 must fail
  const strict = build({ topics: [TRANSFER, null, pair("0x3333")] });
  assert.equal(matches(strict, log), false);
});

test("an empty alternatives array matches nothing, not everything", () => {
  const f = build({ topics: [[TRANSFER]] });
  f.topics[0] = [];
  const log = { address: USDC.toLowerCase(), topics: [TRANSFER] };
  assert.equal(matches(f, log), false);
});

test("a log shorter than the filter does not match", () => {
  const f = build({ topics: [TRANSFER, pair("0x1111")] });
  const log = { address: USDC.toLowerCase(), topics: [TRANSFER] };
  assert.equal(matches(f, log), false);
});

test("address list is an OR", () => {
  const f = build({ address: [USDC, "0x0000000000000000000000000000000000000001"] });
  assert.equal(f.address.length, 2);
  const log = { address: "0x0000000000000000000000000000000000000001", topics: [] };
  assert.equal(matches(f, log), true);
});

test("filter picks the matching subset", () => {
  const logs = [
    { address: USDC.toLowerCase(), topics: [TRANSFER] },
    { address: "0x0000000000000000000000000000000000000009", topics: [TRANSFER] },
  ];
  assert.equal(filter(logs, { address: USDC }).length, 1);
});
