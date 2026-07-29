import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowRight,
  Building2,
  Package,
  ShoppingBag,
  User,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

export default async function CustomerDashboardPage() {
  // =========================================
  // 1. CREATE SUPABASE SERVER CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 2. GET CURRENTLY LOGGED-IN USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // =========================================
  // 3. CHECK AUTHENTICATION
  // =========================================

  if (userError || !user) {
    redirect("/login");
  }

  // =========================================
  // 4. GET CUSTOMER PROFILE
  // =========================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      `
        id,
        full_name,
        email,
        role
      `
    )
    .eq("id", user.id)
    .maybeSingle();

  // =========================================
  // 5. VERIFY CUSTOMER ROLE
  // =========================================

  if (profileError) {
    console.error(
      "CUSTOMER PROFILE ERROR:",
      profileError
    );
  }

  if (
    profile &&
    profile.role === "business_owner"
  ) {
    redirect("/dashboard/businesses");
  }

  if (
    profile &&
    profile.role === "admin"
  ) {
    redirect("/admin/dashboard");
  }

  // =========================================
  // 6. GET CUSTOMER ORDERS
  // =========================================

  const {
    data: orders,
    error: ordersError,
  } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        status,
        total_amount,
        created_at
      `
    )
    .eq("customer_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(5);

  if (ordersError) {
    console.error(
      "CUSTOMER ORDERS ERROR:",
      ordersError
    );
  }

  // =========================================
  // 7. CUSTOMER DISPLAY NAME
  // =========================================

  const customerName =
    profile?.full_name ||
    user.email?.split("@")[0] ||
    "Customer";

  // =========================================
  // 8. RENDER CUSTOMER DASHBOARD
  // =========================================

  return (
    <main className="min-h-screen bg-[#faf7f8]">

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="sticky top-0 z-20 border-b border-[#ead6dd] bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          {/* LOGO */}

          <Link
            href="/"
            className="text-2xl font-bold text-[#8B1E3F]"
          >
            ADADI
          </Link>

          {/* NAVIGATION */}

          <nav className="flex items-center gap-5">

            <Link
              href="/businesses"
              className="text-sm font-medium text-gray-600 transition hover:text-[#8B1E3F]"
            >
              Explore Businesses
            </Link>

            <Link
              href="/cart"
              className="text-sm font-medium text-gray-600 transition hover:text-[#8B1E3F]"
            >
              Cart
            </Link>

            <Link
              href="/customer/account"
              className="flex items-center gap-2 rounded-lg border border-[#ead6dd] px-4 py-2 text-sm font-medium text-[#64152E] transition hover:bg-[#faf7f8]"
            >
              <User size={17} />

              Account
            </Link>

          </nav>

        </div>

      </header>

      {/* =========================================
          PAGE CONTENT
      ========================================= */}

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* =========================================
            WELCOME
        ========================================= */}

        <div className="mb-10">

          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Customer Dashboard
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">
            Welcome back, {customerName}
          </h1>

          <p className="mt-3 text-gray-600">
            Discover businesses, manage your orders,
            and continue shopping on ADADI.
          </p>

        </div>

        {/* =========================================
            QUICK ACTIONS
        ========================================= */}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

          {/* EXPLORE BUSINESSES */}

          <Link
            href="/businesses"
            className="group rounded-2xl border border-[#ead6dd] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#8B1E3F] hover:shadow-md"
          >

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f7e9ee] text-[#8B1E3F]">
              <Building2 size={24} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-gray-900">
              Explore Businesses
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Discover businesses, products, and
              services available on ADADI.
            </p>

            <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#8B1E3F]">
              Browse Businesses

              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-1"
              />
            </div>

          </Link>

          {/* MY ORDERS */}

          <Link
            href="/customer/orders"
            className="group rounded-2xl border border-[#ead6dd] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#8B1E3F] hover:shadow-md"
          >

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f7e9ee] text-[#8B1E3F]">
              <ShoppingBag size={24} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-gray-900">
              My Orders
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              View your previous orders and track
              your purchases on ADADI.
            </p>

            <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#8B1E3F]">
              View Orders

              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-1"
              />
            </div>

          </Link>

          {/* MY ACCOUNT */}

          <Link
            href="/customer/account"
            className="group rounded-2xl border border-[#ead6dd] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#8B1E3F] hover:shadow-md"
          >

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f7e9ee] text-[#8B1E3F]">
              <User size={24} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-gray-900">
              My Account
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Manage your profile and account
              information.
            </p>

            <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#8B1E3F]">
              Manage Account

              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-1"
              />
            </div>

          </Link>

        </div>

        {/* =========================================
            RECENT ORDERS
        ========================================= */}

        <section className="mt-10">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
                Your Activity
              </p>

              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                Recent Orders
              </h2>

            </div>

            <Link
              href="/customer/orders"
              className="text-sm font-semibold text-[#8B1E3F] hover:underline"
            >
              View All
            </Link>

          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[#ead6dd] bg-white shadow-sm">

            {!orders ||
            orders.length === 0 ? (

              <div className="px-6 py-14 text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f7e9ee] text-[#8B1E3F]">
                  <Package size={28} />
                </div>

                <h3 className="mt-5 text-xl font-bold text-gray-900">
                  No orders yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-gray-600">
                  You haven't placed an order yet.
                  Explore businesses on ADADI and
                  find something you love.
                </p>

                <Link
                  href="/businesses"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#8B1E3F] px-6 py-3 font-semibold text-white transition hover:bg-[#64152E]"
                >
                  Start Shopping

                  <ArrowRight size={17} />
                </Link>

              </div>

            ) : (

              <div className="divide-y divide-gray-100">

                {orders.map(
                  (order) => (
                    <Link
                      key={order.id}
                      href={`/customer/orders/${order.id}`}
                      className="flex items-center justify-between gap-5 px-6 py-5 transition hover:bg-[#faf7f8]"
                    >

                      <div>

                        <p className="font-semibold text-gray-900">
                          Order #
                          {order.order_number}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {new Date(
                            order.created_at
                          ).toLocaleDateString(
                            "en-NG",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="font-semibold text-[#64152E]">
                          ₦
                          {Number(
                            order.total_amount
                          ).toLocaleString(
                            "en-NG"
                          )}
                        </p>

                        <span
                          className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            order.status ===
                            "completed"
                              ? "bg-green-100 text-green-700"
                              : order.status ===
                                  "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {order.status ||
                            "Pending"}
                        </span>

                      </div>

                    </Link>
                  )
                )}

              </div>

            )}

          </div>

        </section>

      </div>

    </main>
  );
}