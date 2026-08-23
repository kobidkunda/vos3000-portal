#!/bin/sh
# Dev bootstrap for the baked ClickHouse image.
#
# The stock /entrypoint.sh rewrites users.d on every boot (with CLICKHOUSE_USER
# set it REMOVES the `default` user; without it, it locks `default` to loopback),
# which breaks host-side unit tests. We run initdb ourselves and start the
# server directly so the baked users.d (open `default` + `vos`) stays intact.
set -e

# The server must run as the `clickhouse` user (data dir ownership check, Code 430);
# compose declares `user: clickhouse`, so no gosu/su is needed here.
# NOTE: background the COMMAND directly (not via a function) — dash would fork a
# subshell for a function, so $SRV_PID would be the wrapper PID, not the server.
clickhouse-server --config-file=/etc/clickhouse-server/config.xml &
SRV_PID=$!

# Wait until the server accepts queries (local `default` is open in this image).
i=0
until clickhouse-client --query "SELECT 1" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 90 ]; then
    echo "[dev-entrypoint] clickhouse-server did not become ready"
    exit 1
  fi
  sleep 1
done

if [ ! -f /var/lib/clickhouse/.vos-init-done ]; then
  echo "[dev-entrypoint] first boot — creating vos schema"
  clickhouse-client --multiquery < /docker-entrypoint-initdb.d/001-init.sql
  touch /var/lib/clickhouse/.vos-init-done
  echo "[dev-entrypoint] schema ready"
fi

# Restart cleanly in the foreground (stock entrypoint does the same hand-off).
kill -TERM "$SRV_PID"
wait "$SRV_PID" 2>/dev/null || true
exec clickhouse-server --config-file=/etc/clickhouse-server/config.xml