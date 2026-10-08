import { test } from "node:test";
import assert from "node:assert/strict";
import { breakdownText, normaliseSize, parseRoster } from "./roster";

test("normalises common size spellings", () => {
  assert.equal(normaliseSize("xxl"), "2XL");
  assert.equal(normaliseSize("Medium"), "M");
  assert.equal(normaliseSize("8-9"), "8-9Y");
  assert.equal(normaliseSize("10Y"), "10-11Y");
  assert.equal(normaliseSize("Youth L"), "YL");
  assert.equal(normaliseSize("10"), null);
  assert.equal(normaliseSize("Ali"), null);
});

test("parses spreadsheet columns and skips the header", () => {
  const r = parseRoster("Name\tNumber\tSize\nAli Khan\t10\tM\nSara Ahmed\t7\tS\nJohn Smith\t23\txl");
  assert.equal(r.players.length, 3);
  assert.deepEqual(r.players[0], { name: "Ali Khan", number: "10", size: "M" });
  assert.equal(breakdownText(r.breakdown), "S × 1, M × 1, XL × 1");
});

test("parses WhatsApp-style lines in any order", () => {
  const r = parseRoster("1. Ali Khan 10 M\n- #7 Sara S\nBilal L 9\nYouth M Omar 4");
  assert.deepEqual(
    r.players.map((p) => [p.name, p.number, p.size]),
    [
      ["Ali Khan", "10", "M"],
      ["Sara", "7", "S"],
      ["Bilal", "9", "L"],
      ["Omar", "4", "YM"],
    ],
  );
});

test("flags duplicate numbers and missing sizes", () => {
  const r = parseRoster("Ali,10,M\nUsman,10,L\nHamza,11,");
  assert.deepEqual(r.duplicateNumbers, ["10"]);
  assert.equal(r.missingSize, 1);
});

test("orders the breakdown kids → youth → adult", () => {
  const r = parseRoster("a,1,XL\nb,2,8-9\nc,3,YS\nd,4,S");
  assert.deepEqual(r.breakdown.map((b) => b.size), ["8-9Y", "YS", "S", "XL"]);
});
