import assert from "node:assert/strict";
import test from "node:test";
import { verifiedSessionSide } from "./session-proxy";

const TEST_SESSION_SECRET = "vos-session-proxy-test-secret";
process.env.SESSION_SECRET = TEST_SESSION_SECRET;

const futureExp = Math.floor(Date.now() / 1000) + 300;
const validClaims = {
  exp: futureExp,
  sessionId: "session-1",
  side: "client",
  userId: "user-1",
} as const;

async function tokenWithModifiedBody(token: string, transform: (claims: any) => any) {
  const [body, signature] = token.split(".");
  const normalized = body.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(normalized, "base64").toString("utf8");
  const encoded = btoa(JSON.stringify(transform(JSON.parse(json))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${encoded}.${signature}`;
}

async function createTestToken(claims: Record<string, unknown>): Promise<string> {
  const body = btoa(JSON.stringify(claims))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(TEST_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const signatureValue = Array.from(new Uint8Array(signature), (byte) =>
    String.fromCharCode(byte),
  ).join("");
  const encodedSignature = btoa(signatureValue)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${body}.${encodedSignature}`;
}

test("verified session side accepts a correctly signed token", async () => {
  const side = await verifiedSessionSide(await createTestToken(validClaims));
  assert.equal(side, "client");
});

test("verified session side rejects a forged role or side claim", async () => {
  const token = await createTestToken(validClaims);
  const forged = await tokenWithModifiedBody(token, (claims) => ({
    ...claims,
    side: "admin",
  }));
  assert.equal(await verifiedSessionSide(forged), undefined);
});

test("verified session side rejects expired and malformed tokens", async () => {
  const expired = await createTestToken({ ...validClaims, exp: Math.floor(Date.now() / 1000) - 1 });
  assert.equal(await verifiedSessionSide(expired), undefined);
  assert.equal(await verifiedSessionSide("not-a-token"), undefined);
  assert.equal(await verifiedSessionSide("x.%"), undefined);
  assert.equal(await verifiedSessionSide(undefined), undefined);
});

test("verified session side fails closed without a configured secret", async () => {
  const configuredSecret = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  try {
    const token = await createTestToken(validClaims);
    assert.equal(await verifiedSessionSide(token), undefined);
  } finally {
    process.env.SESSION_SECRET = configuredSecret;
  }
});
