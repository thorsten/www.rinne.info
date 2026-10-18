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
  /** Number of stable release tags (plain semver, no nightlies or pre-releases), cached like stars. */
  releases?: number;
  /** Rendered as a wide card with stats instead of a small tile. */
  featured?: boolean;
  links?: { label: string; url: string }[];
}

export interface Contribution {
  /** GitHub "owner/name"; omit for projects hosted elsewhere and set url instead. */
  repo?: string;
  url?: string;
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

const STABLE_TAG = /^v?\d+\.\d+(\.\d+)?$/;

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/vnd.github+json", "User-Agent": "rinne.info build" },
  });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function fetchGitHub(repo: string, signal: AbortSignal): Promise<{ stars: number; releases: number }> {
  const [info, refs] = (await Promise.all([
    fetchJson(`https://api.github.com/repos/${repo}`, signal),
    fetchJson(`https://api.github.com/repos/${repo}/git/matching-refs/tags/`, signal),
  ])) as [{ stargazers_count: number }, { ref: string }[]];
  const releases = refs.filter((r) => STABLE_TAG.test(r.ref.replace("refs/tags/", ""))).length;
  return { stars: info.stargazers_count, releases };
}

export async function loadOpenSource(file: string): Promise<OpenSource> {
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as OpenSource;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const live = await Promise.all(data.projects.map((p) => fetchGitHub(p.repo, controller.signal)));
    let changed = false;
    data.projects.forEach((p, i) => {
      const fresh = live[i];
      if (!fresh) return;
      if (p.stars !== fresh.stars || p.releases !== fresh.releases) {
        p.stars = fresh.stars;
        p.releases = fresh.releases;
        changed = true;
      }
    });
    if (changed) {
      data.fetchedAt = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }
  } catch (error) {
    console.warn(`[content] GitHub data unavailable, using cache from ${data.fetchedAt ?? "?"}: ${String(error)}`);
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

function renderStat(value: string, label: string): string {
  return `            <div><div class="font-sans text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.02em] text-fg">${value}</div><div class="mt-2 font-mono text-[11px] tracking-[0.08em] uppercase text-fg-muted">${label}</div></div>`;
}

function renderFeatured(p: Project): string {
  const links = (p.links ?? [])
    .map((l) => `<a rel="nofollow" target="_blank" href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>`)
    .join(" · ");
  const years = p.since ? new Date().getFullYear() - p.since : undefined;
  return `        <div class="grid gap-10 rounded-card border border-rule-soft bg-bg-elev p-8 md:grid-cols-[1fr_300px] md:p-10">
          <div class="max-w-[60ch] [&_a]:text-accent [&_a]:no-underline [&_a]:border-b [&_a]:border-accent/40 [&_a:hover]:border-accent">
            <div class="mb-4 font-mono text-[11px] tracking-[0.1em] uppercase text-accent">${escapeHtml(p.role)}${p.since ? ` · seit ${p.since}` : ""}</div>
            <h3 class="m-0 mb-4 font-sans font-medium leading-[1.05] tracking-[-0.02em] text-[clamp(32px,4vw,56px)] text-fg">${escapeHtml(p.name)}</h3>
            <p class="m-0 text-[clamp(16px,1.3vw,19px)] leading-[1.55] text-fg-dim">${escapeHtml(p.description)}</p>
            ${links ? `<p class="mt-5 mb-0 text-[15px]">${links}</p>` : ""}
          </div>
          <div class="grid grid-cols-2 gap-x-6 gap-y-8 self-start border-t border-rule-soft pt-8 md:border-t-0 md:border-l md:pt-0 md:pl-10">
${renderStat(p.releases !== undefined ? `${Math.floor(p.releases / 10) * 10}+` : "–", "Releases")}
${renderStat(years !== undefined ? String(years) : "–", "Jahre Entwicklung")}
          </div>
        </div>`;
}

function renderContribution(c: Contribution): string {
  const href = c.url ?? (c.repo ? `https://github.com/${c.repo}` : undefined);
  const name = href
    ? `<a href="${escapeHtml(href)}" rel="nofollow" target="_blank" class="text-fg no-underline hover:text-accent">${escapeHtml(c.name)}</a>`
    : `<span class="text-fg">${escapeHtml(c.name)}</span>`;
  return `        <li class="grid gap-1 border-t border-rule-soft py-4 text-[15px] md:grid-cols-[260px_1fr] md:gap-6">
          ${name}
          <span class="text-fg-dim">${escapeHtml(c.what)}</span>
        </li>`;
}

export function renderOpenSource(data: OpenSource): string {
  const nf = new Intl.NumberFormat("de-DE");
  return `      <p class="reveal m-0 mb-12 max-w-[60ch] text-[17px] text-fg-dim">${escapeHtml(data.intro)}</p>
      <div class="reveal-stagger grid gap-5 md:grid-cols-3 [&>.featured]:col-span-full">
${data.projects.map((p) => (p.featured ? `<div class="featured">\n${renderFeatured(p)}\n</div>` : renderProject(p, nf))).join("\n")}
      </div>
      <div class="reveal mt-16 grid items-start gap-10 md:grid-cols-[180px_1fr]">
        <div class="font-mono text-[12px] tracking-[0.12em] uppercase text-fg-muted">Weitere Projekte<br/>&amp; Beiträge</div>
        <ul class="m-0 list-none p-0 border-b border-rule-soft">
${data.contributions.map(renderContribution).join("\n")}
        </ul>
      </div>`;
}
