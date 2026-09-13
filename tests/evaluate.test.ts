import { describe, expect, it } from "vitest";
import { evaluate } from "../src/lib/evaluate";
import { dateTimestamp, planSchema, validateWindow, type ClaimPlan, type GraphSnapshot } from "../src/lib/types";

const plan: ClaimPlan = { metric: "volumeUSD", comparison: "multiplier", operator: "eq", value: "5", targetDate: "2026-09-12", baselineDate: "2026-09-11", interpretation: "Five times the previous day’s volume." };
function source(baseline = "200", current = "1000"): GraphSnapshot {
  return { pool: { id: "0xpool", feeTier: "500", token0: { id: "a", symbol: "USDC" }, token1: { id: "b", symbol: "WETH" } }, observations: [{ date: dateTimestamp("2026-09-11"), volumeUSD: baseline, txCount: "10" }, { date: dateTimestamp("2026-09-12"), volumeUSD: current, txCount: "50" }], provenance: { provider: "The Graph", chain: "Ethereum mainnet", subgraphId: "test", deployment: "test", block: { number: 1, hash: null, timestamp: dateTimestamp("2026-09-13") }, retrievedAt: "2026-09-13T01:00:00Z", indexingLagSeconds: 0, hasIndexingErrors: false, query: "test fixture", variables: {}, explorerUrl: "" } };
}
describe("claim calculations", () => {
  it("distinguishes 5× from a 500% increase", () => {
    expect(evaluate(plan, source()).verdict).toBe("supported");
    expect(evaluate(plan, source()).percentChange).toBe("400.00000000");
    expect(evaluate({ ...plan, comparison: "percentage_change", value: "500" }, source()).verdict).toBe("contradicted");
  });
  it("never treats a missing day as zero", () => {
    const data = source(); data.observations.shift();
    expect(evaluate(plan, data).verdict).toBe("insufficient_data");
  });
  it("refuses duplicate daily rows", () => {
    const data = source(); data.observations.push(data.observations[0]);
    expect(evaluate(plan, data).verdict).toBe("insufficient_data");
  });
  it("refuses a zero denominator, including zero to zero", () => {
    expect(evaluate(plan, source("0", "100")).headline).toBe("There is no valid denominator");
    expect(evaluate(plan, source("0", "0")).verdict).toBe("insufficient_data");
  });
  it("requires indexing through the entire target day", () => {
    const data = source(); data.provenance.block.timestamp -= 1;
    expect(evaluate(plan, data).verdict).toBe("insufficient_data");
  });
  it("rejects indexing errors", () => {
    const data = source(); data.provenance.hasIndexingErrors = true;
    expect(evaluate(plan, data).verdict).toBe("insufficient_data");
  });
  it("uses decimal arithmetic for very large counts", () => {
    const data = source(); data.observations[0].txCount = "10000000000000000001"; data.observations[1].txCount = "10000000000000000002";
    expect(evaluate({ ...plan, metric: "txCount", comparison: "percentage_change", value: "0" }, data).absoluteChange).toBe("1");
  });
  it("checks strict thresholds without equality tolerance", () => {
    expect(evaluate({ ...plan, operator: "gt" }, source()).verdict).toBe("contradicted");
    expect(evaluate({ ...plan, operator: "gte" }, source()).verdict).toBe("supported");
  });
  it("handles percentage decreases", () => {
    const result = evaluate({ ...plan, comparison: "percentage_change", value: "-50" }, source("200", "100"));
    expect(result.verdict).toBe("supported"); expect(result.absoluteChange).toBe("-100");
  });
  it("checks an absolute value without a baseline", () => {
    expect(evaluate({ ...plan, comparison: "absolute", baselineDate: null, value: "1000" }, source()).verdict).toBe("supported");
  });
});
describe("date and plan validation", () => {
  it("rejects impossible dates", () => expect(planSchema.safeParse({ ...plan, targetDate: "2026-02-30" }).success).toBe(false));
  it("requires a baseline for relative claims", () => expect(planSchema.safeParse({ ...plan, baselineDate: null }).success).toBe(false));
  it("rejects today even when the local timezone has advanced", () => expect(() => validateWindow({ ...plan, targetDate: "2026-09-13" }, Date.parse("2026-09-13T20:00:00Z"))).toThrow("completed UTC"));
  it("rejects dates older than the supported window", () => expect(() => validateWindow({ ...plan, baselineDate: "2026-01-01" }, Date.parse("2026-09-13T10:00:00Z"))).toThrow("90"));
});
