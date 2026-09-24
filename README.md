# log-filter

Build `eth_getLogs` filters and match them against logs you already have, with no
node and no dependencies.

Event filtering is a small language that is easy to get subtly wrong, and the
mistakes cost real requests: a filter that matches nothing looks identical to a
filter that is correct but has no results yet.

## Usage

```bash
npx github:yuniyunanie250-lgtm/log-filter 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef -
```

```json
{
  "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "topics": [
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    null
  ]
}
```

As a library:

```js
import { build, matches, filter } from "log-filter";
const f = build({ address: USDC, topics: [TRANSFER, null] });
matches(f, someLog);            // boolean
filter(logs, { address: USDC }); // subset
```

## Rules made explicit

- **An empty alternatives array matches nothing.** `topics: [[]]` is an empty
  set. Tools that treat it as "no constraint" silently over-fetch.
- **A wildcard is `null`, not an empty string.** `null` means "any value at this
  position"; `undefined` slots beyond the array length are simply not checked.
- **Addresses and topics are lowercased.** Hex comparison is case-insensitive on
  the wire, but mixed-case addresses in an EIP-55 checksum form would never
  string-match a node's lowercase output.
- **Block numbers become hex tags**; the named tags pass through unchanged.
- **At most 4 topics**, because a log cannot have more.

## What it does not do

- **No RPC calls.** It builds and matches; fetching is the caller's job.
- **No ABI decoding.** Topics are opaque 32-byte values here. Decoding indexed
  arguments needs the event ABI.
- **No block-range validation against the chain.** It checks shape, not whether a
  range is too wide for the provider.

## Development

```bash
npm test
```

## License

MIT
