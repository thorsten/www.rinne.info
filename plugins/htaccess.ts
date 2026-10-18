/**
 * Writes public/.htaccess from plugins/htaccess.template after the build.
 *
 * The template's __CSP_SCRIPT_HASHES__ placeholder is replaced with sha256 hashes of every
 * inline <script> found in the emitted HTML, so the Content-Security-Policy keeps matching
 * the pre-paint theme snippet in <head> without manual updates.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

const PLACEHOLDER = "__CSP_SCRIPT_HASHES__";
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)(?![^>]*\btype="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g;

export function inlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>();
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const body = match[1] ?? "";
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  return [...hashes];
}

export function htaccessPlugin(template = "plugins/htaccess.template"): Plugin {
  let config: ResolvedConfig;
  const hashes = new Set<string>();

  return {
    name: "rinne:htaccess",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      order: "post",
      handler(html) {
        for (const hash of inlineScriptHashes(html)) hashes.add(hash);
      },
    },
    closeBundle() {
      const source = fs.readFileSync(path.resolve(config.root, template), "utf8");
      const out = source.replace(PLACEHOLDER, [...hashes].toSorted().join(" "));
      fs.writeFileSync(path.join(config.build.outDir, ".htaccess"), out);
      config.logger.info(`.htaccess written with ${hashes.size} inline script hash(es)`);
    },
  };
}
