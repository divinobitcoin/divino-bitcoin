import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const runtimeFiles = [
  "app/oauth/callback.tsx",
  "lib/_core/api.ts",
  "lib/_core/auth.ts",
  "hooks/use-auth.ts",
] as const;

function readRuntimeFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("OAuth and authentication log boundaries", () => {
  it("does not accept a session token from callback URL parameters", () => {
    const callback = readRuntimeFile("app/oauth/callback.tsx");

    expect(callback).not.toMatch(/sessionToken\?:/);
    expect(callback).not.toMatch(/params\.sessionToken/);
    expect(callback).not.toMatch(/searchParams\.get\(["']sessionToken["']\)/);
    expect(callback).not.toMatch(/setSessionToken\(sessionToken\)/);
    expect(callback).toMatch(/const match = url\.match\(\/\[\?&\]\(code\|state\)/);
  });

  it("does not log raw secrets, callback values, user objects, headers, or errors", () => {
    const sensitiveLogPatterns = [
      /\b(?:code|state|sessionToken|user)\s*:\s*params\./,
      /(?:token|sessionToken)\.substring/,
      /(?:userInfo|cachedUser|apiUser|responseHeaders|setCookie|errorText)\b/,
      /,\s*error\s*\)?\s*;?$/,
    ];

    for (const relativePath of runtimeFiles) {
      const source = readRuntimeFile(relativePath).replace(/\s+/g, " ");
      const unsafeLogCalls = source.match(
        /console\.(?:log|warn|error)\([^)]*(?:\b(?:code|state|sessionToken|user)\s*:\s*params\.|(?:token|sessionToken)\.substring|,\s*(?:userInfo|cachedUser|apiUser|responseHeaders|setCookie|errorText|error)\s*[),;])/g,
      ) ?? [];

      expect(unsafeLogCalls, `unsafe log in ${relativePath}`).toEqual([]);
    }
  });

  it("retains only boolean or status metadata in authentication logs", () => {
    const sources = runtimeFiles.map(readRuntimeFile).join("\n");
    const logLines = sources.split("\n").filter((line) => line.includes("console."));

    expect(sources).toContain("hasSession");
    expect(sources).toContain("hasUser");
    expect(sources).toContain("hasCode");
    expect(sources).toContain("hasState");
    expect(logLines).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Set-Cookie|Bearer|\bsessionToken\s*[:=]|\buser\s*[:=]/i),
      ]),
    );
  });
});
