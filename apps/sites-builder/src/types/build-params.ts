import type { SiteMounts } from "@notra/sites-core/types/deployment";
import type { SiteConfig } from "@notra/sites-core/types/site-config";
import type {
  SiteC15t,
  SiteConsentScript,
  SiteHeadScript,
} from "@notra/sites-core/types/site-integrations";

export interface SiteConsentOptions {
  ui: "react";
  colorScheme: "none";
  scripts: SiteConsentScript[];
  presentation: Pick<SiteC15t, "prompt" | "preferences">;
  legalLinks?: SiteC15t["legalLinks"];
  i18n?: { locale: NonNullable<SiteC15t["locale"]>; detectLanguage: false };
  storageConfig: { crossSubdomain?: boolean; defaultExpiryDays?: number };
  disableAnimation?: boolean;
  theme: {
    colors: Record<string, string>;
    dark: Record<string, string>;
    typography: { fontFamily: string };
    radius: { sm: string; md: string; lg: string };
    shadows: { sm: string; md: string; lg: string };
  };
}

export interface SiteConsentParams {
  backendURL: string | null;
  devTools: boolean;
  hideBranding: boolean;
  options: SiteConsentOptions;
}

export interface BuildParams {
  area: "blog" | "changelog";
  mount: string;
  publicOrigin: string;
  siteId: string;
  deploymentId: string;
  noindex: boolean;
  includeDrafts: boolean;
  branding: boolean;
  workDir: string;
  publicFiles: string[];
  fontStylesheet?: string;
  mounts: SiteMounts;
  config: SiteConfig;
  headScripts: SiteHeadScript[];
  consent: SiteConsentParams | null;
  hasReactComponents: boolean;
}
