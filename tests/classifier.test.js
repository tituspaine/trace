import test from "node:test";
import assert from "node:assert/strict";
import {subjectHint,exactWordMatch} from "../src/engine/classifier.js";
test("distinguishes organizations and ambiguous personal names",()=>{
 assert.equal(subjectHint("ABC Holdings LLC"),"organization");
 assert.equal(subjectHint("Titus Paine"),"ambiguous_name");
});
test("prevents irrelevant substring matches",()=>{
 assert.equal(exactWordMatch("Hello","Hello World Limited"),true);
 assert.equal(exactWordMatch("Hello","Othello Holdings"),false);
 assert.equal(exactWordMatch("Hello Group","Hello Group SARL"),true);
 assert.equal(exactWordMatch("Titus Paine","Titus Pine LLC"),false);
});
