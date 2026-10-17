import { cikFrom, investigateSec } from "./collectors/sec.js";
import { searchInstitutions } from "./collectors/openalex.js";
import { domainFrom, investigateDomain } from "./collectors/rdap.js";
// TRACE: stateless, read-only public business record investigator.
// Initial real source: GLEIF's public Legal Entity Identifier API.
const GLEIF = "https://api.gleif.org/api/v1";
const headers = {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"};
export function classify(q) {
  if(cikFrom(q))return "cik";
  if (/^[A-Z0-9]{18}[0-9]{2}$/i.test(q)) return "lei";
  if (/^https?:\/\//i.test(q)) return "url";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) return "email";
  if (/^\+?[\d\s().-]{8,}$/.test(q)) return "phone";
  if (domainFrom(q)) return "domain";
  return "name";
}
export function normalize(row) {
  const a=row.attributes||{},e=a.entity||{},lei=a.lei||"";
  const addr=x=>x?[...(x.addressLines||[]),x.city,x.region,x.postalCode,x.country].filter(Boolean).join(", "):null;
  return {id:"lei:"+lei,type:"business",name:e.legalName?.name||lei,lei,
    jurisdiction:e.legalJurisdiction||null,status:e.status||null,
    registrationStatus:a.registration?.status||null,
    registrationNumber:e.registeredAt?.otherRegistrationId||null,
    legalAddress:addr(e.legalAddress),headquartersAddress:addr(e.headquartersAddress),
    source:{name:"GLEIF public LEI record",url:"https://search.gleif.org/#/record/"+encodeURIComponent(lei)}};
}
async function source(path) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try {
    const r=await fetch(GLEIF+path,{headers:{accept:"application/vnd.api+json"},signal:controller.signal});
    if(!r.ok)throw Error("GLEIF returned HTTP "+r.status);
    return await r.json();
  } finally {clearTimeout(timer)}
}
export async function investigate(q) {
  q=String(q||"").trim().slice(0,160);
  if(q.length<2)throw Error("Enter at least two characters");
  const type=classify(q);
  const out={query:q,type,at:new Date().toISOString(),records:[],searched:[],limitations:[],unsupported:[],errors:[]};
  if(type==="cik") {
    out.searched.push("SEC EDGAR public company submissions");
    try{out.records=[await investigateSec(cikFrom(q),"contact@tituspaine.com")]}catch(e){out.errors.push(String(e.message||e))}
    out.limitations.push("SEC EDGAR covers reporting companies and other SEC filers, not all businesses.");
  } else if(type==="domain" || type==="url") {
    const domain=domainFrom(q);
    if(domain){out.searched.push("Public RDAP domain registry");try{out.records=[await investigateDomain(domain)]}catch(e){out.errors.push(String(e.message||e))}out.limitations.push("RDAP availability and registration data vary by registry. Private registration contacts are not collected.");}
    else out.unsupported.push("Invalid or unsupported URL.");
  } else if(type==="lei"||type==="name"){
    out.searched.push("GLEIF public LEI registry");
    try{
      const path=type==="lei"?"/lei-records/"+encodeURIComponent(q.toUpperCase()):
        "/lei-records?filter[entity.legalName]="+encodeURIComponent(q)+"&page[size]=25";
      const result=await source(path);
      out.records=(Array.isArray(result.data)?result.data:result.data?[result.data]:[]).map(normalize);
    }catch(e){out.errors.push(String(e.message||e))}
    if(type==="name" && /(?:university|college|institute|research|laboratory|academy)/i.test(q)){out.searched.push("OpenAlex research institution directory");try{out.records.push(...await searchInstitutions(q))}catch(e){out.errors.push("OpenAlex unavailable: "+String(e.message||e))}}
    out.limitations.push("Business-name search checks GLEIF entities. Personal-name searches are not supported by these sources; no personal identity match is implied.");
  } else out.unsupported.push("No live collector exists for this identifier yet. TRACE will not fabricate results.");
  out.sourceStatus=out.searched.map(name=>({name,status:out.errors.some(e=>name.includes("OpenAlex")?e.includes("OpenAlex"):name.includes("GLEIF")?e.includes("GLEIF"):name.includes("SEC")?e.includes("SEC"):name.includes("RDAP")?e.includes("RDAP"):false)?"failed":"completed"}));
  return out;
}
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers});
export default {async fetch(request){
  const u=new URL(request.url);
  if(u.pathname==="/api/health" && request.method==="GET")return json({ok:true,persistence:false,collectors:["GLEIF","RDAP","OpenAlex","SEC EDGAR"]});
  if(u.pathname==="/api/investigate"){
    if(request.method!=="POST")return json({error:"Use POST"},405);
    const origin=request.headers.get("origin");
    if(origin && origin!==u.origin)return json({error:"Cross-origin requests disabled"},403);
    if(request.headers.get("sec-fetch-site")==="cross-site")return json({error:"Cross-site requests disabled"},403);
    if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return json({error:"JSON required"},415);
    if(Number(request.headers.get("content-length")||0)>2048)return json({error:"Request too large"},413);
    let payload;
    try{payload=await request.json()}catch{return json({error:"Invalid JSON"},400)}
    if(typeof payload?.q!=="string"||payload.q.length>160)return json({error:"Invalid query"},400);
    const q=payload.q;
    if(q.trim().length<2)return json({error:"Enter at least two characters"},400);
    try{return json(await investigate(q))}catch(e){return json({error:String(e.message||e)},500)}
  }
  if(u.pathname==="/")return new Response(PAGE,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","referrer-policy":"no-referrer","x-content-type-options":"nosniff","content-security-policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"}});
  return new Response("Not found",{status:404});
}};
const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#090d13"><title>TRACE — Investigation</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#090d13;color:#e7edf5;font:15px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:820px;margin:auto;padding:28px 20px 90px}header{letter-spacing:.35em;font-weight:800}.hero{text-align:center;padding:24vh 0 35px;max-width:760px;margin:auto}.hero h1{font-size:clamp(48px,12vw,94px);line-height:1.1;letter-spacing:.2em;margin:0 0 48px;font-weight:700}.muted{color:#93a0b2;line-height:1.6}form{display:flex;gap:8px;max-width:700px;margin:auto;background:#161f2b;border:1px solid #3a485c;padding:8px;border-radius:16px}input{min-width:0;flex:1;background:none;color:white;border:0;outline:0;padding:12px;font-size:16px}button{cursor:pointer;border-radius:10px;padding:11px 14px;border:1px solid #41526a;background:#192536;color:#e5edf8;font:inherit}button.primary{background:#dce8ff;color:#111b2a;border:0;font-weight:700}.hidden{display:none}.panel{margin:18px 0;padding:20px;border:1px solid #303e51;background:#121a25;border-radius:14px}.panel h3{margin-top:0}.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.field{font-size:12px;color:#8e9caf}.value{font-size:14px;overflow-wrap:anywhere;margin-top:5px}.actions{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}.trail{display:flex;gap:6px;flex-wrap:wrap}.trail button{padding:7px 10px;font-size:12px}.pulse{display:inline-block;width:22px;height:22px;background:#90b9ff;border-radius:50%;animation:p 1s infinite alternate;margin-right:12px;box-shadow:0 0 20px #90b9ff88}@keyframes p{to{box-shadow:0 0 0 12px #90b9ff15}}a{color:#accaff}footer{display:none;color:#78889b;font-size:12px;border-top:1px solid #2d3948;padding-top:20px;margin-top:60px}
@media(max-width:520px){.hero{padding:23vh 0 35px}form{gap:4px;padding:5px}input{padding:12px 8px}button.primary{padding:12px 18px}.panel{padding:15px}}@media print{body{background:white;color:black}.tools,.trail,header,footer{display:none}.panel{background:white;color:black;border-color:#aaa}.field,.muted{color:#555}}\n.brandTop{font-size:13px;opacity:.6}.tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:6px 0 12px}.tabs button{font-size:clamp(11px,2.7vw,14px);padding:11px 3px;white-space:nowrap}.actions button{font-size:14px}.actions{gap:7px}.actions button{padding:10px 13px}.tabs button[aria-pressed="true"]{background:#dce8ff;color:#111b2a}.graphNode{display:block;width:100%;text-align:left;padding:15px;margin:10px 0;border:1px solid #3a4b60;background:#141e2a;border-radius:12px}.graphNode small{display:block;color:#9caec2;margin-top:4px}.sectionLabel{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#91a4bd}.sourceLink{display:block;padding:12px 0;overflow-wrap:anywhere;border-bottom:1px solid #273447}.timestamp{color:#8fa1b6;font-size:13px}@media print{.tabs,.actions,.trail,#exportPanel{display:none!important}}\n</style></head><body><main><header class="brandTop">TRACE</header>
<section id="home" class="hero"><h1>TRACE</h1><form id="search"><input id="q" maxlength="160" placeholder="Search anything…" aria-label="Search identifier" required><button class="primary" aria-label="Search">→</button></form></section>
<section id="loading" class="panel hidden" role="status"><span class="pulse"></span><span id="progress">Searching public records…</span><p><button id="cancel">Cancel investigation</button></p></section>
<section id="result" class="hidden"><div id="trail" class="trail"></div><h1 id="title"></h1><p id="summary" class="muted"></p><div class="actions"><button id="back">← Back</button><button id="new">New search</button><button id="share">Share / Export</button></div><div id="exportPanel" class="hidden panel"><button id="export">JSON</button><button id="htmlExport">HTML</button><button id="print">Print / PDF</button></div><nav class="tabs" aria-label="Result views"><button id="tabRecords" aria-pressed="true">Records</button><button id="tabGraph" aria-pressed="false">Connections</button><button id="tabTimeline" aria-pressed="false">Timeline</button><button id="tabSources" aria-pressed="false">Sources</button></nav><div id="records"></div><div id="graph" class="hidden"></div><div id="timeline" class="hidden"></div><div id="sources" class="hidden"></div></section>
<footer>TRACE · Source-linked public-record research. Missing results do not establish absence.</footer></main>
<script>
(()=>{"use strict";const $=id=>document.getElementById(id),session=[];let current=-1,active=null;
function show(id){for(const k of ["home","loading","result"])$(k).classList.toggle("hidden",k!==id)}
function text(tag,value,cls){const n=document.createElement(tag);n.textContent=String(value??"");if(cls)n.className=cls;return n}
function field(name,value){const d=document.createElement("div");d.append(text("div",name,"field"),text("div",value||"Not provided","value"));return d}
function setTab(which){for(const key of ["records","graph","timeline","sources"]){$(key).classList.toggle("hidden",key!==which);const b=$("tab"+key[0].toUpperCase()+key.slice(1));b.setAttribute("aria-pressed",String(key===which))}}
function render(i){$("exportPanel").classList.add("hidden");current=i;const d=session[i];show("result");$("title").textContent=d.query;$("summary").textContent=d.records.length+" records found · "+d.searched.length+" sources attempted"+(d.errors.length?" · "+d.errors.length+" unavailable":"");
$("trail").replaceChildren();session.forEach((x,j)=>{const b=text("button",(j+1)+". "+x.query);b.onclick=()=>render(j);$("trail").append(b)});
const root=$("records");root.replaceChildren();if(!d.records.length){const empty=text("article","","panel");empty.append(text("h3",d.errors.length?"Some sources were unavailable":"No verified matches from supported sources"),text("p",d.type==="name"?"This search currently covers registered organizations, not personal background records. A person’s name cannot be reliably investigated through these business registries.":"The connected public registries did not return matching records. This is not evidence that the subject does not exist.","muted"));if(d.errors.length){empty.append(text("p","Source issue: "+d.errors.join("; "),"muted"));const retry=text("button","Retry search");retry.onclick=()=>{session.splice(current,1);investigate(d.query)};empty.append(retry)}root.append(empty)}
for(const r of d.records){const card=text("article","","panel");card.append(text("h3",r.name));const grid=text("div","","row");
for(const [label,value] of [["LEI",r.lei],["SEC CIK",r.cik],["Industry",r.sicDescription],["Tickers",r.tickers?.join(", ")],["Jurisdiction",r.jurisdiction],["Entity status",r.status],["Registration status",r.registrationStatus],["Registration number",r.registrationNumber],["Legal address",r.legalAddress],["Headquarters",r.headquartersAddress],["Domain",r.domain],["Registered",r.registered],["Expires",r.expires],["Nameservers",r.nameservers?.join(", ")],["Website",r.website],["City",r.city],["Research works",r.worksCount]])grid.append(field(label,value));card.append(grid);
const p=document.createElement("p"),a=text("a","View original "+r.source.name+" ↗");a.href=r.source.url;a.rel="noopener noreferrer";a.target="_blank";p.append(a);card.append(p);
if(r.lei||r.domain||r.cik){const b=text("button","Investigate "+r.name+" →");b.onclick=()=>investigate(r.lei||r.domain||("CIK "+r.cik));card.append(b)}root.append(card)}
const details=text("article","","panel");details.append(text("h3","Coverage and limitations"));for(const [name,items] of [["Searched",d.searched],["Unsupported",d.unsupported],["Limitations",d.limitations],["Errors",d.errors]])if(items?.length){details.append(text("div",name,"field"));items.forEach(v=>details.append(text("p",v,"value")))}root.append(details);
const graph=$("graph");graph.replaceChildren();graph.append(text("h3","Investigation connections"),text("p","Each result below was returned by a source queried for this investigation. This does not establish a personal or ownership relationship.","muted"));
graph.append(text("div","SEARCH: "+d.query,"sectionLabel"));
for(const r of d.records){const b=text("button",r.name+" →","graphNode");b.append(text("small",r.type+" · "+r.source.name));b.onclick=()=>{if(r.lei||r.domain||r.cik)investigate(r.lei||r.domain||("CIK "+r.cik));else{setTab("records");document.getElementById("records").scrollIntoView({behavior:"smooth"})}};graph.append(b)}
const timeline=$("timeline");timeline.replaceChildren();timeline.append(text("h3","Evidence timeline"),text("p","Dates below come from source records. They are not a timeline of the subject's personal movements.","muted"));
const events=[];for(const r of d.records){if(r.registered)events.push({date:r.registered,label:r.name+" — domain registration"});if(r.expires)events.push({date:r.expires,label:r.name+" — domain expiration"})}
events.sort((a,b)=>String(a.date).localeCompare(String(b.date)));if(!events.length)timeline.append(text("p","No dated events were provided by the queried sources.","muted"));for(const e of events){const box=text("article","","panel");box.append(text("div",e.date,"timestamp"),text("p",e.label));timeline.append(box)}
const sources=$("sources");sources.replaceChildren();sources.append(text("h3","Original evidence"));const seen=new Set();for(const r of d.records){if(!r.source?.url||seen.has(r.source.url))continue;seen.add(r.source.url);const a=text("a",r.name+" · "+r.source.name+" ↗","sourceLink");a.href=r.source.url;a.target="_blank";a.rel="noopener noreferrer";sources.append(a)}if(!seen.size)sources.append(text("p","No source records returned.","muted"));setTab("records")}
async function investigate(q){q=q.trim();if(q.length<2)return;const found=session.findIndex(x=>x.query.toLowerCase()===q.toLowerCase());if(found>=0){render(found);return}active?.abort();active=new AbortController();show("loading");$("progress").textContent="Investigating "+q+"…";try{const response=await fetch("/api/investigate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({q}),cache:"no-store",signal:active.signal});const d=await response.json();if(!response.ok)throw Error(d.error||"Search failed");session.push(d);render(session.length-1)}catch(e){if(e.name==="AbortError")return;$("progress").textContent="Search failed: "+e.message;void 0}}
for(const name of ["Records","Graph","Timeline","Sources"])$("tab"+name).onclick=()=>setTab(name.toLowerCase());$("cancel").onclick=()=>{active?.abort();show("home")};$("search").onsubmit=e=>{e.preventDefault();investigate($("q").value)};$("new").onclick=()=>{$("q").value="";show("home");$("q").focus()};$("back").onclick=()=>current>0?render(current-1):show("home");
const content=()=>JSON.stringify({format:"TRACE-session-v1",exportedAt:new Date().toISOString(),investigations:session},null,2);
$("export").onclick=()=>{const url=URL.createObjectURL(new Blob([content()],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="trace-investigation.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$("htmlExport").onclick=()=>{const data=content().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>TRACE investigation archive</title><style>body{font:15px system-ui;max-width:850px;margin:35px auto;padding:20px;line-height:1.6}pre{white-space:pre-wrap;overflow-wrap:anywhere}h1{letter-spacing:.2em}</style><h1>TRACE</h1><p>Self-contained investigation archive. Evidence links require internet access.</p><pre>'+data+'</pre></html>';const url=URL.createObjectURL(new Blob([html],{type:"text/html"}));const a=document.createElement("a");a.href=url;a.download="trace-investigation.html";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$("print").onclick=()=>window.print();
$("share").onclick=async()=>{const file=new File([content()],"trace-investigation.json",{type:"application/json"});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:"TRACE investigation"})}catch(e){if(e.name!=="AbortError")$("exportPanel").classList.remove("hidden")}}else $("exportPanel").classList.toggle("hidden")};
})();
</script></body></html>`;
