// Pure, deterministic in-session entity graph. No persistent storage.
export function buildGraph(investigations){
  const nodes=new Map(),edges=new Map();
  for(const inv of investigations||[]){
    for(const record of inv.records||[]){
      if(!record.id)continue;
      nodes.set(record.id,{id:record.id,type:record.type,name:record.name,source:record.source});
      for(const link of record.links||[]){
        if(!link.id||!link.type)continue;
        nodes.set(link.id,nodes.get(link.id)||{id:link.id,type:link.type,name:link.label||link.id});
        const id=record.id+"|"+link.type+"|"+link.id;
        edges.set(id,{id,from:record.id,to:link.id,relation:link.type,source:record.source});
      }
    }
  }
  return {nodes:[...nodes.values()],edges:[...edges.values()]};
}
