import { test } from "node:test";
import assert from "node:assert/strict";
import { detectLang, smallTalk, smallTalkKind } from "./smalltalk";

test("recognises greetings and small talk in several languages", () => {
  assert.equal(smallTalkKind("hi"), "greeting");
  assert.equal(smallTalkKind("Hello!"), "greeting");
  assert.equal(smallTalkKind("Assalam o alaikum"), "greeting");
  assert.equal(smallTalkKind("नमस्ते"), "greeting");
  assert.equal(smallTalkKind("السلام علیکم"), "greeting");
  assert.equal(smallTalkKind("how are you?"), "how_are_you");
  assert.equal(smallTalkKind("hello how are you"), "how_are_you");
  assert.equal(smallTalkKind("kya chal raha hai"), "how_are_you");
  assert.equal(smallTalkKind("क्या चल रहा है"), "how_are_you");
  assert.equal(smallTalkKind("thanks a lot"), "thanks");
  assert.equal(smallTalkKind("shukriya"), "thanks");
  assert.equal(smallTalkKind("are you a bot?"), "who");
  assert.equal(smallTalkKind("ok"), "ack");
});

test("leaves real questions to the product engine", () => {
  assert.equal(smallTalkKind("What is the MOQ for racing suits?"), null);
  assert.equal(smallTalkKind("history of football"), null);
  assert.equal(smallTalkKind("hockey jerseys price"), null);
});

test("replies in the visitor's script", () => {
  assert.equal(detectLang("kya haal hai bhai"), "roman");
  assert.equal(detectLang("how are you"), "en");
  assert.equal(detectLang("कैसे हो"), "hi");
  assert.match(smallTalk("kya chal raha hai", "Gridline")!.reply, /theek/);
  assert.match(smallTalk("hi", "Gridline")!.reply, /Welcome to Gridline/);
});
