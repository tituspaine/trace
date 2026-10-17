// USAspending.gov public award search; organizational recipients only.
const API="https://api.usaspending.gov/api/v2/search/spending_by_award/";
export function normalizeAward(row){
 const id=String(row["Award ID"]||row.generated_internal_id||"");
 const recipient=String(row["Recipient Name"]||"");
 return {id:"usaspending:"+id,type:"federal_award",name:recipient||"Federal award "+id,
   awardId:id,recipient,amount:row["Award Amount"]??null,
   awardType:row["Award Type"]||null,description:row["Description"]||null,
   awardingAgency:row["Awarding Agency"]||null,place:row["Place of Performance State Code"]||null,
   source:{name:"USAspending.gov",url:"https://www.usaspending.gov/search?hash="+encodeURIComponent(id)}};
}
export async function searchAwards(query){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const body={filters:{keywords:[query],award_type_codes:["A","B","C","D"]},
    fields:["Award ID","Recipient Name","Award Amount","Award Type","Description","Awarding Agency","Place of Performance State Code"],
    page:1,limit:10,sort:"Award Amount",order:"desc",subawards:false};
  const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:controller.signal});
  if(!r.ok)throw Error("USAspending HTTP "+r.status);
  const data=await r.json();return (data.results||[]).map(normalizeAward);
 }finally{clearTimeout(timer)}
}
