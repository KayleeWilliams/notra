import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import messages from "../messages/en.json";
import type { SiteDeployment, SiteDetail } from "../src/types/sites";

if (!process.env.NOTRA_SITE_UPDATED_TEST_WORKER) {
  test("production card update metadata", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_SITE_UPDATED_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  let liveDeployment: SiteDeployment | null = null;
  const deployment = {
    id: "deployment_demo",
    commitAuthor: "Alex",
    trigger: "push",
    liveSince: new Date("2026-10-12T12:00:00Z"),
    createdAt: new Date("2026-10-12T11:00:00Z"),
  } as unknown as SiteDeployment;
  mock.module("../src/components/sites/site-context", () => ({
    useSite: () => ({
      organizationSlug: "example",
      siteId: "site_demo",
      liveDeployment,
      detail: {
        site: {
          name: "Example blog",
          status: "active",
          productionBranch: "main",
          liveDeploymentId: "deployment_demo",
          aliasOrigin: "https://example.notra.site",
          liveUrl: "https://example.notra.site/blog",
          repository: { owner: "example", name: "blog" },
        },
        deployments: [],
        domains: [],
        draftCount: 0,
      } as unknown as SiteDetail,
    }),
  }));
  mock.module("../src/components/framework/link", () => ({ default: "a" }));
  mock.module("../src/components/sites/site-overview-preview", () => ({
    SiteOverviewPreview: () => null,
  }));
  mock.module("../src/components/sites/site-overview-status", () => ({
    SiteOverviewStatus: () => null,
  }));
  const { SiteOverviewHero } =
    await import("../src/components/sites/site-overview-hero");

  test("the production card shows when and by whom the live deployment was updated", () => {
    liveDeployment = deployment;
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteOverviewHero />
      </IntlProvider>
    );
    expect(html).toContain("Updated ");
    expect(html).toContain("by Alex");
    expect(html).toContain('dateTime="2026-10-12T12:00:00.000Z"');
    expect(html.indexOf("Updated ")).toBeGreaterThan(html.indexOf("main"));
    expect(html).toContain("min-h-14");
    expect(html).toContain("pt-1.5 pb-6.5");
  });

  test("missing authors fall back to the deployment trigger and creation time", () => {
    liveDeployment = { ...deployment, commitAuthor: null, liveSince: null };
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteOverviewHero />
      </IntlProvider>
    );
    expect(html).toContain(messages.sites.triggers.push);
    expect(html).not.toContain("by null");
    expect(html).toContain('dateTime="2026-10-12T11:00:00.000Z"');
  });

  test("unpublished sites show the existing first-deployment guidance", () => {
    liveDeployment = null;
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteOverviewHero />
      </IntlProvider>
    );
    expect(html).toContain(messages.sites.overviewPage.notLiveYet);
    expect(html).not.toContain("Updated ");
  });
}
