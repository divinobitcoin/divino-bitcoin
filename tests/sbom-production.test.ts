import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const sbomPath = resolve(projectRoot, "docs", "sbom-cyclonedx-production.json");

describe("SBOM de produção", () => {
  it("mantém um inventário CycloneDX determinístico e sem dependências de desenvolvimento", () => {
    const sbom = JSON.parse(readFileSync(sbomPath, "utf8"));
    const componentNames = sbom.components.map((component: { name: string }) => component.name);

    expect(sbom).toMatchObject({
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      version: 1,
      metadata: { component: { type: "application" } },
    });
    expect(sbom.metadata.component.licenses).toEqual([{ license: { id: "GPL-3.0-or-later" } }]);
    expect(sbom.components.length).toBeGreaterThan(100);
    expect(componentNames).toContain("expo");
    expect(componentNames).toContain("react-native");
    expect(componentNames).not.toContain("vitest");
  });
});
