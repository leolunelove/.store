import test from "node:test";
import assert from "node:assert/strict";
import { getProduct, isAllowedPaidAmount, parseAmount } from "../server/store.js";

test("only known product IDs resolve", () => {
  assert.equal(getProduct("smile").name, "Smile — digital download");
  assert.equal(getProduct("__proto__"), null);
  assert.equal(getProduct("../../secret"), null);
});

test("amounts must be whole pennies within the allowed range", () => {
  assert.equal(parseAmount("500"), 500);
  assert.equal(parseAmount("5.5"), null);
  assert.equal(isAllowedPaidAmount(99), false);
  assert.equal(isAllowedPaidAmount(100), true);
  assert.equal(isAllowedPaidAmount(50000), true);
  assert.equal(isAllowedPaidAmount(50001), false);
});
