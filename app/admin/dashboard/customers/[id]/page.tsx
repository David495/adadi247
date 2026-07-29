import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  ShoppingBag,
  User,
  XCircle,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

type AdminCustomerDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCustomerDetailsPage({
  params,
}: AdminCustomerDetailsPageProps) {
  const { id } = await params;

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
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    redirect("/dashboard/customer");
  }

  if (!id) {
    notFound();
  }

  const {
    data: customer,
    error: customerError,
  } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, role, created_at, updated_at"
    )
    .eq("id", id)
    .eq("role", "customer")
    .maybeSingle();

  if (customerError) {
    console.error(
      "ADMIN CUSTOMER FETCH ERROR:",
      customerError
    );

    throw new Error(
      "Unable to load customer."
    );
  }

  if (!customer) {
    notFound();
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
        business_id,
        customer_name,
        total_amount,
        subtotal,
        delivery_fee,
        total,
        payment_status,
        order_status,
        status,
        delivery_method,
        created_at,
        updated_at,
        businesses (
          id,
          name,
          slug
        )
      `
    )
    .eq("customer_id", customer.id)
    .order("created_at", {
      ascending: false,
    });

  if (ordersError) {
    console.error(
      "ADMIN CUSTOMER ORDERS ERROR:",
      ordersError
    );
  }

  const customerOrders = orders ?? [];

  const totalOrders =
    customerOrders.length;

  const paidOrders =
    customerOrders.filter(
      (order) =>
        order.payment_status === "paid"
    ).length;

  const completedOrders =
    customerOrders.filter(
      (order) =>
        (order.order_status ||
          order.status) === "completed"
    ).length;

  const pendingOrders =
    customerOrders.filter(
      (order) =>
        (order.order_status ||
          order.status) === "pending"
    ).length;

  const cancelledOrders =
    customerOrders.filter(
      (order) =>
        (order.order_status ||
          order.status) === "cancelled"
    ).length;

  const totalSpent =
    customerOrders
      .filter(
        (order) =>
          order.payment_status === "paid"
      )
      .reduce(
        (sum, order) =>
          sum +
          Number(
            order.total ??
              order.total_amount ??
              0
          ),
        0
      );

  const formatCurrency = (
    amount: number | string | null
  ) => {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2,
      }
    ).format(Number(amount ?? 0));
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
        month: "long",
        year: "numeric",
      }
    );
  };

  const formatDateTime = (
    date: string | null
  ) => {
    if (!date) {
      return "Unknown date";
    }

    return new Date(date).toLocaleString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  return (
    <main className="min-h-screen">
      <Link
        href="/admin/dashboard/customers"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
      >
        <ArrowLeft size={17} />
        Back to Customers
      </Link>

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F7E9EE] text-2xl font-bold text-[#8B1E3F]">
            {customer.full_name
              ?.charAt(0)
              .toUpperCase() || "C"}
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
              Customer Profile
            </p>

            <h1 className="mt-1 text-3xl font-bold text-[#242424]">
              {customer.full_name ||
                "Unnamed Customer"}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Customer since{" "}
              {formatDate(
                customer.created_at
              )}
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold capitalize text-green-700">
          <CheckCircle size={17} />
          {customer.role}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
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

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <ShoppingBag size={22} />
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

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CheckCircle size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Pending
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {pendingOrders}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600">
              <Clock size={22} />
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

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Total Spent
            </p>

            <p className="mt-3 text-2xl font-bold text-[#8B1E3F]">
              {formatCurrency(totalSpent)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <User size={21} />
              </div>

              <h2 className="font-bold text-[#242424]">
                Customer Information
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Full Name
                </p>

                <p className="mt-2 font-medium text-[#242424]">
                  {customer.full_name ||
                    "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Email
                </p>

                <div className="mt-2 flex items-start gap-2">
                  <Mail
                    size={16}
                    className="mt-0.5 shrink-0 text-gray-400"
                  />

                  <p className="break-all text-sm font-medium text-[#242424]">
                    {customer.email ||
                      "Not provided"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Phone
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <Phone
                    size={16}
                    className="text-gray-400"
                  />

                  <p className="text-sm font-medium text-[#242424]">
                    {customer.phone ||
                      "Not provided"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Customer ID
                </p>

                <p className="mt-2 break-all text-xs text-gray-500">
                  {customer.id}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Registered
                </p>

                <p className="mt-2 text-sm text-[#242424]">
                  {formatDateTime(
                    customer.created_at
                  )}
                </p>
              </div>

              {customer.updated_at && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Last Updated
                  </p>

                  <p className="mt-2 text-sm text-[#242424]">
                    {formatDateTime(
                      customer.updated_at
                    )}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <ShoppingBag size={21} />
              </div>

              <h2 className="font-bold text-[#242424]">
                Customer Summary
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Total orders
                </span>

                <span className="font-semibold text-[#242424]">
                  {totalOrders}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Paid orders
                </span>

                <span className="font-semibold text-green-600">
                  {paidOrders}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Completed orders
                </span>

                <span className="font-semibold text-[#242424]">
                  {completedOrders}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Cancelled orders
                </span>

                <span className="font-semibold text-red-600">
                  {cancelledOrders}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#242424]">
                    Total spent
                  </span>

                  <span className="font-bold text-[#8B1E3F]">
                    {formatCurrency(
                      totalSpent
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#242424]">
                  Order History
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  All orders placed by this
                  customer.
                </p>
              </div>

              <span className="rounded-full bg-[#F7E9EE] px-3 py-1 text-sm font-semibold text-[#8B1E3F]">
                {totalOrders}
              </span>
            </div>
          </div>

          {ordersError ? (
            <div className="p-10 text-center">
              <XCircle
                size={32}
                className="mx-auto text-red-400"
              />

              <p className="mt-3 font-semibold text-[#242424]">
                Unable to load orders
              </p>

              <p className="mt-1 text-sm text-gray-500">
                There was a problem retrieving
                this customer's order history.
              </p>
            </div>
          ) : customerOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7E9EE] text-[#8B1E3F]">
                <ShoppingBag size={25} />
              </div>

              <h3 className="mt-5 font-bold text-[#242424]">
                No orders yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                This customer has not placed
                any orders on ADADI.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {customerOrders.map(
                (order) => {
                  const business =
                    Array.isArray(
                      order.businesses
                    )
                      ? order.businesses[0]
                      : order.businesses;

                  const orderStatus =
                    order.order_status ||
                    order.status ||
                    "pending";

                  const paymentStatus =
                    order.payment_status ||
                    "pending";

                  return (
                    <div
                      key={order.id}
                      className="p-6 transition hover:bg-[#FCF7F9]"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-bold text-[#8B1E3F] hover:underline"
                          >
                            {order.order_number}
                          </Link>

                          <p className="mt-1 text-sm text-gray-500">
                            {formatDateTime(
                              order.created_at
                            )}
                          </p>

                          <p className="mt-3 text-sm text-gray-600">
                            Business:{" "}
                            <span className="font-semibold text-[#242424]">
                              {business?.name ||
                                "Unknown Business"}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                              paymentStatus ===
                              "paid"
                                ? "bg-green-100 text-green-700"
                                : paymentStatus ===
                                  "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {paymentStatus ===
                            "paid" ? (
                              <CheckCircle
                                size={14}
                              />
                            ) : (
                              <Clock
                                size={14}
                              />
                            )}

                            {paymentStatus}
                          </span>

                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
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
                            {orderStatus ===
                            "completed" ? (
                              <CheckCircle
                                size={14}
                              />
                            ) : orderStatus ===
                              "cancelled" ? (
                              <XCircle
                                size={14}
                              />
                            ) : (
                              <Clock
                                size={14}
                              />
                            )}

                            {orderStatus}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4 lg:justify-end">
                          <div>
                            <p className="text-xs text-gray-500">
                              Order Total
                            </p>

                            <p className="mt-1 font-bold text-[#242424]">
                              {formatCurrency(
                                order.total ??
                                  order.total_amount
                              )}
                            </p>
                          </div>

                          <Link
                            href={`/admin/dashboard/orders/${order.id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#E8D5DC] px-3 py-2 text-sm font-semibold text-[#8B1E3F] transition hover:bg-[#F7E9EE]"
                          >
                            View
                            <ArrowRight
                              size={15}
                            />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}