/**
 * Build and match eth_getLogs filters.
 *
 * A log filter is a small language that is easy to get subtly wrong: a topic
 * position can be "any", one value, or a set of alternatives, and a filter with
 * an empty alternatives array matches nothing rather than everything. This
 * implements the matching rules explicitly so a filter can be checked offline
 * against logs you already have, before spending a request on it.
 */

export function strip0x(s) {
  return s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s;
}

/** Normalise a 32-byte topic to lowercase 0x form. */
export function topic(value) {
  const s = strip0x(String(value)).toLowerCase();
  if (s.length !== 64) throw new Error(`topic must be 32 bytes, got ${s.length / 2}`);
  if (!/^[0-9a-f]*$/.test(s)) throw new Error(`non-hex topic: ${value}`);
  return "0x" + s;
}

/**
 * Build a filter object for eth_getLogs.
 * @param {{address?: string|string[], topics?: (string|string[]|null)[],
 *          fromBlock?: string|number, toBlock?: string|number}} spec
 */
export function build(spec = {}) {
  const out = {};
  if (spec.address !== undefined) {
    out.address = Array.isArray(spec.address)
      ? spec.address.map(lower)
      : lower(spec.address);
  }
  if (spec.topics) {
    out.topics = spec.topics.map((t) => {
      if (t === null || t === undefined) return null;
      return Array.isArray(t) ? t.map(topic) : topic(t);
    });
    if (out.topics.length > 4) throw new Error("a log has at most 4 topics");
  }
  if (spec.fromBlock !== undefined) out.fromBlock = toBlockTag(spec.fromBlock);
  if (spec.toBlock !== undefined) out.toBlock = toBlockTag(spec.toBlock);
  return out;
}

function lower(addr) {
  const s = strip0x(String(addr)).toLowerCase();
  if (s.length !== 40) throw new Error(`address must be 20 bytes, got ${s.length / 2}`);
  return "0x" + s;
}

function toBlockTag(v) {
  if (typeof v === "number") {
    if (!Number.isInteger(v) || v < 0) throw new Error(`bad block number: ${v}`);
    return "0x" + v.toString(16);
  }
  if (["latest", "earliest", "pending", "safe", "finalized"].includes(v)) return v;
  if (/^0x[0-9a-f]+$/i.test(v)) return v.toLowerCase();
  throw new Error(`bad block tag: ${v}`);
}

/**
 * Does a log match a filter? Both sides are plain objects, so this works on
 * logs fetched from a node or read from a fixture file.
 */
export function matches(filter, log) {
  if (filter.address !== undefined) {
    const wanted = Array.isArray(filter.address) ? filter.address : [filter.address];
    const got = lower(log.address);
    if (!wanted.includes(got)) return false;
  }
  const wanted = filter.topics ?? [];
  const got = (log.topics ?? []).map(topic);
  for (let i = 0; i < wanted.length; i++) {
    const slot = wanted[i];
    if (slot === null || slot === undefined) continue; // wildcard
    const alternatives = Array.isArray(slot) ? slot : [slot];
    if (alternatives.length === 0) return false; // empty set matches nothing
    if (got[i] === undefined || !alternatives.includes(got[i])) return false;
  }
  return true;
}

/** Keep only the logs that match. */
export function filter(logs, spec) {
  const f = build(spec);
  return logs.filter((l) => matches(f, l));
}
