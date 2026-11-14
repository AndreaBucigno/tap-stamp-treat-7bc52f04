import { describe, expect, it } from "vitest";
import { rewardDescription, validStampResult } from "@/lib/loyalty";

describe("Reward input rules", () => {
  it("accepts a 1 percent discount", () => expect(rewardDescription("discount", "1")).toBe("Sconto del 1%"));
  it("accepts a 100 percent discount", () => expect(rewardDescription("discount", "100")).toBe("Sconto del 100%"));
  it("rejects discounts above 100", () => expect(rewardDescription("discount", "101")).toBeNull());
  it("rejects empty gifts", () => expect(rewardDescription("gift", " ")).toBeNull());
  it("rejects gifts exceeding server length limit", () => expect(rewardDescription("gift", "x".repeat(501))).toBeNull());
});

describe("Stamp response validation", () => {
  it("accepts a confirmed completed card", () => expect(validStampResult({ customer_name: "Cliente", stamps: 10, stamps_required: 10 })).toBe(true));
  it("rejects a missing confirmation", () => expect(validStampResult(null)).toBe(false));
  it("rejects stamps exceeding the card limit", () => expect(validStampResult({ customer_name: "Cliente", stamps: 11, stamps_required: 10 })).toBe(false));
  it("rejects nonnumeric stamp counts", () => expect(validStampResult({ customer_name: "Cliente", stamps: "1", stamps_required: 10 })).toBe(false));
  it("rejects incomplete confirmations", () => expect(validStampResult({ stamps: 1 })).toBe(false));
});