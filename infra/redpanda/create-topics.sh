#!/usr/bin/env bash
set -euo pipefail
until rpk cluster health -X brokers=redpanda:9092 -X admin.hosts=redpanda:9644 >/dev/null 2>&1; do sleep 2; done
for spec in \
  "cdr.raw:12" \
  "cdr.unmapped:3" \
  "cdr.invalid:3" \
  "portal.events:6" \
  "webhook.delivery:6" \
  "report.jobs:3" \
  "audit.events:3"; do
  topic=${spec%%:*}; parts=${spec##*:}
  rpk topic create "$topic" --partitions "$parts" -X brokers=redpanda:9092 -X admin.hosts=redpanda:9644 || true
done
