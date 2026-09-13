import { createHash } from "node:crypto";
import { guard, readBody, apiError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { fetchSnapshot } from "@/lib/graph";
import { evaluate } from "@/lib/evaluate";
import { getPool } from "@/lib/pools";
import { validateWindow, verifyInputSchema, type Receipt } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    guard(request);
    const input = verifyInputSchema.parse(await readBody(request));
    try {
      validateWindow(input.plan);
    } catch (error) {
      throw new AppError("DATE_WINDOW", (error as Error).message);
    }
    const snapshot = await fetchSnapshot(input.poolId, input.plan);
    const evaluation = evaluate(input.plan, snapshot);
    const pool = getPool(input.poolId)!;
    const payload = {
      version: "1.0" as const,
      claim: input.claim,
      poolLabel: `${pool.label} · ${pool.fee}`,
      plan: input.plan,
      evaluation,
      snapshot,
      interpretationConfirmedByUser: true as const,
    };
    const id = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
    const receipt: Receipt = { ...payload, id };
    return Response.json(receipt, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
