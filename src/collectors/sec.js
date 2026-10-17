// SEC EDGAR: public company lookup by exact CIK identifier.
export function cikFrom(query) {
  const match=String(query||"").trim().match(/^cik[:\s-]*(\d{1,10})$/i);
  return match?match[1].padStart(10,"0"):null;
}
export function normalizeSec(data,cik) {
  const a=data.addresses?.business||{};
  return {id:"sec:"+cik,type:"business",name:data.name||"CIK "+cik,cik,
    jurisdiction:data.stateOfIncorporation||null,registrationNumber:cik,
    legalAddress:[a.street1,a.street2,a.city,a.stateOrCountry,a.zipCode].filter(Boolean).join(", ")||null,
    sic:data.sic||null,sicDescription:data.sicDescription||null,tickers:data.tickers||[],
    source:{name:"SEC EDGAR",url:"https://www.sec.gov/edgar/browse/?CIK="+encodeURIComponent(cik)}};
}
export async function investigateSec(cik,contact) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try {
    const r=await fetch("https://data.sec.gov/submissions/CIK"+cik+".json",{
      headers:{"user-agent":"TRACE Public Records "+contact,"accept":"application/json"},signal:controller.signal
    });
    if(!r.ok)throw Error("SEC EDGAR returned HTTP "+r.status);
    return normalizeSec(await r.json(),cik);
  }finally{clearTimeout(timer)}
}
