# Demo and submission guide

## Before recording

Open the production app in a clean browser window. Select **ETH / USDC · 0.05%**. Keep the browser at about 1440 × 1000 and 100% zoom. Close unrelated tabs. Run one complete check first to verify quota and connectivity, then reset the form. Do not show environment files or API keys.

## A roughly three-minute walkthrough

**0:00–0:25 — The problem**

“Crypto headlines love percentages. A number like 5× means little without the pool, time window and denominator. Denominator turns a claim into a checkable comparison and shows the evidence behind the answer.”

**0:25–1:00 — AI with a clear job**

Select **The big percentage** and click **Interpret claim**.

“Gemini extracts the metric, dates and comparison. It doesn't decide whether the statement is true. I review this interpretation first, so the app doesn't quietly check a different claim.”

Point out the pool fee tier and both complete UTC dates. Click **Confirm & check evidence**.

**1:00–1:45 — The Graph and the denominator**

“The Graph supplies real daily observations from the Ethereum Uniswap v3 subgraph. We pin the evidence to one block hash. Decimal arithmetic compares the measured values with the confirmed claim.”

Read the actual verdict and values from the screen. Point out the baseline, target, percentage and chart. Do not memorize a result that differs from what the app returns.

For the Sep 12 versus Sep 11, 2026 volume claim, the development verification observed approximately $20.83m versus $155.17m, a decline of 86.58%, contradicting a 50% increase. This is a recorded observation, not a hardcoded product result; the indexer can revise historical data.

**1:45–2:30 — Show the receipts**

Open **Inspect the evidence**. Show the block, formula, equality tolerance, query and exact values. Download the JSON receipt.

“Someone else can inspect the raw values and rerun the query with their own Graph key, subject to historical retention. The checksum is an integrity check, not a blockchain attestation.”

**2:30–3:00 — Why it matters**

“Denominator keeps AI on language and code on arithmetic. Missing observations don't become zeros, a zero denominator doesn't become infinity, and a single pool never silently becomes the whole market. The useful output is a corrected claim with evidence you can carry away.”

## Optional second claim

For the same pool, try:

> This pool's USD volume fell by more than 80% on 2026-09-12 compared with 2026-09-11.

Review that Gemini represents this as a percentage change **less than −80**. The previously observed values support it, but always use the returned live result. An ambiguity example is “This pool exploded yesterday”; the app should request a measurable claim instead of inventing one. Skip optional calls if free-tier quota is tight.

## Submission copy

**Name:** Denominator

**Short description:** An AI-assisted onchain claim checker that exposes the denominator and returns reproducible evidence from The Graph.

**What it does:** Users submit a claim about one Ethereum Uniswap v3 pool. Gemini extracts a structured comparison, the user confirms it, and The Graph supplies daily measurements pinned to a block hash. Deterministic decimal arithmetic produces a verdict, a corrected claim, and an exportable evidence receipt containing the source query, exact observations and checksum.

**How The Graph is used:** Every numerical verdict depends on live `poolDayDatas` and pool metadata from an existing public Uniswap v3 subgraph through The Graph gateway. A metadata preflight provides the block hash used to pin the evidence query. Receipts preserve the deployment, block, query, variables and source values for inspection and replay.

**What was built during the hackathon:** The application interface, structured AI interpretation, validation, Graph integration, deterministic comparison engine, evidence receipts, responsive layout and tests. Existing frameworks, Gemini and the public subgraph are dependencies.

**Limitations:** Selected Ethereum pools; complete daily volume and indexed transaction counts only. AI interpretations need user review. The indexer is the data source, not independently audited truth. Free-tier Gemini quota can limit availability.

## Final hand-in

- Use the **from-scratch** Graph AI track in the submission portal.
- Add the public production URL, GitHub repository and recorded demo URL.
- Explain the Graph integration using the copy above, including that it queries an existing subgraph.
- Confirm all required team, project and submission fields in the portal.
- Open the submitted URLs in a private window to confirm judges can access them.

A working submission does not guarantee a prize or stake refund; eligibility and acceptance are decided by the event.
