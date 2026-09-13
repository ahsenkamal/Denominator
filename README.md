# Denominator

Check the numbers behind a crypto claim. Built from scratch for ETHOnline 2026, targeting **The Graph — Best AI Tooling or AI Use Case (From Scratch)**.

Denominator interprets a claim about one Uniswap v3 pool, queries The Graph for real daily observations, computes the comparison deterministically, and exports the evidence. A large percentage should never hide its denominator.

## Run locally

Requires Node.js 22 or newer.

```sh
npm install
cp .env.example .env.local
# Fill in GRAPH_API_KEY and LLM_API_KEY, and select LLM_PROVIDER / LLM_MODEL.
npm run dev
```

Secrets stay on the server and `.env.local` is ignored by Git. Existing public subgraphs are queried; this project does not deploy contracts or require visitors to connect a wallet.

## Scope

- Ethereum mainnet, curated Uniswap v3 pools
- Daily USD volume and indexed transaction counts
- Explicit, completed UTC dates
- Deterministic comparisons; AI interprets language but does not determine truth
- Visible provenance, missing-data handling, and exportable evidence

## Development

Implementation is in progress. No fixture results count as live integration. The first external verification is a real query against the configured Graph deployment plus a real inference request.

```sh
npm run check
npm run build
```

## Original work

Project-specific code and design started during ETHOnline 2026. Public frameworks and libraries are dependencies. Development is assisted by Codex; incremental Git history records completed work.
