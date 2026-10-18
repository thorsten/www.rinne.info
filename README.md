# www.rinne.info

Personal homepage of Thorsten Rinne. Static site built with [Vite](https://vite.dev), [Tailwind CSS v4](https://tailwindcss.com) and TypeScript.

## Requirements

- Node.js 24 or newer (see `.node-version`)
- [pnpm](https://pnpm.io) 10 or newer

## Quick start

```bash
pnpm install
pnpm dev        # dev server with hot reload on http://localhost:9090
pnpm build      # production build into public/
pnpm preview    # serve the production build locally
```

`public/` is generated and git-ignored. Upload its content to any static host.

## Quality checks

```bash
pnpm typecheck      # TypeScript 7 (tsc --noEmit)
pnpm lint           # oxlint
pnpm format         # oxfmt, writes changes
pnpm format:check   # oxfmt, CI mode
pnpm check          # all of the above
```

CI runs the same checks plus the build on every push and pull request.

## Project layout

```
index.html                  main page (Vite entry)
datenschutzerklaerung.html  privacy page (Vite entry)
src/css/main.css            Tailwind v4 theme and components
src/js/main.ts              entry point: fonts, CSS, site behaviour
src/js/site/                nav, theme, scroll, reveal, experience cards
static/                     copied as-is: favicons, images, robots.txt, sitemap.xml
bin/images.ts               responsive image generator, see below
```

## Images

`pnpm images` creates resized variants next to the originals, configured in `images.config.ts`.
Use `pnpm images recreate` to regenerate or `pnpm images remove` to delete the variants.

The AVIF/WebP variants under `static/images/{hero,profil,reisen}` were generated once with
[sharp](https://sharp.pixelplumbing.com) and are committed.

## Credits

Originally based on the boilerplate by [Dominik Hanke](https://github.com/noreading/bootstrap5-webpack-boilerplate).

© 1997 – 2026 Thorsten Rinne
