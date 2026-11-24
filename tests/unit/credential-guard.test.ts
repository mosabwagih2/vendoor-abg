import { describe, expect, it } from "vitest";
import { analyzeText, redactSecrets } from "@/domain/credential-guard";

describe("credential guard (FR-6.11)", () => {
  it.each([
    "password: Vend00r!2026",
    "the pass is Tamq@123",
    "pass = abc12345",
    "الباسورد: Ab12345",
    "الباسورد هو Arc_2026",
    "كلمة السر: Zx98uY",
    "el pass howa vara2026",
    "AKIAIOSFODNN7EXAMPLE",
    "AIzaSyA1234567890abcdefghijklmnopqrstuv",
    "-----BEGIN RSA PRIVATE KEY-----",
    "shpat_" + "0123456789abcdef0123456789abcdef",
  ])("warns (high): %s", (t) => expect(analyzeText(t).level).toBe("high"));

  it("warns (medium) on email followed by a password-like line", () => {
    const r = analyzeText("tamqve@outlook.com\nTamq#2026");
    expect(r.level).not.toBe("none");
    expect(r.suggestion).toEqual({ username: "tamqve@outlook.com", password: "Tamq#2026" });
  });

  it("extracts username and password for the Account access form", () => {
    const r = analyzeText("email: ve7586@vendoor.com\npassword: Ve7586!x");
    expect(r.suggestion?.username).toBe("ve7586@vendoor.com");
    expect(r.suggestion?.password).toBe("Ve7586!x");
  });

  it.each([
    "Forgot-password code not sent (OTP service)",
    "The reset password page is broken",
    "نسيت كلمة السر ومش بيوصل كود",
    "Password reset OTP does not arrive",
    "Change password button does nothing",
    "Account ve5372 will not open",
    "tamqve@outlook.com cannot link Bosta",
    "password: ****",
    "Order si1267 shows wrong COD",
  ])("does not warn: %s", (t) => expect(analyzeText(t).level).toBe("none"));

  it("redacts detected secrets", () => {
    expect(redactSecrets("password: Vend00r!2026")).toBe("password: [see Account access]");
  });
});
