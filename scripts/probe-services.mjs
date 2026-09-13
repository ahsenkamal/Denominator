// Does not log request headers, credentials, or unfiltered upstream errors.
const graph = await fetch(`https://gateway.thegraph.com/api/subgraphs/id/${process.env.GRAPH_SUBGRAPH_ID}`, {
  method: 'POST', headers: {'Content-Type':'application/json', Authorization:`Bearer ${process.env.GRAPH_API_KEY}`},
  body: JSON.stringify({query:'{ _meta { deployment hasIndexingErrors block { number hash timestamp } } }'}), signal:AbortSignal.timeout(20000)
});
const g=await graph.json();
console.log(JSON.stringify({service:'Graph',status:graph.status,meta:g.data?._meta,errors:g.errors?.map(e=>String(e.message).replaceAll(process.env.GRAPH_API_KEY,'[redacted]'))}));
const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.LLM_MODEL}:generateContent`,{
 method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.LLM_API_KEY},
 body:JSON.stringify({contents:[{parts:[{text:'Reply with exactly OK.'}]}],generationConfig:{maxOutputTokens:1024}}),signal:AbortSignal.timeout(20000)
});
const data=await response.json();
console.log(JSON.stringify({service:'Gemini',status:response.status,errorCode:data.error?.status,message:data.error?.message?.replaceAll(process.env.LLM_API_KEY,'[redacted]'),finishReason:data.candidates?.[0]?.finishReason,text:data.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')}));
