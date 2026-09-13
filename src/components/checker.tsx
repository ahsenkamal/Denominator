"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronDown, CircleHelp, Clipboard, Code2, ExternalLink, FileCheck2, Fingerprint, Globe2, Info, Layers3, Loader2, LockKeyhole, Quote, SearchCheck, ShieldCheck, Sparkles, X } from "lucide-react";
import { POOLS, getPool } from "@/lib/pools";
import { DAY, type ClaimPlan, type Interpretation, type Receipt } from "@/lib/types";

type Config = { graphConfigured: boolean; llmConfigured: boolean; accessCodeRequired: boolean };
const OPS = { eq: "equals", gte: "at least", lte: "at most", gt: "more than", lt: "less than" };
const shortDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
function amount(raw: string | null, metric: string, compact = false) {
  if (raw === null) return "Unavailable";
  return new Intl.NumberFormat("en-US", { style: metric === "volumeUSD" ? "currency" : "decimal", currency: "USD", notation: compact ? "compact" : "standard", maximumFractionDigits: metric === "txCount" && !compact ? 0 : 2 }).format(Number(raw));
}
function download(receipt: Receipt) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = `denominator-${receipt.id.slice(0, 12)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Checker({ today }: { today: string }) {
  const [poolId, setPoolId] = useState<string>(POOLS[0].id);
  const [claim, setClaim] = useState("");
  const [config, setConfig] = useState<Config | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [interpretation, setInterpretation] = useState<Extract<Interpretation, { status: "ready" }> | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState<"interpret" | "verify" | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"claim" | "method">("claim");
  const [modal, setModal] = useState(false);
  const resultRef = useRef<HTMLElement>(null), dialogRef = useRef<HTMLDialogElement>(null), inputRef = useRef<HTMLTextAreaElement>(null);
  const pool = getPool(poolId)!;
  const priorDay = (offset: number) => new Date(Date.parse(`${today}T00:00:00Z`) - offset * DAY * 1000).toISOString().slice(0, 10);
  const examples = [
    { title: "The big percentage", tag: "VOLUME", claim: `This pool’s USD volume increased by 50% on ${priorDay(1)} compared with ${priorDay(2)}.`, icon: "↗" },
    { title: "The multiplier", tag: "BASELINE", claim: `This pool’s USD volume was 5× as much on ${priorDay(1)} as on ${priorDay(2)}.`, icon: "×" },
    { title: "The activity claim", tag: "TRANSACTIONS", claim: `This pool’s indexed transaction count was higher on ${priorDay(1)} than on ${priorDay(2)}.`, icon: "≋" },
  ];
  useEffect(() => { fetch("/api/status").then(r => r.json()).then(setConfig).catch(() => setConfig(null)); }, []);
  useEffect(() => { if (modal) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [modal]);
  function clearResult() { setInterpretation(null); setReceipt(null); setError(null); setCopied(false); }
  function reset() { clearResult(); setClaim(""); setTab("claim"); inputRef.current?.focus(); }
  async function post(path: string, body: unknown) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", ...(accessCode ? { "x-demo-access-code": accessCode } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(65000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The request could not be completed.");
    return data;
  }
  async function interpret() {
    setBusy("interpret"); clearResult();
    try {
      const response: Interpretation = await post("/api/interpret", { claim, poolId });
      if (response.status === "ready") setInterpretation(response);
      else setError({ title: response.status === "unsupported" ? "Let’s narrow the claim" : "A little more context, please", message: response.message });
    } catch(e) { setError({ title: "We couldn’t interpret this claim", message: e instanceof Error && e.name !== "TimeoutError" ? e.message : "The request timed out. Please retry." }); }
    finally { setBusy(null); }
  }
  async function verify() {
    if (!interpretation) return;
    setBusy("verify"); setError(null);
    try {
      setReceipt(await post("/api/verify", { claim, poolId, plan: interpretation.plan }));
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch(e) { setError({ title: "Live evidence is unavailable", message: e instanceof Error && e.name !== "TimeoutError" ? e.message : "The evidence request timed out. Please retry." }); }
    finally { setBusy(null); }
  }
  async function copy() {
    if (!receipt?.evaluation.correctedClaim) return;
    try { await navigator.clipboard.writeText(`${receipt.poolLabel} · Uniswap v3, Ethereum\n${receipt.evaluation.correctedClaim}\nSource: The Graph, block ${receipt.snapshot.provenance.block.number}.\n${receipt.snapshot.provenance.explorerUrl}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError({ title: "Clipboard unavailable", message: "Download the evidence receipt or select the corrected claim to copy it." }); }
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Denominator home"><span className="brand-symbol">d<span>_</span></span><span>denominator<span className="brand-dot">.</span></span></a>
      <div className="sidebar-section-label">THE WORKSPACE</div>
      <nav aria-label="Main navigation"><button className={`nav-item ${tab === "claim" ? "active" : ""}`} onClick={() => setTab("claim")}><SearchCheck size={18}/> Claim checker <span className="nav-dot"/></button><button className={`nav-item ${tab === "method" ? "active" : ""}`} onClick={() => setTab("method")}><BookOpen size={18}/> Methodology</button></nav>
      <div className="sidebar-card"><div className="small-fraction">claim<span/>context</div><p>Good questions deserve<br/><strong>verifiable answers.</strong></p><span className="sidebar-card-line"/></div>
      <div className="sidebar-bottom"><button onClick={() => setModal(true)}><CircleHelp size={16}/> How it works <ArrowUpRight size={14}/></button><a href="https://github.com/ahsenkamal/Denominator" target="_blank" rel="noreferrer"><Code2 size={16}/> View source <ArrowUpRight size={14}/></a><div className="sidebar-footer">BUILT FOR ETHONLINE 2026<span>Independent thinking. Onchain evidence.</span></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{tab === "claim" ? "Claim checker" : "Methodology"}</strong></div><div className="topbar-right"><span className="network-pill"><span className="eth-symbol">◆</span> Ethereum <span className="tiny-dot"/></span><span className="topbar-divider"/><span className="powered">DATA BY <a href="https://thegraph.com" target="_blank" rel="noreferrer"><span className="graph-symbol">◌</span> The Graph</a></span></div></header>
      <main className="workspace">{tab === "method" ? <Methodology onBack={() => setTab("claim")}/> : <>
        <section className="hero"><div className="eyebrow"><span/> LESS HYPE. MORE CONTEXT.</div><h1>Big claims.<br/><em>Meet the small print.</em></h1><p>Put an onchain claim to the test. We check the numbers,<br className="desktop-break"/> show the baseline, and give you the evidence.</p><div className="hero-mark" aria-hidden="true"><span>5×</span><div/><small>compared to what?</small><i>?</i></div></section>
        <div className="scope-strip"><span><Layers3 size={14}/> Uniswap v3</span><span><Globe2 size={14}/> Ethereum mainnet</span><span><LockKeyhole size={14}/> No wallet connection</span><span className="scope-right">ONE POOL. COMPLETE UTC DAYS.</span></div>
        {config && (!config.graphConfigured || !config.llmConfigured) && <div className="setup-notice"><Info size={18}/><span><strong>Waiting for live-service setup.</strong> The server needs { !config.graphConfigured ? "a Graph key" : "" }{!config.graphConfigured && !config.llmConfigured ? " and " : ""}{!config.llmConfigured ? "a Gemini key" : ""}. You can explore the interface; evidence checks need both services.</span></div>}
        <div className="checker-grid">
          <section className="claim-panel panel"><div className="panel-heading"><div><span className="step-number">01</span><h2>What’s the claim?</h2></div><span className="label-tag">START HERE</span></div>
            <form onSubmit={e => { e.preventDefault(); void interpret(); }}>
              <label htmlFor="pool" className="field-label">Choose the pool <span>Define your scope</span></label><div className="select-wrap"><div className="token-pair" aria-hidden="true"><span>Ξ</span><span>$</span></div><select id="pool" value={poolId} disabled={Boolean(busy)} onChange={e => { setPoolId(e.target.value); clearResult(); }}>{POOLS.map(p => <option key={p.id} value={p.id}>{p.label} · {p.fee} fee</option>)}</select><ChevronDown size={16}/></div>
              <div className="pool-caption">Uniswap v3 <span>·</span> Ethereum <a href={`https://etherscan.io/address/${pool.id}`} target="_blank" rel="noreferrer">{pool.id.slice(0,6)}…{pool.id.slice(-4)} <ExternalLink size={11}/></a></div>
              <label htmlFor="claim" className="field-label claim-label">Paste a claim <span>Or try an example below</span></label><div className="textarea-wrap"><Quote size={18}/><textarea id="claim" ref={inputRef} placeholder="This pool’s volume doubled yesterday compared with the day before…" value={claim} minLength={8} maxLength={1200} disabled={Boolean(busy)} onChange={e => { setClaim(e.target.value); clearResult(); }} required/><span className="char-count">{claim.length}/1200</span></div><p className="field-help"><Info size={13}/> Include a metric, a date, and something to compare it with.</p>
              {config?.accessCodeRequired && <label className="access-label">Demo access code<input type="password" autoComplete="off" value={accessCode} onChange={e => setAccessCode(e.target.value)}/></label>}
              <button className="primary-button" type="submit" disabled={Boolean(busy) || claim.trim().length < 8}>{busy === "interpret" ? <><Loader2 size={17} className="spin"/> Reading your claim…</> : <><Sparkles size={16}/> Interpret claim <ArrowRight size={17}/></>}</button><div className="button-footnote"><ShieldCheck size={13}/> AI reads the claim. The numbers determine the verdict.</div>
            </form>{error && <div className="error-box" role="alert"><Info size={18}/><div><strong>{error.title}</strong><p>{error.message}</p></div></div>}
          </section>
          <section className="review-panel panel" aria-live="polite"><div className="panel-heading"><div><span className="step-number">02</span><h2>Check the context</h2></div>{interpretation ? <span className="label-tag green">READY TO REVIEW</span> : <LockKeyhole size={15} className="muted"/>}</div>
            {interpretation ? <><div className="plan-intro"><span className="model-label"><Sparkles size={12}/> INTERPRETED WITH GEMINI</span><p>{interpretation.plan.interpretation}</p></div><PlanDetails plan={interpretation.plan}/><p className="review-help">Does this match what you meant? Confirm the dates and comparison before we fetch the evidence.</p><button className="primary-button" disabled={Boolean(busy)} onClick={() => void verify()}>{busy === "verify" ? <><Loader2 size={17} className="spin"/> Gathering live evidence…</> : <><Check size={17}/> Confirm & check evidence <ArrowRight size={17}/></>}</button><button className="text-button edit-claim" disabled={Boolean(busy)} onClick={() => { clearResult(); inputRef.current?.focus(); }}>Edit the original claim</button></> : <div className="review-empty"><div className="context-art" aria-hidden="true"><span className="art-top">THE CLAIM</span><div className="art-numerator">50<span>%</span> <ArrowUpRight size={25}/></div><div className="art-rule"/><div className="art-denominator"><span>the baseline</span><SearchCheck size={22}/></div><span className="art-note">The part that changes everything.</span></div><h3>There’s always a denominator.</h3><p>We’ll identify the metric, time window,<br/>and baseline behind your claim.</p><div className="review-checks"><span><Check size={13}/> Exact pool</span><span><Check size={13}/> Full UTC days</span><span><Check size={13}/> Clear baseline</span></div></div>}
          </section>
        </div>
        {receipt ? <section className="result-section" ref={resultRef} aria-live="polite"><div className="section-title"><div><span className="step-number">03</span><h2>The evidence, in full.</h2></div><button className="text-button" onClick={reset}>Check another claim <ArrowRight size={15}/></button></div><Result receipt={receipt} onDownload={() => download(receipt)} onCopy={() => void copy()} copied={copied}/></section> : <section className="examples-section"><div className="section-title"><h2>A few claims worth checking</h2><span>EXAMPLES ARE PROMPTS, NOT VERIFIED FACTS</span></div><div className="example-grid">{examples.map(example => <button className="example-card" key={example.title} disabled={Boolean(busy)} onClick={() => { setClaim(example.claim); clearResult(); inputRef.current?.focus(); }}><span className="example-top"><span className="example-icon">{example.icon}</span><span>{example.tag}</span><ArrowUpRight size={15}/></span><strong>{example.title}</strong><p>{example.claim}</p></button>)}</div></section>}
        <footer className="workspace-footer"><span><Fingerprint size={14}/> Every verdict comes with a paper trail.</span><button onClick={() => setTab("method")}>Read our methodology <ArrowUpRight size={13}/></button></footer>
      </>}</main>
    </div>
    <dialog ref={dialogRef} className="help-dialog" onCancel={() => setModal(false)} onClick={e => { if (e.target === dialogRef.current) setModal(false); }}><button className="close-modal" aria-label="Close explanation" onClick={() => setModal(false)}><X size={20}/></button><span className="eyebrow">THE THREE-STEP CHECK</span><h2>A little context<br/>goes a long way.</h2><ol><li><strong>Tell us the claim.</strong><p>Choose a pool and write a claim about its daily volume or indexed transaction count.</p></li><li><strong>Confirm what it means.</strong><p>Gemini extracts the metric, comparison and UTC dates. You review that interpretation.</p></li><li><strong>Follow the evidence.</strong><p>The Graph supplies observations at one block. Decimal arithmetic determines the verdict. Download the full receipt.</p></li></ol><button className="primary-button" onClick={() => setModal(false)}>Let’s check a claim <ArrowRight size={16}/></button></dialog>
  </div>;
}

function PlanDetails({ plan }: { plan: ClaimPlan }) {
  return <dl className="plan-details"><div><dt>Metric</dt><dd>{plan.metric === "volumeUSD" ? "Daily USD volume" : "Daily indexed transactions"}</dd></div><div><dt>Target day</dt><dd>{plan.targetDate} <span>UTC</span></dd></div>{plan.baselineDate && <div><dt>Baseline day</dt><dd>{plan.baselineDate} <span>UTC</span></dd></div>}<div><dt>Claimed comparison</dt><dd>{OPS[plan.operator]} {plan.value}{plan.comparison === "percentage_change" ? "% change" : plan.comparison === "multiplier" ? "× baseline" : plan.metric === "volumeUSD" ? " USD" : " transactions"}</dd></div></dl>;
}

function Result({ receipt, onDownload, onCopy, copied }: { receipt: Receipt; onDownload: () => void; onCopy: () => void; copied: boolean }) {
  const { evaluation:e, plan, snapshot } = receipt;
  const [evidenceTab,setEvidenceTab] = useState<"source"|"query"|"data">("source");
  const supported = e.verdict === "supported", incomplete = e.verdict === "insufficient_data";
  const rows = snapshot.observations.slice(-7), max = Math.max(...rows.map(row => Number(row[plan.metric])),1);
  return <article className={`result-card panel ${e.verdict}`}>
    <div className="verdict-header"><span className="verdict-badge">{incomplete ? <Info size={15}/> : supported ? <CheckCircle2 size={15}/> : <SearchCheck size={15}/>} {incomplete ? "INSUFFICIENT DATA" : supported ? "SUPPORTED" : "CONTRADICTED"}</span><span className="receipt-id">RECEIPT {receipt.id.slice(0,8).toUpperCase()}</span></div><h3>{e.headline}</h3><p className="verdict-explanation">{e.explanation}</p><div className="result-scope">{receipt.poolLabel}<span>·</span>Uniswap v3<span>·</span>Ethereum mainnet</div>
    <div className="metric-grid">{plan.baselineDate && <div className="metric-cell"><span>THE BASELINE <small>{shortDate(plan.baselineDate)} UTC</small></span><strong title={e.baseline??"Unavailable"}>{amount(e.baseline,plan.metric,true)}</strong><p>The denominator behind the headline</p></div>}<div className="metric-cell"><span>THE TARGET <small>{shortDate(plan.targetDate)} UTC</small></span><strong title={e.current??"Unavailable"}>{amount(e.current,plan.metric,true)}</strong><p>{plan.metric === "volumeUSD" ? "Derived USD volume" : "Indexed transaction count"}</p></div>{plan.baselineDate && <div className="metric-cell change-cell"><span>ACTUAL CHANGE</span><strong>{e.percentChange !== null ? `${Number(e.percentChange)>=0?"+":""}${Number(e.percentChange).toFixed(2)}%` : "Undefined"}</strong><p>{e.multiple !== null ? `${Number(e.multiple).toFixed(2)}× the baseline` : "A valid baseline is required"}</p></div>}</div>
    {rows.length > 0 && <div className="chart-block"><div className="chart-title"><span>Daily {plan.metric === "volumeUSD" ? "USD volume" : "indexed transactions"}</span><span>OBSERVED DAYS ONLY · UTC</span></div><div className="bar-chart" role="img" aria-label="Observed daily values. Exact values are in the source data below.">{rows.map(row => { const date=new Date(row.date*1000).toISOString().slice(0,10);return <div className="bar-column" key={row.date}><div className="bar-space"><span className="bar-tooltip">{amount(row[plan.metric],plan.metric)}</span><div className={`bar ${date===plan.targetDate?"selected":date===plan.baselineDate?"baseline-bar":""}`} style={{height:`${Math.max(1,Number(row[plan.metric])/max*100)}%`}}/></div><span>{shortDate(date)}</span></div>;})}</div></div>}
    {e.correctedClaim && <div className="corrected-claim"><span><Quote size={14}/> A CLAIM YOU CAN ACTUALLY BACK UP</span><p>{e.correctedClaim}</p><button className="text-button" onClick={onCopy}>{copied?<Check size={14}/>:<Clipboard size={14}/>} {copied?"Copied":"Copy with source"}</button></div>}
    <div className="context-notes">{e.notes.map(note=><p key={note}><Info size={14}/><span>{note}</span></p>)}</div>
    <details className="evidence-details"><summary><span><FileCheck2 size={17}/> Inspect the evidence</span><span>Source · calculation · raw data <ChevronDown size={16}/></span></summary><div className="evidence-inner"><div className="evidence-tabs" role="tablist" aria-label="Evidence sections">{(["source","query","data"] as const).map(t=><button role="tab" aria-selected={evidenceTab===t} key={t} className={evidenceTab===t?"selected":""} onClick={()=>setEvidenceTab(t)}>{t==="source"?"Source & calculation":t==="query"?"Reproduce query":"Exact values"}</button>)}</div>
      {evidenceTab==="source"?<dl className="source-list"><div><dt>Provider</dt><dd><a href={snapshot.provenance.explorerUrl} target="_blank" rel="noreferrer">The Graph Explorer <ExternalLink size={12}/></a></dd></div><div><dt>Data block</dt><dd><a href={`https://etherscan.io/block/${snapshot.provenance.block.number}`} target="_blank" rel="noreferrer">{snapshot.provenance.block.number.toLocaleString()} <ExternalLink size={12}/></a></dd></div><div><dt>Block timestamp</dt><dd>{new Date(snapshot.provenance.block.timestamp*1000).toISOString()}</dd></div><div><dt>Retrieved</dt><dd>{snapshot.provenance.retrievedAt}</dd></div><div><dt>Formula</dt><dd>{e.formula||"Unavailable"}</dd></div><div><dt>Tolerance</dt><dd>{e.tolerance||"No verdict calculated"}</dd></div><div><dt>Deployment</dt><dd className="mono break-all">{snapshot.provenance.deployment}</dd></div><div><dt>Receipt hash</dt><dd className="mono break-all">{receipt.id}<small>SHA-256 integrity checksum, not an onchain attestation.</small></dd></div></dl>:evidenceTab==="query"?<><p className="evidence-help">Run this query against the recorded deployment with your own Graph API key. Historical replay depends on retained block history.</p><pre>{snapshot.provenance.query}</pre><pre>{JSON.stringify(snapshot.provenance.variables,null,2)}</pre></>:<div className="table-scroll"><table><caption>Daily observations returned by The Graph</caption><thead><tr><th>Day (UTC)</th><th>Volume (USD)</th><th>Indexed tx count</th></tr></thead><tbody>{snapshot.observations.map(row=><tr key={row.date}><td>{new Date(row.date*1000).toISOString().slice(0,10)}</td><td>{row.volumeUSD}</td><td>{row.txCount}</td></tr>)}</tbody></table></div>}
    </div></details>
    <div className="result-actions"><span><ShieldCheck size={14}/> Measured by code. Traceable to source.</span><div><button className="secondary-button" onClick={()=>window.print()}>Print result</button><button className="primary-button compact" onClick={onDownload}><ArrowDownToLine size={15}/> Download receipt</button></div></div>
  </article>;
}

function Methodology({onBack}:{onBack:()=>void}) {
  return <section className="methodology"><button className="text-button" onClick={onBack}><ArrowLeft size={15}/> Back to the checker</button><div className="eyebrow">HOW WE ARRIVE AT AN ANSWER</div><h1>Show your work.<br/><em>All of it.</em></h1><p className="method-lead">Denominator checks a specific measurement against a specific claim. The scope and limitations are part of the answer.</p><div className="method-grid">{[
    ["01","Interpret, then confirm","Gemini extracts the metric, comparison, and dates. You review them before verification. A mistaken interpretation can produce a verdict about the wrong proposition, so this confirmation matters."],
    ["02","One source snapshot","Daily observations come from an existing Ethereum Uniswap v3 subgraph on The Graph. Queries are pinned to one block. We validate pool identity, fee tier, response shape, and metadata. This is indexed evidence, not an independent audit of the indexer."],
    ["03","A deterministic verdict","Decimal arithmetic calculates percentage change as ((target − baseline) ÷ baseline) × 100. Multipliers use target ÷ baseline. AI does not calculate or select the verdict. Zero baselines remain undefined."],
    ["04","Honest boundaries","Only completed UTC days within the last 90 days are supported. Missing rows are never filled with zero. The index must cover the target day. Evidence measures one pool, not the entire asset, protocol, or market."],
  ].map(([number,title,text])=><article className="panel" key={number}><span className="step-number">{number}</span><h2>{title}</h2><p>{text}</p></article>)}</div><div className="method-footnote"><h2>What the numbers mean</h2><p><strong>USD volume</strong> is a derived valuation supplied by the subgraph. <strong>txCount</strong> follows the subgraph’s mapping and can include more activity than swaps; it is not unique people or wallets.</p><p><strong>Equality tolerance:</strong> ±1 percentage point, ±0.01×, ±$0.01, or exact integer equality, depending on the claim. Inequality thresholds are compared exactly. These are product choices, not statistical confidence intervals.</p><p><strong>Small-baseline context:</strong> baseline volume below $10,000 or activity below 100 indexed transactions triggers a note. This heuristic never changes the verdict.</p><p><strong>Receipts:</strong> exports contain the claim, confirmed interpretation, source, block, observations, formula, and verdict. The checksum detects changes against a previously trusted checksum; it is not a signature or blockchain proof. No claims are stored in a shared database. Claim text goes to Gemini; pool and dates go to The Graph.</p><a className="text-button" href="https://github.com/ahsenkamal/Denominator" target="_blank" rel="noreferrer">Read the implementation <ArrowUpRight size={14}/></a></div></section>;
}
