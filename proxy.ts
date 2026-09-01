import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/") ||
    pathname === "/customer/signup" ||
    pathname.startsWith("/customer/signup/") ||
    pathname === "/business-login" ||
    pathname.startsWith("/business-login/") ||
    pathname === "/admin-login" ||
    pathname.startsWith("/admin-login/") ||
    pathname === "/business-pending" ||
    pathname.startsWith("/business-pending/") ||
    pathname === "/businesses" ||
    pathname.startsWith("/businesses/") ||
    pathname === "/about" ||
    pathname.startsWith("/about/") ||
    pathname === "/contact" ||
    pathname.startsWith("/contact/") ||
    pathname === "/faqs" ||
    pathname.startsWith("/faqs/") ||
    pathname === "/terms" ||
    pathname.startsWith("/terms/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/logout/");

  const isCustomerRoute =
    pathname === "/customer" ||
    pathname.startsWith("/customer/");

  const isBusinessRoute =
    pathname === "/dashboard/businesses" ||
    pathname.startsWith("/dashboard/businesses/");

  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  const isProtectedCustomerRoute =
    isCustomerRoute &&
    pathname !== "/customer/signup" &&
    !pathname.startsWith("/customer/signup/");

  const isProtectedRoute =
    isProtectedCustomerRoute ||
    isBusinessRoute ||
    isAdminRoute;

  if (isPublicRoute) {
    return supabaseResponse;
  }

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone();

    if (isProtectedCustomerRoute) {
      loginUrl.pathname = "/login";
    } else if (isBusinessRoute) {
      loginUrl.pathname = "/business-login";
    } else if (isAdminRoute) {
      loginUrl.pathname = "/admin-login";
    }

    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};