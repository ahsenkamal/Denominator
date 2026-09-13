import { guard, readBody, apiError } from "@/lib/api";
import { interpretClaim } from "@/lib/interpret";
import { claimInputSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 45;
export async function POST(request: Request) {
  try {
    guard(request);
    const { claim, poolId } = claimInputSchema.parse(await readBody(request));
    return Response.json(await interpretClaim(claim, poolId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
