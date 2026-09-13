# Denominator

**Big claims. Meet the small print.**

Denominator turns a claim about an onchain pool into a measurement you can inspect. Gemini interprets the language; the user confirms the scope; The Graph supplies real observations; decimal arithmetic determines the verdict. Every result includes its denominator, dates, query, block, exact values and an exportable receipt.

Built from scratch for **ETHOnline 2026 — The Graph: Best AI Tooling or AI Use Case (From Scratch)**. No wallet, contracts, database or new subgraph deployment is required.

## Try it

Choose ETH / USDC · 0.05% and select **The big percentage**. Click **Interpret claim**, review the dates and comparison, then **Confirm & check evidence**. Open **Inspect the evidence** and download the receipt. Example cards are unverified claims, not preset results.

**Live app: [denominator-three.vercel.app](https://denominator-three.vercel.app)**

See [the demo and submission guide](docs/DEMO.md).

## Run locally

Use Node.js 24 LTS and npm.

```sh
npm ci
cp .env.example .env.local
# Set GRAPH_API_KEY and LLM_API_KEY in .env.local.
npm run dev
```

| Variable            | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `GRAPH_API_KEY`     | The Graph query API key, server only                         |
| `GRAPH_SUBGRAPH_ID` | Ethereum Uniswap v3 subgraph; a verified default is included |
| `LLM_API_KEY`       | Google Gemini API key, server only                           |
| `LLM_PROVIDER`      | `gemini`                                                     |
| `LLM_MODEL`         | `gemini-3.6-flash`, verified with the development account    |
| `DEMO_ACCESS_CODE`  | Optional shared code to restrict public inference requests   |

Keys and `.vercel` credentials are ignored by Git. Never prefix secrets with `NEXT_PUBLIC_`. Model availability and free-tier quota depend on the Google account.

## How it works

```text
Claim + selected pool
  → POST /api/interpret → Gemini structured interpretation → schema validation
  → user confirms the metric, UTC dates, threshold and comparison
  → POST /api/verify → The Graph metadata preflight
  → evidence query pinned to the preflight block hash
  → validate source identity, deployment, metadata and observations
  → Decimal evaluation → visible evidence + JSON receipt
```

The Graph is the source of every numerical verdict. The server calls its gateway using a Bearer authorization header and an existing public Uniswap v3 subgraph. It first obtains an indexed block header, then uses that block's **hash** for all evidence fields. Historical `_meta` responses can omit timestamp and hash; the verified preflight header is retained after checking the deployment and block number. The full pinned query and variables are in each receipt.

The receipt ID is SHA-256 of `JSON.stringify(payload)` before adding `id`. It detects changes relative to a previously trusted checksum. It is not a signature, onchain attestation, or independent proof that the indexer is correct. Historical query replay depends on indexer retention.

## Boundaries

- Four curated Ethereum Uniswap v3 pools; one fee tier at a time.
- Daily `volumeUSD` and indexed `txCount`, within the last 90 completed UTC days.
- Percentage change, multipliers, and absolute comparisons; explicit baseline required for relative comparisons.
- Missing or duplicate required observations produce insufficient data. Missing days are never converted to zeros. A zero denominator remains undefined.
- Indexing must cover the end of the requested day. Invalid identity, incomplete source metadata, and upstream failures stop verification.
- USD volume is derived by the subgraph. `txCount` is not unique traders and is not necessarily swap-only activity. Pool evidence does not describe a whole token or protocol.
- Equality tolerance is ±1 percentage point, ±0.01×, ±$0.01, or exact transaction count. Inequality comparisons use exact thresholds.
- AI may misinterpret language: user review is required before evidence retrieval. The verdict assesses that confirmed interpretation.

No shared claim database is used. Claim text is sent to Gemini; pool and date queries go to The Graph. Public endpoints include validation, timeouts, sanitized errors and basic per-process throttling. This throttle resets across serverless instances and is **not a distributed spending cap**. Configure provider budgets or the optional access code when needed.

## Validation

```sh
npm run check       # TypeScript + 19 arithmetic, date and Graph snapshot tests
npm run build       # Production build; no keys required at build time
npm run verify:live # Real Gemini + Graph call; requires .env.local and running app
npm run test:browser # Navigation and responsive layout
# LIVE_BROWSER=1 npm run test:browser also exercises live APIs + receipt download
```

The browser script uses a portable Chromium bundle for this Linux workspace. It checks desktop/mobile layout and navigation, writes screenshots to `/tmp`, and can target a deployed app using `APP_URL`.

`verify:live` asserts interpretation fields, real Graph provenance, a computed verdict and receipt checksum. It consumes API quota and writes a receipt to `/tmp/denominator-live-receipt.json`. Use `APP_URL=https://your-deployment.example npm run verify:live` against a deployment. Numerical test fixtures are isolated to tests; the product never falls back to fabricated results.

## Deploy on Vercel

Import this GitHub repository as a Next.js project. Use Node.js 24.x. Add the variables above to the **Production** environment, then deploy. `/api/status` reports configuration presence without revealing credentials; use a real claim to check connectivity. Preview deployments need their own environment settings if you want API functionality there.

## Original work

Project-specific application code, evaluation logic, evidence receipts and design were created during ETHOnline 2026, with Codex assistance. Git history records incremental completed work. Next.js, React, Gemini and the public Uniswap v3 subgraph are existing dependencies/services. This submission queries an existing subgraph; it does not claim to have built the Uniswap indexer.
