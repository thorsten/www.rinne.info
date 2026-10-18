/**
 * Vite plugin that renders the data under content/ into index.html at build and dev time.
 *
 * Placeholders in the HTML:
 *   <!-- @content talks -->
 *   <!-- @content certifications -->
 *   <!-- @content experience -->
 *
 * Output is plain static HTML, so SEO and no-JS rendering stay intact. Editing a JSON file
 * in dev triggers a full reload.
 */

import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export interface Talk {
  year: number;
  /** Display date without year, e.g. "12. Oktober". */
  date: string;
  title: string;
  /** Free text; the link label (if any) must appear verbatim in here. */
  text: string;
  link?: { label: string; url: string };
}

export interface Certification {
  year: number;
  title: string;
}

export interface Experience {
  from: number;
  /** null means "heute". */
  to: number | null;
  company: string;
  role: string;
  city: string;
  country: string;
  detail: string;
}

const CONTENT_DIR = "content";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ESCAPES[char] ?? char);
}

function renderLinkedText(text: string, link: Talk["link"]): string {
  if (!link) return escapeHtml(text);
  const index = text.indexOf(link.label);
  if (index === -1) throw new Error(`Talk link label "${link.label}" not found in text "${text}"`);
  const anchor = `<a rel="nofollow" target="_blank" href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`;
  return escapeHtml(text.slice(0, index)) + anchor + escapeHtml(text.slice(index + link.label.length));
}

export function renderTalks(talks: readonly Talk[]): string {
  const byYear = new Map<number, Talk[]>();
  for (const talk of talks) {
    byYear.set(talk.year, [...(byYear.get(talk.year) ?? []), talk]);
  }
  const years = [...byYear.keys()].toSorted((a, b) => b - a);

  return years
    .map((year) => {
      const items = (byYear.get(year) ?? [])
        .map(
          (talk) => `          <li>
            <div class="when">${escapeHtml(talk.date)}</div>
            <div class="what"><strong>»${escapeHtml(talk.title)}«</strong><span>${renderLinkedText(talk.text, talk.link)}</span></div>
          </li>`,
        )
        .join("\n");
      return `      <div class="talk-year">
        <div class="y">${year}</div>
        <ul class="talk-items">
${items}
        </ul>
      </div>`;
    })
    .join("\n\n");
}

export function renderCertifications(certifications: readonly Certification[]): string {
  return certifications
    .toSorted((a, b) => a.year - b.year)
    .map((c) => `          <li><span class="yr">${c.year}</span><span>${escapeHtml(c.title)}</span></li>`)
    .join("\n");
}

export function renderExperience(experience: readonly Experience[]): string {
  const arrow =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  return experience
    .toSorted((a, b) => (b.to ?? Number.MAX_SAFE_INTEGER) - (a.to ?? Number.MAX_SAFE_INTEGER) || b.from - a.from)
    .map((e, i) => {
      const id = `exp-detail-${i + 1}`;
      const until = e.to === null ? '<span class="text-accent">heute</span>' : String(e.to);
      return `      <div class="exp reveal">
        <div class="font-mono text-[12px] tracking-[0.06em] text-fg-muted pt-2.5">${e.from} — ${until}</div>
        <div>
          <h3 class="m-0 mb-1.5 font-sans font-medium leading-[1.05] tracking-[-0.015em] text-[clamp(28px,3.2vw,42px)]">${escapeHtml(e.company)}</h3>
          <div class="m-0 mb-1 text-[16px] text-fg-dim">${escapeHtml(e.role)}</div>
          <div class="font-mono text-[11px] tracking-[0.08em] uppercase text-fg-muted">${escapeHtml(e.city)} · ${escapeHtml(e.country)}</div>
          <div class="exp-detail max-w-[70ch] text-[15px] leading-[1.65] text-fg-dim" id="${id}">${escapeHtml(e.detail)}</div>
        </div>
        <button type="button" class="exp-arrow mt-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-rule-soft bg-transparent text-fg-muted transition-all duration-300" aria-expanded="false" aria-controls="${id}" aria-label="Details anzeigen">${arrow}</button>
      </div>`;
    })
    .join("\n\n");
}

type Renderer = (data: never) => string;

const SECTIONS: Record<string, { file: string; render: Renderer }> = {
  talks: { file: "talks.json", render: renderTalks as Renderer },
  certifications: { file: "certifications.json", render: renderCertifications as Renderer },
  experience: { file: "experience.json", render: renderExperience as Renderer },
};

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function contentPlugin(root: string = process.cwd()): Plugin {
  const dir = path.resolve(root, CONTENT_DIR);
  return {
    name: "rinne:content",
    buildStart() {
      for (const section of Object.values(SECTIONS)) this.addWatchFile(path.join(dir, section.file));
    },
    configureServer(server) {
      server.watcher.add(dir);
      server.watcher.on("change", (file) => {
        if (file.startsWith(dir)) server.ws.send({ type: "full-reload" });
      });
    },
    transformIndexHtml(html) {
      return html.replace(/^[ \t]*<!-- @content (\w+) -->[ \t]*$/gm, (_match, name: string) => {
        const section = SECTIONS[name];
        if (!section) throw new Error(`Unknown content section "${name}"`);
        const data = readJson(path.join(dir, section.file));
        if (!Array.isArray(data)) throw new Error(`${section.file} must contain an array`);
        return section.render(data as never);
      });
    },
  };
}
