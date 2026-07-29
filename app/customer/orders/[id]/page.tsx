import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Package,
  XCircle,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

type CustomerOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerOrderDetailsPage({
  params,
}: CustomerOrderPageProps) {
  // =========================================
  // 1. GET ORDER ID
  // =========================================

  const { id } = await params;

  // =========================================
  // 2. CREATE SUPABASE SERVER CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 3. GET CURRENTLY LOGGED-IN USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // =========================================
  // 4. CHECK AUTHENTICATION
  // =========================================

  if (userError || !user) {
    redirect("/login");
  }

  // =========================================
  // 5. GET ORDER
  //
  // IMPORTANT:
  // We filter by customer_id so a customer
  // can only access their own order.
  // =========================================

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        status,
        total_amount,
        created_at,
        customer_id
      `
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  // =========================================
  // 6. HANDLE DATABASE ERROR
  // =========================================

  if (orderError) {
    console.error(
      "CUSTOMER ORDER DETAILS ERROR:",
      orderError
    );

    return (
      <main className="min-h-screen bg-[#faf7f8]">

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

        <div className="mx-auto max-w-3xl px-6 py-20 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            !
          </div>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Unable to Load Order
          </h1>

          <p className="mt-3 text-gray-600">
            We couldn't load this order right now.
            Please try again later.
          </p>

          <Link
            href="/customer/orders"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#8B1E3F] px-6 py-3 font-semibold text-white transition hover:bg-[#64152E]"
          >
            <ArrowLeft size={17} />

            Back to Orders
          </Link>

        </div>

      </main>
    );
  }

  // =========================================
  // 7. CHECK ORDER EXISTS
  // =========================================

  if (!order) {
    notFound();
  }

  // =========================================
  // 8. FORMAT ORDER STATUS
  // =========================================

  const orderStatus =
    order.status || "pending";

  const formattedStatus =
    orderStatus.replace(
      /_/g,
      " "
    );

  // =========================================
  // 9. DETERMINE STATUS ICON
  // =========================================

  const StatusIcon =
    orderStatus === "completed"
      ? CheckCircle2
      : orderStatus === "cancelled"
        ? XCircle
        : Clock3;

  // =========================================
  // 10. RENDER ORDER DETAILS
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

        {/* BACK TO ORDERS */}

        <Link
          href="/customer/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-[#8B1E3F]"
        >
          <ArrowLeft size={17} />

          Back to My Orders
        </Link>

        {/* =========================================
            ORDER HEADER
        ========================================= */}

        <div className="mt-8 rounded-2xl border border-[#ead6dd] bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            {/* ORDER NUMBER */}

            <div>

              <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
                Order Details
              </p>

              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                Order #{order.order_number}
              </h1>

              <p className="mt-2 text-sm text-gray-500">
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

            {/* STATUS */}

            <div
              className={`flex items-center gap-3 rounded-xl px-5 py-4 ${
                orderStatus ===
                "completed"
                  ? "bg-green-50 text-green-700"
                  : orderStatus ===
                      "cancelled"
                    ? "bg-red-50 text-red-700"
                    : "bg-yellow-50 text-yellow-700"
              }`}
            >

              <StatusIcon size={24} />

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider">
                  Status
                </p>

                <p className="mt-1 font-bold capitalize">
                  {formattedStatus}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* =========================================
            ORDER SUMMARY
        ========================================= */}

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">

          {/* BUSINESS */}

          <div className="rounded-2xl border border-[#ead6dd] bg-white p-6 shadow-sm">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f7e9ee] text-[#8B1E3F]">
              <Building2 size={22} />
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Business
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              ADADI Business
            </p>

          </div>

          {/* ORDER STATUS */}

          <div className="rounded-2xl border border-[#ead6dd] bg-white p-6 shadow-sm">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f7e9ee] text-[#8B1E3F]">
              <Package size={22} />
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Order Status
            </p>

            <p className="mt-1 font-semibold capitalize text-gray-900">
              {formattedStatus}
            </p>

          </div>

          {/* TOTAL */}

          <div className="rounded-2xl border border-[#ead6dd] bg-white p-6 shadow-sm">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f7e9ee] text-[#8B1E3F]">
              <CheckCircle2 size={22} />
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Order Total
            </p>

            <p className="mt-1 text-xl font-bold text-[#64152E]">
              ₦
              {Number(
                order.total_amount
              ).toLocaleString(
                "en-NG"
              )}
            </p>

          </div>

        </div>

        {/* =========================================
            ORDER ITEMS
        ========================================= */}

        <section className="mt-6 rounded-2xl border border-[#ead6dd] bg-white shadow-sm">

          <div className="border-b border-gray-100 p-6">

            <h2 className="text-xl font-bold text-gray-900">
              Order Summary
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Details of your ADADI purchase.
            </p>

          </div>

          <div className="p-6">

            <div className="flex items-center gap-4 rounded-xl bg-[#faf7f8] p-5">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#8B1E3F] shadow-sm">
                <Package size={23} />
              </div>

              <div className="flex-1">

                <p className="font-semibold text-gray-900">
                  Order #{order.order_number}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Your order has been received and is
                  currently being processed.
                </p>

              </div>

              <p className="font-bold text-[#64152E]">
                ₦
                {Number(
                  order.total_amount
                ).toLocaleString(
                  "en-NG"
                )}
              </p>

            </div>

          </div>

        </section>

        {/* =========================================
            ACTIONS
        ========================================= */}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">

          <Link
            href="/businesses"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B1E3F] px-6 py-3 font-semibold text-white transition hover:bg-[#64152E]"
          >
            Continue Shopping
          </Link>

          <Link
            href="/customer/orders"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#8B1E3F] px-6 py-3 font-semibold text-[#8B1E3F] transition hover:bg-[#f7e9ee]"
          >
            <ArrowLeft size={17} />

            All Orders
          </Link>

        </div>

      </div>

    </main>
  );
}