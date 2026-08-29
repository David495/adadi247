import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  ShoppingBag,
  Users,
  XCircle,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/server";

export default async function AdminCustomersPage() {
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

  const {
    data: customers,
    error: customersError,
  } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, role, created_at"
    )
    .eq("role", "customer")
    .order("created_at", {
      ascending: false,
    });

  const {
    data: orders,
    error: ordersError,
  } = await supabase
    .from("orders")
    .select(`
      id,
      customer_id,
      total_amount,
      total,
      payment_status,
      order_status,
      status
    `);

  const allCustomers = customers ?? [];
  const allOrders = orders ?? [];

  const ordersByCustomer = new Map<
    string,
    {
      totalOrders: number;
      paidOrders: number;
      completedOrders: number;
      cancelledOrders: number;
      totalSpent: number;
    }
  >();

  for (const order of allOrders) {
    if (!order.customer_id) {
      continue;
    }

    const existing =
      ordersByCustomer.get(order.customer_id) ?? {
        totalOrders: 0,
        paidOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalSpent: 0,
      };

    existing.totalOrders += 1;

    if (order.payment_status === "paid") {
      existing.paidOrders += 1;
      existing.totalSpent += Number(
        order.total ??
          order.total_amount ??
          0
      );
    }

    const orderStatus =
      order.order_status ||
      order.status ||
      "pending";

    if (orderStatus === "completed") {
      existing.completedOrders += 1;
    }

    if (orderStatus === "cancelled") {
      existing.cancelledOrders += 1;
    }

    ordersByCustomer.set(
      order.customer_id,
      existing
    );
  }

  const totalCustomers =
    allCustomers.length;

  const activeCustomers =
    allCustomers.filter((customer) =>
      ordersByCustomer.has(customer.id)
    ).length;

  const customersWithNoOrders =
    totalCustomers - activeCustomers;

  const totalCustomerOrders =
    allOrders.filter(
      (order) => order.customer_id
    ).length;

  const totalCustomerRevenue =
    allOrders
      .filter(
        (order) =>
          order.customer_id &&
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
    return new Intl.NumberFormat("en-US", {
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
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Marketplace Management
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#242424]">
          Customers
        </h1>

        <p className="mt-2 text-gray-500">
          Manage and monitor customers using
          the ADADI marketplace.
        </p>
      </div>

      {customersError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">
            Unable to load customers
          </p>

          <p className="mt-1">
            There was a problem loading
            customer information from the
            database.
          </p>
        </div>
      )}

      {ordersError && (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-700">
          <p className="font-semibold">
            Customer order statistics
            unavailable
          </p>

          <p className="mt-1">
            Customer profiles loaded, but
            order statistics could not be
            retrieved.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Customers
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {totalCustomers}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Active Customers
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {activeCustomers}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                No Orders Yet
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {customersWithNoOrders}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600">
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Customer Revenue
              </p>

              <p className="mt-3 text-2xl font-bold text-[#8B1E3F]">
                {formatCurrency(
                  totalCustomerRevenue
                )}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <ShoppingBag size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#242424]">
              All Customers
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              View customer profiles and
              marketplace activity.
            </p>
          </div>

          <div className="text-sm text-gray-500">
            {totalCustomers}{" "}
            {totalCustomers === 1
              ? "customer"
              : "customers"}
          </div>
        </div>

        {customersError ||
        allCustomers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7E9EE] text-[#8B1E3F]">
              <Users size={28} />
            </div>

            <h3 className="mt-6 text-xl font-bold text-[#242424]">
              {customersError
                ? "Unable to load customers"
                : "No customers yet"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              {customersError
                ? "Please try again later."
                : "Registered customers will appear here once they create accounts on ADADI."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-262.5">
              <thead className="bg-[#FCF7F9]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Customer
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Contact
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Orders
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Total Spent
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Joined
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {allCustomers.map(
                  (customer) => {
                    const stats =
                      ordersByCustomer.get(
                        customer.id
                      ) ?? {
                        totalOrders: 0,
                        paidOrders: 0,
                        completedOrders: 0,
                        cancelledOrders: 0,
                        totalSpent: 0,
                      };

                    const hasOrders =
                      stats.totalOrders > 0;

                    return (
                      <tr
                        key={customer.id}
                        className="transition hover:bg-[#FCF7F9]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7E9EE] font-bold text-[#8B1E3F]">
                              {customer.full_name
                                ?.charAt(0)
                                .toUpperCase() ||
                                "C"}
                            </div>

                            <div>
                              <p className="font-semibold text-[#242424]">
                                {customer.full_name ||
                                  "Unnamed Customer"}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                ID:{" "}
                                {customer.id.slice(
                                  0,
                                  8
                                )}
                                ...
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Mail
                                size={15}
                                className="text-gray-400"
                              />

                              <span className="text-sm text-gray-600">
                                {customer.email ||
                                  "No email"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Phone
                                size={15}
                                className="text-gray-400"
                              />

                              <span className="text-sm text-gray-600">
                                {customer.phone ||
                                  "No phone"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div>
                            <p className="font-semibold text-[#242424]">
                              {stats.totalOrders}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {
                                stats.completedOrders
                              }{" "}
                              completed
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-semibold text-[#242424]">
                            {formatCurrency(
                              stats.totalSpent
                            )}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {stats.paidOrders} paid
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          {hasOrders ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              <CheckCircle
                                size={14}
                              />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                              <XCircle
                                size={14}
                              />
                              No Orders
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-sm text-gray-600">
                            {formatDate(
                              customer.created_at
                            )}
                          </p>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link
                            href={`/admin/dashboard/customers/${customer.id}`}
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
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-500">
        Total customer orders tracked:{" "}
        <span className="font-semibold text-[#242424]">
          {totalCustomerOrders}
        </span>
      </div>
    </main>
  );
}