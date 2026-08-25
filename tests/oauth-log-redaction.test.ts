import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const runtimeFiles = [
  "app/oauth/callback.tsx",
  "lib/_core/api.ts",
  "lib/_core/auth.ts",
  "hooks/use-auth.ts",
] as const;

const sensitiveNames = new Set([
  "code",
  "state",
  "sessionToken",
  "token",
  "user",
  "userInfo",
  "apiUser",
  "cachedUser",
  "responseHeaders",
  "setCookie",
  "errorText",
  "error",
  "result",
  "url",
]);

function readRuntimeFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function getPropertyNameText(name: ts.PropertyName | undefined): string | null {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function isSensitiveExpression(expression: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(expression)) {
    return isSensitiveExpression(expression.expression);
  }

  if (ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression)) {
    return isSensitiveExpression(expression.expression);
  }

  if (ts.isNonNullExpression(expression)) {
    return isSensitiveExpression(expression.expression);
  }

  if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.ExclamationToken) {
    return false;
  }

  if (ts.isCallExpression(expression)) {
    if (ts.isIdentifier(expression.expression) && expression.expression.text === "Boolean") {
      return false;
    }
    return (
      isSensitiveExpression(expression.expression) ||
      expression.arguments.some(isSensitiveExpression)
    );
  }

  if (ts.isIdentifier(expression)) {
    return sensitiveNames.has(expression.text);
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return sensitiveNames.has(expression.name.text) || isSensitiveExpression(expression.expression);
  }

  if (ts.isElementAccessExpression(expression)) {
    return (
      isSensitiveExpression(expression.expression) ||
      (expression.argumentExpression ? isSensitiveExpression(expression.argumentExpression) : false)
    );
  }

  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.some((property) => {
      if (ts.isPropertyAssignment(property)) {
        return isSensitiveExpression(property.initializer);
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        return sensitiveNames.has(property.name.text);
      }
      return false;
    });
  }

  if (ts.isBinaryExpression(expression)) {
    return isSensitiveExpression(expression.left) || isSensitiveExpression(expression.right);
  }

  if (ts.isConditionalExpression(expression)) {
    return (
      isSensitiveExpression(expression.condition) ||
      isSensitiveExpression(expression.whenTrue) ||
      isSensitiveExpression(expression.whenFalse)
    );
  }

  if (ts.isTemplateExpression(expression)) {
    return expression.templateSpans.some((span) => isSensitiveExpression(span.expression));
  }

  return false;
}

function findUnsafeConsoleCalls(relativePath: string): string[] {
  const source = readRuntimeFile(relativePath);
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const unsafeCalls: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(sourceFile) === "console" &&
      ["log", "warn", "error"].includes(node.expression.name.text) &&
      node.arguments.some(isSensitiveExpression)
    ) {
      unsafeCalls.push(node.getText(sourceFile));
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return unsafeCalls;
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

  it("does not pass raw secrets, callback values, user objects, headers, or errors to console", () => {
    for (const relativePath of runtimeFiles) {
      expect(findUnsafeConsoleCalls(relativePath), `unsafe log in ${relativePath}`).toEqual([]);
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
