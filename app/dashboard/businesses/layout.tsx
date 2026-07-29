import Link from "next/link";
import { redirect } from "next/navigation";

import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  CreditCard,
  Settings,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

import LogoutButton from "./LogoutButton";

export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // =========================================
  // 1. CREATE SUPABASE CLIENT
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
    console.error(
      "AUTHENTICATION ERROR:",
      userError
    );

    redirect("/business-login");
  }

  console.log(
    "BUSINESS DASHBOARD USER:",
    user.id
  );

  // =========================================
  // 4. GET USER PROFILE
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
  // 5. CHECK PROFILE
  // =========================================

  if (profileError) {
    console.error(
      "PROFILE ERROR:",
      profileError
    );

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F6] p-6">
        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            !
          </div>

          <h1 className="mt-5 text-2xl font-bold text-[#242424]">
            Unable to Verify Account
          </h1>

          <p className="mt-3 text-gray-500">
            We could not verify your account
            information. Please try again later.
          </p>

        </div>
      </div>
    );
  }

  // =========================================
  // 6. CHECK BUSINESS OWNER ROLE
  // =========================================

  if (
    !profile ||
    profile.role !== "business_owner"
  ) {
    console.error(
      "UNAUTHORIZED BUSINESS DASHBOARD ACCESS:",
      {
        userId: user.id,
        role: profile?.role,
      }
    );

    redirect("/customer/dashboard");
  }

  console.log(
    "BUSINESS OWNER VERIFIED:",
    profile
  );

  // =========================================
  // 7. FIND BUSINESS OWNED BY USER
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
        owner_id,
        status,
        onboarding_status
      `
    )
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();

  // =========================================
  // 8. CHECK BUSINESS EXISTS
  // =========================================

  if (
    businessError ||
    !business
  ) {
    console.error(
      "BUSINESS NOT FOUND:",
      businessError
    );

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F6] p-6">
        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#64152E] text-white">
            <Store size={26} />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-[#242424]">
            Business Account Not Found
          </h1>

          <p className="mt-3 text-gray-500">
            We could not find a business connected
            to your account.
          </p>

          <Link
            href="/register/businesses"
            className="mt-6 inline-block rounded-lg bg-[#64152E] px-6 py-3 font-medium text-white transition hover:bg-[#7A1B38]"
          >
            Register Your Business
          </Link>

        </div>
      </div>
    );
  }

  console.log(
    "BUSINESS FOUND:",
    business
  );

  // =========================================
  // 9. CHECK BUSINESS OWNER
  // =========================================

  if (
    business.owner_id !== user.id
  ) {
    console.error(
      "BUSINESS OWNERSHIP VERIFICATION FAILED:",
      {
        userId: user.id,
        businessOwnerId:
          business.owner_id,
      }
    );

    redirect("/customer/dashboard");
  }

  // =========================================
  // 10. CHECK BUSINESS STATUS
  // =========================================

  if (
    business.status !== "active"
  ) {
    console.log(
      "BUSINESS NOT ACTIVE:",
      business.status
    );

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F6] p-6">

        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">

          {/* ICON */}

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7E9EE] text-[#64152E]">
            <Store size={30} />
          </div>

          {/* TITLE */}

          <h1 className="mt-6 text-2xl font-bold text-[#242424]">
            Your Business Is Pending Activation
          </h1>

          {/* DESCRIPTION */}

          <p className="mt-3 leading-7 text-gray-500">
            Thank you for registering{" "}
            <span className="font-semibold text-[#64152E]">
              {business.name}
            </span>
            .
          </p>

          <p className="mt-3 leading-7 text-gray-500">
            Your business account is currently
            being reviewed by the ADADI team.
            You will be able to access your
            business dashboard once your account
            has been activated.
          </p>

          {/* STATUS */}

          <div className="mt-6 rounded-xl border border-[#E8D5DC] bg-[#FCF7F9] p-4">

            <p className="text-xs font-semibold uppercase tracking-wider text-[#8B1E3F]">
              Current Status
            </p>

            <p className="mt-1 font-semibold capitalize text-[#64152E]">
              {business.status ||
                "Pending"}
            </p>

          </div>

          {/* ONBOARDING */}

          <div className="mt-4 rounded-xl bg-gray-50 p-4">

            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Onboarding Status
            </p>

            <p className="mt-1 font-semibold capitalize text-gray-700">
              {business.onboarding_status ||
                "Incomplete"}
            </p>

          </div>

          {/* BACK TO CUSTOMER DASHBOARD */}

          <Link
            href="/customer/dashboard"
            className="mt-7 inline-block rounded-lg bg-[#64152E] px-6 py-3 font-medium text-white transition hover:bg-[#7A1B38]"
          >
            Go to Customer Dashboard
          </Link>

        </div>

      </div>
    );
  }

  // =========================================
  // 11. BUSINESS IS ACTIVE
  // =========================================

  console.log(
    "ACTIVE BUSINESS VERIFIED:",
    business
  );

  // =========================================
  // 12. RENDER BUSINESS DASHBOARD
  // =========================================

  return (
    <div className="min-h-screen bg-[#FAF8F6]">

      {/* ========================================= */}
      {/* SIDEBAR */}
      {/* ========================================= */}

      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#64152E] text-white">

        {/* ========================================= */}
        {/* LOGO */}
        {/* ========================================= */}

        <div className="flex h-16 items-center border-b border-white/10 px-6">

          <Link
            href="/dashboard/businesses"
            className="flex items-center gap-2"
          >

            <span className="text-2xl font-bold tracking-tight">
              ADADI
            </span>

            <span className="h-2 w-2 rounded-full bg-[#D4A017]" />

          </Link>

        </div>

        {/* ========================================= */}
        {/* NAVIGATION */}
        {/* ========================================= */}

        <nav className="p-4">

          {/* ========================================= */}
          {/* BUSINESS SECTION */}
          {/* ========================================= */}

          <div className="mb-7">

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
              Business
            </p>

            <div className="space-y-1">

              {/* OVERVIEW */}

              <Link
                href="/dashboard/businesses"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <LayoutDashboard size={19} />

                Overview
              </Link>

              {/* MY BUSINESS */}

              <Link
                href="/dashboard/businesses"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Store size={19} />

                My Business
              </Link>

              {/* PRODUCTS */}

              <Link
                href="/dashboard/businesses/products"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Package size={19} />

                Products & Services
              </Link>

              {/* ORDERS */}

              <Link
                href="/dashboard/businesses/orders"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <ShoppingBag size={19} />

                Orders
              </Link>

              {/* CUSTOMERS */}

              <Link
                href="/dashboard/businesses/customers"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Users size={19} />

                Customers
              </Link>

              {/* ANALYTICS */}

              <Link
                href="/dashboard/businesses/analytics"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <BarChart3 size={19} />

                Analytics
              </Link>

            </div>

          </div>

          {/* ========================================= */}
          {/* ACCOUNT SECTION */}
          {/* ========================================= */}

          <div>

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
              Account
            </p>

            <div className="space-y-1">

              {/* SUBSCRIPTION */}

              <Link
                href="/dashboard/businesses/subscription"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <CreditCard size={19} />

                Subscription
              </Link>

              {/* SETTINGS */}

              <Link
                href="/dashboard/businesses/settings"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Settings size={19} />

                Settings
              </Link>

            </div>

          </div>

        </nav>

        {/* ========================================= */}
        {/* LOGOUT */}
        {/* ========================================= */}

        <div className="absolute bottom-0 left-0 w-full border-t border-white/10 p-4">

          <LogoutButton />

        </div>

      </aside>

      {/* ========================================= */}
      {/* MAIN CONTENT */}
      {/* ========================================= */}

      <main className="ml-64 min-h-screen">

        {/* ========================================= */}
        {/* TOP BAR */}
        {/* ========================================= */}

        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">

          <div>

            <h1 className="text-lg font-semibold text-[#242424]">
              Business Dashboard
            </h1>

          </div>

          {/* ========================================= */}
          {/* BUSINESS AVATAR */}
          {/* ========================================= */}

          <div className="flex items-center gap-3">

            <div className="hidden text-right sm:block">

              <p className="text-sm font-semibold text-[#242424]">
                {business.name}
              </p>

              <p className="text-xs text-gray-500">
                Business Account
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B1E3F] text-sm font-semibold text-white">

              {business.name
                .charAt(0)
                .toUpperCase()}

            </div>

          </div>

        </header>

        {/* ========================================= */}
        {/* PAGE CONTENT */}
        {/* ========================================= */}

        <div className="p-8">

          {children}

        </div>

      </main>

    </div>
  );
}