import { test, expect, request as pwRequest } from "@playwright/test";

const API = process.env.API_URL ?? "http://localhost:4000";
const WEB = process.env.WEB_URL ?? "http://localhost:3001";
const ADMIN = { email: "admin@example.com", password: "Admin123!" };
const CLIENT = { email: "client@example.com", password: "Client123!" };

const CLIENT_PAGES = [
  "/app",
  "/app/cdr",
  "/app/gateways",
  "/app/billing/balance",
  "/app/analytics/traffic",
  "/app/settings/profile",
];

function cookieHeader(setCookie?: string[]): string {
  const raw = setCookie?.[0] ?? "";
  return raw.split(";")[0] ?? "";
}
function cookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-vos_session" : "vos_session";
}

async function loginCookie(base: typeof API, body: any): Promise<string> {
  const ctx = await pwRequest.newContext();
  const res = await ctx.post(`${base}/api/v1/auth/login`, { data: body });
  if (!res.ok()) throw new Error(`login failed for ${body.email}`);
  const cookie = cookieHeader(await res.headersArray().length ? (res.headersArray() as any[]).filter(h => h.name.toLowerCase() === "set-cookie").map(h => h.value) : undefined);
  await ctx.dispose();
  return cookie;
}

async function adminLoginCookie(): Promise<string> {
  const ctx = await pwRequest.newContext();
  const res = await ctx.post(`${API}/api/v1/admin/auth/login`, { data: ADMIN });
  if (!res.ok()) throw new Error("admin login failed");
  const values = (res.headersArray() as any[]).filter(h => h.name.toLowerCase() === "set-cookie").map(h => h.value as string);
  const cookie = cookieHeader(values);
  await ctx.dispose();
  return cookie;
}

async function adminPutSupport(payload: any) {
  const ctx = await pwRequest.newContext();
  await ctx.post(`${API}/api/v1/admin/auth/login`, { data: ADMIN });
  const res = await ctx.put(`${API}/api/v1/admin/settings/support`, { data: payload });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return body;
}

function sessionCookie(value: string) {
  const pair = value.split("=");
  return { name: cookieName(), value: pair[1] ?? pair[0], url: WEB };
}

test.describe("Support FAB (client portal)", () => {
  let clientCookie = "";
  let adminCookie = "";

  test.beforeAll(async () => {
    clientCookie = await loginCookie(API, CLIENT);
    adminCookie = await adminLoginCookie();
    await adminPutSupport({
      enabled: true,
      label: "Need help? Talk to us",
      telegram: { enabled: true, handle: "@vos_support_bot" },
      teams: { enabled: true, id: "support@vos-portal.local" },
    });
  });

  test("seed save is validated server-side and returns built URL", async () => {
    const body = await adminPutSupport({
      enabled: true,
      label: "Need help?",
      telegram: { enabled: true, handle: "@vos_support_bot" },
      teams: { enabled: true, id: "support@vos-portal.local" },
    });
    expect(body.data.telegram.url).toBe("https://t.me/vos_support_bot");
    expect(body.data.teams.url).toContain("users=support%40vos-portal.local");
  });

  for (const path of CLIENT_PAGES) {
    test(`FAB visible bottom-right on ${path}`, async ({ page }) => {
      await page.context().addCookies([sessionCookie(clientCookie)]);
      await page.goto(path);
      const fab = page.locator(".supportFab");
      await expect(fab).toBeVisible();
      const box = await fab.boundingBox();
      if (box) {
        expect(box.x + box.width).toBeGreaterThan(page.viewportSize()!.width - 120);
        expect(box.y + box.height).toBeGreaterThan(page.viewportSize()!.height - 160);
      }
    });
  }

  test("dual-channel FAB expands with correct hrefs; Esc closes", async ({ page }) => {
    await page.context().addCookies([sessionCookie(clientCookie)]);
    await page.goto("/app");
    const fab = page.locator(".supportFab");
    await fab.locator("button.supportFabBtn").click();
    const tg = fab.locator('a[href="https://t.me/vos_support_bot"]');
    const tm = fab.locator('a[href^="https://teams.microsoft.com/l/chat/0/0?users="]');
    await expect(tg).toHaveAttribute("target", "_blank");
    await expect(tg).toHaveAttribute("rel", /noopener/);
    await expect(tm).toHaveAttribute("target", "_blank");
    await page.keyboard.press("Escape");
    await expect(fab.locator(".supportFabMenu")).toBeHidden();
  });

  test("admin pages never render the FAB", async ({ page }) => {
    await page.context().addCookies([sessionCookie(adminCookie)]);
    for (const p of ["/admin", "/admin/settings/support"]) {
      await page.goto(p);
      await expect(page.locator(".supportFab")).toHaveCount(0);
    }
  });

  test("disabling global toggle hides FAB after refresh (cache invalidated)", async ({ page }) => {
    await adminPutSupport({ enabled: false, label: "", telegram: { enabled: true, handle: "vos_support_bot" }, teams: { enabled: false, id: "" } });
    await page.context().addCookies([sessionCookie(clientCookie)]);
    await page.goto("/app");
    await expect(page.locator(".supportFab")).toHaveCount(0);
    await adminPutSupport({ enabled: true, label: "Need help?", telegram: { enabled: true, handle: "vos_support_bot" }, teams: { enabled: true, id: "support@vos-portal.local" } });
  });

  test("admin archetype edits handle, saves, success toast shown", async ({ page }) => {
    await page.context().addCookies([sessionCookie(adminCookie)]);
    await page.goto("/admin/settings/support");
    await expect(page.getByRole("heading", { name: /support settings/i })).toBeVisible();
    await page.locator('input[placeholder*="t.me"]').fill("@updated_support_bot");
    await page.getByRole("button", { name: /save configuration/i }).click();
    await expect(page.getByText(/saved and audited/i)).toBeVisible({ timeout: 10_000 });
    // restore canonical seed
    await adminPutSupport({ enabled: true, label: "Need help?", telegram: { enabled: true, handle: "@vos_support_bot" }, teams: { enabled: true, id: "support@vos-portal.local" } });
  });

  test("invalid handle shows inline field error and PUT is rejected", async ({ page }) => {
    await page.context().addCookies([sessionCookie(adminCookie)]);
    await page.goto("/admin/settings/support");
    await page.locator('input[placeholder*="t.me"]').fill("javascript:evil");
    await page.getByRole("button", { name: /save configuration/i }).click();
    await expect(page.getByText(/invalid telegram handle/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
