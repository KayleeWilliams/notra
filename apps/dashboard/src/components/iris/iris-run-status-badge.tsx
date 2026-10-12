import { StatusBadge } from "@notra/ui/components/status-badge";
import { useTranslations } from "use-intl";

import type { IrisRunStatusBadgeProps } from "@/types/iris";
import { humanizeIrisRunStatus } from "@/utils/iris-copy";

const RUN_STATUS_VARIANTS: Record<
  string,
  "success" | "secondary" | "destructive" | "outline"
> = {
  completed: "success",
  failed: "destructive",
  canceled: "outline",
  planning: "secondary",
  executing: "secondary",
};

export function IrisRunStatusBadge({ status }: IrisRunStatusBadgeProps) {
  const t = useTranslations("iris");
  const tLabels = useTranslations("common.labels");
  return (
    <StatusBadge
      appearance={{ variant: RUN_STATUS_VARIANTS[status] ?? "secondary" }}
      label={humanizeIrisRunStatus(t, tLabels, status)}
    />
  );
}
