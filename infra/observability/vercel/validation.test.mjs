import assert from "node:assert/strict";
import { test } from "node:test";

import { catalogPage } from "./schemas/metrics.ts";
import {
  metricGroups,
  metricQuery,
  metricSamples,
  metricSelections,
  promLabels,
} from "./utils/metrics.ts";
import { pollMetrics } from "./utils/poll.ts";

const metric = {
  id: "vercel.request.count",
  unit: "count",
  aggregations: ["count"],
  dimensions: ["projectId", "environment"],
  derivedFrom: { event: "vercel.request" },
};

test("reviewed units and aggregations preserve spelling and currency selection", () => {
  const units = [
    "bytes",
    "count",
    "currency",
    "gigabyte_hour",
    "megabytes",
    "milliseconds",
    "percent",
    "ratio",
    "score",
    "seconds",
    "usd",
    "USD",
  ];
  const aggregations = [
    "avg",
    "count",
    "max",
    "min",
    "p50",
    "p75",
    "p90",
    "p95",
    "p99",
    "stddev",
    "sum",
    "unique",
  ];
  for (const unit of units) {
    const [parsed] = catalogPage({
      metrics: [{ ...metric, unit, aggregations }],
    }).metrics;
    assert.equal(parsed.unit, unit);
    assert.deepEqual(parsed.aggregations, aggregations);
    for (const aggregation of aggregations) {
      const single = { ...parsed, aggregations: [aggregation] };
      assert.deepEqual(metricSelections(single), [aggregation]);
      const group = metricGroups([single])[0];
      const samples = metricSamples(group, metricQuery(group, "team_test"), [
        { dimensions: {}, values: { m0: 2.75 } },
      ]);
      assert.match(samples[0], new RegExp(`unit="${unit}"`));
      assert.match(samples[0], new RegExp(`aggregation="${aggregation}"`));
      assert.ok(samples[0].endsWith(" 2.75"));
    }
  }
  for (const unit of ["usd", "USD", "currency", "CURRENCY"]) {
    assert.deepEqual(
      metricSelections({
        ...metric,
        id: "vercel.ai_gateway.request.cost",
        unit,
        aggregations: ["avg", "sum"],
      }),
      ["sum"]
    );
  }
});

test("invalid metadata fails with fixed diagnostics before samples, status or logs", async () => {
  const invalid = [
    { unit: "fixture-secret@example.com" },
    { unit: "Bearer fixture-token" },
    { unit: "temperature" },
    { unit: 123 },
    { aggregations: ["fixture-secret@example.com"] },
    { aggregations: ["Bearer fixture-token"] },
    { aggregations: [123] },
    { aggregations: "sum" },
    { aggregations: [] },
    { id: "fixture-secret@example.com" },
    { id: "vercel.request.FIXTURE_SECRET" },
    { derivedFrom: { event: "fixture-secret@example.com" } },
    { dimensions: [123] },
    { dimensions: ["fixture-secret@example.com"] },
  ];
  for (const patch of invalid) {
    const value = { metrics: [{ ...metric, ...patch }] };
    assert.throws(() => catalogPage(value), /^Error: invalid_catalog$/);
    await assert.rejects(
      pollMetrics(async () => value, "team_test"),
      /^Error: invalid_catalog$/
    );
  }
});

test("each platform dimension uses its own reviewed domain and original scalar", () => {
  const cases = {
    projectId: [
      "prj_test",
      "prj_fixture",
      "prj_a123XYZ",
      `prj_${"a".repeat(156)}`,
    ],
    environment: ["production", "preview", "development"],
    httpStatus: [100, 200, 599, "100", "200", "599"],
    requestMethod: [
      "CONNECT",
      "DELETE",
      "GET",
      "HEAD",
      "OPTIONS",
      "PATCH",
      "POST",
      "PUT",
      "TRACE",
    ],
    cacheResult: ["BYPASS", "HIT", "MISS", "REVALIDATED", "STALE"],
    runtime: [
      "nodejs18.x",
      "nodejs20.x",
      "nodejs22.x",
      "nodejs24.x",
      "python3.12",
      "edge",
    ],
    functionStartType: ["cold", "hot", "prewarmed"],
  };
  for (const [dimension, values] of Object.entries(cases)) {
    const group = { ...metricGroups([metric])[0], dimensions: [dimension] };
    const query = metricQuery(group, "team_test");
    const name = dimension.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`
    );
    for (const value of [...values, "", null, undefined]) {
      const samples = metricSamples(group, query, [
        { dimensions: { [dimension]: value }, values: { m0: 0 } },
      ]);
      assert.ok(
        samples[0].includes(
          `${name}="${value == null ? "unattributed" : value}"`
        )
      );
      assert.ok(samples[0].endsWith(" 0"));
    }
  }
});

test("field-invalid, numeric, free-text and credential-shaped dimensions fail closed", async () => {
  const cases = {
    projectId: [
      "customer-name",
      "https://example.test",
      "fixture@example.test",
      1,
      "prj_a.b.c",
      "prj_",
      `prj_${"a".repeat(157)}`,
    ],
    environment: ["customer", "validation", "prod", 1, "prj_test"],
    httpStatus: [0, "0", 99, 600, "0200", "200.0", "2e2", 200.5, "GET"],
    requestMethod: ["get", "CUSTOM", "prj_test", 200],
    cacheResult: ["hit", "UNKNOWN", "prj_test", 200],
    runtime: [
      "customer-function",
      "nodejs24.x-secret",
      "nodejs024.x",
      "python3.012",
      "prj_test",
      24,
    ],
    functionStartType: ["COLD", "customer-function", "prj_test", 1],
  };
  for (const [dimension, values] of Object.entries(cases)) {
    const group = { ...metricGroups([metric])[0], dimensions: [dimension] };
    const query = metricQuery(group, "team_test");
    for (const value of [
      ...values,
      {},
      [],
      true,
      "Bearer fixture-token",
      "fixture-secret@example.test",
    ]) {
      assert.throws(
        () =>
          metricSamples(group, query, [
            { dimensions: { [dimension]: value }, values: { m0: 1 } },
          ]),
        /^Error: invalid_dimension$/
      );
    }
  }
  const result = await pollMetrics(
    async (_path, body) =>
      body
        ? {
            summary: [
              {
                dimensions: { projectId: "fixture-secret@example.test" },
                values: { m0: 1 },
              },
            ],
          }
        : { metrics: [metric] },
    "team_test"
  );
  assert.deepEqual(result.results, [
    {
      group: "vercel.request:projectId,environment",
      ok: false,
      reason: "invalid_dimension",
    },
  ]);
  assert.doesNotMatch(
    `${result.text}${JSON.stringify(result.results)}`,
    /fixture-secret|metric_window/
  );
});

test("ignored sensitive fields, missing numbers, native values and escaping stay unchanged", () => {
  const group = metricGroups([metric])[0];
  const query = metricQuery(group, "team_test");
  const dimensions = {
    projectId: "prj_fixture",
    environment: "production",
    clientIp: {},
    requestPath: "fixture-secret",
  };
  for (const value of [null, undefined, Number.NaN, Infinity, "1", {}]) {
    assert.deepEqual(
      metricSamples(group, query, [{ dimensions, values: { m0: value } }]),
      []
    );
  }
  const samples = metricSamples(group, query, [
    { dimensions, values: { m0: -0.25 } },
  ]);
  assert.ok(samples[0].endsWith(" -0.25"));
  assert.doesNotMatch(samples[0], /fixture-secret|clientIp|requestPath/);
  assert.equal(
    promLabels({ fixture: 'a\\b\n"c' }),
    '{fixture="a\\\\b\\n\\"c"}'
  );
});
