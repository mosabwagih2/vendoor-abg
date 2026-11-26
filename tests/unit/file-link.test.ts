import { describe, expect, it } from "vitest";
import { fileLinkMessage, opensInline, servedType } from "@/domain/file-link";

describe("servedType", () => {
  it("passes safe media types through", () => {
    expect(servedType("image/png")).toBe("image/png");
    expect(servedType("video/mp4")).toBe("video/mp4");
    expect(servedType("audio/mp4")).toBe("audio/mp4");
    expect(servedType("application/pdf")).toBe("application/pdf");
  });
  it("turns anything a browser could run into a download", () => {
    for (const t of ["text/html", "image/svg+xml", "application/xhtml+xml", "text/xml", "application/javascript", "text/javascript", "TEXT/HTML; charset=utf-8"]) expect(servedType(t)).toBe("application/octet-stream");
  });
  it("falls back for missing or unknown types", () => {
    expect(servedType(null)).toBe("application/octet-stream");
    expect(servedType("whatever/else")).toBe("application/octet-stream");
  });
  it("ignores case and parameters", () => expect(servedType("Image/PNG; foo=bar")).toBe("image/png"));
});

describe("opensInline", () => {
  it("opens media in the browser and downloads the rest", () => {
    expect(opensInline("image/jpeg")).toBe(true);
    expect(opensInline("application/pdf")).toBe(true);
    expect(opensInline("text/plain")).toBe(false);
    expect(opensInline("application/octet-stream")).toBe(false);
  });
});

describe("fileLinkMessage", () => {
  it("includes the content type, so changing it breaks the signature", () => {
    expect(fileLinkMessage("a/b.png", 5, "image/png")).not.toBe(fileLinkMessage("a/b.png", 5, "text/html"));
  });
});
