import {
  Cancel01Icon,
  Clock01Icon,
  Loading03Icon,
  Rocket01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { StatusBadge } from "@notra/ui/components/status-badge";
import { TrendBadge } from "@notra/ui/components/trend-badge";
import { Badge } from "@notra/ui/components/ui/badge";

export function BadgeShowcase() {
  return (
    <div className="space-y-6">
      <div className="border-border overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium" scope="col">Environment</th>
              <th className="px-4 py-3 font-medium" scope="col">Status</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            <tr>
              <td className="px-4 py-4"><StatusBadge appearance={{ variant: "secondary", icon: Rocket01Icon }} label="Production" /></td>
              <td className="px-4 py-4"><div className="flex items-center gap-2"><StatusBadge appearance={{ variant: "success", icon: Tick02Icon, square: true }} label="Successful" /><span className="text-muted-foreground tabular-nums">11s</span></div></td>
            </tr>
            <tr>
              <td className="px-4 py-4"><StatusBadge appearance={{ variant: "secondary", icon: Rocket01Icon }} label="Production" /></td>
              <td className="px-4 py-4"><StatusBadge appearance={{ variant: "secondary" }} label="Superseded" /></td>
            </tr>
            <tr>
              <td className="px-4 py-4"><StatusBadge appearance={{ variant: "secondary", icon: Rocket01Icon }} label="Production" /></td>
              <td className="px-4 py-4"><StatusBadge appearance={{ variant: "secondary" }} label="Skipped" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">Status variants</p>
        <div className="flex flex-wrap gap-2">
          <StatusBadge appearance={{ variant: "info", icon: Clock01Icon }} label="Queued" />
          <StatusBadge appearance={{ variant: "warning", icon: Loading03Icon, spin: true }} label="Building" />
          <StatusBadge appearance={{ variant: "destructive", icon: Cancel01Icon, square: true }} label="Failed" />
          <StatusBadge appearance={{ variant: "secondary" }} label="Canceled" />
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">Trends · visibility, mentions, and readiness</p>
        <div className="flex flex-wrap items-center gap-2">
          <TrendBadge tone="up">+12.4%</TrendBadge>
          <TrendBadge tone="down">−3.2%</TrendBadge>
          <TrendBadge tone="flat">0%</TrendBadge>
          <TrendBadge showIcon={false} tone="up">New</TrendBadge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TrendBadge size="sm" tone="up">+8 pts</TrendBadge>
          <TrendBadge tone="up">+8 pts</TrendBadge>
          <TrendBadge size="md" tone="up">+8 pts</TrendBadge>
          <Badge shape="rounded" variant="secondary">Learning</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TrendBadge appearance="plain" tone="up">12.4%</TrendBadge>
          <TrendBadge appearance="plain" tone="down">3.2%</TrendBadge>
          <TrendBadge appearance="plain" tone="flat">0%</TrendBadge>
        </div>
      </div>
    </div>
  );
}
