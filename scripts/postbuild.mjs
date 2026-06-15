// Writes the module-type marker into each build output directory so that Node
// interprets the files correctly regardless of the published package's top-level
// "type": dist/cjs/* are CommonJS, dist/esm/* are ES modules. Without the esm
// marker, Node would parse the ESM output as CommonJS and throw on `import`.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const markers = [
  ["dist/cjs/package.json", { type: "commonjs" }],
  ["dist/esm/package.json", { type: "module" }],
];

for (const [relPath, contents] of markers) {
  const target = resolve(root, relPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(contents, null, 2) + "\n");
}
