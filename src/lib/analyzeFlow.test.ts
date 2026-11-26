import { describe, expect, it, vi } from "vitest";
import {
  fileFromPastedText,
  prettyFileSize,
  signInPath,
  stashPendingAnalysis,
  takePendingAnalysis,
  validateFile,
  type PreparedUpload,
} from "@/lib/analyzeFlow";

function prepared(overrides: Partial<PreparedUpload> = {}): PreparedUpload {
  return {
    objectKey: "uploads/abc.pdf",
    filename: "contract.pdf",
    contentType: "application/pdf",
    size: 1234,
    precheckToken: "token",
    preparedAt: Date.now(),
    parties: [],
    ...overrides,
  };
}

describe("validateFile", () => {
  it("accepts PDF, Word and text files", () => {
    for (const name of ["a.pdf", "b.DOCX", "c.txt"]) {
      expect(validateFile(new File(["x"], name))).toBeNull();
    }
  });

  it("rejects other types, empty files and files over 25 MB", () => {
    expect(validateFile(new File(["x"], "photo.png"))).toMatch(/PDF, Word/);
    expect(validateFile(new File([], "empty.pdf"))).toMatch(/empty/);
    const big = new File(["x"], "big.pdf");
    Object.defineProperty(big, "size", { value: 26 * 1024 * 1024 });
    expect(validateFile(big)).toMatch(/25 MB/);
  });
});

describe("pasted text", () => {
  it("becomes a plain-text file for the upload pipeline", async () => {
    const file = fileFromPastedText("Contract body");
    expect(file.type).toBe("text/plain");
    expect(file.name).toBe("Pasted contract.txt");
    expect(await file.text()).toBe("Contract body");
  });
});

describe("pending analysis across sign-in", () => {
  it("returns a fresh stashed upload once, then clears it", () => {
    stashPendingAnalysis(prepared());
    expect(takePendingAnalysis()?.objectKey).toBe("uploads/abc.pdf");
    expect(takePendingAnalysis()).toBeNull();
  });

  it("drops an upload whose safety check has likely expired", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000_000_000_000);
    stashPendingAnalysis(prepared({ preparedAt: 1_000_000_000_000 - 14 * 60 * 1000 }));
    expect(takePendingAnalysis()).toBeNull();
  });
});

describe("helpers", () => {
  it("builds a sign-in link that comes back to the right place", () => {
    expect(signInPath("/?resume=1")).toBe("/sign-in?returnTo=%2F%3Fresume%3D1");
    expect(signInPath("/", "sign-up")).toBe("/sign-in?returnTo=%2F&mode=sign-up");
  });

  it("formats file sizes", () => {
    expect(prettyFileSize(512)).toBe("512 B");
    expect(prettyFileSize(2048)).toBe("2 KB");
    expect(prettyFileSize(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
});

describe("stashed uploads keep their parties", () => {
  it("restores the parties found at precheck after sign-in", () => {
    stashPendingAnalysis(prepared({ parties: [{ name: "Luna Park Studio", role: "vendor" }, { name: "Harbor Media Inc.", role: "client" }] }));
    expect(takePendingAnalysis()?.parties.map((p) => p.name)).toEqual(["Luna Park Studio", "Harbor Media Inc."]);
  });

  it("treats older stashed uploads as having no parties", () => {
    const { parties: _parties, ...old } = prepared();
    void _parties;
    window.sessionStorage.setItem("pt.pendingAnalysis", JSON.stringify(old));
    expect(takePendingAnalysis()?.parties).toEqual([]);
  });
});
