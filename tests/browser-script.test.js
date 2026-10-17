import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import worker from "../src/worker.js";
test("inline application script compiles without syntax errors",async()=>{
 const response=await worker.fetch(new Request("https://trace.example/"));
 const html=await response.text();
 const match=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(match,"Application script exists");
 assert.doesNotThrow(()=>new vm.Script(match[1]));
});
test("minimal landing screen has only search and brand",async()=>{
 const html=await (await worker.fetch(new Request("https://trace.example/"))).text();
 const home=html.match(/<section id="home"[\s\S]*?<\/section>/)?.[0];
 assert.ok(home);
 assert.match(home,/<h1>TRACE<\/h1>/);
 assert.match(home,/id="search"/);
 assert.doesNotMatch(home,/No account|No database|Follow the evidence/);
});
test("search API requires same-origin JSON POST",async()=>{
 const get=await worker.fetch(new Request("https://trace.example/api/investigate?q=example"));
 assert.equal(get.status,405);
 const cross=await worker.fetch(new Request("https://trace.example/api/investigate",{method:"POST",headers:{"content-type":"application/json","origin":"https://another.example"},body:JSON.stringify({q:"example"})}));
 assert.equal(cross.status,403);
});
