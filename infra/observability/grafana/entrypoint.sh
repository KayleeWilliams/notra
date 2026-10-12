#!/bin/sh
set -eu
mkdir -p /etc/grafana/dashboards
for template in /etc/grafana/dashboard-templates/*.json; do
  if [ "${NOTRA_ORGANIZATION_NAMES:-}" = "@/var/lib/grafana/organization-names.json" ]; then
    jq --slurpfile organizationNames /var/lib/grafana/organization-names.json \
      -f /etc/grafana/utils/organization-names.jq "$template" \
      > "/etc/grafana/dashboards/$(basename "$template")"
  else
    jq -f /etc/grafana/utils/organization-names.jq "$template" \
      > "/etc/grafana/dashboards/$(basename "$template")"
  fi
done
unset NOTRA_ORGANIZATION_NAMES
chown 472:0 /var/lib/grafana
exec su-exec 472:0 /run.sh "$@"
