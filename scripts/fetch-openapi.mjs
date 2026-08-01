/**
 * Pull Weeek OpenAPI schema from the docs site JS bundle and write openapi/weeek.json.
 * The YAML is not published as a standalone file — only as a Vite chunk.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

const DOCS_BASE = "https://developers.weeek.net";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "openapi", "weeek.json");

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

async function main() {
  const html = await fetchText(`${DOCS_BASE}/api`);
  const entryMatch = html.match(/src="(\/assets\/entry\.client-[^"]+\.js)"/);
  if (!entryMatch) throw new Error("entry.client chunk not found in /api HTML");

  const entryJs = await fetchText(`${DOCS_BASE}${entryMatch[1]}`);
  const yamlMatch = entryJs.match(/weeek\.yaml-[A-Za-z0-9_-]+\.js/);
  if (!yamlMatch) throw new Error("weeek.yaml-*.js chunk not referenced from entry");

  const yamlUrl = `${DOCS_BASE}/assets/${yamlMatch[0]}`;
  const yamlJs = await fetchText(yamlUrl);

  const tmp = path.join(os.tmpdir(), `weeek-openapi-${Date.now()}.mjs`);
  await fs.writeFile(tmp, yamlJs, "utf8");
  try {
    const mod = await import(pathToFileURL(tmp).href);
    const schema = mod.schema;
    if (!schema?.openapi || !schema?.paths) {
      throw new Error("Imported module does not export a valid OpenAPI schema");
    }
    await fs.mkdir(path.dirname(OUT), { recursive: true });
    await fs.writeFile(OUT, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
    const pathCount = Object.keys(schema.paths).length;
    console.error(`Wrote ${OUT} (openapi ${schema.openapi}, ${pathCount} paths)`);
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
