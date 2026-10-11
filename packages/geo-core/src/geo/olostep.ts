import { requireApiKey } from "@notra/utils/require-api-key";
import { Effect } from "effect";
import type { output, ZodType } from "zod";

import {
  GEO_OLOSTEP_API_KEY_ENV,
  GEO_OLOSTEP_BASE_URL,
  GEO_OLOSTEP_ITEMS_PAGE_LIMIT,
  GEO_OLOSTEP_REQUEST_TIMEOUT_MS,
} from "../constants/geo-olostep";
import {
  geoOlostepAnswerSchema,
  geoOlostepBatchItemsSchema,
  geoOlostepBatchSchema,
  geoOlostepRetrieveSchema,
} from "../schemas/geo-olostep";
import type {
  GeoOlostepBatchRequest,
  GeoOlostepQuery,
  GeoOlostepResults,
} from "../types/geo-olostep";
import { geoOlostepAnswer } from "../utils/geo-olostep-answer";
import { buildGeoOlostepBatchRequests } from "../utils/geo-olostep-batches";
import { GeoOlostepError, GeoScanError } from "./errors";

function olostepRequest<S extends ZodType>(
  path: string,
  schema: S,
  init?: { method: "POST"; body: unknown }
): Effect.Effect<output<S>, GeoOlostepError> {
  return Effect.gen(function* () {
    const apiKey = yield* Effect.try({
      try: () => requireApiKey(GEO_OLOSTEP_API_KEY_ENV),
      catch: (cause) =>
        new GeoOlostepError({ message: "Olostep is not configured", cause }),
    });
    const response = yield* Effect.tryPromise({
      try: (signal) =>
        fetch(`${GEO_OLOSTEP_BASE_URL}${path}`, {
          method: init?.method ?? "GET",
          body: init ? JSON.stringify(init.body) : undefined,
          signal: AbortSignal.any([
            signal,
            AbortSignal.timeout(GEO_OLOSTEP_REQUEST_TIMEOUT_MS),
          ]),
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
        }),
      catch: (cause) =>
        new GeoOlostepError({ message: `Olostep ${path} failed`, cause }),
    });
    const body = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (cause) =>
        new GeoOlostepError({
          message: `Olostep ${path} responded with ${response.status} and no JSON`,
          cause,
        }),
    });
    if (!response.ok) {
      return yield* Effect.fail(
        new GeoOlostepError({
          message: `Olostep ${path} responded with ${response.status}`,
          cause: body,
        })
      );
    }
    return yield* Effect.try({
      try: () => schema.parse(body),
      catch: (cause) =>
        new GeoOlostepError({
          message: `Olostep ${path} returned an unexpected shape`,
          cause,
        }),
    });
  }).pipe(Effect.withSpan("geo.olostepRequest", { attributes: { path } }));
}

const submitGeoOlostepBatch = Effect.fn("geo.submitOlostepBatch")(function* (
  request: GeoOlostepBatchRequest
) {
  const batch = yield* olostepRequest("/batches", geoOlostepBatchSchema, {
    method: "POST",
    body: request.body,
  });
  return batch.id;
});

/** Submits the queries at `indexes` and returns the created batch ids. */
export const submitGeoOlostepBatches = Effect.fn("geo.submitOlostepBatches")(
  function* (queries: readonly GeoOlostepQuery[], indexes: readonly number[]) {
    return yield* Effect.forEach(
      buildGeoOlostepBatchRequests(queries, indexes),
      submitGeoOlostepBatch,
      { concurrency: "unbounded" }
    );
  }
);

/** Ids of the given batches that have not completed yet. */
export const pendingGeoOlostepBatches = Effect.fn("geo.pendingOlostepBatches")(
  function* (batchIds: readonly string[]) {
    const statuses = yield* Effect.forEach(
      batchIds,
      (batchId) =>
        olostepRequest(
          `/batches/${encodeURIComponent(batchId)}`,
          geoOlostepBatchSchema
        ),
      { concurrency: "unbounded" }
    );
    return batchIds.filter(
      (_, index) => statuses[index]?.status !== "completed"
    );
  }
);

const listGeoOlostepBatchResults = Effect.fn("geo.listOlostepBatchResults")(
  function* (batchId: string) {
    const results: GeoOlostepResults = {};
    let cursor: string | undefined;
    for (;;) {
      const params = new URLSearchParams({
        status: "completed",
        limit: String(GEO_OLOSTEP_ITEMS_PAGE_LIMIT),
        ...(cursor ? { cursor } : {}),
      });
      const page = yield* olostepRequest(
        `/batches/${encodeURIComponent(batchId)}/items?${params}`,
        geoOlostepBatchItemsSchema
      );
      for (const item of page.items) {
        results[item.custom_id] = item.retrieve_id;
      }
      if (
        page.items.length === 0 ||
        page.cursor === null ||
        page.cursor === undefined
      ) {
        return results;
      }
      cursor = String(page.cursor);
    }
  }
);

/** Result handles of every finished item across the given batches. */
export const collectGeoOlostepResults = Effect.fn("geo.collectOlostepResults")(
  function* (batchIds: readonly string[]) {
    const pages = yield* Effect.forEach(batchIds, listGeoOlostepBatchResults, {
      concurrency: "unbounded",
    });
    const results: GeoOlostepResults = {};
    for (const page of pages) {
      Object.assign(results, page);
    }
    return results;
  }
);

const fetchGeoOlostepAnswer = Effect.fn("geo.fetchOlostepAnswer")(function* (
  retrieveId: string
) {
  const retrieved = yield* olostepRequest(
    `/retrieve?${new URLSearchParams({ retrieve_id: retrieveId, formats: "json" })}`,
    geoOlostepRetrieveSchema
  );
  const payload = yield* Effect.try({
    try: () =>
      geoOlostepAnswerSchema.parse(JSON.parse(retrieved.json_content ?? "")),
    catch: (cause) =>
      new GeoOlostepError({
        message: `Olostep result ${retrieveId} has no parsed answer`,
        cause,
      }),
  });
  return geoOlostepAnswer(payload);
});

/**
 * Consumer apps scraped through Olostep. The batch was submitted and awaited
 * by the scan workflow; a missing handle means the item never finished.
 */
export const askGeoOlostepAnswer = Effect.fn("geo.askOlostepAnswer")(function* (
  engine: string,
  retrieveId: string | null | undefined
) {
  if (!retrieveId) {
    return yield* Effect.fail(
      new GeoScanError({
        message: `Engine ${engine} returned no result from its Olostep batch`,
      })
    );
  }
  return yield* fetchGeoOlostepAnswer(retrieveId).pipe(
    Effect.mapError(
      (cause) =>
        new GeoScanError({
          message: `Engine ${engine} failed to answer`,
          cause,
        })
    )
  );
});
