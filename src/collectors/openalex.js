// OpenAlex public research-institution directory.
export function normalizeInstitution(row) {
  return {id:"openalex:"+row.id,type:"organization",name:row.display_name,
    jurisdiction:row.country_code||null,city:row.geo?.city||null,
    website:row.homepage_url||null,worksCount:row.works_count||0,
    source:{name:"OpenAlex",url:row.id}};
}
export async function searchInstitutions(query) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7500);
  try {
    const u="https://api.openalex.org/institutions?search="+encodeURIComponent(query)+"&per-page=10";
    const response=await fetch(u,{signal:controller.signal,headers:{accept:"application/json"}});
    if(!response.ok)throw Error("OpenAlex HTTP "+response.status);
    const data=await response.json();
    if(!Array.isArray(data.results))throw Error("Invalid institution search response");
    return data.results.map(normalizeInstitution);
  } finally {clearTimeout(timer)}
}
