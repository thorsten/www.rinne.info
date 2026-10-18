/**
 * Open-source section: own projects with live GitHub stars plus a list of projects I contributed to.
 * Star counts are fetched at build time with a short timeout and cached in content/opensource.json,
 * so an offline build still renders the last known numbers.
 */

import fs from "node:fs";
import { escapeHtml } from "./content.ts";

export interface Project {
  /** GitHub "owner/name". */
  repo: string;
  name: string;
  role: string;
  description: string;
  /** Public site if different from the repository. */
  url?: string;
  since?: number;
  /** Cached from GitHub, updated by the build when reachable. */
  stars?: number;
}

export interface Contribution {
  repo: string;
  name: string;
  /** What the contribution was about, one short sentence. */
  what: string;
}

export interface OpenSource {
  intro: string;
  projects: Project[];
  contributions: Contribution[];
  fetchedAt?: string;
}

const TIMEOUT_MS = 5000;

async function fetchStars(repo: string, signal: AbortSignal): Promise<number> {
  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    signal,
    headers: { Accept: "application/vnd.github+json", "User-Agent": "rinne.info build" },
  });
  if (!res.ok) throw new Error(`${repo}: ${res.status}`);
  const data = (await res.json()) as { stargazers_count: number };
  return data.stargazers_count;
}

export async function loadOpenSource(file: string): Promise<OpenSource> {
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as OpenSource;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const stars = await Promise.all(data.projects.map((p) => fetchStars(p.repo, controller.signal)));
    let changed = false;
    data.projects.forEach((p, i) => {
      const count = stars[i];
      if (count !== undefined && p.stars !== count) {
        p.stars = count;
        changed = true;
      }
    });
    if (changed) {
      data.fetchedAt = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }
  } catch (error) {
    console.warn(`[content] GitHub stars unavailable, using cache from ${data.fetchedAt ?? "?"}: ${String(error)}`);
  } finally {
    clearTimeout(timer);
  }
  return data;
}

function renderProject(p: Project, nf: Intl.NumberFormat): string {
  const site = p.url ?? `https://github.com/${p.repo}`;
  const meta = [p.since ? `seit ${p.since}` : "", p.stars !== undefined ? `${nf.format(p.stars)} Stars` : ""]
    .filter(Boolean)
    .join(" · ");
  return `        <a href="${escapeHtml(site)}" rel="nofollow" target="_blank" class="group flex flex-col gap-3 rounded-card border border-rule-soft bg-bg-elev p-7 no-underline transition-colors duration-300 hover:border-rule">
          <div class="flex items-baseline justify-between gap-3 font-mono text-[11px] tracking-[0.1em] uppercase text-accent">
            <span>${escapeHtml(p.role)}</span><span class="text-fg-muted normal-case tracking-normal">${escapeHtml(meta)}</span>
          </div>
          <h3 class="m-0 font-sans font-medium leading-[1.15] tracking-[-0.01em] text-[22px] text-fg">${escapeHtml(p.name)}</h3>
          <p class="m-0 text-[14px] leading-[1.6] text-fg-dim">${escapeHtml(p.description)}</p>
          <span class="mt-auto pt-2 font-mono text-[11px] tracking-[0.06em] text-fg-muted group-hover:text-fg">${escapeHtml(p.repo)} ↗</span>
        </a>`;
}

function renderContribution(c: Contribution): string {
  return `        <li class="grid gap-1 border-t border-rule-soft py-4 text-[15px] md:grid-cols-[260px_1fr] md:gap-6">
          <a href="https://github.com/${escapeHtml(c.repo)}" rel="nofollow" target="_blank" class="text-fg no-underline hover:text-accent">${escapeHtml(c.name)}</a>
          <span class="text-fg-dim">${escapeHtml(c.what)}</span>
        </li>`;
}

export function renderOpenSource(data: OpenSource): string {
  const nf = new Intl.NumberFormat("de-DE");
  return `      <p class="reveal m-0 mb-12 max-w-[60ch] text-[17px] text-fg-dim">${escapeHtml(data.intro)}</p>
      <div class="reveal-stagger grid gap-5 md:grid-cols-3">
${data.projects.map((p) => renderProject(p, nf)).join("\n")}
      </div>
      <div class="reveal mt-16 grid items-start gap-10 md:grid-cols-[180px_1fr]">
        <div class="font-mono text-[12px] tracking-[0.12em] uppercase text-fg-muted">Beiträge</div>
        <ul class="m-0 list-none p-0 border-b border-rule-soft">
${data.contributions.map(renderContribution).join("\n")}
        </ul>
      </div>`;
}
