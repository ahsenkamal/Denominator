import Decimal from "decimal.js";
import {
  DAY,
  dateTimestamp,
  type ClaimPlan,
  type Evaluation,
  type GraphSnapshot,
} from "./types";

Decimal.set({ precision: 60 });
const metricName = (plan: ClaimPlan) =>
  plan.metric === "volumeUSD" ? "USD volume" : "indexed transaction count";
function formatted(value: Decimal, metric: ClaimPlan["metric"]) {
  const text = value
    .toFixed(metric === "volumeUSD" ? 2 : 0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return metric === "volumeUSD" ? `$${text}` : text;
}

export function evaluate(plan: ClaimPlan, snapshot: GraphSnapshot): Evaluation {
  const result: Evaluation = {
    verdict: "insufficient_data",
    headline: "The evidence is incomplete",
    explanation: "",
    correctedClaim: null,
    baseline: null,
    current: null,
    actual: null,
    absoluteChange: null,
    percentChange: null,
    multiple: null,
    tolerance: "",
    formula: "",
    notes: [],
  };
  const targetTs = dateTimestamp(plan.targetDate);
  if (
    snapshot.provenance.hasIndexingErrors ||
    snapshot.provenance.block.timestamp < targetTs + DAY
  ) {
    return {
      ...result,
      explanation:
        "The index has errors or has not indexed through the end of the target UTC day. A daily verdict would be premature.",
    };
  }
  const target = snapshot.observations.filter((d) => d.date === targetTs);
  const base = plan.baselineDate
    ? snapshot.observations.filter(
        (d) => d.date === dateTimestamp(plan.baselineDate!),
      )
    : [];
  if (
    target.length !== 1 ||
    (plan.comparison !== "absolute" && base.length !== 1)
  ) {
    return {
      ...result,
      explanation:
        "A required daily observation is missing or duplicated. Missing observations are not assumed to be zero.",
    };
  }
  const current = new Decimal(target[0][plan.metric]);
  const baseline = base.length ? new Decimal(base[0][plan.metric]) : null;
  if (
    !current.isFinite() ||
    current.isNegative() ||
    (baseline && (!baseline.isFinite() || baseline.isNegative()))
  ) {
    return {
      ...result,
      explanation: "The source returned an invalid value for this metric.",
    };
  }
  result.current = current.toFixed();
  result.baseline = baseline?.toFixed() ?? null;
  if (baseline) {
    result.absoluteChange = current.minus(baseline).toFixed();
    if (baseline.isZero())
      return {
        ...result,
        headline: "There is no valid denominator",
        explanation:
          "The baseline is zero. A percentage change or multiplier is undefined, even if the current value is also zero.",
        notes: ["Compare absolute values instead."],
      };
    result.percentChange = current
      .minus(baseline)
      .div(baseline)
      .mul(100)
      .toFixed(8);
    result.multiple = current.div(baseline).toFixed(8);
  }
  const actual =
    plan.comparison === "absolute"
      ? current
      : plan.comparison === "multiplier"
        ? current.div(baseline!)
        : current.minus(baseline!).div(baseline!).mul(100);
  const expected = new Decimal(plan.value);
  const tolerance =
    plan.comparison === "percentage_change"
      ? new Decimal(1)
      : plan.comparison === "multiplier"
        ? new Decimal("0.01")
        : new Decimal(plan.metric === "volumeUSD" ? "0.01" : 0);
  const passes =
    plan.operator === "eq"
      ? actual.minus(expected).abs().lte(tolerance)
      : plan.operator === "gte"
        ? actual.gte(expected)
        : plan.operator === "lte"
          ? actual.lte(expected)
          : plan.operator === "gt"
            ? actual.gt(expected)
            : actual.lt(expected);
  result.actual = actual.toFixed(8);
  result.tolerance =
    plan.operator !== "eq"
      ? "Exact threshold; no tolerance applied."
      : plan.comparison === "percentage_change"
        ? "±1 percentage point for equality claims."
        : plan.comparison === "multiplier"
          ? "±0.01× for equality claims."
          : plan.metric === "volumeUSD"
            ? "±$0.01 for equality claims."
            : "Exact integer equality.";
  result.verdict = passes ? "supported" : "contradicted";
  result.headline = passes
    ? "The numbers support this claim"
    : "The numbers tell a different story";
  result.formula =
    plan.comparison === "absolute"
      ? "observed daily value"
      : plan.comparison === "multiplier"
        ? "target ÷ baseline"
        : "((target − baseline) ÷ baseline) × 100";
  result.correctedClaim = baseline
    ? `${metricName(plan)} changed from ${formatted(baseline, plan.metric)} on ${plan.baselineDate} to ${formatted(current, plan.metric)} on ${plan.targetDate}: ${new Decimal(result.percentChange!).gte(0) ? "+" : ""}${new Decimal(result.percentChange!).toFixed(2)}% (${new Decimal(result.multiple!).toFixed(2)}× the baseline). Both are complete UTC days for this selected pool.`
    : `${metricName(plan)} was ${formatted(current, plan.metric)} on ${plan.targetDate}, a complete UTC day for this selected pool.`;
  result.explanation = passes
    ? "The observed value meets the confirmed comparison under the stated tolerance. Check the baseline and scope before repeating the headline."
    : "The observed value does not meet the confirmed comparison under the stated tolerance. The rewritten claim below preserves the measured values.";
  result.notes.push(
    "This measures one pool and fee tier, not the entire token, exchange, or chain.",
  );
  if (plan.metric === "volumeUSD")
    result.notes.push(
      "USD volume is the subgraph’s derived valuation, not independently audited dollar settlement.",
    );
  else
    result.notes.push(
      "txCount follows the subgraph mapping’s activity-count semantics; it is not a count of unique traders or necessarily swap-only transactions.",
    );
  if (baseline && baseline.lt(plan.metric === "volumeUSD" ? 10000 : 100))
    result.notes.push(
      `Small baseline: below ${plan.metric === "volumeUSD" ? "$10,000" : "100 indexed transactions"}. Large percentage changes can describe small absolute activity. This is a context heuristic, not a verdict rule.`,
    );
  if (snapshot.provenance.indexingLagSeconds > 900)
    result.notes.push(
      "The index is over 15 minutes behind retrieval time, but has covered both requested days.",
    );
  return result;
}
