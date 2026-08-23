export type SessionSide = "admin" | "client";

type SessionClaims = {
  exp?: unknown;
  sessionId?: unknown;
  side?: unknown;
  userId?: unknown;
};

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function isSessionSide(value: unknown): value is SessionSide {
  return value === "admin" || value === "client";
}

export async function verifiedSessionSide(
  token: string | undefined,
): Promise<SessionSide | undefined> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !token) return undefined;

  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return undefined;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signature),
      new TextEncoder().encode(body),
    );
    if (!validSignature) return undefined;

    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(body))) as SessionClaims;
    const expiresAt = Number(claims.exp);
    if (
      !Number.isFinite(expiresAt) ||
      expiresAt < Math.floor(Date.now() / 1000) ||
      typeof claims.sessionId !== "string" ||
      claims.sessionId.length === 0 ||
      typeof claims.userId !== "string" ||
      claims.userId.length === 0 ||
      !isSessionSide(claims.side)
    ) {
      return undefined;
    }

    return claims.side;
  } catch {
    return undefined;
  }
}
