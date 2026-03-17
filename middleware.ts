import { NextRequest, NextResponse } from "next/server";

// Korumasız rotalar (giriş yapmadan erişilebilir)
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/me", "/api/auth/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Statik dosyalar, _next, favicon vb. hariç tut
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") // .png, .jpg, .css vs.
  ) {
    return NextResponse.next();
  }

  // Public yolları geçir
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Session cookie kontrolü
  const sessionCookie = request.cookies.get("pt-session");
  if (!sessionCookie?.value) {
    // API istekleri için 401 döndür
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }
    // Sayfa istekleri için login'e yönlendir
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Tüm rotaları eşle (statik dosyalar hariç)
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
