import { describe, expect, it } from "vitest";
import { passwordError } from "@/lib/account-validation";

describe("Account password validation", () => {
  it("rejects a password shorter than the existing eight-character minimum", () => {
    expect(passwordError("Abc1234", "Abc1234")).not.toBeNull();
  });
  it("rejects mismatched confirmation", () => {
    expect(passwordError("Password1", "Password2")).not.toBeNull();
  });
  it("accepts matching eight-character passwords", () => {
    expect(passwordError("Abcd1234", "Abcd1234")).toBeNull();
  });
});