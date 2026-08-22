# Field Redaction Rules

## Client
Hide by default:
- carrier cost / portal margin
- other customer identifiers
- raw VOS credentials
- internal routing topology/routing gateway unless explicitly granted
- private system/softswitch internals
- secrets after initial generation

## Admin
Mask secrets by default. Restrict sensitive values/actions by explicit RBAC. Audit access/mutations where policy requires it.
