import { NextResponse, type NextRequest } from "next/server";
import { verifiedSessionSide } from "./lib/session-proxy";

function sessionToken(request: NextRequest) {
  const cookieName = process.env.NODE_ENV === "production"
    ? "__Host-vos_session"
    : "vos_session";
  return request.cookies.get(cookieName)?.value;
}

function safeDestination(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isClientRoute = pathname === "/app" || pathname.startsWith("/app/");
  if (!isAdminRoute && !isClientRoute) return NextResponse.next();

  const isPublicAdminRoute =
    pathname === "/admin/login" || pathname === "/admin/logout";
  const isPublicClientRoute = pathname === "/app/login" || pathname === "/app/logout";
  if ((isAdminRoute && isPublicAdminRoute) || (isClientRoute && isPublicClientRoute)) {
    return NextResponse.next();
  }

  const expectedSide = isAdminRoute ? "admin" : "client";
  const actualSide = await verifiedSessionSide(
    sessionToken(request),
  );
  if (actualSide === expectedSide) return NextResponse.next();

  const destinationPath = safeDestination(`${pathname}${search}`);
  if (!actualSide) {
    const loginPath = isAdminRoute ? "/admin/login" : "/app/login";
    const loginUrl = new URL(loginPath, request.url);
    if (destinationPath) loginUrl.searchParams.set("next", destinationPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(actualSide === "admin" ? "/admin" : "/app", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/app/:path*"],
};
