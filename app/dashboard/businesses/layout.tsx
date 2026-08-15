import Link from "next/link";
import { redirect } from "next/navigation";

import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  Store,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

import LogoutButton from "./LogoutButton";
import MobileBusinessMenu from "../businesses/MobileBusinessMenu";

export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. GET AUTHENTICATED USER

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "BUSINESS AUTHENTICATION ERROR:",
      userError
    );

    redirect("/business-login");
  }

  console.log("=================================");
  console.log("BUSINESS DASHBOARD AUTH");
  console.log("USER:", user.id);
  console.log("=================================");

  // 2. GET PROFILE

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      role
    `)
    .eq("id", user.id)
    .maybeSingle();

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

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Unable to Verify Account
          </h1>

          <p className="mt-3 text-gray-500">
            We could not verify your business
            account information.
          </p>
        </div>
      </div>
    );
  }

  // 3. VERIFY BUSINESS OWNER ROLE

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

  // 4. FIND BUSINESS

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      slug,
      owner_id,
      status,
      onboarding_status
    `)
    .eq("owner_id", user.id)
    .maybeSingle();

  // 5. BUSINESS QUERY ERROR

  if (businessError) {
    console.error(
      "BUSINESS QUERY ERROR:",
      businessError
    );

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F6] p-6">
        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
          <Store
            size={40}
            className="mx-auto text-[#64152E]"
          />

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Unable to Load Business
          </h1>

          <p className="mt-3 text-gray-500">
            We could not load your business
            information. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // 6. BUSINESS DOES NOT EXIST

  if (!business) {
    console.error(
      "BUSINESS NOT FOUND FOR USER:",
      user.id
    );

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F6] p-6">
        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7E9EE]">
            <Store
              size={30}
              className="text-[#64152E]"
            />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Business Account Not Found
          </h1>

          <p className="mt-3 text-gray-500">
            No business is connected to this
            account.
          </p>

          <Link
            href="/register/businesses"
            className="mt-7 inline-block rounded-lg bg-[#64152E] px-6 py-3 font-semibold text-white transition hover:bg-[#7A1B38]"
          >
            Register Your Business
          </Link>
        </div>
      </div>
    );
  }

  // 7. VERIFY OWNERSHIP

  if (business.owner_id !== user.id) {
    console.error(
      "BUSINESS OWNERSHIP CHECK FAILED:",
      {
        userId: user.id,
        ownerId: business.owner_id,
      }
    );

    redirect("/customer/dashboard");
  }

  // 8. BUSINESS STATUS

  console.log("BUSINESS:", business.name);
  console.log("STATUS:", business.status);
  console.log(
    "ONBOARDING:",
    business.onboarding_status
  );

  // 9. ONLY APPROVED BUSINESSES ENTER

  if (business.status !== "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F6] p-6">
        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7E9EE]">
            <Store
              size={30}
              className="text-[#64152E]"
            />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Your Business Is Pending Activation
          </h1>

          <p className="mt-4 leading-7 text-gray-500">
            Your business{" "}
            <span className="font-semibold text-[#64152E]">
              {business.name}
            </span>{" "}
            has not been approved yet.
          </p>

          <div className="mt-6 rounded-xl border border-[#E8D5DC] bg-[#FCF7F9] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8B1E3F]">
              Current Status
            </p>

            <p className="mt-1 font-semibold capitalize text-[#64152E]">
              {business.status}
            </p>
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Onboarding Status
            </p>

            <p className="mt-1 font-semibold capitalize text-gray-700">
              {business.onboarding_status}
            </p>
          </div>

          <Link
            href="/customer/dashboard"
            className="mt-7 inline-block rounded-lg bg-[#64152E] px-6 py-3 font-semibold text-white"
          >
            Go to Customer Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 10. APPROVED BUSINESS DASHBOARD

  return (
    <div className="min-h-screen bg-[#FAF8F6]">

      {/* DESKTOP SIDEBAR */}

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-[#64152E] text-white lg:block">

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

        <nav className="p-4">

          <div className="mb-7">

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
              Business
            </p>

            <div className="space-y-1">

              <Link
                href="/dashboard/businesses"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <LayoutDashboard size={19} />
                Overview
              </Link>

              <Link
                href="/dashboard/businesses/products"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Package size={19} />
                Products & Services
              </Link>

              <Link
                href="/dashboard/businesses/orders"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <ShoppingBag size={19} />
                Orders
              </Link>

              <Link
                href="/dashboard/businesses/customers"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Users size={19} />
                Customers
              </Link>

              <Link
                href="/dashboard/businesses/analytics"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <BarChart3 size={19} />
                Analytics
              </Link>

            </div>

          </div>

          <div>

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
              Account
            </p>

            <div className="space-y-1">

              <Link
                href="/dashboard/businesses/subscription"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <CreditCard size={19} />
                Subscription
              </Link>

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

        <div className="absolute bottom-0 left-0 w-full border-t border-white/10 p-4">
          <LogoutButton />
        </div>

      </aside>

      {/* MAIN */}

      <main className="min-h-screen lg:ml-64">

        {/* TOP BAR */}

        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">

            <div className="lg:hidden">
  <MobileBusinessMenu
    businessName={business.name}
  />
</div>

            <h1 className="text-base font-semibold text-[#242424] sm:text-lg">
              Business Dashboard
            </h1>

          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            <div className="hidden text-right sm:block">

              <p className="text-sm font-semibold text-[#242424]">
                {business.name}
              </p>

              <p className="text-xs text-gray-500">
                Business Account
              </p>

            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8B1E3F] text-sm font-semibold text-white">
              {business.name
                .charAt(0)
                .toUpperCase()}
            </div>

          </div>

        </header>

        {/* CONTENT */}

        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>

      </main>

    </div>
  );
}