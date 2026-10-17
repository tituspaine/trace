import test from "node:test";
import assert from "node:assert/strict";
import { classify, normalize } from "../src/worker.js";
test("recognizes LEIs",()=>assert.equal(classify("5493001KJTIIGC8Y1R12"),"lei"));
test("recognizes email",()=>assert.equal(classify("person@example.org"),"email"));
test("recognizes domain URL",()=>assert.equal(classify("https://example.org/profile"),"url"));
test("recognizes names",()=>assert.equal(classify("Example Holdings LLC"),"name"));
test("normalizes documented public record",()=>{
  const record=normalize({attributes:{lei:"5493001KJTIIGC8Y1R12",entity:{legalName:{name:"Example LLC"},legalJurisdiction:"US-GA",legalAddress:{addressLines:["123 Example St"],city:"Albany",country:"US"}}}});
  assert.equal(record.name,"Example LLC");
  assert.equal(record.jurisdiction,"US-GA");
  assert.match(record.legalAddress,/Albany/);
  assert.match(record.source.url,/gleif.org/);
});
