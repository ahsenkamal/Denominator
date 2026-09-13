export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    {
      graphConfigured: Boolean(process.env.GRAPH_API_KEY?.trim()),
      llmConfigured: Boolean(process.env.LLM_API_KEY?.trim()),
      accessCodeRequired: Boolean(process.env.DEMO_ACCESS_CODE?.trim()),
      // These flags only report configuration presence, not successful service connectivity.
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
