import { describe, expect, it } from "vitest";
import { rewardDescription } from "@/lib/loyalty";

describe("Reward input rules", () => {
  it("accepts a 1 percent discount", () => expect(rewardDescription("discount", "1")).toBe("Sconto del 1%"));
  it("accepts a 100 percent discount", () => expect(rewardDescription("discount", "100")).toBe("Sconto del 100%"));
  it("rejects discounts above 100", () => expect(rewardDescription("discount", "101")).toBeNull());
  it("rejects empty gifts", () => expect(rewardDescription("gift", " ")).toBeNull());
  it("rejects gifts exceeding server length limit", () => expect(rewardDescription("gift", "x".repeat(501))).toBeNull());
});