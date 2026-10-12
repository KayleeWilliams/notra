import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { createRailwayContext, project } from "railway/iac";

import { productionTarget } from "../../.railway/constants/targets.ts";
import euProbes, { partial } from "../../.railway/observability-probes.ts";
import observability from "../../.railway/observability.ts";

const prometheus = Bun.YAML.parse(
  readFileSync(new URL("prometheus/prometheus.yml", import.meta.url), "utf8")
);
const blackbox = Bun.YAML.parse(
  readFileSync(new URL("blackbox/blackbox.yml", import.meta.url), "utf8")
);
const surfaces = JSON.parse(
  readFileSync(
    new URL("grafana/dashboards/notra-surfaces.json", import.meta.url),
    "utf8"
  )
);

test("the EU partial owns only a private, volume-free Amsterdam probe", async () => {
  const definition = await euProbes(
    createRailwayContext(productionTarget),
    project
  );
  expect(partial).toBe("observability-probes");
  expect(definition.name).toBe("notra-prod");
  expect(definition.resources).toHaveLength(1);
  expect(definition.resources).toMatchObject([
    {
      address: "service.blackbox-eu",
      type: "service",
      networking: { customDomains: {}, tcpProxies: {}, serviceDomains: {} },
      deploy: {
        healthcheckPath: "/",
        multiRegionConfig: { "europe-west4-drams3a": { numReplicas: 1 } },
      },
      variables: { NOTRA_PROBE_API_KEY: { type: "preserve" } },
    },
  ]);
  const resource = definition.resources?.flat()[0];
  expect(resource?.type).toBe("service");
  if (resource?.type === "service") {
    expect(resource.source).toBeUndefined();
    expect(resource.volumeMounts).toBeUndefined();
  }
  expect(() => euProbes(createRailwayContext({}), project)).toThrow(
    "before planning"
  );
  const existing = await observability(
    createRailwayContext(productionTarget),
    project
  );
  expect(
    existing.resources
      ?.flat()
      .find((item) => item.address === "service.blackbox")
  ).toMatchObject({
    deploy: { multiRegionConfig: { "us-east4-eqdc4a": { numReplicas: 1 } } },
    variables: { NOTRA_PROBE_API_KEY: { type: "preserve" } },
  });
});

test("both API checks use explicit exporters and distinct regional labels every 30 seconds", () => {
  expect(prometheus.global.scrape_interval).toBe("30s");
  const job = prometheus.scrape_configs.find(
    (item) => item.job_name === "http-probes"
  );
  expect(job.metrics_path).toBe("/probe");
  expect(job.static_configs.flatMap((group) => group.targets)).toHaveLength(8);
  const apiGroups = job.static_configs.filter((group) =>
    group.labels.probe_check.startsWith("api_")
  );
  expect(apiGroups).toHaveLength(4);
  for (const [region, exporter] of [
    ["us-east", "blackbox.railway.internal:9115"],
    ["eu-west", "blackbox-eu.railway.internal:9115"],
  ]) {
    const regional = apiGroups.filter(
      (group) => group.labels.probe_region === region
    );
    expect(regional.map((group) => group.labels.probe_check).sort()).toEqual([
      "api_ping",
      "api_workspace",
    ]);
    for (const group of regional) {
      expect(group.labels.probe_exporter).toBe(exporter);
      expect(group.labels.probe_module).toBe(group.labels.probe_check);
      expect(group.targets).toEqual([
        group.labels.probe_check === "api_ping"
          ? "https://api.usenotra.com/ping"
          : "https://api.usenotra.com/v1/me/workspaces",
      ]);
    }
  }
  expect(job.relabel_configs).toContainEqual({
    source_labels: ["probe_module"],
    regex: "(.+)",
    target_label: "__param_module",
  });
  expect(job.relabel_configs).toContainEqual({
    source_labels: ["probe_exporter"],
    target_label: "__address__",
  });
  expect(job.relabel_configs).toContainEqual({
    action: "labeldrop",
    regex: "probe_exporter|probe_module",
  });
  const exporters = prometheus.scrape_configs.find(
    (item) => item.job_name === "blackbox"
  );
  expect(exporters.static_configs).toHaveLength(2);
  expect(
    exporters.static_configs.map((group) => group.labels.probe_region).sort()
  ).toEqual(["eu-west", "us-east"]);
});

test("API modules require HTTPS, exact status and content without redirecting bearer credentials", () => {
  for (const name of ["api_ping", "api_workspace"]) {
    const module = blackbox.modules[name];
    expect(module.prober).toBe("http");
    expect(module.timeout).toBe("10s");
    expect(module.http).toMatchObject({
      method: "GET",
      valid_status_codes: [200],
      follow_redirects: false,
      fail_if_not_ssl: true,
      body_size_limit: "128KB",
      tls_config: { insecure_skip_verify: false },
    });
  }
  expect(blackbox.modules.api_ping.http.authorization).toBeUndefined();
  expect(
    blackbox.modules.api_ping.http.fail_if_body_not_matches_regexp
  ).toEqual(["^pong$"]);
  expect(blackbox.modules.api_workspace.http.authorization).toEqual({
    type: "Bearer",
    credentials_file: "/tmp/notra-probe/api-key",
  });
  expect(
    blackbox.modules.api_workspace.http.fail_if_body_json_not_matches_cel
  ).toContain('body.authentication.type == "apiKey"');
  expect(
    blackbox.modules.api_workspace.http.fail_if_body_json_not_matches_cel
  ).toContain("w.id == body.currentWorkspace.id");
  const entrypoint = readFileSync(
    new URL("blackbox/entrypoint.sh", import.meta.url),
    "utf8"
  );
  expect(entrypoint).toContain("umask 077");
  expect(entrypoint).toContain("mkdir -p /tmp/notra-probe");
  expect(entrypoint).toContain("${NOTRA_PROBE_API_KEY:?");
  expect(entrypoint).toContain("unset NOTRA_PROBE_API_KEY");
  expect(entrypoint).not.toMatch(/set -[^\n]*x|echo.*\$NOTRA_PROBE_API_KEY/);
});

test("regional panels distinguish synthetic latency, failed checks and collection health", () => {
  const latency = surfaces.panels.find((panel) => panel.id === 10);
  const status = surfaces.panels.find((panel) => panel.id === 11);
  const collection = surfaces.panels.find((panel) => panel.id === 12);
  expect(latency.description).toContain("Not the p95 of customer traffic");
  expect(latency.targets[0].expr).toContain("probe_success");
  expect(latency.targets[0].expr).toContain("== 1");
  expect(status.targets[0].instant).toBe(true);
  expect(status.targets[0].expr).toContain("probe_success");
  expect(collection.targets[0].instant).toBe(true);
  expect(collection.targets[0].expr).toContain('up{job="http-probes"');
  expect(collection.targets[1].expr).toContain('up{job="blackbox"');
  for (const panel of [latency, status, collection]) {
    expect(panel.datasource.uid).toBe("notra-prometheus");
    expect(panel.targets[0].legendFormat).toContain("{{probe_region}}");
    expect(panel.targets[0].expr).not.toMatch(
      /or vector\(0\)|\$\{organization|\$\{user/
    );
  }
  for (const [index, a] of surfaces.panels.entries()) {
    for (const b of surfaces.panels.slice(index + 1)) {
      expect(
        a.gridPos.x + a.gridPos.w <= b.gridPos.x ||
          b.gridPos.x + b.gridPos.w <= a.gridPos.x ||
          a.gridPos.y + a.gridPos.h <= b.gridPos.y ||
          b.gridPos.y + b.gridPos.h <= a.gridPos.y
      ).toBe(true);
    }
  }
});
