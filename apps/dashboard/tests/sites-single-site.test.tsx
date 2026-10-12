import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import messages from "../messages/en.json";
import type { DashboardLinkProps } from "../src/types/framework";
import type { SiteDetail, SiteListResult } from "../src/types/sites";

if (!process.env.NOTRA_SINGLE_SITE_TEST_WORKER) {
  test("single-site navigation and creation entry point", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_SINGLE_SITE_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  let data: SiteListResult | undefined;
  const site = {
    id: "site_demo",
    name: "Example blog",
    projectId: "project/demo",
    status: "active",
    productionBranch: "main",
    analyticsEnabled: false,
  };
  mock.module("../src/lib/hooks/use-active-project", () => ({
    useActiveProject: () => ({
      projectId: site.projectId,
      isResolved: true,
      isError: false,
    }),
  }));
  mock.module("../src/lib/hooks/use-sites", () => ({
    useSitesOrganizationId: () => "org-demo",
    useSitesList: () => ({ data, isError: false }),
  }));
  mock.module("@tanstack/react-router", () => ({
    Navigate: mock(() => null),
  }));
  mock.module("../src/components/framework/link", () => ({
    default: ({ href, children, ...props }: DashboardLinkProps) => (
      <a {...props} href={href}>
        {children}
      </a>
    ),
  }));
  mock.module("../src/components/sites/sites-list", () => ({
    SitesList: () => <div data-sites-list="true" />,
  }));
  mock.module("../src/components/sites/site-context", () => ({
    useSite: () => ({
      organizationId: "org-demo",
      organizationSlug: "example",
      siteId: site.id,
      detail: { site, deployments: [], previews: [] } as unknown as SiteDetail,
      liveDeployment: null,
    }),
  }));
  mock.module("../src/lib/hooks/use-site-deployments", () => ({
    useDeployLatest: () => ({ isPending: false, mutate: () => undefined }),
  }));
  mock.module("../src/components/sites/site-overview-hero", () => ({
    SiteOverviewHero: () => null,
  }));
  mock.module("../src/components/sites/site-deployments-table", () => ({
    SiteDeploymentsTable: () => null,
  }));
  mock.module("../src/components/sites/site-previews-table", () => ({
    SitePreviewsTable: () => null,
  }));
  mock.module("../src/components/sites/site-visitors-card", () => ({
    SiteVisitorsCard: () => null,
  }));

  const { Navigate } = await import("@tanstack/react-router");
  const { default: SitesPage } =
    await import("../src/app/(dashboard)/[slug]/sites/page-client");
  const { SiteOverviewPage } =
    await import("../src/components/sites/pages/site-overview-page");

  test("a single configured site redirects with its project and replaces history", () => {
    data = { configured: true, sites: [site] } as SiteListResult;
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SitesPage organizationSlug="example" />
      </IntlProvider>
    );
    expect(html).not.toContain("data-sites-list");
    expect(Navigate).toHaveBeenLastCalledWith(
      {
        replace: true,
        to: "/example/sites/site_demo",
        search: { project: "project/demo" },
      },
      undefined
    );
  });

  test("multiple sites still show the selection and a project-scoped creation link", () => {
    data = {
      configured: true,
      sites: [site, { ...site, id: "site_second" }],
    } as SiteListResult;
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SitesPage organizationSlug="example" />
      </IntlProvider>
    );
    expect(html).toContain('data-sites-list="true"');
    expect(html).toContain("/example/sites/new?project=project%2Fdemo");
  });

  test("the site overview offers creation even before its first deployment", () => {
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteOverviewPage />
      </IntlProvider>
    );
    expect(html).toContain("/example/sites/new?project=project%2Fdemo");
    expect(html).toContain(messages.sites.newSite);
  });

  test("no sites offers creation without redirecting", () => {
    mock.clearAllMocks();
    data = { configured: true, sites: [] } as SiteListResult;
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SitesPage organizationSlug="example" />
      </IntlProvider>
    );
    expect(Navigate).not.toHaveBeenCalled();
    expect(html).toContain("/example/sites/new?project=project%2Fdemo");
    expect(html).toContain(messages.sites.empty.title);
  });

  test("unconfigured hosting does not redirect to a site", () => {
    mock.clearAllMocks();
    data = { configured: false, sites: [site] } as SiteListResult;
    renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SitesPage organizationSlug="example" />
      </IntlProvider>
    );
    expect(Navigate).not.toHaveBeenCalled();
  });
}
