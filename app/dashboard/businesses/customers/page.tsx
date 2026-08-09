import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  ShoppingBag,
  Store,
  Users,
  UserPlus,
  UserRound,
} from "lucide-react";
import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

type Order = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  total: number | null;
  total_amount: number | null;
  payment_status: string | null;
  order_status: string | null;
  status: string | null;
  created_at: string | null;
};

type Customer = {
  key: string;
  name: string;
  email: string;
  orders: number;
  spent: number;
  lastOrder: string | null;
};

export default async function BusinessCustomersPage() {
  const supabase = await createClient();

  // =========================================
  // AUTHENTICATED USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // =========================================
  // BUSINESS
  // =========================================

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("id, name, slug, status")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (businessError) {
    console.error(
      "BUSINESS CUSTOMERS - BUSINESS ERROR:",
      businessError
    );

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-xl font-bold text-red-800">
          Unable to Load Customers
        </h1>

        <p className="mt-2 text-sm text-red-700">
          Something went wrong while loading your business
          information.
        </p>

        <p className="mt-3 text-xs text-red-600">
          {businessError.message}
        </p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          Business Not Found
        </h1>

        <p className="mt-2 text-gray-500">
          We could not find a business connected to your
          account.
        </p>
      </div>
    );
  }

  // =========================================
  // ORDERS
  // =========================================

  const {
    data: orderData,
    error: ordersError,
  } = await supabase
    .from("orders")
    .select(
      `
        id,
        customer_id,
        customer_name,
        customer_email,
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

  if (ordersError) {
    console.error(
      "BUSINESS CUSTOMERS - ORDERS ERROR:",
      ordersError
    );

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-xl font-bold text-red-800">
          Unable to Load Customers
        </h1>

        <p className="mt-2 text-sm text-red-700">
          We encountered a problem while loading your
          customer information.
        </p>

        <p className="mt-3 text-xs text-red-600">
          {ordersError.message}
        </p>
      </div>
    );
  }

  const orders: Order[] = orderData || [];

  // =========================================
  // BUILD CUSTOMER DIRECTORY
  // =========================================

  const customerMap = new Map<string, Customer>();

  for (const order of orders) {
    const email = order.customer_email?.trim().toLowerCase();
    const customerId = order.customer_id?.trim();

    /*
     * Prefer customer_id when available.
     * Fall back to email for older orders that may
     * not have customer_id populated.
     */
    const key =
      customerId ||
      email ||
      `guest-${order.id}`;

    const customerName =
      order.customer_name?.trim() ||
      "Customer";

    const customerEmail =
      order.customer_email?.trim() ||
      "No email available";

    const orderValue = Number(
      order.total ??
        order.total_amount ??
        0
    );

    const existing = customerMap.get(key);

    if (!existing) {
      customerMap.set(key, {
        key,
        name: customerName,
        email: customerEmail,
        orders: 1,
        spent:
          order.payment_status?.toLowerCase() === "paid"
            ? orderValue
            : 0,
        lastOrder: order.created_at,
      });
    } else {
      existing.orders += 1;

      if (
        order.payment_status?.toLowerCase() ===
        "paid"
      ) {
        existing.spent += orderValue;
      }

      if (
        order.created_at &&
        (!existing.lastOrder ||
          new Date(order.created_at) >
            new Date(existing.lastOrder))
      ) {
        existing.lastOrder = order.created_at;
      }

      /*
       * Prefer a real customer name if the first
       * order had no useful name.
       */
      if (
        existing.name === "Customer" &&
        customerName !== "Customer"
      ) {
        existing.name = customerName;
      }

      if (
        existing.email === "No email available" &&
        customerEmail !== "No email available"
      ) {
        existing.email = customerEmail;
      }
    }
  }

  const customers = Array.from(
    customerMap.values()
  );

  // =========================================
  // CUSTOMER STATISTICS
  // =========================================

  const totalCustomers = customers.length;

  const returningCustomers = customers.filter(
    (customer) => customer.orders > 1
  ).length;

  const newCustomers = customers.filter(
    (customer) => customer.orders === 1
  ).length;

  const totalCustomerSpend = customers.reduce(
    (sum, customer) => sum + customer.spent,
    0
  );

  const averageCustomerSpend =
    totalCustomers > 0
      ? totalCustomerSpend / totalCustomers
      : 0;

  // Most recent customers first
  customers.sort((a, b) => {
    if (!a.lastOrder) return 1;
    if (!b.lastOrder) return -1;

    return (
      new Date(b.lastOrder).getTime() -
      new Date(a.lastOrder).getTime()
    );
  });

  const recentCustomers = customers.slice(0, 10);

  // =========================================
  // HELPERS
  // =========================================

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "Date unavailable";
    }

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatMoney(
    amount: number
  ) {
    return `₦${amount.toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  function getInitials(
    name: string
  ) {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return "C";
    }

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();
  }

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="space-y-8">

      {/* =====================================
          HEADER
      ===================================== */}

      <div>
        <Link
          href="/dashboard/businesses"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#8B1E3F] transition hover:text-[#64152E]"
        >
          <ArrowLeft size={16} />

          Back to Business Dashboard
        </Link>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
              Customer Management
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Customers
            </h1>

            <p className="mt-2 max-w-2xl text-gray-500">
              View the people who have purchased
              from your business and understand
              your customer activity.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm">
            <Store
              size={17}
              className="text-[#8B1E3F]"
            />

            {business.name}
          </div>
        </div>
      </div>

      {/* =====================================
          CUSTOMER STATS
      ===================================== */}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {/* TOTAL CUSTOMERS */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Customers
              </p>

              <p className="mt-3 text-3xl font-bold text-gray-900">
                {totalCustomers}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Unique customers
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
              <Users
                size={21}
                className="text-[#8B1E3F]"
              />
            </div>
          </div>
        </div>

        {/* NEW CUSTOMERS */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                One-Time Customers
              </p>

              <p className="mt-3 text-3xl font-bold text-gray-900">
                {newCustomers}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Customers with one order
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <UserPlus
                size={21}
                className="text-blue-600"
              />
            </div>
          </div>
        </div>

        {/* RETURNING CUSTOMERS */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Returning Customers
              </p>

              <p className="mt-3 text-3xl font-bold text-gray-900">
                {returningCustomers}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Customers with multiple orders
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
              <UserRound
                size={21}
                className="text-green-600"
              />
            </div>
          </div>
        </div>

        {/* AVERAGE SPEND */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Average Customer Spend
              </p>

              <p className="mt-3 text-2xl font-bold text-gray-900">
                {formatMoney(
                  averageCustomerSpend
                )}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                From successful payments
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
              <ShoppingBag
                size={21}
                className="text-[#8B1E3F]"
              />
            </div>
          </div>
        </div>

      </div>

      {/* =====================================
          CUSTOMER DIRECTORY
      ===================================== */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        <div className="border-b border-gray-200 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
                Customer Directory
              </p>

              <h2 className="mt-1 text-xl font-bold text-gray-900">
                Your Customers
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Customers are created from successful
                and recorded orders.
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">
              {totalCustomers}{" "}
              {totalCustomers === 1
                ? "customer"
                : "customers"}
            </div>
          </div>
        </div>

        {recentCustomers.length === 0 ? (
          <div className="px-6 py-16 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B1E3F]/10">
              <Users
                size={28}
                className="text-[#8B1E3F]"
              />
            </div>

            <h3 className="mt-5 text-lg font-bold text-gray-900">
              No customers yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Customers will appear here when
              people place orders from your
              business.
            </p>

            <Link
              href="/dashboard/businesses/products"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#64152E]"
            >
              Manage Products

              <ArrowRight size={17} />
            </Link>

          </div>
        ) : (
          <>

            {/* DESKTOP TABLE */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Customer
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Orders
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Total Spent
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Last Order
                    </th>

                    <th className="px-6 py-4" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {recentCustomers.map(
                    (customer) => (
                      <tr
                        key={customer.key}
                        className="transition hover:bg-[#faf7f7]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8B1E3F]/10 text-sm font-bold text-[#8B1E3F]">
                              {getInitials(
                                customer.name
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-gray-900">
                                {customer.name}
                              </p>

                              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                                <Mail size={13} />

                                <span className="truncate">
                                  {customer.email}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className="font-semibold text-gray-900">
                            {customer.orders}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span className="font-bold text-[#8B1E3F]">
                            {formatMoney(
                              customer.spent
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span className="text-sm text-gray-600">
                            {formatDate(
                              customer.lastOrder
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#8B1E3F]">
                            View

                            <ArrowRight
                              size={16}
                            />
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE LIST */}

            <div className="divide-y divide-gray-100 md:hidden">
              {recentCustomers.map(
                (customer) => (
                  <div
                    key={customer.key}
                    className="px-5 py-5"
                  >
                    <div className="flex items-start gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8B1E3F]/10 text-sm font-bold text-[#8B1E3F]">
                        {getInitials(
                          customer.name
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900">
                          {customer.name}
                        </p>

                        <p className="mt-1 truncate text-xs text-gray-500">
                          {customer.email}
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-3">

                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">
                              Orders
                            </p>

                            <p className="mt-1 font-bold text-gray-900">
                              {customer.orders}
                            </p>
                          </div>

                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">
                              Spent
                            </p>

                            <p className="mt-1 font-bold text-[#8B1E3F]">
                              {formatMoney(
                                customer.spent
                              )}
                            </p>
                          </div>

                        </div>

                        <p className="mt-3 text-xs text-gray-500">
                          Last order:{" "}
                          {formatDate(
                            customer.lastOrder
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

          </>
        )}
      </div>

      {/* =====================================
          CUSTOMER INSIGHT
      ===================================== */}

      {totalCustomers > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50">
                <UserPlus
                  size={21}
                  className="text-green-600"
                />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  Customer Retention
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {returningCustomers > 0
                    ? `${returningCustomers} ${
                        returningCustomers === 1
                          ? "customer has"
                          : "customers have"
                      } returned to place multiple orders.`
                    : "You do not have any returning customers yet."}
                </p>
              </div>

            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
                <ShoppingBag
                  size={21}
                  className="text-[#8B1E3F]"
                />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  Customer Sales
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Your customers have generated{" "}
                  <span className="font-semibold text-gray-900">
                    {formatMoney(
                      totalCustomerSpend
                    )}
                  </span>{" "}
                  in recorded successful payments.
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* =====================================
          BUSINESS TOOLS
      ===================================== */}

      <div className="grid gap-5 md:grid-cols-2">

        <Link
          href="/dashboard/businesses/orders"
          className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-center justify-between">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
              <ShoppingBag
                size={22}
                className="text-[#8B1E3F]"
              />
            </div>

            <span className="text-sm font-semibold text-[#8B1E3F] transition group-hover:translate-x-1">
              Manage Orders →
            </span>

          </div>

          <h2 className="mt-5 font-bold text-gray-900">
            Order Management
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Review customer purchases, update
            order statuses and manage fulfilment.
          </p>
        </Link>

        <Link
          href="/dashboard/businesses/analytics"
          className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-center justify-between">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
              <Users
                size={22}
                className="text-[#8B1E3F]"
              />
            </div>

            <span className="text-sm font-semibold text-[#8B1E3F] transition group-hover:translate-x-1">
              View Analytics →
            </span>

          </div>

          <h2 className="mt-5 font-bold text-gray-900">
            Customer Analytics
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            See revenue, order performance and
            broader business activity.
          </p>
        </Link>

      </div>

    </div>
  );
}