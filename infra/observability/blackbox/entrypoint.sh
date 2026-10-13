#!/bin/sh
set -eu
umask 077
: "${NOTRA_PROBE_API_KEY:?Set a dedicated organization-scoped monitoring API key}"
mkdir -p /tmp/notra-probe
printf '%s' "$NOTRA_PROBE_API_KEY" > /tmp/notra-probe/api-key
unset NOTRA_PROBE_API_KEY
exec /bin/blackbox_exporter "$@"
