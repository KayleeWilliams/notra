import type { SiteManifest } from "@notra/sites-core/types/deployment";
import {
  joinMountPath,
  listMountedAreas,
} from "@notra/sites-core/utils/mounts";

import {
  AI_USER_AGENTS,
  ROBOTS_TXT_MAX_AGE_SECONDS,
} from "../constants/responses";
import { plainText } from "../utils/responses";

export function robotsTxt(
  origin: string,
  crawlable: SiteManifest | null
): Response {
  const lines = crawlable
    ? [
        `# Markdown map of this site for language models: ${origin}/llms.txt`,
        "User-agent: *",
        "Allow: /",
        "",
        ...AI_USER_AGENTS.map((agent) => `User-agent: ${agent}`),
        "Allow: /",
        "",
        ...listMountedAreas(crawlable.target.mounts).map(
          ({ mount }) =>
            `Sitemap: ${origin}${joinMountPath(mount, "sitemap.xml")}`
        ),
      ]
    : ["User-agent: *", "Disallow: /"];
  return plainText(`${lines.join("\n")}\n`, ROBOTS_TXT_MAX_AGE_SECONDS);
}
