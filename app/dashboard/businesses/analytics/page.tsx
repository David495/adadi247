import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Package,
  ShoppingBag,
  TrendingUp,
  Store,
  CircleDollarSign,
} from "lucide-react";

import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  // =========================================
  // 1. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 2. GET CURRENT USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // =========================================
  // 3. AUTHENTICATION CHECK
  // =========================================

  if (userError || !user) {
    redirect("/business-login");
  }

  // =========================================
  // 4. GET BUSINESS
  // =========================================

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select(
      `
        id,
        name,
        slug,
        status
      `
    )
    .eq("owner_id", user.id)
    .maybeSingle();

  // =========================================
  // 5. HANDLE BUSINESS ERROR
  // =========================================

  if (businessError) {
    console.error(
      "BUSINESS ANALYTICS ERROR:",
      {
        message: businessError.message,
        details: businessError.details,
        hint: businessError.hint,
        code: businessError.code,
      }
    );

    return (
      <main className="min-h-screen bg-[#faf7f7]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <BarChart3 className="h-6 w-6 text-red-600" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-red-800">
              Unable to Load Analytics
            </h1>

            <p className="mt-2 text-sm leading-6 text-red-700">
              We encountered a problem while loading
              your business analytics.
            </p>

            <p className="mt-4 rounded-xl bg-white/70 p-4 text-xs text-red-700">
              {businessError.message}
            </p>

            <Link
              href="/dashboard/businesses"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6b1224] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#53101c]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // =========================================
  // 6. BUSINESS NOT FOUND
  // =========================================

  if (!business) {
    return (
      <main className="min-h-screen bg-[#faf7f7]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6b1224]/10">
              <Store className="h-7 w-7 text-[#6b1224]" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Business Not Found
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              We could not find a business connected to
              your account.
            </p>

            <Link
              href="/dashboard/businesses"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6b1224] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#53101c]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // =========================================
  // 7. GET PRODUCT COUNT
  // =========================================

  const { count: productCount } = await supabase
    .from("products")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("business_id", business.id);

  // =========================================
  // 8. GET AVAILABLE PRODUCT COUNT
  // =========================================

  const { count: availableProductCount } =
    await supabase
      .from("products")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("business_id", business.id)
      .eq("is_available", true);

  // =========================================
  // 9. GET ORDERS
  // =========================================

  const {
    data: orders,
    error: ordersError,
  } = await supabase
    .from("orders")
    .select(
      `
        id,
        total,
        total_amount,
        payment_status,
        order_status,
        status,
        created_at
      `
    )
    .eq("business_id", business.id)
    .order("created_at", {
      ascending: false,
    });

  // =========================================
  // 10. HANDLE ORDERS ERROR
  // =========================================

  if (ordersError) {
    console.error(
      "BUSINESS ANALYTICS ORDERS ERROR:",
      {
        message: ordersError.message,
        details: ordersError.details,
        hint: ordersError.hint,
        code: ordersError.code,
      }
    );
  }

  const businessOrders = orders || [];

  // =========================================
  // 11. CALCULATE ORDER STATISTICS
  // =========================================

  const totalOrders = businessOrders.length;

  const paidOrders = businessOrders.filter(
    (order) =>
      order.payment_status?.toLowerCase() === "paid"
  ).length;

  const pendingOrders = businessOrders.filter(
    (order) => {
      const status =
        order.order_status ||
        order.status;

      return (
        status?.toLowerCase() === "pending"
      );
    }
  ).length;

  const completedOrders = businessOrders.filter(
    (order) => {
      const status =
        order.order_status ||
        order.status;

      return (
        status?.toLowerCase() === "completed"
      );
    }
  ).length;

  // =========================================
  // 12. CALCULATE REVENUE
  // =========================================

  const totalRevenue = businessOrders
    .filter(
      (order) =>
        order.payment_status?.toLowerCase() ===
        "paid"
    )
    .reduce(
      (total, order) =>
        total +
        Number(
          order.total ??
            order.total_amount ??
            0
        ),
      0
    );

  // =========================================
  // 13. AVERAGE ORDER VALUE
  // =========================================

  const averageOrderValue =
    paidOrders > 0
      ? totalRevenue / paidOrders
      : 0;

  // =========================================
  // 14. CONVERSION / COMPLETION RATE
  // =========================================

  const completionRate =
    totalOrders > 0
      ? Math.round(
          (completedOrders /
            totalOrders) *
            100
        )
      : 0;

  // =========================================
  // 15. FORMAT CURRENCY
  // =========================================

  const formatCurrency = (
    amount: number
  ) =>
    `₦${amount.toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;

  // =========================================
  // 16. RENDER
  // =========================================

  return (
    <main className="min-h-screen bg-[#faf7f7]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">

        {/* =========================================
            BACK LINK
        ========================================= */}

        <Link
          href="/dashboard/businesses"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6b1224] transition hover:text-[#53101c]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Business Dashboard
        </Link>

        {/* =========================================
            PAGE HEADER
        ========================================= */}

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Business Performance
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Analytics
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
            Track the performance of{" "}
            <span className="font-semibold text-[#64152E]">
              {business.name}
            </span>{" "}
            on ADADI.
          </p>
        </div>

        {/* =========================================
            OVERVIEW CARDS
        ========================================= */}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

          {/* REVENUE */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
                <CircleDollarSign
                  className="h-5 w-5 text-[#8B1E3F]"
                />
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Revenue
              </span>

            </div>

            <p className="mt-6 text-sm text-gray-500">
              Paid Revenue
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(totalRevenue)}
            </p>
          </div>

          {/* ORDERS */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                <ShoppingBag
                  className="h-5 w-5 text-blue-600"
                />
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Orders
              </span>

            </div>

            <p className="mt-6 text-sm text-gray-500">
              Total Orders
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {totalOrders}
            </p>
          </div>

          {/* PRODUCTS */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50">
                <Package
                  className="h-5 w-5 text-purple-600"
                />
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Catalogue
              </span>

            </div>

            <p className="mt-6 text-sm text-gray-500">
              Available Products
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {availableProductCount ?? 0}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              {productCount ?? 0} total products
            </p>
          </div>

          {/* COMPLETION */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
                <TrendingUp
                  className="h-5 w-5 text-green-600"
                />
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Performance
              </span>

            </div>

            <p className="mt-6 text-sm text-gray-500">
              Completion Rate
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {completionRate}%
            </p>
          </div>

        </div>

        {/* =========================================
            REVENUE / ORDER SUMMARY
        ========================================= */}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">

          {/* REVENUE CARD */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
                  Revenue Overview
                </p>

                <h2 className="mt-2 text-2xl font-bold text-gray-900">
                  {formatCurrency(totalRevenue)}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Total revenue from paid orders
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
                <BarChart3 className="h-5 w-5 text-[#8B1E3F]" />
              </div>

            </div>

            <div className="mt-8 h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#8B1E3F]"
                style={{
                  width:
                    paidOrders > 0
                      ? "100%"
                      : "0%",
                }}
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Paid orders
              </span>

              <span className="font-semibold text-gray-900">
                {paidOrders}
              </span>
            </div>

          </div>

          {/* ORDER PERFORMANCE */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
              Order Performance
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              {averageOrderValue > 0
                ? formatCurrency(
                    averageOrderValue
                  )
                : "₦0.00"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Average paid order value
            </p>

            <div className="mt-7 grid grid-cols-3 gap-3">

              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs font-medium text-amber-600">
                  Pending
                </p>

                <p className="mt-1 text-xl font-bold text-amber-800">
                  {pendingOrders}
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-xs font-medium text-green-600">
                  Completed
                </p>

                <p className="mt-1 text-xl font-bold text-green-800">
                  {completedOrders}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs font-medium text-blue-600">
                  Paid
                </p>

                <p className="mt-1 text-xl font-bold text-blue-800">
                  {paidOrders}
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* =========================================
            BUSINESS INSIGHT
        ========================================= */}

        <div className="mt-8 rounded-2xl bg-[#64152E] p-6 text-white shadow-sm sm:p-8">

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />

                <h2 className="text-xl font-bold">
                  Business Performance
                </h2>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                Keep your product catalogue updated and
                respond quickly to customer orders to
                improve your business performance.
              </p>
            </div>

            <Link
              href="/dashboard/businesses/products"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#64152E] transition hover:bg-gray-100"
            >
              Manage Products
            </Link>

          </div>

        </div>

        {/* =========================================
            PUBLIC STORE
        ========================================= */}

        {business.slug && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6b1224]/10">
                <Store className="h-5 w-5 text-[#6b1224]" />
              </div>

              <div>
                <p className="font-semibold text-gray-900">
                  Public Store
                </p>

                <p className="text-sm text-gray-500">
                  View how customers see your business.
                </p>
              </div>

            </div>

            <Link
              href={`/businesses/${business.slug}`}
              target="_blank"
              className="inline-flex items-center justify-center rounded-xl border border-[#6b1224]/20 px-5 py-3 text-sm font-semibold text-[#6b1224] transition hover:bg-[#6b1224]/5"
            >
              View Store
            </Link>

          </div>
        )}

      </div>
    </main>
  );
}