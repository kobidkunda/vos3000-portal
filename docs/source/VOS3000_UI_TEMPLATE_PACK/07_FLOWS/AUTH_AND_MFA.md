# Auth & MFA Flow
Login → credential validation → optional MFA → session creation → role/tenant resolution → route.
Failure: rate-limited/locked/expired/invalid without revealing sensitive account existence.
