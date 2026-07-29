import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Package,
  ShoppingBag,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

export default async function CustomerOrdersPage() {
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
  // 4. GET CUSTOMER ORDERS
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
    });

  // =========================================
  // 5. HANDLE DATABASE ERROR
  // =========================================

  if (ordersError) {
    console.error(
      "CUSTOMER ORDERS PAGE ERROR:",
      ordersError
    );

    return (
      <main className="min-h-screen bg-[#faf7f8]">

        {/* HEADER */}

        <header className="border-b border-[#ead6dd] bg-white">

          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

            <Link
              href="/"
              className="text-2xl font-bold text-[#8B1E3F]"
            >
              ADADI
            </Link>

            <Link
              href="/customer/dashboard"
              className="text-sm font-medium text-gray-600 transition hover:text-[#8B1E3F]"
            >
              Dashboard
            </Link>

          </div>

        </header>

        {/* ERROR */}

        <div className="mx-auto max-w-3xl px-6 py-20 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            !
          </div>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Unable to Load Your Orders
          </h1>

          <p className="mt-3 text-gray-600">
            We couldn't load your order history right now.
            Please try again later.
          </p>

          <Link
            href="/customer/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#8B1E3F] px-6 py-3 font-semibold text-white transition hover:bg-[#64152E]"
          >
            <ArrowLeft size={17} />

            Back to Dashboard
          </Link>

        </div>

      </main>
    );
  }

  // =========================================
  // 6. RENDER ORDERS PAGE
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
              href="/customer/dashboard"
              className="text-sm font-medium text-[#8B1E3F]"
            >
              Dashboard
            </Link>

          </nav>

        </div>

      </header>

      {/* =========================================
          PAGE CONTENT
      ========================================= */}

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* BACK LINK */}

        <Link
          href="/customer/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-[#8B1E3F]"
        >
          <ArrowLeft size={17} />

          Back to Dashboard
        </Link>

        {/* PAGE HEADER */}

        <div className="mt-8">

          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Customer Account
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">
            My Orders
          </h1>

          <p className="mt-3 text-gray-600">
            View and track your orders placed through ADADI.
          </p>

        </div>

        {/* =========================================
            ORDERS
        ========================================= */}

        {!orders ||
        orders.length === 0 ? (

          /* EMPTY STATE */

          <div className="mt-8 rounded-2xl border border-[#ead6dd] bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f7e9ee] text-[#8B1E3F]">
              <ShoppingBag size={28} />
            </div>

            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              You haven't placed any orders yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-gray-600">
              Explore businesses on ADADI and discover
              products and services that interest you.
            </p>

            <Link
              href="/businesses"
              className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#8B1E3F] px-6 py-3 font-semibold text-white transition hover:bg-[#64152E]"
            >
              Start Shopping

              <ArrowRight size={17} />
            </Link>

          </div>

        ) : (

          /* ORDERS LIST */

          <div className="mt-8 space-y-4">

            {orders.map(
              (order) => (
                <Link
                  key={order.id}
                  href={`/customer/orders/${order.id}`}
                  className="group block rounded-2xl border border-[#ead6dd] bg-white p-6 shadow-sm transition hover:border-[#8B1E3F] hover:shadow-md"
                >

                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                    {/* ORDER INFORMATION */}

                    <div className="flex items-start gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f7e9ee] text-[#8B1E3F]">
                        <Package size={23} />
                      </div>

                      <div>

                        <h2 className="font-bold text-gray-900">
                          Order #
                          {order.order_number}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          Placed on{" "}
                          {new Date(
                            order.created_at
                          ).toLocaleDateString(
                            "en-NG",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>

                      </div>

                    </div>

                    {/* ORDER STATUS AND TOTAL */}

                    <div className="flex items-center justify-between gap-6 sm:justify-end">

                      <div className="text-left sm:text-right">

                        <p className="text-lg font-bold text-[#64152E]">
                          ₦
                          {Number(
                            order.total_amount
                          ).toLocaleString(
                            "en-NG"
                          )}
                        </p>

                        <span
                          className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            order.status ===
                            "completed"
                              ? "bg-green-100 text-green-700"
                              : order.status ===
                                  "cancelled"
                                ? "bg-red-100 text-red-700"
                                : order.status ===
                                    "processing"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {order.status ||
                            "Pending"}
                        </span>

                      </div>

                      <ArrowRight
                        size={20}
                        className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#8B1E3F]"
                      />

                    </div>

                  </div>

                </Link>
              )
            )}

          </div>

        )}

      </div>

    </main>
  );
}