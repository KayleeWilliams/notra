import { StatusBadge } from "@notra/ui/components/status-badge";
import { useTranslations } from "use-intl";

export function TriggerStatusBadge({ enabled }: { enabled: boolean }) {
  const tCommon = useTranslations("common");
  return (
    <StatusBadge
      appearance={{ variant: enabled ? "success" : "secondary" }}
      label={enabled ? tCommon("states.active") : tCommon("labels.paused")}
    />
  );
}
