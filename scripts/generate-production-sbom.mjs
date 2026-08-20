import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";

const projectRoot = resolve(import.meta.dirname, "..");
const lockfile = parse(readFileSync(resolve(projectRoot, "pnpm-lock.yaml"), "utf8"));
const manifest = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));
const packages = lockfile.packages ?? {};
const snapshots = lockfile.snapshots ?? {};
const importer = lockfile.importers?.["."];

if (!importer?.dependencies) {
  throw new Error("O lockfile não contém as dependências de produção do importador raiz.");
}

function withoutPeerSuffix(reference) {
  return String(reference).replace(/\(.+$/, "");
}

function packageKey(name, reference) {
  return `${name}@${withoutPeerSuffix(reference)}`;
}

function snapshotKey(name, reference) {
  return `${name}@${String(reference)}`;
}

function packageCoordinates(key) {
  const separator = key.lastIndexOf("@");
  if (separator <= 0) throw new Error(`Chave de pacote inválida: ${key}`);
  return { name: key.slice(0, separator), version: key.slice(separator + 1) };
}

function packageUrl(name, version) {
  const encodedName = name.split("/").map(encodeURIComponent).join("/");
  return `pkg:npm/${encodedName}@${encodeURIComponent(version)}`;
}

function sha512Hash(integrity) {
  if (!integrity?.startsWith("sha512-")) return undefined;
  return { alg: "SHA-512", content: integrity.slice("sha512-".length) };
}

const queue = Object.entries(importer.dependencies).map(([name, entry]) => ({
  packageKey: packageKey(name, entry.version),
  snapshotKey: snapshotKey(name, entry.version),
}));
const visitedPackages = new Set();
const visitedSnapshots = new Set();
const edges = new Map();

while (queue.length > 0) {
  const item = queue.pop();
  if (!item || visitedSnapshots.has(item.snapshotKey)) continue;
  if (!packages[item.packageKey]) {
    throw new Error(`Pacote de produção ausente do lockfile: ${item.packageKey}`);
  }

  visitedSnapshots.add(item.snapshotKey);
  visitedPackages.add(item.packageKey);
  const snapshot = snapshots[item.snapshotKey] ?? snapshots[item.packageKey] ?? {};
  const dependencies = { ...(snapshot.dependencies ?? {}), ...(snapshot.optionalDependencies ?? {}) };
  const childKeys = edges.get(item.packageKey) ?? new Set();

  for (const [name, reference] of Object.entries(dependencies)) {
    if (typeof reference !== "string" || reference.startsWith("link:")) continue;
    const childPackageKey = packageKey(name, reference);
    if (!packages[childPackageKey]) {
      throw new Error(`Dependência ausente do lockfile: ${item.packageKey} → ${childPackageKey}`);
    }
    childKeys.add(childPackageKey);
    queue.push({ packageKey: childPackageKey, snapshotKey: snapshotKey(name, reference) });
  }

  edges.set(item.packageKey, childKeys);
}

const componentByKey = new Map(
  [...visitedPackages].sort().map((key) => {
    const { name, version } = packageCoordinates(key);
    const resolution = packages[key]?.resolution ?? {};
    const hash = sha512Hash(resolution.integrity);
    const component = {
      type: "library",
      "bom-ref": packageUrl(name, version),
      name,
      version,
      purl: packageUrl(name, version),
      ...(hash ? { hashes: [hash] } : {}),
    };
    return [key, component];
  }),
);

const rootPurl = packageUrl(manifest.name, manifest.version);
const bom = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: `urn:uuid:${"00000000-0000-4000-8000-000000000000"}`,
  version: 1,
  metadata: {
    component: {
      type: "application",
      "bom-ref": rootPurl,
      name: manifest.name,
      version: manifest.version,
      licenses: [{ license: { id: manifest.license } }],
      purl: rootPurl,
    },
  },
  components: [...componentByKey.values()].sort((left, right) => left.purl.localeCompare(right.purl)),
  dependencies: [
    {
      ref: rootPurl,
      dependsOn: Object.entries(importer.dependencies)
        .map(([name, entry]) => componentByKey.get(packageKey(name, entry.version))?.purl)
        .filter(Boolean)
        .sort(),
    },
    ...[...edges.entries()]
      .map(([key, childKeys]) => ({
        ref: componentByKey.get(key).purl,
        dependsOn: [...childKeys].map((childKey) => componentByKey.get(childKey).purl).sort(),
      }))
      .sort((left, right) => left.ref.localeCompare(right.ref)),
  ],
};

const outputPath = resolve(projectRoot, "docs", "sbom-cyclonedx-production.json");
writeFileSync(outputPath, `${JSON.stringify(bom, null, 2)}\n`);
console.log(`SBOM de produção gerado: ${outputPath} (${bom.components.length} componentes).`);
