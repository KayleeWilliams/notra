import { defineRailway, preserve, project, service } from "railway/iac";

import { monitoringService } from "./constants/observability.ts";
import { productionTarget } from "./constants/targets.ts";
import { assertTarget } from "./utils/assert-target.ts";

export const partial = "observability-probes";

export default defineRailway((ctx) => {
  assertTarget(ctx, productionTarget);

  return project("notra-prod", {
    resources: [
      service("blackbox-eu", {
        ...monitoringService,
        replicas: { "europe-west4-drams3a": 1 },
        healthcheck: "/",
        env: {
          NOTRA_PROBE_API_KEY: preserve(),
          PORT: "9115",
          RAILWAY_RUN_UID: "65534",
        },
      }),
    ],
  });
});
