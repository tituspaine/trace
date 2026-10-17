import test from "node:test";
import assert from "node:assert/strict";
import {normalizeAward} from "../src/collectors/usaspending.js";
test("federal award normalizes recipient and evidence",()=>{
 const record=normalizeAward({"Award ID":"ABC123","Recipient Name":"Example Holdings LLC","Award Amount":125000,"Awarding Agency":"Example Agency"});
 assert.equal(record.id,"usaspending:ABC123");
 assert.equal(record.amount,125000);
 assert.equal(record.recipient,"Example Holdings LLC");
 assert.equal(record.source.name,"USAspending.gov");
});
