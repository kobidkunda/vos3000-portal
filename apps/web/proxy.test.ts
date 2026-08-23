import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const TEST_SESSION_SECRET = "vos-session-proxy-route-test-secret";

process.env.SESSION_SECRET = TEST_SESSION_SECRET;

async function createSessionToken(side: "admin" | "client") {
  const claims = {
    exp: Math.floor(Date.now() / 1000) + 300,
    sessionId: `session-${side}`,
    side,
    userId: `user-${side}`,
  };
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
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${body}.${encodedSignature}`;
}

function request(path: string, token?: string) {
  return new NextRequest(`http://localhost:5027${path}`, {
    headers: token ? { cookie: `vos_session=${token}` } : {},
  });
}

test("proxy redirects an unauthenticated client page to client login", async () => {
  const response = await proxy(request("/app/settings/profile"));
  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "http://localhost:5027/app/login?next=%2Fapp%2Fsettings%2Fprofile",
  );
});

test("proxy redirects an unauthenticated admin page to admin login", async () => {
  const response = await proxy(request("/admin/settings/profile"));
  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "http://localhost:5027/admin/login?next=%2Fadmin%2Fsettings%2Fprofile",
  );
});

test("proxy keeps each authenticated session on its own portal", async () => {
  const [clientToken, adminToken] = await Promise.all([
    createSessionToken("client"),
    createSessionToken("admin"),
  ]);

  const clientOnAdmin = await proxy(request("/admin/settings/profile", clientToken));
  assert.equal(clientOnAdmin.headers.get("location"), "http://localhost:5027/app");

  const adminOnClient = await proxy(request("/app/settings/profile", adminToken));
  assert.equal(adminOnClient.headers.get("location"), "http://localhost:5027/admin");
});
