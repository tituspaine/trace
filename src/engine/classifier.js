const corporate=/\b(llc|inc|incorporated|corp|corporation|ltd|limited|holdings|foundation|university|college|bank|company|co\.|group|nonprofit|association|church|ministries|enterprises)\b/i;
const address=/\b\d{1,6}\s+[\w.\s-]+\b(st|street|rd|road|ave|avenue|blvd|boulevard|dr|drive|ln|lane|ct|court|way)\b/i;
export function subjectHint(query){
 const q=String(query||"").trim();
 if(address.test(q))return "property";
 if(corporate.test(q))return "organization";
 if(/^[a-z\s.'-]+$/i.test(q)&&q.split(/\s+/).length>=2)return "ambiguous_name";
 return "unknown";
}
export function exactWordMatch(query,name){
 const norm=s=>String(s||"").normalize("NFKC").toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
 const words=norm(name),wanted=norm(query);
 return wanted.length>0&&wanted.every(w=>words.includes(w));
}
