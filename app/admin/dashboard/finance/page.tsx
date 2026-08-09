import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

export default async function AdminFinancePage() {
  const supabase = await createClient();

  // =========================================
  // 1. CHECK AUTHENTICATION
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin-login");
  }

  // =========================================
  // 2. CHECK ADMIN ROLE
  // =========================================

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
    redirect("/customer/dashboard");
  }

  // =========================================
  // 3. FETCH FINANCE DATA
  // =========================================

  const [
    { data: orders, error: ordersError },
    { data: businesses, error: businessesError },
    { data: platformSettings, error: settingsError },
  ] = await Promise.all([
    supabase
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
          paystack_reference,
          created_at,
          businesses (
            id,
            name,
            slug
          )
        `
      )
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("businesses")
      .select(
        "id, name, status, created_at"
      ),

    supabase
      .from("platform_settings")
      .select(
        "business_subscription_fee, transaction_fee"
      )
      .order("created_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle(),
  ]);

  // =========================================
  // 4. LOG DATABASE ERRORS
  // =========================================

  if (ordersError) {
    console.error(
      "ADMIN FINANCE ORDERS ERROR:",
      ordersError
    );
  }

  if (businessesError) {
    console.error(
      "ADMIN FINANCE BUSINESSES ERROR:",
      businessesError
    );
  }

  if (settingsError) {
    console.error(
      "ADMIN FINANCE SETTINGS ERROR:",
      settingsError
    );
  }

  // =========================================
  // 5. NORMALIZE DATA
  // =========================================

  const allOrders = orders ?? [];
  const allBusinesses = businesses ?? [];

  // =========================================
  // 6. PAYMENT STATUS GROUPS
  // =========================================

  const paidOrders = allOrders.filter(
    (order) =>
      order.payment_status === "paid"
  );

  const pendingPayments =
    allOrders.filter(
      (order) =>
        order.payment_status === "pending"
    );

  const failedPayments =
    allOrders.filter(
      (order) =>
        order.payment_status === "failed"
    );

  // =========================================
  // 7. BUSINESS STATUS
  // =========================================

  const approvedBusinesses =
    allBusinesses.filter(
      (business) =>
        business.status === "approved"
    );

  // =========================================
  // 8. TOTAL PAID ORDER VALUE
  // =========================================

  const totalOrderValue =
    paidOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.total ??
            order.total_amount ??
            0
        ),
      0
    );

  // =========================================
  // 9. ADADI MAINTENANCE FEE
  //
  // BUSINESS RULE:
  //
  // Every ₦1,000 paid = ₦25 to ADADI.
  //
  // Therefore:
  //
  // Platform fee =
  // Paid order value × (25 / 1000)
  //
  // = Paid order value × 0.025
  //
  // This means ADADI receives 2.5%
  // of the paid order value.
  // =========================================

  const transactionFeeRate = 25 / 1000;

  const transactionFees =
    totalOrderValue *
    transactionFeeRate;

  // =========================================
  // 10. BUSINESS SUBSCRIPTION REVENUE
  // =========================================

  const businessSubscriptionFee =
    Number(
      platformSettings?.business_subscription_fee ??
        0
    );

  const subscriptionRevenue =
    approvedBusinesses.length *
    businessSubscriptionFee;

  // =========================================
  // 11. TOTAL PLATFORM REVENUE
  // =========================================

  const totalPlatformRevenue =
    transactionFees +
    subscriptionRevenue;

  // =========================================
  // 12. FORMATTING HELPERS
  // =========================================

  const formatCurrency = (
    amount: number | string | null
  ) => {
    return new Intl.NumberFormat(
      "en-NG",
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
        month: "short",
        year: "numeric",
      }
    );
  };

  // =========================================
  // 13. RECENT PAID ORDERS
  // =========================================

  const recentPaidOrders =
    paidOrders.slice(0, 10);

  // =========================================
  // 14. RENDER PAGE
  // =========================================

  return (
    <main className="min-h-screen">
      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Financial Management
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#242424]">
            Finance Overview
          </h1>

          <p className="mt-2 text-gray-500">
            Monitor ADADI&apos;s payment activity,
            platform revenue, maintenance fees,
            and business subscription revenue.
          </p>
        </div>

        <Link
          href="/admin/dashboard/orders"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#E8D5DC] bg-white px-5 py-3 text-sm font-semibold text-[#8B1E3F] transition hover:bg-[#F7E9EE]"
        >
          View All Orders
          <ArrowRight size={17} />
        </Link>
      </div>

      {/* =========================================
          DATABASE WARNING
      ========================================= */}

      {(ordersError ||
        businessesError ||
        settingsError) && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          Some financial data could not be
          loaded. Please check your database
          connection and try again.
        </div>
      )}

      {/* =========================================
          MAIN FINANCIAL CARDS
      ========================================= */}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* PAID ORDER VALUE */}

        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Paid Order Value
              </p>

              <p className="mt-3 text-2xl font-bold text-[#242424]">
                {formatCurrency(
                  totalOrderValue
                )}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        {/* TOTAL PLATFORM REVENUE */}

        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Platform Revenue
              </p>

              <p className="mt-3 text-2xl font-bold text-green-600">
                {formatCurrency(
                  totalPlatformRevenue
                )}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        {/* MAINTENANCE FEES */}

        <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Maintenance Fees
              </p>

              <p className="mt-3 text-2xl font-bold text-blue-600">
                {formatCurrency(
                  transactionFees
                )}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                ₦25 per ₦1,000 paid
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CreditCard size={24} />
            </div>
          </div>
        </div>

        {/* SUBSCRIPTION REVENUE */}

        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Subscription Revenue
              </p>

              <p className="mt-3 text-2xl font-bold text-purple-600">
                {formatCurrency(
                  subscriptionRevenue
                )}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Building2 size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          PAYMENT STATISTICS
      ========================================= */}

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* PAID ORDERS */}

        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ShoppingBag
              size={20}
              className="text-[#8B1E3F]"
            />

            <p className="font-semibold text-[#242424]">
              Paid Orders
            </p>
          </div>

          <p className="mt-4 text-3xl font-bold text-[#242424]">
            {paidOrders.length}
          </p>
        </div>

        {/* PENDING PAYMENTS */}

        <div className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Clock
              size={20}
              className="text-yellow-600"
            />

            <p className="font-semibold text-[#242424]">
              Pending Payments
            </p>
          </div>

          <p className="mt-4 text-3xl font-bold text-[#242424]">
            {pendingPayments.length}
          </p>
        </div>

        {/* FAILED PAYMENTS */}

        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <XCircle
              size={20}
              className="text-red-600"
            />

            <p className="font-semibold text-[#242424]">
              Failed Payments
            </p>
          </div>

          <p className="mt-4 text-3xl font-bold text-[#242424]">
            {failedPayments.length}
          </p>
        </div>

        {/* APPROVED BUSINESSES */}

        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle
              size={20}
              className="text-green-600"
            />

            <p className="font-semibold text-[#242424]">
              Approved Businesses
            </p>
          </div>

          <p className="mt-4 text-3xl font-bold text-[#242424]">
            {approvedBusinesses.length}
          </p>
        </div>
      </div>

      {/* =========================================
          RECENT PAID ORDERS
      ========================================= */}

      <div className="mt-8 overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#242424]">
              Recent Paid Orders
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Recent successful customer payments
              processed through ADADI.
            </p>
          </div>

          <Link
            href="/admin/dashboard/orders"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
          >
            View Orders
            <ArrowRight size={15} />
          </Link>
        </div>

        {recentPaidOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7E9EE] text-[#8B1E3F]">
              <CreditCard size={25} />
            </div>

            <h3 className="mt-5 font-bold text-[#242424]">
              No paid orders yet
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Successful customer payments will
              appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
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
                    Maintenance Fee
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {recentPaidOrders.map(
                  (order) => {
                    const business =
                      Array.isArray(
                        order.businesses
                      )
                        ? order.businesses[0]
                        : order.businesses;

                    // =========================================
                    // CALCULATE THIS ORDER'S ADADI FEE
                    //
                    // ₦25 per ₦1,000
                    // = 2.5%
                    // =========================================

                    const orderAmount =
                      Number(
                        order.total ??
                          order.total_amount ??
                          0
                      );

                    const orderPlatformFee =
                      orderAmount *
                      transactionFeeRate;

                    return (
                      <tr
                        key={order.id}
                        className="transition hover:bg-[#FCF7F9]"
                      >
                        {/* ORDER */}

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

                        {/* CUSTOMER */}

                        <td className="px-6 py-5">
                          <p className="font-medium text-[#242424]">
                            {order.customer_name ||
                              "Guest Customer"}
                          </p>
                        </td>

                        {/* BUSINESS */}

                        <td className="px-6 py-5">
                          <p className="font-medium text-[#242424]">
                            {business?.name ||
                              "Unknown Business"}
                          </p>
                        </td>

                        {/* ORDER AMOUNT */}

                        <td className="px-6 py-5">
                          <p className="font-semibold text-[#242424]">
                            {formatCurrency(
                              orderAmount
                            )}
                          </p>
                        </td>

                        {/* ADADI MAINTENANCE FEE */}

                        <td className="px-6 py-5">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(
                              orderPlatformFee
                            )}
                          </span>

                          <p className="mt-1 text-xs text-gray-400">
                            2.5% maintenance fee
                          </p>
                        </td>

                        {/* ACTION */}

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
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================
          PLATFORM FEES AND SUBSCRIPTION
      ========================================= */}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* MAINTENANCE FEE INFORMATION */}

        <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CreditCard
              size={21}
              className="text-[#8B1E3F]"
            />

            <h2 className="font-bold text-[#242424]">
              ADADI Maintenance Fee
            </h2>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded-xl bg-[#FCF7F9] p-5">
              <p className="text-sm text-gray-500">
                ADADI earns
              </p>

              <p className="mt-2 text-3xl font-bold text-[#8B1E3F]">
                ₦25
              </p>

              <p className="mt-1 text-sm text-gray-500">
                for every ₦1,000 paid through
                the platform.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Maintenance fee rate
                </span>

                <span className="font-bold text-[#242424]">
                  2.5%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Total paid order value
                </span>

                <span className="font-bold text-[#242424]">
                  {formatCurrency(
                    totalOrderValue
                  )}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#242424]">
                    ADADI maintenance revenue
                  </span>

                  <span className="font-bold text-green-600">
                    {formatCurrency(
                      transactionFees
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SUBSCRIPTION REVENUE */}

        <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Building2
              size={21}
              className="text-[#8B1E3F]"
            />

            <h2 className="font-bold text-[#242424]">
              Subscription Revenue
            </h2>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-500">
              Approved Businesses
            </p>

            <p className="mt-2 text-3xl font-bold text-[#242424]">
              {approvedBusinesses.length}
            </p>

            <p className="mt-4 text-sm leading-6 text-gray-500">
              Estimated subscription revenue based
              on the current business subscription
              fee and the number of approved
              businesses.
            </p>

            <div className="mt-6 border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Subscription fee
                </span>

                <span className="font-bold text-[#242424]">
                  {formatCurrency(
                    businessSubscriptionFee
                  )}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="font-semibold text-[#242424]">
                  Estimated revenue
                </span>

                <span className="font-bold text-purple-600">
                  {formatCurrency(
                    subscriptionRevenue
                  )}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/businesses"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
          >
            View Businesses
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </main>
  );
}