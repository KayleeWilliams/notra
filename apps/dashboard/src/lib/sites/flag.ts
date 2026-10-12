import { Effect } from "effect";

import {
  SITES_BULK_IMPORT_FLAG_KEY,
  SITES_FLAG_KEY,
  SITES_FLAG_TIMEOUT_MS,
} from "@/constants/sites";
import { resolveGeoFlagState } from "@/lib/geo/flag";

function isFlagEnabledForOrganization(
  flagKey: string,
  organizationId: string
): Promise<boolean> {
  return Effect.runPromise(
    resolveGeoFlagState(flagKey, organizationId).pipe(
      Effect.timeout(SITES_FLAG_TIMEOUT_MS),
      Effect.map((state) => state === "enabled")
    )
  ).catch(() => false);
}

export function isSitesEnabledForOrganization(
  organizationId: string
): Promise<boolean> {
  return isFlagEnabledForOrganization(SITES_FLAG_KEY, organizationId);
}

export function isSitesBulkImportEnabled(
  organizationId: string
): Promise<boolean> {
  return isFlagEnabledForOrganization(
    SITES_BULK_IMPORT_FLAG_KEY,
    organizationId
  );
}
