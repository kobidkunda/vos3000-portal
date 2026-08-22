# Security Hardening Checklist

## Host
- [ ] Minimal Ubuntu packages.
- [ ] SSH keys only; root SSH disabled where practical.
- [ ] Host firewall allows only required ports.
- [ ] Automatic/controlled security patch policy.
- [ ] Time synchronization configured.
- [ ] Disk encryption where infrastructure permits.
- [ ] Separate service users/containers.

## Network
- [ ] PostgreSQL, ClickHouse, Redis, Redpanda and MinIO are not public.
- [ ] VOS accepts adapter traffic only from approved network/IP where feasible.
- [ ] Nginx terminates modern TLS.
- [ ] Admin routes can optionally have additional VPN/IP restrictions.
- [ ] Outbound webhook egress is restricted against local/private metadata targets.

## Application
- [ ] Secure cookies.
- [ ] CSRF protection for cookie-auth state changes.
- [ ] CSP and XSS-safe rendering.
- [ ] Input validation at API boundary.
- [ ] Rate limiting on auth/public APIs.
- [ ] Authorization at service/repository boundary.
- [ ] MFA enforced for privileged admin roles.
- [ ] Re-authentication for dangerous operations.

## Secrets
- [ ] No secrets in Git.
- [ ] No secrets in frontend bundle.
- [ ] Rotate database/VOS/provider credentials.
- [ ] API/SIP secrets shown once where possible.
- [ ] Secret values redacted from logs/audit diffs.

## Data
- [ ] Tenant scoping tests.
- [ ] Admin/client DTO redaction review.
- [ ] Payment/card data minimized; use provider tokenization.
- [ ] Audit retention policy.
- [ ] Backup encryption/access controls.

## Supply chain
- [ ] Dependency scanning.
- [ ] Container scanning.
- [ ] Pin/lock dependency versions.
- [ ] CI provenance/image SHA.
- [ ] No production deploy from developer laptop.

## Review gates
- [ ] Threat model reviewed.
- [ ] High-risk endpoints reviewed manually.
- [ ] External penetration test or equivalent security review before broad launch.
