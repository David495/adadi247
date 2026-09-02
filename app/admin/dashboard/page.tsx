import Link from "next/link";
import {
  Store,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertCircle,
  Ban,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("ADMIN DASHBOARD AUTH ERROR:", userError);
    redirect("/admin-login");
  }

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

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    console.error(
      "UNAUTHORIZED ADMIN DASHBOARD ACCESS:",
      {
        userId: user.id,
        role: profile?.role,
        profileError,
      }
    );
    redirect("/dashboard/customer");
  }

  const [
    totalBusinessesResult,
    activeSubscriptionsResult,
    pendingBusinessesResult,
    suspendedBusinessesResult,
    totalProductsResult,
    totalOrdersResult,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("subscriptions")
      .select("business_id", {
        count: "exact",
        head: true,
      })
      .eq("status", "active"),

    supabase
      .from("businesses")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),

    supabase
      .from("businesses")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "suspended"),

    supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      }),
  ]);

  const totalBusinesses =
    totalBusinessesResult.count ?? 0;

  const activeBusinesses =
    activeSubscriptionsResult.count ?? 0;

  const pendingBusinesses =
    pendingBusinessesResult.count ?? 0;

  const suspendedBusinesses =
    suspendedBusinessesResult.count ?? 0;

  const totalProducts =
    totalProductsResult.count ?? 0;

  const totalOrders =
    totalOrdersResult.count ?? 0;

  const statisticsError =
    totalBusinessesResult.error ||
    activeSubscriptionsResult.error ||
    pendingBusinessesResult.error ||
    suspendedBusinessesResult.error ||
    totalProductsResult.error ||
    totalOrdersResult.error;

  if (statisticsError) {
    console.error(
      "ADMIN DASHBOARD STATISTICS ERROR:",
      statisticsError
    );
  }

  const {
    data: recentBusinesses,
    error: recentBusinessesError,
  } = await supabase
    .from("businesses")
    .select(
      `
        id,
        name,
        slug,
        category,
        status,
        onboarding_status,
        created_at
      `
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(6);

  if (recentBusinessesError) {
    console.error(
      "RECENT BUSINESSES ERROR:",
      recentBusinessesError
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F6]">
      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
              ADADI Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#242424]">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-gray-500">
              Welcome back,{" "}
              <span className="font-semibold text-[#64152E]">
                {profile.full_name || "Admin"}
              </span>
              . Here's what's happening on ADADI.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/dashboard/businesses"
              className="inline-flex items-center gap-2 rounded-lg bg-[#64152E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7A1B38]"
            >
              <Store size={18} />
              Manage Businesses
            </Link>

            <Link
              href="/dashboard/businesses"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg border border-[#DCC5CC] bg-white px-5 py-3 text-sm font-semibold text-[#64152E] transition hover:bg-[#FCF7F9]"
            >
              View Marketplace
              <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Businesses
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {totalBusinesses}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <Store size={24} />
            </div>
          </div>

          <Link
            href="/admin/dashboard/businesses"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
          >
            View businesses
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Active Businesses
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {activeBusinesses}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CheckCircle size={24} />
            </div>
          </div>

          <p className="mt-5 text-sm text-gray-500">
            Businesses with an active subscription on ADADI.
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Pending Activation
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {pendingBusinesses}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600">
              <Clock size={24} />
            </div>
          </div>

          <Link
            href="/admin/dashboard/businesses"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
          >
            Review businesses
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Suspended Businesses
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {suspendedBusinesses}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Ban size={24} />
            </div>
          </div>

          <p className="mt-5 text-sm text-gray-500">
            Businesses currently restricted.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <Package size={24} />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Products
              </p>

              <p className="mt-1 text-2xl font-bold text-[#242424]">
                {totalProducts}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Products currently listed by businesses
            across the ADADI marketplace.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <ShoppingBag size={24} />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Orders
              </p>

              <p className="mt-1 text-2xl font-bold text-[#242424]">
                {totalOrders}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Orders placed by customers across the
            ADADI marketplace.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-[#E8D5DC] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#242424]">
              Recent Business Registrations
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              The latest businesses registered on ADADI.
            </p>
          </div>

          <Link
            href="/admin/dashboard/businesses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
          >
            View all
            <ArrowRight size={16} />
          </Link>
        </div>

        {!recentBusinesses ||
        recentBusinesses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7E9EE] text-[#8B1E3F]">
              <Store size={25} />
            </div>

            <h3 className="mt-5 text-lg font-bold text-[#242424]">
              No businesses registered yet
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              New business registrations will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentBusinesses.map((business) => {
              const formattedDate = business.created_at
                ? new Date(
                    business.created_at
                  ).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Unknown date";

              const isApproved =
                business.status === "approved";

              const isActive =
                business.status === "active";

              const isSuspended =
                business.status === "suspended";

              return (
                <Link
                  key={business.id}
                  href={`/admin/dashboard/businesses/${business.id}`}
                  className="flex flex-col gap-4 p-6 transition hover:bg-[#FCF7F9] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7E9EE] font-bold text-[#8B1E3F]">
                      {business.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <h3 className="font-semibold text-[#242424]">
                        {business.name}
                      </h3>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {business.category && (
                          <>
                            <span>
                              {business.category}
                            </span>

                            <span>•</span>
                          </>
                        )}

                        <span>
                          Registered{" "}
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                        isApproved || isActive
                          ? "bg-green-100 text-green-700"
                          : isSuspended
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {isApproved || isActive ? (
                        <CheckCircle size={14} />
                      ) : isSuspended ? (
                        <Ban size={14} />
                      ) : (
                        <AlertCircle size={14} />
                      )}

                      {isApproved
                        ? "approved"
                        : isActive
                        ? "active"
                        : isSuspended
                        ? "suspended"
                        : business.status || "pending"}
                    </span>

                    <ArrowRight
                      size={18}
                      className="text-gray-400"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-[#242424]">
          Quick Actions
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/dashboard/businesses"
            className="group rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm transition hover:border-[#8B1E3F] hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <Store size={22} />
              </div>

              <ArrowRight
                size={19}
                className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#8B1E3F]"
              />
            </div>

            <h3 className="mt-5 font-bold text-[#242424]">
              Manage Businesses
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Review, activate, suspend, and manage
              registered businesses.
            </p>
          </Link>

          <Link
            href="/dashboard/businesses"
            target="_blank"
            className="group rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm transition hover:border-[#8B1E3F] hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <ExternalLink size={22} />
              </div>

              <ArrowRight
                size={19}
                className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#8B1E3F]"
              />
            </div>

            <h3 className="mt-5 font-bold text-[#242424]">
              View Marketplace
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              See how customers currently experience
              the ADADI business directory.
            </p>
          </Link>

          <Link
            href="/admin/dashboard/businesses"
            className="group rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm transition hover:border-[#8B1E3F] hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <Clock size={22} />
              </div>

              <ArrowRight
                size={19}
                className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#8B1E3F]"
              />
            </div>

            <h3 className="mt-5 font-bold text-[#242424]">
              Review Pending Businesses
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Review businesses waiting for activation
              and onboarding approval.
            </p>
          </Link>
        </div>
      </div>

      {statisticsError && (
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              Some dashboard statistics could not be loaded.
            </p>

            <p className="mt-1">
              Please check your database connection
              and try refreshing the page.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}