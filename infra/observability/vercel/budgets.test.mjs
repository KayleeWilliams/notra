import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_METADATA_LENGTH,
  MAX_RESPONSE_BYTES,
  MAX_SNAPSHOT_BYTES,
  MAX_SNAPSHOT_LINES,
} from "./constants/metrics.ts";
import { catalogPage, metricSummary } from "./schemas/metrics.ts";
import { metricCatalog, vercelApi } from "./utils/api.ts";
import { appendSnapshotLine } from "./utils/metrics.ts";
import { pollMetrics } from "./utils/poll.ts";
import { readJson } from "./utils/read-json.ts";

const metric = {
  id: "vercel.fixture.count",
  unit: "count",
  aggregations: ["count"],
  dimensions: ["projectId"],
  derivedFrom: { event: "vercel.fixture" },
};
const row = { dimensions: { projectId: "prj_fixture" }, values: { m0: 1 } };

function jsonBytes(size, multibyte = false) {
  const content = multibyte
    ? "€".repeat(Math.floor((size - 2) / 3)) + "a".repeat((size - 2) % 3)
    : "a".repeat(size - 2);
  return new TextEncoder().encode(JSON.stringify(content));
}

function streamedResponse(bytes, header, keepOpen = false) {
  let offset = 0;
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      if (offset < bytes.length) {
        const end = Math.min(offset + 1023, bytes.length);
        controller.enqueue(bytes.subarray(offset, end));
        offset = end;
      } else if (!keepOpen) {
        controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });
  return {
    response: new Response(stream, {
      headers: header === undefined ? {} : { "content-length": header },
    }),
    cancelled: () => cancelled,
  };
}

test("decoded response bytes accept the exact limit and reject +1 without trusting headers", async () => {
  for (const multibyte of [false, true]) {
    for (const header of [undefined, "1", String(MAX_RESPONSE_BYTES)]) {
      const exact = jsonBytes(MAX_RESPONSE_BYTES, multibyte);
      assert.equal(exact.byteLength, MAX_RESPONSE_BYTES);
      const valid = streamedResponse(exact, header);
      const value = await readJson(valid.response);
      assert.equal(
        Buffer.byteLength(JSON.stringify(value)),
        MAX_RESPONSE_BYTES
      );
      assert.equal(valid.response.body.locked, false);
      const oversized = streamedResponse(
        jsonBytes(MAX_RESPONSE_BYTES + 1, multibyte),
        header,
        true
      );
      await assert.rejects(
        readJson(oversized.response),
        /^Error: response_byte_limit$/
      );
      assert.equal(oversized.cancelled(), true);
      assert.equal(oversized.response.body.locked, false);
    }
  }
});

test("oversized advertised bodies cancel early; malformed and interrupted bodies use fixed errors", async () => {
  const advertised = streamedResponse(
    jsonBytes(20),
    String(MAX_RESPONSE_BYTES + 1),
    true
  );
  await assert.rejects(
    readJson(advertised.response),
    /^Error: response_byte_limit$/
  );
  assert.equal(advertised.cancelled(), true);
  for (const body of ["{fixture-secret", "", new Uint8Array([0xff])]) {
    await assert.rejects(
      readJson(new Response(body)),
      /^Error: invalid_response$/
    );
  }
  await assert.rejects(
    readJson(new Response(null)),
    /^Error: invalid_response$/
  );
  const interrupted = new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new Error("fixture-secret stream failure"));
      },
    })
  );
  await assert.rejects(readJson(interrupted), /^Error: invalid_response$/);
  assert.equal(interrupted.body.locked, false);
  let cancelled = false;
  const malformed = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([0xff]));
      },
      cancel() {
        cancelled = true;
        throw new Error("fixture-secret cancellation failure");
      },
    })
  );
  await assert.rejects(readJson(malformed), /^Error: invalid_response$/);
  assert.equal(cancelled, true);
});

test("API reads use the bounded reader, retain timeout/origin/redirect guards and hide transport text", async () => {
  const api = vercelApi("team_test", "fixture-token", async (url, init) => {
    assert.equal(url.origin, "https://api.vercel.com");
    assert.equal(url.searchParams.get("teamId"), "team_test");
    assert.equal(init.redirect, "error");
    assert.ok(init.signal instanceof AbortSignal);
    return streamedResponse(jsonBytes(MAX_RESPONSE_BYTES + 1), "1", true)
      .response;
  });
  await assert.rejects(api("/metrics/v1"), /^Error: response_byte_limit$/);
  const failed = vercelApi("team_test", "fixture-token", () => {
    throw new Error("fixture-secret transport failure");
  });
  await assert.rejects(failed("/metrics/v1"), /^Error: request_failed$/);
});

test("catalog page and total budgets reject before mapping or appending", async () => {
  assert.equal(
    catalogPage({ metrics: Array.from({ length: 250 }, () => ({ ...metric })) })
      .metrics.length,
    250
  );
  const oversized = Array.from({ length: 251 }, () => ({ ...metric }));
  oversized.map = () => {
    throw new Error("mapped before bound");
  };
  assert.throws(
    () => catalogPage({ metrics: oversized }),
    /^Error: catalog_page_limit$/
  );
  for (const total of [1000, 1001]) {
    let calls = 0;
    const api = async (path) => {
      assert.equal(
        new URL(path, "https://fixture.test").searchParams.get("limit"),
        "250"
      );
      const offset = calls++ * 250;
      return {
        metrics: Array.from(
          { length: Math.min(250, total - offset) },
          (_, index) => ({
            ...metric,
            id: `vercel.fixture.metric_${offset + index}`,
          })
        ),
        pagination: {
          hasMore: offset + 250 < total,
          nextCursor: `fixture${calls}`,
        },
      };
    };
    if (total === 1000) {
      assert.equal((await metricCatalog(api)).length, total);
      assert.equal(calls, 4);
    } else {
      await assert.rejects(metricCatalog(api), /^Error: catalog_limit$/);
      assert.equal(calls, 5);
    }
  }
});

test("ten-page guard, duplicate IDs and bad cursors remain fail closed", async () => {
  let calls = 0;
  await assert.rejects(
    metricCatalog(async () => ({
      metrics: [{ ...metric, id: `vercel.fixture.metric_${calls++}` }],
      pagination: { hasMore: true, nextCursor: `fixture${calls}` },
    })),
    /^Error: catalog_page_limit$/
  );
  assert.equal(calls, 10);
  await assert.rejects(
    metricCatalog(async () => ({ metrics: [metric, metric] })),
    /^Error: invalid_catalog$/
  );
  for (const nextCursor of [undefined, ""]) {
    await assert.rejects(
      metricCatalog(async () => ({
        metrics: [metric],
        pagination: { hasMore: true, nextCursor },
      })),
      /^Error: invalid_cursor$/
    );
  }
  await assert.rejects(
    metricCatalog(async () => ({
      metrics: [metric],
      pagination: { hasMore: true, nextCursor: "same" },
    })),
    /^Error: invalid_cursor$/
  );
});

test("metadata strings, dimension names, aggregation arrays and cursors are bounded", () => {
  const id = `vercel.fixture.${"x".repeat(MAX_METADATA_LENGTH - 15)}`;
  assert.equal(id.length, 160);
  const event = `vercel.${"x".repeat(MAX_METADATA_LENGTH - 7)}`;
  const name = "x".repeat(160);
  const bounded = {
    ...metric,
    id,
    derivedFrom: { event },
    dimensions: new Array(64).fill(name),
    aggregations: new Array(12).fill("avg"),
  };
  assert.equal(
    catalogPage({
      metrics: [bounded],
      pagination: { hasMore: true, nextCursor: name },
    }).metrics.length,
    1
  );
  for (const patch of [
    { id: `${id}x` },
    { unit: "x".repeat(161) },
    { derivedFrom: { event: `${event}x` } },
    { dimensions: [`${name}x`] },
    { dimensions: new Array(65).fill("projectId") },
    { aggregations: ["x".repeat(161)] },
    { aggregations: new Array(13).fill("avg") },
  ]) {
    assert.throws(
      () => catalogPage({ metrics: [{ ...bounded, ...patch }] }),
      /^Error: invalid_catalog$/
    );
  }
  for (const nextCursor of ["x".repeat(161), 1, {}, false]) {
    assert.throws(
      () =>
        catalogPage({
          metrics: [metric],
          pagination: { hasMore: true, nextCursor },
        }),
      /^Error: invalid_catalog$/
    );
  }
  assert.equal(
    metricSummary({ summary: Array.from({ length: 499 }, () => ({ ...row })) })
      .length,
    499
  );
  const oversized = Array.from({ length: 500 }, () => ({ ...row }));
  oversized.map = () => {
    throw new Error("mapped before bound");
  };
  assert.throws(
    () => metricSummary({ summary: oversized }),
    /^Error: series_limit$/
  );
});

test("snapshot line and actual UTF-8 byte limits include newlines and never retain +1", () => {
  const lines = [];
  const budget = { lines: 0, bytes: 0 };
  for (let index = 0; index < MAX_SNAPSHOT_LINES; index++) {
    appendSnapshotLine(lines, "€", budget);
  }
  assert.equal(budget.lines, MAX_SNAPSHOT_LINES);
  assert.equal(budget.bytes, MAX_SNAPSHOT_LINES * 4);
  assert.throws(
    () => appendSnapshotLine(lines, "x", budget),
    /^Error: snapshot_line_limit$/
  );
  assert.equal(lines.length, MAX_SNAPSHOT_LINES);
  const byteLines = [];
  const byteBudget = { lines: 0, bytes: 0 };
  const exact =
    "€".repeat(Math.floor((MAX_SNAPSHOT_BYTES - 1) / 3)) +
    "x".repeat((MAX_SNAPSHOT_BYTES - 1) % 3);
  appendSnapshotLine(byteLines, exact, byteBudget);
  assert.equal(byteBudget.bytes, MAX_SNAPSHOT_BYTES);
  assert.throws(
    () => appendSnapshotLine(byteLines, "", byteBudget),
    /^Error: snapshot_byte_limit$/
  );
  assert.equal(byteLines.length, 1);
});

function fixtureCatalog(size, longIds = false) {
  return Array.from({ length: size }, (_, index) => ({
    ...metric,
    id: longIds
      ? `vercel.${"x".repeat(140)}.metric_${String(index).padStart(5, "0")}`
      : `vercel.fixture_${index}.count`,
    derivedFrom: { event: `vercel.fixture_${index}` },
  }));
}

function fixtureRows(size) {
  return Array.from({ length: size }, (_, index) => ({
    dimensions: { projectId: `prj_row${index}` },
    values: { m0: 1 },
  }));
}

test("multiple valid groups share exact snapshot line limits across both workers", async () => {
  const catalog = fixtureCatalog(20);
  for (const extra of [0, 1]) {
    const api = async (_path, body) => {
      if (!body) {
        return { metrics: catalog };
      }
      const index = catalog.findIndex(
        ({ id }) => id === body.metrics.m0.metric
      );
      await Promise.resolve();
      return { summary: fixtureRows(index === 19 ? 437 + extra : 499) };
    };
    if (extra) {
      await assert.rejects(
        pollMetrics(api, "team_test"),
        /^Error: snapshot_line_limit$/
      );
    } else {
      const result = await pollMetrics(api, "team_test");
      assert.equal(result.text.split("\n").length - 1, MAX_SNAPSHOT_LINES);
      assert.equal(result.results.length, 20);
      assert.ok(result.results.every(({ ok }) => ok));
    }
  }
});

test("valid multi-group snapshots accept exact UTF-8 bytes and fail the whole poll at +1", async () => {
  const catalog = fixtureCatalog(22, true);
  const rows = catalog.map(() => fixtureRows(450));
  const api = async (_path, body) =>
    body
      ? {
          summary:
            rows[catalog.findIndex(({ id }) => id === body.metrics.m0.metric)],
        }
      : { metrics: catalog };
  const baseline = await pollMetrics(api, "team_test");
  let remaining = MAX_SNAPSHOT_BYTES - Buffer.byteLength(baseline.text);
  assert.ok(remaining > 0);
  let expandable;
  for (const groupRows of rows) {
    for (const item of groupRows) {
      const size = Math.min(160 - item.dimensions.projectId.length, remaining);
      item.dimensions.projectId += "x".repeat(size);
      remaining -= size;
      if (item.dimensions.projectId.length < 160) {
        expandable = item;
      }
    }
  }
  assert.equal(remaining, 0);
  const exact = await pollMetrics(api, "team_test");
  assert.equal(Buffer.byteLength(exact.text), MAX_SNAPSHOT_BYTES);
  assert.ok(exact.text.split("\n").length - 1 < MAX_SNAPSHOT_LINES);
  assert.ok(exact.results.every(({ ok }) => ok));
  assert.ok(expandable);
  expandable.dimensions.projectId += "x";
  await assert.rejects(
    pollMetrics(api, "team_test"),
    /^Error: snapshot_byte_limit$/
  );
});

test("fatal overflow stops scheduling, settles the other bounded worker and recovers next poll", async () => {
  const catalog = fixtureCatalog(25);
  let release;
  let waiting;
  const blocked = new Promise((resolve) => {
    release = resolve;
  });
  const inFlight = new Promise((resolve) => {
    waiting = resolve;
  });
  let calls = 0;
  let active = 0;
  let maximum = 0;
  let settled = false;
  const api = async (_path, body) => {
    if (!body) {
      return { metrics: catalog };
    }
    const call = ++calls;
    active++;
    maximum = Math.max(maximum, active);
    try {
      if (call === 2) {
        waiting();
        await blocked;
      }
      return { summary: fixtureRows(499) };
    } finally {
      active--;
    }
  };
  const polling = pollMetrics(api, "team_test");
  polling
    .finally(() => {
      settled = true;
    })
    .catch(() => undefined);
  await inFlight;
  // Let the unblocked worker exhaust the shared budget, without timers or real requests.
  for (let index = 0; index < 100; index++) {
    await Promise.resolve();
  }
  const atOverflow = calls;
  try {
    assert.equal(atOverflow, 21);
    assert.equal(maximum, 2);
    assert.equal(settled, false);
  } finally {
    release();
  }
  await assert.rejects(polling, /^Error: snapshot_line_limit$/);
  assert.equal(calls, atOverflow);
  assert.equal(active, 0);
  const recovered = await pollMetrics(
    async (_path, body) => (body ? { summary: [row] } : { metrics: catalog }),
    "team_test"
  );
  assert.equal(recovered.results.length, catalog.length);
  assert.ok(recovered.results.every(({ ok }) => ok));
});

test("ordinary failures discard partial sample charges, oversized responses are safely visible", async () => {
  const catalog = fixtureCatalog(20);
  const result = await pollMetrics(async (_path, body) => {
    if (!body) {
      return { metrics: catalog };
    }
    const rows = fixtureRows(499);
    rows.at(-1).dimensions.projectId = "fixture-secret@example.test";
    return { summary: rows };
  }, "team_test");
  assert.equal(result.results.length, 20);
  assert.ok(
    result.results.every(
      ({ ok, reason }) => !ok && reason === "invalid_dimension"
    )
  );
  assert.doesNotMatch(result.text, /metric_window|fixture-secret/);
  const oversized = await pollMetrics(async (_path, body) => {
    if (!body) {
      return { metrics: [metric] };
    }
    throw new Error("response_byte_limit");
  }, "team_test");
  assert.equal(oversized.results[0].reason, "response_byte_limit");
});
