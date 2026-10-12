import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join } from "node:path";

import { parseEntryFrontmatter } from "@notra/sites-compiler/frontmatter";
import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import { Renderer } from "@takumi-rs/core";
import { render } from "takumi-js";

import { OG_MANIFEST_FILE } from "../src/constants/og";
import { configuredAreaTitle } from "../src/utils/area-titles";
import { OgCard } from "./components/og-card";
import {
  OG_FONT_FAMILY,
  OG_FONT_SUBSETS,
  OG_FONT_WEIGHTS,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_MIME_TYPES,
  OG_IMAGE_WIDTH,
  OG_IMAGES_DIR,
} from "./constants/og-images";
import type {
  OgAppearance,
  OgAssetResult,
  OgCardContent,
  OgImagesResult,
  OgManifest,
  WriteOgImagesParams,
} from "./types/og-images";
import { writeFileEnsured } from "./utils/fs";

let rendererPromise: Promise<Renderer> | null = null;

function loadRenderer(): Promise<Renderer> {
  rendererPromise ??= (async () => {
    const require = createRequire(import.meta.url);
    const renderer = new Renderer();
    for (const subset of OG_FONT_SUBSETS) {
      for (const weight of OG_FONT_WEIGHTS) {
        await renderer.registerFont({
          name: OG_FONT_FAMILY,
          weight,
          style: "normal",
          data: await readFile(
            require.resolve(
              `@fontsource/inter/files/inter-${subset}-${weight}-normal.woff2`
            )
          ),
        });
      }
    }
    return renderer;
  })();
  return rendererPromise;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

async function loadPublicImage(
  params: WriteOgImagesParams,
  path: string | undefined,
  setting: string
): Promise<OgAssetResult> {
  if (!path) {
    return {};
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const mimeType = OG_IMAGE_MIME_TYPES[extname(normalized).toLowerCase()];
  if (!(mimeType && params.publicFiles.includes(normalized))) {
    return {
      diagnostic: {
        severity: "warning",
        file: SITE_CONFIG_FILENAME,
        code: "thumbnail_asset",
        message: `${setting}: ${path} is not a PNG, JPEG, WebP or SVG file in public/. Share images are generated without it.`,
      },
    };
  }
  const bytes = await readFile(
    join(params.workDir, "site", "public", normalized)
  );
  return { dataUri: `data:${mimeType};base64,${bytes.toString("base64")}` };
}

function logoPath(
  params: WriteOgImagesParams,
  appearance: OgAppearance
): string | undefined {
  const { logo } = params.config;
  if (!logo || typeof logo === "string") {
    return logo;
  }
  return logo[appearance];
}

async function renderPng(content: OgCardContent): Promise<Uint8Array> {
  return render(OgCard(content), {
    renderer: await loadRenderer(),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    format: "png",
  });
}

export async function writeOgImages(
  params: WriteOgImagesParams
): Promise<OgImagesResult> {
  const started = Date.now();
  const manifest: OgManifest = {};
  const diagnostics: SiteDiagnostic[] = [];
  const { config } = params;
  if (config.thumbnails.enabled) {
    const appearance = config.thumbnails.appearance;
    const [background, logo] = await Promise.all([
      loadPublicImage(
        params,
        config.thumbnails.background,
        "thumbnails.background"
      ),
      loadPublicImage(params, logoPath(params, appearance), "logo"),
    ]);
    for (const asset of [background, logo]) {
      if (asset.diagnostic) {
        diagnostics.push(asset.diagnostic);
      }
    }
    const base = {
      siteName: config.name,
      appearance,
      accent:
        appearance === "dark"
          ? (config.colors.light ?? config.colors.primary)
          : config.colors.primary,
      logo: logo.dataUri,
      background: background.dataUri,
    };
    const host = new URL(params.publicOrigin).host;
    await Promise.all(
      params.entries.map(async (entry) => {
        const source = await readFile(
          join(
            params.workDir,
            "entries",
            entry.area,
            `${entry.slug}.${entry.format}`
          ),
          "utf8"
        );
        const { data } = parseEntryFrontmatter(entry.path, entry.area, source);
        if (!data || data.image || (data.draft && !params.includeDrafts)) {
          return;
        }
        const version = "version" in data ? data.version : undefined;
        const png = await renderPng({
          ...base,
          section: configuredAreaTitle(config, entry.area),
          title: data.title,
          description: data.description,
          meta: [version, formatDate(data.date)].filter(Boolean).join("  ·  "),
        });
        const urlPath = `/${OG_IMAGES_DIR}/${entry.area}/${entry.slug}.png`;
        await writeFileEnsured(
          join(params.workDir, "site", "public", urlPath),
          png
        );
        manifest[`${entry.area}/${entry.slug}`] = urlPath;
      })
    );
    await Promise.all(
      params.areas.map(async (area) => {
        const title = configuredAreaTitle(config, area);
        const png = await renderPng({
          ...base,
          title,
          description: config[area]?.description ?? config.description,
          meta: host,
        });
        const urlPath = `/${OG_IMAGES_DIR}/${area}.png`;
        await writeFileEnsured(
          join(params.workDir, "site", "public", urlPath),
          png
        );
        manifest[area] = urlPath;
      })
    );
  }
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))
  );
  await writeFileEnsured(
    join(params.workDir, OG_MANIFEST_FILE),
    `${JSON.stringify(sorted, null, 2)}\n`
  );
  return { manifest: sorted, diagnostics, durationMs: Date.now() - started };
}
