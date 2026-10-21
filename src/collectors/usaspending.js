// USAspending.gov public award search; organizational recipients only.
const API="https://api.usaspending.gov/api/v2/search/spending_by_award/";
export function normalizeAward(row){
 const awardId=String(row["Award ID"]||"");
 const id=String(row.generated_internal_id||awardId);
 const recipient=String(row["Recipient Name"]||"");
 return {id:"usaspending:"+id,type:"federal_award",name:recipient||"Federal award "+id,
   awardId,recipient,amount:row["Award Amount"]??null,
   awardType:row["Contract Award Type"]||row["Award Type"]||null,description:row["Description"]||null,
   awardingAgency:row["Awarding Agency"]||null,place:row["Place of Performance State Code"]||null,
   source:{name:"USAspending.gov",url:row.generated_internal_id?"https://www.usaspending.gov/award/"+encodeURIComponent(row.generated_internal_id):"https://www.usaspending.gov/search",recordSpecific:!!row.generated_internal_id}};
}
export async function searchAwards(query){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const body={filters:{keywords:[query],award_type_codes:["A","B","C","D"]},
    fields:["Award ID","Recipient Name","Award Amount","Contract Award Type","generated_internal_id","Description","Awarding Agency","Place of Performance State Code"],
    page:1,limit:10,sort:"Award Amount",order:"desc",subawards:false};
  const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:controller.signal});
  if(!r.ok)throw Error("USAspending HTTP "+r.status);
  const data=await r.json();if(!Array.isArray(data.results))throw Error("Invalid award search response");return data.results.map(normalizeAward);
 }finally{clearTimeout(timer)}
}
