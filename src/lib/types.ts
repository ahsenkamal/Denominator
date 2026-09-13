import { z } from "zod";

export const DAY = 86400;
export const numeric = z.string().regex(/^-?\d{1,30}(\.\d{1,18})?$/);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date;
}, "Use a real date in YYYY-MM-DD format.");

export const planSchema = z.object({
  metric: z.enum(["volumeUSD", "txCount"]),
  comparison: z.enum(["percentage_change", "multiplier", "absolute"]),
  operator: z.enum(["eq", "gte", "lte", "gt", "lt"]),
  value: numeric,
  targetDate: dateSchema,
  baselineDate: dateSchema.nullable(),
  interpretation: z.string().min(1).max(800),
}).strict().superRefine((plan, ctx) => {
  if (plan.comparison !== "absolute" && !plan.baselineDate) ctx.addIssue({ code: "custom", message: "A comparison needs a baseline date.", path: ["baselineDate"] });
  if (plan.comparison === "absolute" && plan.baselineDate !== null) ctx.addIssue({ code: "custom", message: "An absolute claim does not use a baseline date.", path: ["baselineDate"] });
  if (plan.baselineDate && plan.baselineDate >= plan.targetDate) ctx.addIssue({ code: "custom", message: "The baseline must be earlier than the target day.", path: ["baselineDate"] });
  if (Number(plan.value) < 0 && plan.comparison !== "percentage_change") ctx.addIssue({ code: "custom", message: "This comparison cannot have a negative target.", path: ["value"] });
  if (Number(plan.value) < -100 && plan.comparison === "percentage_change") ctx.addIssue({ code: "custom", message: "A nonnegative metric cannot decrease by more than 100%.", path: ["value"] });
});

export type ClaimPlan = z.infer<typeof planSchema>;
export const claimInputSchema = z.object({ claim: z.string().trim().min(8).max(1200), poolId: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }).strict();
export const verifyInputSchema = claimInputSchema.extend({ plan: planSchema }).strict();

export type Interpretation =
  | { status: "ready"; plan: ClaimPlan; model: string; provider: string }
  | { status: "needs_clarification" | "unsupported"; message: string };

export type Observation = { date: number; volumeUSD: string; txCount: string };
export type GraphSnapshot = {
  pool: { id: string; feeTier: string; token0: { id: string; symbol: string }; token1: { id: string; symbol: string } };
  observations: Observation[];
  provenance: {
    provider: "The Graph"; chain: "Ethereum mainnet"; subgraphId: string; deployment: string;
    block: { number: number; hash: string | null; timestamp: number };
    retrievedAt: string; indexingLagSeconds: number; hasIndexingErrors: boolean;
    query: string; variables: Record<string, number>; explorerUrl: string;
  };
};

export type Evaluation = {
  verdict: "supported" | "contradicted" | "insufficient_data";
  headline: string; explanation: string; correctedClaim: string | null;
  baseline: string | null; current: string | null; actual: string | null;
  absoluteChange: string | null; percentChange: string | null; multiple: string | null;
  tolerance: string; formula: string; notes: string[];
};

export type Receipt = {
  version: "1.0"; id: string; claim: string; poolLabel: string; plan: ClaimPlan;
  evaluation: Evaluation; snapshot: GraphSnapshot; interpretationConfirmedByUser: true;
};

export function dateTimestamp(date: string) { return Date.parse(`${date}T00:00:00Z`) / 1000; }
export function utcDate(offset = 0, now = Date.now()) { return new Date(now + offset * DAY * 1000).toISOString().slice(0, 10); }
export function validateWindow(plan: ClaimPlan, now = Date.now()) {
  const today = utcDate(0, now);
  const earliest = utcDate(-90, now);
  for (const date of [plan.targetDate, plan.baselineDate].filter((d): d is string => Boolean(d))) {
    if (date >= today) throw new Error("Choose a completed UTC day. Today’s partial data cannot verify a daily claim.");
    if (date < earliest) throw new Error("This version supports the last 90 completed UTC days.");
  }
}
