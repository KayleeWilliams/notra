import { Effect, Option } from "effect";

import { serveFile } from "../responses";
import type { ManifestRouteContext } from "../types/routes";

export const staticFileRoute = Effect.fn("Sites.route.staticFile")(function* ({
  path,
  file,
  twin,
  markdownNotFoundPath,
  fileParams,
}: ManifestRouteContext) {
  if (!file || path === markdownNotFoundPath) {
    return Option.none<Response>();
  }
  const response = yield* Effect.promise(() =>
    serveFile({
      ...fileParams,
      file,
      extraHeaders: twin
        ? {
            Vary: "Accept",
            Link: `<${twin.path}>; rel="alternate"; type="text/markdown"`,
          }
        : undefined,
    })
  );
  return Option.some(response);
});
