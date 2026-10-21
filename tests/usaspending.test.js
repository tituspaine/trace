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
test("award evidence uses the generated canonical ID, not the saved-search hash",()=>{
 const record=normalizeAward({"Award ID":"ABC123",generated_internal_id:"CONT_AWD_ABC123_9700_0_0","Recipient Name":"Example Holdings LLC","Award Amount":0,"Contract Award Type":"DEFINITIVE CONTRACT"});
 assert.equal(record.id,"usaspending:CONT_AWD_ABC123_9700_0_0");
 assert.equal(record.awardId,"ABC123");
 assert.equal(record.source.url,"https://www.usaspending.gov/award/CONT_AWD_ABC123_9700_0_0");
 assert.equal(record.source.recordSpecific,true);
 assert.equal(record.amount,0);
 assert.equal(record.awardType,"DEFINITIVE CONTRACT");
});
test("missing canonical award IDs are explicitly non-record-specific",()=>{
 const record=normalizeAward({"Award ID":"ABC123"});
 assert.equal(record.source.url,"https://www.usaspending.gov/search");
 assert.equal(record.source.recordSpecific,false);
});
