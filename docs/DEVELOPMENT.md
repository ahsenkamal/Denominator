# Checkpoint and release workflow

The verified initial demo is tagged `v0.1.0-demo-checkpoint` at commit `7620d8c`.

The checkpoint contains the working Gemini interpretation, live Graph evidence, deterministic verdicts and downloadable receipts. Its production deployment passed the build, 19 automated tests, and live API/browser checks.

Further development starts on `feat/evidence-expansion`. Keep incremental commits on feature branches. Do not push experimental application changes directly to `main`, merge incomplete work, or deploy an unfinished branch to production. The existing Vercel production app follows `main`.

Before merging a feature branch:

- Complete the feature and document its actual supported scope.
- Pass TypeScript, relevant automated tests and the production build.
- Verify the new data integrations against real services; fixtures alone do not qualify.
- Exercise the affected browser flows, evidence exports and responsive layout.
- Resolve material failures and review the diff before merging.

A passing build alone is not sufficient. Preserve the checkpoint tag as the original version; do not move or overwrite it. Compare changes with `git diff v0.1.0-demo-checkpoint...HEAD`.

These rules record the user's request to keep the initial version recoverable and merge subsequent work only when completely working.
