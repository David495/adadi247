import Link from "next/link";
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  CreditCard,
  XCircle,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export default async function AdminOrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin-login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    redirect("/admin-login");
  }

  const {
    data: orders,
    error: ordersError,
  } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        customer_id,
        business_id,
        customer_name,
        customer_email,
        customer_phone,
        total_amount,
        subtotal,
        delivery_fee,
        total,
        status,
        payment_status,
        order_status,
        delivery_method,
        delivery_address,
        created_at,
        updated_at,
        businesses (
          id,
          name,
          slug
        )
      `
    )
    .order("created_at", {
      ascending: false,
    });

  if (ordersError) {
    console.error(
      "ADMIN ORDERS FETCH ERROR:",
      ordersError
    );
  }

  const allOrders = orders ?? [];

  const totalOrders = allOrders.length;

  const pendingPaymentOrders =
    allOrders.filter(
      (order) =>
        (order.payment_status || "pending") ===
        "pending"
    ).length;

  const paidOrders =
    allOrders.filter(
      (order) =>
        order.payment_status === "paid"
    ).length;

  const processingOrders =
    allOrders.filter(
      (order) =>
        (order.order_status ||
          order.status ||
          "pending") === "processing"
    ).length;

  const completedOrders =
    allOrders.filter(
      (order) =>
        (order.order_status ||
          order.status ||
          "pending") === "completed"
    ).length;

  const cancelledOrders =
    allOrders.filter(
      (order) =>
        (order.order_status ||
          order.status ||
          "pending") === "cancelled"
    ).length;

  const formatCurrency = (
    amount: number | string | null
  ) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(Number(amount ?? 0));
  };

  const formatDate = (
    date: string | null
  ) => {
    if (!date) {
      return "Unknown date";
    }

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (
    <main className="min-h-screen">
      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
              Marketplace Management
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#242424]">
              Orders
            </h1>

            <p className="mt-2 text-gray-500">
              Monitor customer orders and payment activity across ADADI.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Orders
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {totalOrders}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <ShoppingBag size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Pending Payment
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {pendingPaymentOrders}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600">
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Paid Orders
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {paidOrders}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CreditCard size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Processing
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {processingOrders}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShoppingBag size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Completed
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {completedOrders}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Cancelled
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {cancelledOrders}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <XCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#242424]">
              All Orders
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              View and monitor all orders placed on ADADI.
            </p>
          </div>

          <div className="text-sm text-gray-500">
            {totalOrders}{" "}
            {totalOrders === 1
              ? "order"
              : "orders"}
          </div>
        </div>

        {ordersError && (
          <div className="m-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Unable to load orders
              </p>

              <p className="mt-1">
                There was a problem loading orders from the database.
              </p>
            </div>
          </div>
        )}

        {!ordersError &&
        allOrders.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7E9EE] text-[#8B1E3F]">
              <ShoppingBag size={28} />
            </div>

            <h3 className="mt-6 text-xl font-bold text-[#242424]">
              No orders yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Customer orders will appear here once they start placing orders on the ADADI marketplace.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-250">
              <thead className="bg-[#FCF7F9]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Order
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Customer
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Business
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Amount
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Payment
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {allOrders.map((order) => {
                  const business = Array.isArray(
                    order.businesses
                  )
                    ? order.businesses[0]
                    : order.businesses;

                  const paymentStatus =
                    order.payment_status ||
                    "pending";

                  const orderStatus =
                    order.order_status ||
                    order.status ||
                    "pending";

                  return (
                    <tr
                      key={order.id}
                      className="transition hover:bg-[#FCF7F9]"
                    >
                      <td className="px-6 py-5">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-semibold text-[#8B1E3F] hover:underline"
                        >
                          {order.order_number}
                        </Link>

                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(
                            order.created_at
                          )}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-medium text-[#242424]">
                          {order.customer_name ||
                            "Guest Customer"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {order.customer_email ||
                            "No email"}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-medium text-[#242424]">
                          {business?.name ||
                            "Unknown Business"}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-semibold text-[#242424]">
                          {formatCurrency(
                            order.total ??
                              order.total_amount
                          )}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            paymentStatus ===
                            "paid"
                              ? "bg-green-100 text-green-700"
                              : paymentStatus ===
                                "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {paymentStatus}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            orderStatus ===
                            "completed"
                              ? "bg-green-100 text-green-700"
                              : orderStatus ===
                                "cancelled"
                              ? "bg-red-100 text-red-700"
                              : orderStatus ===
                                "processing"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {orderStatus}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#E8D5DC] px-3 py-2 text-sm font-semibold text-[#8B1E3F] transition hover:bg-[#F7E9EE]"
                        >
                          View
                          <ArrowRight
                            size={15}
                          />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
