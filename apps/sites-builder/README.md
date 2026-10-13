# Notra Sites local development

The `@usenotra/sites-dev` package contains the same compiler and Astro theme as
hosted Notra Sites. The Notra CLI downloads it on the first `notra dev` run and
reuses npm's or Bun's package cache afterward. Local previews need no login or
API key. Node.js 22.12 or newer can run the CLI without Bun; Bun can also run it
directly.

From a site folder containing `blog.json`, `blog/`, or `changelog/`:

```bash
notra dev
notra dev --source ./hosted-site --port 4400
```

Without a global CLI installation:

```bash
npx notra@latest dev
bunx --bun notra@latest dev
```

The default address is `http://localhost:4321`. Blog and changelog are served
under `/blog` and `/changelog`; `/` redirects to the blog. Drafts are included,
and analytics integrations are disabled. Content, styling, components, and
configuration refresh when their source files change. Stop with Ctrl+C.

## Work on the renderer

```bash
cd apps/sites-builder
bun dev
bun compiler/cli.ts dev --source /path/to/site --port 4400
```

`bun dev` uses the demo fixture. The Worker in `apps/sites` is the production
delivery layer, not the content preview server.

## Build and test the distributable

```bash
bun run package:cli
```

This writes `.notra/usenotra-sites-dev-<version>.tgz`, with the compiled CLI,
Astro theme, and declared runtime dependencies. It does not publish anything.
Workspace-only compiler dependencies are bundled into the CLI.

To exercise an unreleased tarball with the Notra CLI:

```bash
NOTRA_SITES_DEV_PACKAGE=/absolute/path/to/usenotra-sites-dev-0.1.0.tgz notra dev
```

Release the runtime package before the corresponding Notra CLI version. Its
default runtime version is pinned in the CLI's `src/constants/sites-dev.ts`.
