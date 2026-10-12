"use client";

import { useState } from "react";

import { SKELETON_REVEAL_CLASS } from "@/constants/skeleton";

/**
 * The reveal class for content that may replace a skeleton. Only components
 * that first rendered without data fade in; cached data renders at once.
 */
export function useSkeletonReveal(ready: boolean) {
  const [startedLoading] = useState(!ready);
  return startedLoading ? SKELETON_REVEAL_CLASS : undefined;
}
