"use client";

import { useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";

import { CompetitorDetailSkeleton } from "@/app/(dashboard)/[slug]/geo/competitors/skeleton";
import { CompetitorModal } from "@/components/geo/competitor-modal";
import { GEO_COMPETITOR_DETAIL_QUERY_KEY } from "@/constants/geo-competitors";
import { useSearchParams } from "@/lib/navigation";
import type { CompetitorSheetHostProps } from "@/types/geo";
import { loadCompetitorDetailView } from "@/utils/competitor-detail-chunk";
import { lazyPage } from "@/utils/lazy-page";

// The sheet opens on click; only the (heavy) detail view loads lazily, behind
// a skeleton inside the already open sheet.
const CompetitorDetail = lazyPage(() =>
  loadCompetitorDetailView().then((module) => ({
    default: module.CompetitorDetailView,
  }))
);

/**
 * Competitor details always open as a sheet over the current GEO page, driven
 * by `?competitor=`. Deep links and reloads therefore land on the same sheet
 * instead of a separate full page.
 */
export function GeoCompetitorSheetHost({
  organizationSlug,
}: CompetitorSheetHostProps) {
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const competitor =
    searchParams.get(GEO_COMPETITOR_DETAIL_QUERY_KEY)?.trim() || null;

  if (!competitor) {
    return null;
  }

  const close = () => {
    navigate({
      to: ".",
      search: (previous: Record<string, unknown>) => ({
        ...previous,
        [GEO_COMPETITOR_DETAIL_QUERY_KEY]: undefined,
      }),
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <CompetitorModal key={competitor} onClose={close} title={competitor}>
      <Suspense fallback={<CompetitorDetailSkeleton />}>
        <CompetitorDetail
          competitor={competitor}
          organizationSlug={organizationSlug}
        />
      </Suspense>
    </CompetitorModal>
  );
}
