import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { fetchSnapshot } from "../src/lib/graph";
import { POOLS } from "../src/lib/pools";
import { dateTimestamp, type ClaimPlan } from "../src/lib/types";

const plan: ClaimPlan = { metric:"volumeUSD",comparison:"multiplier",operator:"eq",value:"5",targetDate:"2026-09-12",baselineDate:"2026-09-11",interpretation:"Five times the baseline." };
const hash = `0x${"a".repeat(64)}`;
const metadata = { deployment:"QmExample",hasIndexingErrors:false,block:{number:123,hash,timestamp:dateTimestamp("2026-09-13")} };
function data() { return { _meta:{...metadata,block:{number:123,hash:null,timestamp:null}},pool:{id:POOLS[0].id,feeTier:"500",token0:{id:"usdc",symbol:"USDC"},token1:{id:"weth",symbol:"WETH"}},poolDayDatas:[{date:dateTimestamp("2026-09-12"),volumeUSD:"1000",txCount:"100"}] }; }
function setup(second = data()) {
  vi.stubEnv("GRAPH_API_KEY","unit-test-secret");
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({data:{_meta:metadata}})).mockResolvedValueOnce(Response.json({data:second}));
  vi.stubGlobal("fetch",fetch);return fetch;
}
afterEach(() => { vi.unstubAllGlobals();vi.unstubAllEnvs(); });
describe("Graph provenance", () => {
  it("pins by hash and retains the matching preflight header when historical fields are null", async () => {
    const fetch=setup();const snapshot=await fetchSnapshot(POOLS[0].id,plan);
    expect(snapshot.provenance.block).toEqual(metadata.block);
    expect(snapshot.provenance.query).toContain(`hash: "${hash}"`);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer unit-test-secret");
    expect(JSON.stringify(snapshot)).not.toContain("unit-test-secret");
  });
  it("rejects an unexpected deployment", async () => {
    const response=data();response._meta.deployment="QmDifferent";setup(response);
    await expect(fetchSnapshot(POOLS[0].id,plan)).rejects.toMatchObject({code:"SOURCE_CHANGED"});
  });
  it("rejects a mismatched block number", async () => {
    const response=data();response._meta.block.number=124;setup(response);
    await expect(fetchSnapshot(POOLS[0].id,plan)).rejects.toMatchObject({code:"SOURCE_CHANGED"});
  });
  it("rejects the wrong fee tier", async () => {
    const response=data();response.pool.feeTier="3000";setup(response);
    await expect(fetchSnapshot(POOLS[0].id,plan)).rejects.toMatchObject({code:"POOL_MISMATCH"});
  });
  it("does not execute arbitrary pool addresses", async () => {
    const fetch=setup();await expect(fetchSnapshot(`0x${"1".repeat(40)}`,plan)).rejects.toMatchObject({code:"POOL_UNSUPPORTED"});
    expect(fetch).not.toHaveBeenCalled();
  });
});
