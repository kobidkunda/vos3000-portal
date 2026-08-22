import { portalRoutes } from "./routes.generated.js";
export type PortalRoute = (typeof portalRoutes)[number];

export function routeMatches(pattern: string, actual: string): boolean {
  const clean = (v:string) => v.split("?")[0].replace(/\/$/, "") || "/";
  const p = clean(pattern).split("/").filter(Boolean);
  const a = clean(actual).split("/").filter(Boolean);
  if (p.length !== a.length) return false;
  return p.every((seg, i) => /^\{[^}]+\}$/.test(seg) || seg === a[i]);
}
export function findPortalRoute(pathname: string): PortalRoute | undefined {
  const cleanPath = pathname.split("?")[0].replace(/\/$/, "") || "/";
  // 1. Check exact match first
  const exact = portalRoutes.find(r => r.route === cleanPath || r.route.replace(/\/$/, "") === cleanPath);
  if (exact) return exact;
  // 2. Find parameterized matches, prioritize routes with fewest dynamic params
  const matches = portalRoutes.filter(r => routeMatches(r.route, cleanPath));
  if (!matches.length) return undefined;

  matches.sort((a, b) => {
    const aParams = (a.route.match(/\{[^}]+\}/g) || []).length;
    const bParams = (b.route.match(/\{[^}]+\}/g) || []).length;
    return aParams - bParams;
  });

  return matches[0];
}
export function routesForSide(side: "Admin"|"Client") { return portalRoutes.filter(r => r.side === side); }
