import Link from "next/link";

import {
  Store,
  Package,
  ShoppingBag,
  Users,
  TrendingUp,
  CreditCard,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

export default async function BusinessDashboardPage() {
  // =========================================
  // 1. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 2. GET LOGGED-IN USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // =========================================
  // 3. HANDLE UNAUTHENTICATED USER
  // =========================================

  if (userError || !user) {
    return (
      <div className="rounded-xl border border-[#ead6dd] bg-white p-8">
        <h1 className="text-xl font-bold text-gray-900">
          Authentication Required
        </h1>

        <p className="mt-2 text-gray-500">
          You must be logged in to access your business dashboard.
        </p>

        <Link
          href="/business-login"
          className="mt-6 inline-block rounded-lg bg-[#8B1E3F] px-5 py-3 font-medium text-white transition hover:bg-[#64152E]"
        >
          Business Owner Login
        </Link>
      </div>
    );
  }

  // =========================================
  // 4. GET USER PROFILE
  // =========================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  // =========================================
  // 5. HANDLE PROFILE ERROR
  // =========================================

  if (profileError) {
    console.error(
      "PROFILE ERROR:",
      profileError
    );

    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-xl font-bold text-red-800">
          Unable to Verify Account
        </h1>

        <p className="mt-2 text-red-700">
          We could not verify your account information.
          Please try again later.
        </p>
      </div>
    );
  }

  // =========================================
  // 6. VERIFY BUSINESS OWNER ROLE
  // =========================================

  if (
    !profile ||
    profile.role !== "business_owner"
  ) {
    return (
      <div className="rounded-xl border border-[#ead6dd] bg-white p-8">
        <h1 className="text-xl font-bold text-gray-900">
          Business Owner Access Required
        </h1>

        <p className="mt-2 text-gray-500">
          This dashboard is only available to registered
          business owners.
        </p>

        <Link
          href="/customer/dashboard"
          className="mt-6 inline-block rounded-lg bg-[#8B1E3F] px-5 py-3 font-medium text-white transition hover:bg-[#64152E]"
        >
          Go to Customer Dashboard
        </Link>
      </div>
    );
  }

  // =========================================
  // 7. GET BUSINESS OWNED BY USER
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
        category,
        status,
        onboarding_status,
        created_at
      `
    )
    .eq("owner_id", user.id)
    .maybeSingle();

  // =========================================
  // 8. HANDLE BUSINESS NOT FOUND
  // =========================================

  if (businessError) {
    console.error(
      "BUSINESS DASHBOARD ERROR:",
      businessError
    );

    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-xl font-bold text-red-800">
          Unable to Load Business
        </h1>

        <p className="mt-2 text-red-700">
          We could not load your business information.
          Please try again later.
        </p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="rounded-xl border border-[#ead6dd] bg-white p-8">
        <h1 className="text-xl font-bold text-gray-900">
          Business Not Found
        </h1>

        <p className="mt-2 text-gray-500">
          We could not find a business account connected
          to your account.
        </p>

        <Link
          href="/register/businesses"
          className="mt-6 inline-block rounded-lg bg-[#8B1E3F] px-5 py-3 font-medium text-white transition hover:bg-[#64152E]"
        >
          Register Your Business
        </Link>
      </div>
    );
  }

  // =========================================
  // 9. VERIFY BUSINESS STATUS
  // =========================================

  const normalizedStatus =
    business.status?.toLowerCase();

  // =========================================
  // 10. HANDLE INACTIVE BUSINESS
  // =========================================

  if (normalizedStatus !== "active") {
    const statusLabel =
      business.status
        ? business.status
            .charAt(0)
            .toUpperCase() +
          business.status.slice(1)
        : "Pending";

    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl border border-[#ead6dd] bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f7e9ee]">
            <Store
              size={30}
              className="text-[#8B1E3F]"
            />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Your Business Is Pending Activation
          </h1>

          <p className="mt-3 text-gray-600">
            Hello{" "}
            <span className="font-semibold">
              {profile.full_name || "Business Owner"}
            </span>
            . Your business account for{" "}
            <span className="font-semibold text-[#8B1E3F]">
              {business.name}
            </span>{" "}
            has been created successfully.
          </p>

          <div className="mt-6 rounded-xl bg-[#faf7f8] p-5 text-left">

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Business Status
              </span>

              <span className="rounded-full bg-[#f7e9ee] px-3 py-1 text-sm font-semibold text-[#8B1E3F]">
                {statusLabel}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Business
              </span>

              <span className="text-sm font-medium text-gray-900">
                {business.name}
              </span>
            </div>

          </div>

          <p className="mt-6 text-sm text-gray-500">
            Our team is currently reviewing your business.
            Once your account is activated, you will be able
            to access your full business dashboard and start
            managing your store.
          </p>

          <Link
            href="/customer/dashboard"
            className="mt-6 inline-block rounded-lg border border-[#8B1E3F] px-5 py-3 font-medium text-[#8B1E3F] transition hover:bg-[#f7e9ee]"
          >
            Go to Customer Dashboard
          </Link>

        </div>
      </div>
    );
  }

  // =========================================
  // 11. GET ACTIVE SUBSCRIPTION
  // =========================================

  const {
    data: subscription,
    error: subscriptionError,
  } = await supabase
    .from("subscriptions")
    .select(
      `
        id,
        plan_name,
        amount,
        status,
        starts_at,
        expires_at,
        created_at
      `
    )
    .eq("business_id", business.id)
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    console.error(
      "SUBSCRIPTION ERROR:",
      subscriptionError
    );
  }

  // =========================================
  // 12. GET PRODUCT COUNT
  // =========================================

  const {
    count: productCount,
    error: productError,
  } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("business_id", business.id)
    .eq("is_available", true);

  if (productError) {
    console.error(
      "PRODUCT COUNT ERROR:",
      productError
    );
  }

  // =========================================
  // 13. GET ORDER COUNT
  // =========================================

  const {
    count: orderCount,
    error: orderError,
  } = await supabase
    .from("orders")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("business_id", business.id);

  if (orderError) {
    console.error(
      "ORDER COUNT ERROR:",
      orderError
    );
  }

  // =========================================
  // 14. GET CUSTOMER COUNT
  // =========================================

  const {
    data: customerOrders,
    error: customerError,
  } = await supabase
    .from("orders")
    .select("customer_id")
    .eq("business_id", business.id)
    .not("customer_id", "is", null);

  if (customerError) {
    console.error(
      "CUSTOMER COUNT ERROR:",
      customerError
    );
  }

  const uniqueCustomerIds = new Set(
    (customerOrders || [])
      .map((order) => order.customer_id)
      .filter(Boolean)
  );

  const customerCount =
    uniqueCustomerIds.size;

  // =========================================
  // 15. GET BUSINESS TRANSACTIONS
  // =========================================

  const {
    data: transactions,
    error: transactionError,
  } = await supabase
    .from("platform_transactions")
    .select(
      `
        gross_amount,
        platform_fee,
        business_amount,
        status,
        created_at
      `
    )
    .eq("business_id", business.id)
    .eq("status", "successful");

  if (transactionError) {
    console.error(
      "TRANSACTION ERROR:",
      transactionError
    );
  }

  // =========================================
  // 16. CALCULATE TOTAL SALES
  // =========================================

  const totalSales =
    (transactions || []).reduce(
      (total, transaction) => {
        return (
          total +
          Number(
            transaction.business_amount || 0
          )
        );
      },
      0
    );

  // =========================================
  // 17. CALCULATE THIS WEEK'S SALES
  // =========================================

  const now = new Date();

  const startOfWeek =
    new Date(now);

  const day =
    startOfWeek.getDay();

  startOfWeek.setDate(
    startOfWeek.getDate() - day
  );

  startOfWeek.setHours(
    0,
    0,
    0,
    0
  );

  const weeklySales =
    (transactions || [])
      .filter((transaction) => {
        if (!transaction.created_at) {
          return false;
        }

        return (
          new Date(
            transaction.created_at
          ) >= startOfWeek
        );
      })
      .reduce(
        (total, transaction) => {
          return (
            total +
            Number(
              transaction.business_amount || 0
            )
          );
        },
        0
      );

  // =========================================
  // 18. FORMAT SUBSCRIPTION
  // =========================================

  const subscriptionExpiresAt =
    subscription?.expires_at
      ? new Date(
          subscription.expires_at
        ).toLocaleDateString(
          "en-NG",
          {
            day: "numeric",
            month: "short",
            year: "numeric",
          }
        )
      : "No active subscription";

  const subscriptionAmount =
    subscription?.amount
      ? `₦${Number(
          subscription.amount
        ).toLocaleString()} / week`
      : "No active subscription";

  const planName =
    subscription?.plan_name
      ? subscription.plan_name
          .charAt(0)
          .toUpperCase() +
        subscription.plan_name.slice(1)
      : "No Plan";

  // =========================================
  // 19. FORMAT BUSINESS STATUS
  // =========================================

  const businessStatus =
    business.status
      ? business.status
          .charAt(0)
          .toUpperCase() +
        business.status.slice(1)
      : "Unknown";

  // =========================================
  // 20. RETURN DASHBOARD
  // =========================================

  return (
    <div className="space-y-8">

      {/* HEADER */}

      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Business Dashboard
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          Welcome back 👋
        </h1>

        <p className="mt-1 text-gray-500">
          Here's what's happening with{" "}
          <span className="font-medium text-[#8B1E3F]">
            {business.name}
          </span>{" "}
          today.
        </p>
      </div>

      {/* STATS */}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

        {/* TOTAL SALES */}

        <div className="rounded-xl border border-[#ead6dd] bg-white p-6">

          <div className="flex items-center justify-between">

            <p className="text-sm text-gray-500">
              Total Sales
            </p>

            <TrendingUp
              size={20}
              className="text-[#8B1E3F]"
            />

          </div>

          <h2 className="mt-3 text-2xl font-bold">
            ₦{totalSales.toLocaleString()}
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            All-time business earnings
          </p>

        </div>

        {/* ORDERS */}

        <div className="rounded-xl border border-[#ead6dd] bg-white p-6">

          <div className="flex items-center justify-between">

            <p className="text-sm text-gray-500">
              Orders
            </p>

            <ShoppingBag
              size={20}
              className="text-[#8B1E3F]"
            />

          </div>

          <h2 className="mt-3 text-2xl font-bold">
            {orderCount || 0}
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            Total orders
          </p>

        </div>

        {/* PRODUCTS */}

        <div className="rounded-xl border border-[#ead6dd] bg-white p-6">

          <div className="flex items-center justify-between">

            <p className="text-sm text-gray-500">
              Products
            </p>

            <Package
              size={20}
              className="text-[#8B1E3F]"
            />

          </div>

          <h2 className="mt-3 text-2xl font-bold">
            {productCount || 0}
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            Active listings
          </p>

        </div>

        {/* CUSTOMERS */}

        <div className="rounded-xl border border-[#ead6dd] bg-white p-6">

          <div className="flex items-center justify-between">

            <p className="text-sm text-gray-500">
              Customers
            </p>

            <Users
              size={20}
              className="text-[#8B1E3F]"
            />

          </div>

          <h2 className="mt-3 text-2xl font-bold">
            {customerCount}
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            Unique customers
          </p>

        </div>

      </div>

      {/* SALES THIS WEEK */}

      <div className="rounded-xl border border-[#ead6dd] bg-white p-6">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="font-semibold">
              This Week's Sales
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Your business earnings since the start of this week.
            </p>

          </div>

          <TrendingUp
            size={24}
            className="text-[#8B1E3F]"
          />

        </div>

        <p className="mt-5 text-3xl font-bold">
          ₦{weeklySales.toLocaleString()}
        </p>

      </div>

      {/* DASHBOARD GRID */}

      <div className="grid gap-6 lg:grid-cols-3">

        {/* BUSINESS CARD */}

        <div className="rounded-xl border border-[#ead6dd] bg-white p-6 lg:col-span-2">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f7e9ee]">

              <Store
                size={24}
                className="text-[#8B1E3F]"
              />

            </div>

            <div>

              <h2 className="font-semibold">
                {business.name}
              </h2>

              <p className="text-sm capitalize text-gray-500">
                {business.category}
              </p>

            </div>

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">

            {/* BUSINESS STATUS */}

            <div className="rounded-lg bg-[#faf7f8] p-4">

              <p className="text-xs text-gray-500">
                Business Status
              </p>

              <p className="mt-1 font-semibold text-[#8B1E3F]">
                {businessStatus}
              </p>

            </div>

            {/* SUBSCRIPTION */}

            <div className="rounded-lg bg-[#faf7f8] p-4">

              <p className="text-xs text-gray-500">
                Subscription
              </p>

              <p className="mt-1 font-semibold">
                {planName}
              </p>

            </div>

            {/* ONBOARDING */}

            <div className="rounded-lg bg-[#faf7f8] p-4">

              <p className="text-xs text-gray-500">
                Onboarding
              </p>

              <p className="mt-1 font-semibold capitalize">
                {business.onboarding_status ||
                  "Incomplete"}
              </p>

            </div>

          </div>

        </div>

        {/* SUBSCRIPTION */}

        <div className="rounded-xl border border-[#ead6dd] bg-white p-6">

          <div className="flex items-center gap-3">

            <CreditCard
              size={22}
              className="text-[#8B1E3F]"
            />

            <h2 className="font-semibold">
              Subscription
            </h2>

          </div>

          <p className="mt-5 text-sm text-gray-500">
            Current plan
          </p>

          <p className="mt-1 text-xl font-bold">
            {planName}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {subscriptionAmount}
          </p>

          <p className="mt-3 text-xs text-gray-400">
            Expires: {subscriptionExpiresAt}
          </p>

          <Link
            href="/dashboard/business/subscription"
            className="mt-6 block w-full rounded-lg bg-[#8B1E3F] px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-[#64152E]"
          >
            Manage Subscription
          </Link>

        </div>

      </div>

      {/* QUICK ACTIONS */}

      <div>

        <h2 className="mb-4 text-lg font-semibold">
          Quick Actions
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* ADD PRODUCT */}

          <Link
            href="/dashboard/business/products"
            className="rounded-xl border border-[#ead6dd] bg-white p-5 text-left transition hover:border-[#d9aebe] hover:bg-[#faf7f8]"
          >

            <Package
              size={22}
              className="text-[#8B1E3F]"
            />

            <p className="mt-3 font-medium">
              Add Product
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Add a new product to your store.
            </p>

          </Link>

          {/* EDIT BUSINESS */}

          <Link
            href="/dashboard/business/business"
            className="rounded-xl border border-[#ead6dd] bg-white p-5 text-left transition hover:border-[#d9aebe] hover:bg-[#faf7f8]"
          >

            <Store
              size={22}
              className="text-[#8B1E3F]"
            />

            <p className="mt-3 font-medium">
              Edit Business
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Update your business information.
            </p>

          </Link>

          {/* VIEW ORDERS */}

          <Link
            href="/dashboard/business/orders"
            className="rounded-xl border border-[#ead6dd] bg-white p-5 text-left transition hover:border-[#d9aebe] hover:bg-[#faf7f8]"
          >

            <ShoppingBag
              size={22}
              className="text-[#8B1E3F]"
            />

            <p className="mt-3 font-medium">
              View Orders
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Manage your customer orders.
            </p>

          </Link>

          {/* VIEW ANALYTICS */}

          <Link
            href="/dashboard/business/analytics"
            className="rounded-xl border border-[#ead6dd] bg-white p-5 text-left transition hover:border-[#d9aebe] hover:bg-[#faf7f8]"
          >

            <TrendingUp
              size={22}
              className="text-[#8B1E3F]"
            />

            <p className="mt-3 font-medium">
              View Analytics
            </p>

            <p className="mt-1 text-sm text-gray-500">
              See how your business is performing.
            </p>

          </Link>

        </div>

      </div>

    </div>
  );
}