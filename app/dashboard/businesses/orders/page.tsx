import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Package,
  ShoppingBag,
  Store,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

type Order = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  subtotal: number | null;
  delivery_fee: number | null;
  total: number | null;
  total_amount: number;
  payment_status: string | null;
  order_status: string | null;
  status: string | null;
  delivery_method: string | null;
  created_at: string | null;
};

export default async function BusinessOrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return (
      <main className="min-h-screen bg-[#faf7f7]">
        <section className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Authentication Required
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Please log in to view your business orders.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-[#6b1224] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#53101c]"
            >
              Log In
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const {
    data: businesses,
    error: businessesError,
  } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("owner_id", user.id)
    .order("created_at", {
      ascending: true,
    });

  if (businessesError) {
    console.error(
      "BUSINESS ORDERS - BUSINESS FETCH ERROR:",
      businessesError
    );

    return (
      <main className="min-h-screen bg-[#faf7f7]">
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="font-bold text-red-800">
              Unable to load your businesses
            </h1>

            <p className="mt-2 text-sm text-red-700">
              Please refresh the page and try again.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const businessIds =
    businesses?.map((business) => business.id) || [];

  let orders: Order[] = [];

  if (businessIds.length > 0) {
    const {
      data: orderData,
      error: ordersError,
    } = await supabase
      .from("orders")
      .select(
        `
          id,
          order_number,
          customer_name,
          customer_email,
          customer_phone,
          subtotal,
          delivery_fee,
          total,
          total_amount,
          payment_status,
          order_status,
          status,
          delivery_method,
          created_at
        `
      )
      .in("business_id", businessIds)
      .order("created_at", {
        ascending: false,
      });

    if (ordersError) {
      console.error(
        "BUSINESS ORDERS - ORDERS FETCH ERROR:",
        ordersError
      );
    } else {
      orders = (orderData as Order[]) || [];
    }
  }

  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order) =>
      order.order_status === "pending" ||
      order.status === "pending"
  ).length;

  const paidOrders = orders.filter(
    (order) => order.payment_status === "paid"
  ).length;

  function formatStatus(status: string | null) {
    if (!status) {
      return "Pending";
    }

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function getStatusClass(status: string | null) {
    const normalized = status?.toLowerCase();

    if (
      normalized === "paid" ||
      normalized === "completed" ||
      normalized === "confirmed"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "cancelled" ||
      normalized === "failed"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      normalized === "preparing" ||
      normalized === "ready" ||
      normalized === "processing"
    ) {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-amber-100 text-amber-700";
  }

  return (
    <main className="min-h-screen bg-[#faf7f7]">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href="/dashboard/businesses"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6b1224] transition hover:text-[#53101c]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Business Dashboard
        </Link>

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#6b1224]">
              Business Management
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Orders
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
              View and manage orders placed by customers
              across your businesses.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Orders
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {totalOrders}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6b1224]/10">
                <ShoppingBag className="h-5 w-5 text-[#6b1224]" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Pending Orders
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {pendingOrders}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100">
                <Clock3 className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Paid Orders
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {paidOrders}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">
                <Package className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {businesses && businesses.length > 0 && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6b1224]/10">
                <Store className="h-5 w-5 text-[#6b1224]" />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  Your Businesses
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Orders from these businesses are
                  displayed below.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {businesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/businesses/${business.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-[#faf7f7] px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#6b1224]/30 hover:bg-[#6b1224]/5 hover:text-[#6b1224]"
                >
                  <Store className="h-4 w-4" />

                  {business.name}

                  <ChevronRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Recent Orders
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Customer orders placed through ADADI.
              </p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6b1224]/10">
                <ShoppingBag className="h-7 w-7 text-[#6b1224]" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-gray-900">
                No orders yet
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                When customers purchase products from
                your business, their orders will appear
                here.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="bg-[#faf7f7]">
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Order
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Customer
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Fulfillment
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Payment
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Order Status
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Total
                      </th>

                      <th className="px-6 py-4" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="transition hover:bg-[#faf7f7]"
                      >
                        <td className="px-6 py-5">
                          <p className="font-semibold text-gray-900">
                            {order.order_number}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {order.created_at
                              ? new Date(
                                  order.created_at
                                ).toLocaleString("en-US")
                              : "Date unavailable"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-medium text-gray-900">
                            {order.customer_name ||
                              "Customer"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {order.customer_phone ||
                              order.customer_email ||
                              "No contact information"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <span className="text-sm font-medium capitalize text-gray-700">
                            {order.delivery_method ||
                              "Not specified"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                              order.payment_status
                            )}`}
                          >
                            {formatStatus(
                              order.payment_status
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                              order.order_status ||
                                order.status
                            )}`}
                          >
                            {formatStatus(
                              order.order_status ||
                                order.status
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-bold text-[#6b1224]">
                            ₦
                            {Number(
                              order.total ??
                                order.total_amount ??
                                0
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link
                            href={`/dashboard/business/orders/${order.id}`}
                            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-[#6b1224]/10 hover:text-[#6b1224]"
                            aria-label={`View order ${order.order_number}`}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-gray-100 md:hidden">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/businesses/orders/${order.id}`}
                    className="block p-5 transition hover:bg-[#faf7f7]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-gray-900">
                          {order.order_number}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {order.customer_name ||
                            "Customer"}
                        </p>
                      </div>

                      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                          order.payment_status
                        )}`}
                      >
                        Payment:{" "}
                        {formatStatus(
                          order.payment_status
                        )}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                          order.order_status ||
                            order.status
                        )}`}
                      >
                        {formatStatus(
                          order.order_status ||
                            order.status
                        )}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {order.created_at
                          ? new Date(
                              order.created_at
                            ).toLocaleString("en-US")
                          : "Date unavailable"}
                      </span>

                      <span className="font-bold text-[#6b1224]">
                        ₦
                        {Number(
                          order.total ??
                            order.total_amount ??
                            0
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="border-t border-[#6b1224]/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div>
            <p className="font-bold text-[#6b1224]">
              ADADI
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Manage your business and customer orders.
            </p>
          </div>

          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} ADADI. All
            rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}