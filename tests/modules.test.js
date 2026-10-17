import test from "node:test";
import assert from "node:assert/strict";
import { domainFrom, normalizeRdap } from "../src/collectors/rdap.js";
import { buildGraph } from "../src/engine/graph.js";
test("domain input normalization",()=>{
 assert.equal(domainFrom("https://Example.org/path"),"example.org");
 assert.equal(domainFrom("example.org"),"example.org");
 assert.equal(domainFrom("localhost"),null);
});
test("RDAP event extraction",()=>{
 const r=normalizeRdap({events:[{eventAction:"registration",eventDate:"2020-01-01"}],nameservers:[{ldhName:"ns1.example.org"}]},"example.org");
 assert.equal(r.registered,"2020-01-01");
 assert.equal(r.nameservers[0],"ns1.example.org");
});
test("graph deduplicates source-backed edges",()=>{
 const record={id:"lei:ABC",name:"Example",type:"business",links:[{id:"lei:XYZ",label:"Related",type:"parent"}],source:{url:"https://example.org"}};
 const graph=buildGraph([{records:[record]},{records:[record]}]);
 assert.equal(graph.nodes.length,2);
 assert.equal(graph.edges.length,1);
});
