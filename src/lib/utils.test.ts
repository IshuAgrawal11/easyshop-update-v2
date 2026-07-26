import { describe, expect, it } from "vitest";
import { escapeRegex, discountPercent, totalPrice } from "./utils";

describe("escapeRegex", () => {
  it("escapes regex metacharacters so they are matched literally", () => {
    const escaped = escapeRegex("a.b*c?");
    expect(new RegExp(`^${escaped}$`).test("a.b*c?")).toBe(true);
    expect(new RegExp(`^${escaped}$`).test("aXbXc")).toBe(false);
  });

  it("neutralizes a catastrophic-backtracking pattern instead of compiling it as regex", () => {
    const malicious = "(a+)+$";
    const escaped = escapeRegex(malicious);
    // If this were compiled unescaped it would be a ReDoS pattern; escaped,
    // it must only ever match the literal string "(a+)+$".
    expect(new RegExp(escaped).test("(a+)+$")).toBe(true);
    expect(new RegExp(escaped).test("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!")).toBe(false);
  });
});

describe("discountPercent", () => {
  it("computes the percentage drop from oldPrice to price", () => {
    expect(discountPercent(80, 100)).toBe("20%");
  });
});

describe("totalPrice", () => {
  it("sums price * amount across cart items, defaulting amount to 1", () => {
    const items = [
      { _id: "1", title: "a", price: 10, image: [], unit_of_measure: "", shop_category: "grocery" },
      { _id: "2", title: "b", price: 5, amount: 3, image: [], unit_of_measure: "", shop_category: "grocery" },
    ] as any;
    expect(totalPrice(items)).toBe(10 * 1 + 5 * 3);
  });
});
