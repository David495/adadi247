import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function updateSession(
  request: NextRequest
) {
  // =========================================
  // 1. CREATE INITIAL RESPONSE
  // =========================================

  let supabaseResponse =
    NextResponse.next({
      request,
    });

  // =========================================
  // 2. CREATE SUPABASE SERVER CLIENT
  // =========================================

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );

            supabaseResponse =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                supabaseResponse.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  // =========================================
  // 3. REFRESH SUPABASE SESSION
  // =========================================
  // IMPORTANT:
  // Do not remove this getUser() call.
  //
  // Supabase recommends validating the
  // current user here so expired sessions
  // can be refreshed correctly.

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  // =========================================
  // 4. GET CURRENT PATH
  // =========================================

  const pathname =
    request.nextUrl.pathname;

  // =========================================
  // 5. PUBLIC ROUTES
  // =========================================

  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/business-login" ||
    pathname === "/admin-login" ||
    pathname === "/register" ||
    pathname.startsWith(
      "/register/"
    ) ||
    pathname === "/business-pending" ||
    pathname === "/businesses" ||
    pathname.startsWith(
      "/businesses/"
    ) ||
    pathname.startsWith(
      "/api/"
    ) ||
    pathname.startsWith(
      "/auth/"
    ) ||
    pathname.startsWith(
      "/logout/"
    );

  // =========================================
  // 6. PROTECTED ROUTES
  // =========================================

  const isCustomerRoute =
    pathname.startsWith(
      "/customer/"
    );

  const isBusinessRoute =
    pathname.startsWith(
      "/dashboard/businesses"
    );

  const isAdminRoute =
    pathname.startsWith(
      "/admin/"
    );

  const isProtectedRoute =
    isCustomerRoute ||
    isBusinessRoute ||
    isAdminRoute;

  // =========================================
  // 7. ALLOW PUBLIC ROUTES
  // =========================================

  if (isPublicRoute) {
    return supabaseResponse;
  }

  // =========================================
  // 8. PROTECT DASHBOARD ROUTES
  // =========================================

  if (
    isProtectedRoute &&
    !user
  ) {
    const loginUrl =
      request.nextUrl.clone();

    // =========================================
    // CUSTOMER
    // =========================================

    if (isCustomerRoute) {
      loginUrl.pathname =
        "/login";
    }

    // =========================================
    // BUSINESS OWNER
    // =========================================

    else if (
      isBusinessRoute
    ) {
      loginUrl.pathname =
        "/business-login";
    }

    // =========================================
    // ADMIN
    // =========================================

    else if (
      isAdminRoute
    ) {
      loginUrl.pathname =
        "/admin-login";
    }

    // =========================================
    // PRESERVE ORIGINAL DESTINATION
    // =========================================

    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  // =========================================
  // 9. RETURN RESPONSE
  // =========================================

  return supabaseResponse;
}