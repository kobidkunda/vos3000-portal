# Backup, Restore and Disaster Recovery

## Core rule

A backup that has never been restored is not a proven backup.

## PostgreSQL

Back up:
- full database;
- WAL/PITR if chosen;
- roles/config required for restore.

Test:
- restore to clean host;
- run migrations/version checks;
- login with test account;
- validate payment ledger and tenant mappings.

RPO/RTO are business decisions and must be recorded.

## ClickHouse

Back up:
- table schema;
- partitions/data according to chosen backup tooling;
- dictionaries/config if used.

Test:
- restore representative CDR period;
- compare row counts and checksums/aggregates;
- run common CDR query;
- rebuild/verify materialized aggregates.

## Redpanda

Redpanda is a durable buffer, not the only permanent CDR archive.
Retention must cover recovery window.
Document whether cluster replication/tiered storage/backups are used.

## Redis

Live state is reconstructable.
If Redis stores sessions, decide whether session persistence is required or re-login is acceptable.

## Object storage

Protect:
- exports are usually disposable;
- formal invoices/statements may require retention;
- backup/replication policy depends on artifact class.

## Configuration and secrets

Back up:
- infrastructure configs;
- schemas/migrations;
- secret-manager metadata/recovery procedure;
- Nginx/TLS renewal configuration.

Never put plaintext production secrets into a general backup archive.

## DR drill

At scheduled interval:
1. simulate loss of one critical stateful system;
2. restore in isolated environment;
3. measure recovery time;
4. verify business data;
5. document gaps;
6. update runbook.

## VOS dependency

Portal DR does not replace VOS DR.
Document:
- what happens if portal is healthy but VOS unavailable;
- what happens if VOS recovers with a CDR backlog;
- dedupe/replay behavior on recovery.
