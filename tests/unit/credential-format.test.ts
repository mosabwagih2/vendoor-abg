import { describe, expect, it } from "vitest";
import { credentialCopyText } from "@/domain/credential-format";

describe("credentialCopyText", () => {
  it("joins login and password on two lines", () => expect(credentialCopyText({ username: "a@b.com", password: "pw" })).toBe("a@b.com\npw"));
  it("skips a missing password", () => expect(credentialCopyText({ username: "a@b.com", password: null })).toBe("a@b.com"));
  it("skips a missing login", () => expect(credentialCopyText({ username: "", password: "pw" })).toBe("pw"));
  it("is empty when both are empty", () => expect(credentialCopyText({})).toBe(""));
});
