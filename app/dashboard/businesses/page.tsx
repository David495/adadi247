import Link from "next/link";
import {
  ArrowRight,
  Package,
  ShoppingBag,
  Store,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

export default async function BusinessDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: business } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      slug,
      description,
      status,
      onboarding_status
    `)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    return (
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          Business Not Found
        </h1>

        <p className="mt-2 text-gray-500">
          No business is connected to this account.
        </p>
      </div>
    );
  }

  const { count: productCount } =
    await supabase
      .from("products")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("business_id", business.id);

  const { count: orderCount } =
    await supabase
      .from("orders")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("business_id", business.id);

  return (
    <div>

      {/* HEADER */}

      <div className="mb-8">

        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Business Overview
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Welcome back, {business.name}
        </h1>

        <p className="mt-2 text-gray-500">
          Manage your business, products and orders.
        </p>

      </div>

      {/* APPROVED STATUS */}

      <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-5">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <Store
              size={20}
              className="text-green-700"
            />
          </div>

          <div>
            <p className="font-semibold text-green-800">
              Business Approved
            </p>

            <p className="text-sm text-green-700">
              Your business is active on ADADI.
            </p>
          </div>

        </div>

      </div>

      {/* STATS */}

      <div className="grid gap-6 md:grid-cols-3">

        <div className="rounded-2xl border bg-white p-6 shadow-sm">

          <Package
            className="text-[#8B1E3F]"
            size={24}
          />

          <p className="mt-5 text-sm text-gray-500">
            Products
          </p>

          <p className="mt-1 text-3xl font-bold">
            {productCount ?? 0}
          </p>

        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">

          <ShoppingBag
            className="text-[#8B1E3F]"
            size={24}
          />

          <p className="mt-5 text-sm text-gray-500">
            Orders
          </p>

          <p className="mt-1 text-3xl font-bold">
            {orderCount ?? 0}
          </p>

        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">

          <Store
            className="text-[#8B1E3F]"
            size={24}
          />

          <p className="mt-5 text-sm text-gray-500">
            Status
          </p>

          <p className="mt-1 text-xl font-bold capitalize">
            {business.status}
          </p>

        </div>

      </div>

      {/* QUICK ACTIONS */}

      <div className="mt-8 grid gap-6 md:grid-cols-2">

        <Link
          href="/dashboard/businesses/products"
          className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >

          <div className="flex items-center justify-between">

            <div>

              <h2 className="font-bold text-gray-900">
                Manage Products
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Add, edit and manage your products.
              </p>

            </div>

            <ArrowRight
              size={20}
              className="transition group-hover:translate-x-1"
            />

          </div>

        </Link>

        <Link
          href="/dashboard/businesses/orders"
          className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >

          <div className="flex items-center justify-between">

            <div>

              <h2 className="font-bold text-gray-900">
                View Orders
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                View and manage customer orders.
              </p>

            </div>

            <ArrowRight
              size={20}
              className="transition group-hover:translate-x-1"
            />

          </div>

        </Link>

      </div>

      {/* PUBLIC STORE */}

      {business.slug && (
        <div className="mt-8 rounded-2xl bg-[#64152E] p-6 text-white">

          <h2 className="text-xl font-bold">
            Your Public Store
          </h2>

          <p className="mt-2 text-white/70">
            Customers can visit your ADADI
            storefront.
          </p>

          <Link
            href={`/businesses/${business.slug}`}
            target="_blank"
            className="mt-5 inline-block rounded-lg bg-white px-5 py-3 font-semibold text-[#64152E]"
          >
            View Public Store
          </Link>

        </div>
      )}

    </div>
  );
}