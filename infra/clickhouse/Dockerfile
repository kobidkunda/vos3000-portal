# Dev ClickHouse image — baked config avoids broken Colima virtiofs bind mounts
# (single files from /Volumes mount as directories in this environment).
# The stock entrypoint rewrites users.d (removes `default` when CLICKHOUSE_USER
# is set), so a custom bootstrap runs initdb and starts the server directly.
# Build: docker compose build clickhouse
FROM clickhouse/clickhouse-server:26.3.17.110

# users.d: default-user.xml (open networks + empty password for host-side unit
# tests/tooling) and 10-vos-user.xml (dedicated app account, same credentials as
# .env CLICKHOUSE_*). These replace the stock loopback-only default.
COPY users.d/ /etc/clickhouse-server/users.d/

# First-boot schema: creates the `vos` database, cdr_events table and rollup views.
COPY init.sql /docker-entrypoint-initdb.d/001-init.sql

COPY entrypoint-dev.sh /entrypoint-dev.sh
RUN chmod +x /entrypoint-dev.sh
ENTRYPOINT ["/entrypoint-dev.sh"]