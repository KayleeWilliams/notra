import type { SiteEntry } from "@notra/sites-compiler/types/entries";
import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import type { SiteArea } from "@notra/sites-core/types/deployment";
import type { SiteConfig } from "@notra/sites-core/types/site-config";

export interface WriteOgImagesParams {
  workDir: string;
  config: SiteConfig;
  entries: readonly SiteEntry[];
  areas: readonly SiteArea[];
  publicFiles: readonly string[];
  publicOrigin: string;
  includeDrafts: boolean;
}

export type OgManifest = Record<string, string>;

export interface OgImagesResult {
  manifest: OgManifest;
  diagnostics: SiteDiagnostic[];
  durationMs: number;
}

export interface OgAssetResult {
  dataUri?: string;
  diagnostic?: SiteDiagnostic;
}

export type OgAppearance = "light" | "dark";

export interface OgCardContent {
  siteName: string;
  section?: string;
  title: string;
  description?: string;
  meta: string;
  appearance: OgAppearance;
  accent: string;
  logo?: string;
  background?: string;
}
