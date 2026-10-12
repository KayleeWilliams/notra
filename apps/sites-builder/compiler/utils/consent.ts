import type { SiteConfig } from "@notra/sites-core/types/site-config";
import {
  analyticsGatedByConsent,
  integrationConsentScripts,
} from "@notra/sites-core/utils/integrations";

import type { SiteConsentParams } from "../../src/types/build-params";
import {
  CONSENT_RADII,
  CONSENT_SHADOWS,
  CONSENT_SITE_COLORS,
} from "../constants/consent";

export function siteConsent(
  config: SiteConfig,
  analytics: boolean,
  dev: boolean
): SiteConsentParams | null {
  const { c15t } = config.integrations;
  if (!c15t) {
    return null;
  }
  const gated = analytics && analyticsGatedByConsent(config.integrations);
  return {
    backendURL: analytics ? c15t.backendURL : null,
    devTools: dev && c15t.devTools,
    hideBranding: c15t.hideBranding ?? false,
    options: {
      ui: "react",
      colorScheme: "none",
      scripts: gated ? integrationConsentScripts(config.integrations) : [],
      presentation: { prompt: c15t.prompt, preferences: c15t.preferences },
      legalLinks: c15t.legalLinks,
      i18n: c15t.locale
        ? { locale: c15t.locale, detectLanguage: false }
        : undefined,
      storageConfig: {
        crossSubdomain: c15t.crossSubdomain,
        defaultExpiryDays: c15t.expiryDays,
      },
      disableAnimation: c15t.disableAnimation,
      theme: {
        colors: { ...CONSENT_SITE_COLORS, ...c15t.theme?.colors },
        dark: { ...CONSENT_SITE_COLORS, ...c15t.theme?.dark },
        typography: { fontFamily: "var(--font-body)" },
        radius: CONSENT_RADII[c15t.theme?.radius ?? "medium"],
        shadows: CONSENT_SHADOWS,
      },
    },
  };
}
