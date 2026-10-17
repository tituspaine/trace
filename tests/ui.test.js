import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";
test("homepage serves mobile-ready investigation interface",async()=>{
 const response=await worker.fetch(new Request("https://trace.example/"));
 assert.equal(response.status,200);
 const html=await response.text();
 for(const marker of ['name="viewport"','id="search"','id="tabGraph"','id="tabTimeline"','id="tabSources"','id="cancel"','id="share"','id="htmlExport"'])assert.ok(html.includes(marker),marker);
 assert.match(response.headers.get("cache-control"),/no-store/);
});
test("health endpoint does not require persistence",async()=>{
 const response=await worker.fetch(new Request("https://trace.example/api/health"));
 const data=await response.json();
 assert.equal(response.status,200);
 assert.equal(data.persistence,false);
});
test("oversized query rejected before contacting upstream",async()=>{
 const response=await worker.fetch(new Request("https://trace.example/api/investigate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({q:"a".repeat(161)})}));
 assert.equal(response.status,400);
});
test("no unsafe arbitrary fetch route",async()=>{
 const response=await worker.fetch(new Request("https://trace.example/api/fetch?url=http://127.0.0.1"));
 assert.equal(response.status,404);
});
