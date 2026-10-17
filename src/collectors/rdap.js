// Public domain registration information. No private-contact enrichment.
const DOMAIN=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
export function domainFrom(input){
  const q=String(input||"").trim().toLowerCase();
  let host=q;
  if(/^https?:\/\//.test(q)){try{host=new URL(q).hostname}catch{return null}}
  return DOMAIN.test(host)?host:null;
}
export function normalizeRdap(doc,domain){
  const events=Array.isArray(doc.events)?doc.events:[];
  const nameservers=(doc.nameservers||[]).map(n=>n.ldhName).filter(Boolean);
  return {id:"domain:"+domain,type:"domain",name:domain,domain,
    status:(doc.status||[]).join(", ")||null,
    registered:events.find(e=>e.eventAction==="registration")?.eventDate||null,
    expires:events.find(e=>e.eventAction==="expiration")?.eventDate||null,
    nameservers,source:{name:"Public RDAP registry",url:"https://rdap.org/domain/"+encodeURIComponent(domain)}};
}
export async function investigateDomain(domain){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch("https://rdap.org/domain/"+encodeURIComponent(domain),{signal:controller.signal,headers:{accept:"application/rdap+json"}});
    if(!response.ok)throw Error("RDAP returned HTTP "+response.status);
    const doc=await response.json();
    return normalizeRdap(doc,domain);
  }finally{clearTimeout(timer)}
}
