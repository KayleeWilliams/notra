"use client";

import { InstrumentModule } from "@notra/ui/components/instrument/instrument-module";
import { DataTableSkeleton } from "@notra/ui/components/ui/data-table";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { GeoSectionSkeleton } from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";

const ENGINE_ROW_COUNT = 4;

export function GeoPageSkeleton() {
  const t = useTranslations("geo.pages.overview");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  return (
    <PageContainer
      aria-busy="true"
      data-page-skeleton
      className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6"
    >
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight">GEO</h1>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Button className="w-fit gap-2" disabled size="sm">
                {tGeoShared("runScan")}
                <Kbd className="hidden sm:inline-flex">R</Kbd>
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">{t("descriptionFallback")}</p>
        </header>
        <div className="bg-muted/40 flex w-fit shrink-0 items-center gap-0.5 rounded-lg border p-0.5">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton className="h-7 w-24 rounded-md" key={index} />
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 items-stretch gap-4 @min-[44rem]/main:grid-cols-12">
            <InstrumentModule
              className="h-full @min-[44rem]/main:col-span-5"
              eyebrow={tCommon("labels.visibility")}
              variant="table"
            >
              <div className="flex min-h-64 flex-col gap-4">
                <Skeleton className="h-8 w-12" />
                <DataTableSkeleton rows={ENGINE_ROW_COUNT} />
              </div>
            </InstrumentModule>
            <InstrumentModule
              action={<Skeleton className="h-7 w-28 rounded-full" />}
              bodyClassName="flex min-h-0 flex-1 flex-col px-4 pt-1 pb-4"
              className="h-full @min-[44rem]/main:col-span-7"
              eyebrow={t("mentionActivity")}
              variant="table"
            >
              <Skeleton className="min-h-64 w-full flex-1 rounded-xl" />
            </InstrumentModule>
          </div>
          <GeoSectionSkeleton eyebrow={tGeoShared("whatChanged")}>
            <Skeleton className="mb-3 h-4 w-48" />
            <DataTableSkeleton rows={ENGINE_ROW_COUNT} />
          </GeoSectionSkeleton>
          <GeoSectionSkeleton
            action={<Skeleton className="h-7 w-40 rounded-md" />}
            eyebrow={tGeoShared("engines")}
          >
            <DataTableSkeleton rows={ENGINE_ROW_COUNT} />
          </GeoSectionSkeleton>
          <div className="grid grid-cols-1 gap-4 @min-[44rem]/main:grid-cols-2">
            <GeoSectionSkeleton
              action={<Skeleton className="h-3.5 w-8" />}
              eyebrow={tGeoShared("shareOfVoice")}
            >
              <Skeleton className="h-64 w-full rounded-xl" />
            </GeoSectionSkeleton>
            <GeoSectionSkeleton
              action={<Skeleton className="h-3.5 w-8" />}
              eyebrow={tGeoShared("performanceByLanguage")}
            >
              <Skeleton className="h-64 w-full rounded-xl" />
            </GeoSectionSkeleton>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
