import test from "node:test";
import assert from "node:assert/strict";
import {cikFrom,normalizeSec} from "../src/collectors/sec.js";
import {classify} from "../src/worker.js";
test("explicit SEC CIK parsing",()=>{
 assert.equal(cikFrom("CIK 320193"),"0000320193");
 assert.equal(cikFrom("320193"),null);
 assert.equal(classify("CIK 320193"),"cik");
});
test("SEC record normalization",()=>{
 const row=normalizeSec({name:"Example Corp",stateOfIncorporation:"DE",addresses:{business:{city:"Albany",stateOrCountry:"GA"}}},"0000320193");
 assert.equal(row.name,"Example Corp");
 assert.match(row.legalAddress,/Albany/);
 assert.match(row.source.url,/sec.gov/);
});
