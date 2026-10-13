#!/bin/sh
set -eu
mkdir -p /etc/grafana/dashboards
mapping_snapshot=
if [ "${NOTRA_ORGANIZATION_NAMES:-}" = "@/var/lib/grafana/organization-names.json" ]; then
  mapping_snapshot=$(mktemp)
  trap 'rm -f "$mapping_snapshot"' EXIT
  cp /var/lib/grafana/organization-names.json "$mapping_snapshot"
fi
for template in /etc/grafana/dashboard-templates/*.json; do
  if [ -n "$mapping_snapshot" ]; then
    jq --slurpfile organizationNames "$mapping_snapshot" \
      -f /etc/grafana/utils/organization-names.jq "$template" \
      > "/etc/grafana/dashboards/$(basename "$template")"
  else
    jq -f /etc/grafana/utils/organization-names.jq "$template" \
      > "/etc/grafana/dashboards/$(basename "$template")"
  fi
done
if [ -n "$mapping_snapshot" ]; then
  rm -f "$mapping_snapshot"
  trap - EXIT
fi
unset NOTRA_ORGANIZATION_NAMES mapping_snapshot
chown 472:0 /var/lib/grafana
exec su-exec 472:0 /run.sh "$@"
