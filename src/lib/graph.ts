import "server-only";
import { z } from "zod";
import { AppError } from "./errors";
import { getPool } from "./pools";
import { DAY, dateTimestamp, type ClaimPlan, type GraphSnapshot } from "./types";

const nonnegative = z.string().regex(/^\d+(\.\d+)?$/);
const metaSchema = z.object({ deployment: z.string(), hasIndexingErrors: z.boolean(), block: z.object({ number: z.number().int().nonnegative(), hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/), timestamp: z.number().int().positive() }) });
// Graph Node can omit hash/timestamp in _meta for historical block queries.
// The preflight header supplies them; data is explicitly pinned to that header's hash.
const historicalMetaSchema = metaSchema.extend({ block: z.object({ number: z.number().int().nonnegative(), hash: z.string().nullable(), timestamp: z.number().int().positive().nullable() }) });
const dataSchema = z.object({
  _meta: historicalMetaSchema,
  pool: z.object({ id: z.string(), feeTier: z.string(), token0: z.object({ id: z.string(), symbol: z.string() }), token1: z.object({ id: z.string(), symbol: z.string() }) }).nullable(),
  poolDayDatas: z.array(z.object({ date: z.number().int(), volumeUSD: nonnegative, txCount: z.string().regex(/^\d+$/) })),
});

async function request(query: string, variables: Record<string, number>, subgraphId: string, key: string) {
  let response: Response;
  try {
    response = await fetch(`https://gateway.thegraph.com/api/subgraphs/id/${subgraphId}`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(20000), cache: "no-store",
    });
  } catch { throw new AppError("GRAPH_UNAVAILABLE", "The Graph could not be reached. Retry in a moment; no substitute data was used.", 502); }
  if (response.status === 401 || response.status === 403) throw new AppError("GRAPH_AUTH", "The Graph rejected the query key. Check its permissions and available quota.", 502);
  if (response.status === 429) throw new AppError("GRAPH_RATE_LIMIT", "The Graph query limit was reached. Please retry shortly.", 429);
  if (!response.ok) throw new AppError("GRAPH_UNAVAILABLE", "The Graph returned an upstream error. Please retry shortly.", 502);
  const body = await response.json();
  if (body.errors?.length) throw new AppError("GRAPH_QUERY", "This Graph deployment could not serve the evidence query. Check the deployment's schema, availability, and API-key access.", 502);
  return body.data;
}

export async function fetchSnapshot(poolId: string, plan: ClaimPlan): Promise<GraphSnapshot> {
  const pool = getPool(poolId);
  if (!pool) throw new AppError("POOL_UNSUPPORTED", "Choose one of the supported Ethereum pools.");
  const key = process.env.GRAPH_API_KEY?.trim();
  if (!key) throw new AppError("GRAPH_NOT_CONFIGURED", "Add GRAPH_API_KEY to the server environment to fetch live evidence.", 503);
  const subgraphId = process.env.GRAPH_SUBGRAPH_ID?.trim() || "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";
  if (!/^[a-zA-Z0-9]{20,100}$/.test(subgraphId)) throw new AppError("GRAPH_CONFIG", "GRAPH_SUBGRAPH_ID is invalid.", 503);
  const meta = metaSchema.safeParse((await request("{ _meta { deployment hasIndexingErrors block { number hash timestamp } } }", {}, subgraphId, key))?._meta);
  if (!meta.success) throw new AppError("GRAPH_METADATA", "The source did not return valid indexing metadata; a complete-day check is unavailable.", 502);
  if (meta.data.hasIndexingErrors) throw new AppError("GRAPH_INDEXING", "The source reports indexing errors. A reliable verdict is unavailable.", 502);
  const latest = dateTimestamp(plan.targetDate);
  const earliest = Math.min(latest - 6 * DAY, plan.baselineDate ? dateTimestamp(plan.baselineDate) : latest);
  // Only a whitelisted address enters the query. All time and block values are variables.
  // Pin all observations to the same block, preserving reproducibility within archive retention.
  const blockSelector = `{hash: "${meta.data.block.hash}"}`;
  const query = `query Evidence($start: Int!, $end: Int!) {
    pool(id: "${pool.id}", block: ${blockSelector}) { id feeTier token0 { id symbol } token1 { id symbol } }
    poolDayDatas(first: 100, orderBy: date, orderDirection: asc,
      where: {pool: "${pool.id}", date_gte: $start, date_lt: $end}, block: ${blockSelector}) {
      date volumeUSD txCount
    }
    _meta(block: ${blockSelector}) { deployment hasIndexingErrors block { number hash timestamp } }
  }`;
  const variables = { start: earliest, end: latest + DAY };
  const parsed = dataSchema.safeParse(await request(query, variables, subgraphId, key));
  if (!parsed.success) throw new AppError("GRAPH_SCHEMA", "The source response does not match the supported Uniswap v3 daily-data schema.", 502);
  const data = parsed.data;
  if (!data.pool || data.pool.id.toLowerCase() !== pool.id || data.pool.feeTier !== pool.feeTier || data.pool.token0.symbol !== pool.symbols[0] || data.pool.token1.symbol !== pool.symbols[1]) {
    throw new AppError("POOL_MISMATCH", "The source did not resolve the expected pool, token pair, and fee tier.", 502);
  }
  if (data._meta.deployment !== meta.data.deployment || data._meta.block.number !== meta.data.block.number || (data._meta.block.hash !== null && data._meta.block.hash !== meta.data.block.hash) || (data._meta.block.timestamp !== null && data._meta.block.timestamp !== meta.data.block.timestamp)) {
    throw new AppError("SOURCE_CHANGED", "The source changed while gathering evidence. Please retry for a consistent snapshot.", 502);
  }
  return {
    pool: data.pool, observations: data.poolDayDatas,
    provenance: { provider: "The Graph", chain: "Ethereum mainnet", subgraphId, deployment: data._meta.deployment,
      block: meta.data.block, hasIndexingErrors: data._meta.hasIndexingErrors,
      retrievedAt: new Date().toISOString(), indexingLagSeconds: Math.max(0, Math.floor(Date.now() / 1000) - meta.data.block.timestamp),
      query, variables, explorerUrl: `https://thegraph.com/explorer/subgraphs/${subgraphId}?view=Query&chain=arbitrum-one`,
    },
  };
}
