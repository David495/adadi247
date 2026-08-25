import Link from "next/link";
import {
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/server";

export default async function AdminBusinessesPage() {
  const supabase = await createClient();

  const {
    data: businesses,
    error,
  } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      slug,
      category,
      phone,
      address,
      status,
      onboarding_status,
      is_open,
      created_at,
      owner_id
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("ADMIN BUSINESSES ERROR:", error);

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-xl font-bold text-red-800">
          Unable to Load Businesses
        </h1>

        <p className="mt-2 text-sm text-red-700">
          We could not load the business accounts.
          Please try again later.
        </p>
      </div>
    );
  }

  const businessList = businesses || [];

  /*
   * Get the latest subscription payment for every business.
   *
   * We do this separately instead of relying on a nested
   * Supabase relationship so the page works cleanly with
   * the schema you currently have.
   */
  const businessIds = businessList.map((business) => business.id);

  let payments: {
    id: string;
    business_id: string;
    reference: string;
    amount: number;
    status: string;
    created_at: string | null;
  }[] = [];

  if (businessIds.length > 0) {
    const {
      data: paymentData,
      error: paymentError,
    } = await supabase
      .from("subscription_payments")
      .select(`
        id,
        business_id,
        reference,
        amount,
        status,
        created_at
      `)
      .in("business_id", businessIds)
      .order("created_at", {
        ascending: false,
      });

    if (paymentError) {
      console.error(
        "ADMIN SUBSCRIPTION PAYMENTS ERROR:",
        paymentError
      );
    } else {
      payments = paymentData || [];
    }
  }

  /*
   * Keep only the latest payment for each business.
   */
  const latestPaymentByBusiness = new Map<
    string,
    (typeof payments)[number]
  >();

  for (const payment of payments) {
    if (!latestPaymentByBusiness.has(payment.business_id)) {
      latestPaymentByBusiness.set(
        payment.business_id,
        payment
      );
    }
  }

  const totalBusinesses = businessList.length;

  const pendingBusinesses = businessList.filter(
    (business) => business.status === "pending"
  ).length;

  const activeBusinesses = businessList.filter(
    (business) =>
      business.status === "approved" &&
      business.onboarding_status === "complete"
  ).length;

  const suspendedBusinesses = businessList.filter(
    (business) => business.status === "suspended"
  ).length;

  const paidBusinesses = businessList.filter((business) => {
    const payment = latestPaymentByBusiness.get(
      business.id
    );

    return payment?.status === "success";
  }).length;

  const unpaidBusinesses = businessList.filter((business) => {
    const payment = latestPaymentByBusiness.get(
      business.id
    );

    return !payment || payment.status !== "success";
  }).length;

  return (
    <div className="space-y-8">
      {/* HEADER */}

      <div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#8B1E3F]"
        >
          <ArrowLeft size={17} />
          Back to Admin Dashboard
        </Link>

        <div className="mt-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#242424]">
            Business Management
          </h1>

          <p className="mt-2 text-gray-500">
            Review payments and manage businesses
            registered on the ADADI marketplace.
          </p>
        </div>
      </div>

      {/* STATS */}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* TOTAL */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <Building2 size={20} />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Total
              </p>

              <p className="text-2xl font-bold">
                {totalBusinesses}
              </p>
            </div>
          </div>
        </div>

        {/* PENDING */}

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock size={20} />
            </div>

            <div>
              <p className="text-sm text-amber-700">
                Pending
              </p>

              <p className="text-2xl font-bold text-amber-900">
                {pendingBusinesses}
              </p>
            </div>
          </div>
        </div>

        {/* PAID */}

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <CreditCard size={20} />
            </div>

            <div>
              <p className="text-sm text-blue-700">
                Paid
              </p>

              <p className="text-2xl font-bold text-blue-900">
                {paidBusinesses}
              </p>
            </div>
          </div>
        </div>

        {/* APPROVED */}

        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <CheckCircle size={20} />
            </div>

            <div>
              <p className="text-sm text-green-700">
                Approved
              </p>

              <p className="text-2xl font-bold text-green-900">
                {activeBusinesses}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT SUMMARY */}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle
              size={21}
              className="text-green-600"
            />

            <div>
              <p className="text-sm text-green-700">
                Successful Payments
              </p>

              <p className="mt-1 text-xl font-bold text-green-900">
                {paidBusinesses}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center gap-3">
            <CreditCard
              size={21}
              className="text-gray-500"
            />

            <div>
              <p className="text-sm text-gray-500">
                Unpaid Businesses
              </p>

              <p className="mt-1 text-xl font-bold text-gray-800">
                {unpaidBusinesses}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BUSINESSES TABLE */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="font-semibold text-[#242424]">
            Registered Businesses
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Businesses must pay before they can be
            approved.
          </p>
        </div>

        {businessList.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <Building2 size={25} />
            </div>

            <h3 className="mt-5 text-lg font-semibold">
              No businesses found
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              There are currently no registered
              businesses on ADADI.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Business
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Category
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Business Status
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Payment
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Onboarding
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Store
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {businessList.map((business) => {
                  const status =
                    business.status || "unknown";

                  const onboardingStatus =
                    business.onboarding_status ||
                    "incomplete";

                  const payment =
                    latestPaymentByBusiness.get(
                      business.id
                    );

                  const isApproved =
                    status === "approved";

                  const isPending =
                    status === "pending";

                  const isSuspended =
                    status === "suspended";

                  const isPaid =
                    payment?.status === "success";

                  return (
                    <tr
                      key={business.id}
                      className="transition hover:bg-gray-50"
                    >
                      {/* BUSINESS */}

                      <td className="px-6 py-5">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {business.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            ID: {business.id}
                          </p>
                        </div>
                      </td>

                      {/* CATEGORY */}

                      <td className="px-6 py-5">
                        <span className="text-sm text-gray-600">
                          {business.category ||
                            "Not specified"}
                        </span>
                      </td>

                      {/* BUSINESS STATUS */}

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            isApproved
                              ? "bg-green-100 text-green-700"
                              : isPending
                                ? "bg-amber-100 text-amber-700"
                                : isSuspended
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isApproved
                                ? "bg-green-500"
                                : isPending
                                  ? "bg-amber-500"
                                  : isSuspended
                                    ? "bg-red-500"
                                    : "bg-gray-400"
                            }`}
                          />

                          {isApproved
                            ? "Approved"
                            : isPending
                              ? "Pending"
                              : isSuspended
                                ? "Suspended"
                                : status}
                        </span>
                      </td>

                      {/* PAYMENT */}

                      <td className="px-6 py-5">
                        {!payment ? (
                          <div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                              <span className="h-2 w-2 rounded-full bg-gray-400" />
                              Unpaid
                            </span>

                            <p className="mt-1 text-xs text-gray-400">
                              No payment yet
                            </p>
                          </div>
                        ) : payment.status ===
                          "success" ? (
                          <div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              <span className="h-2 w-2 rounded-full bg-green-500" />
                              Paid
                            </span>

                            <p className="mt-1 text-xs text-gray-400">
                              ₦
                              {Number(
                                payment.amount
                              ).toLocaleString()}
                            </p>
                          </div>
                        ) : payment.status ===
                          "pending" ? (
                          <div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              <span className="h-2 w-2 rounded-full bg-amber-500" />
                              Payment Pending
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              <span className="h-2 w-2 rounded-full bg-red-500" />
                              Failed
                            </span>
                          </div>
                        )}
                      </td>

                      {/* ONBOARDING */}

                      <td className="px-6 py-5">
                        <span className="text-sm capitalize text-gray-600">
                          {onboardingStatus.replace(
                            /_/g,
                            " "
                          )}
                        </span>
                      </td>

                      {/* STORE */}

                      <td className="px-6 py-5">
                        <span
                          className={`text-sm font-medium ${
                            business.is_open
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          {business.is_open
                            ? "Open"
                            : "Closed"}
                        </span>
                      </td>

                      {/* ACTION */}

                      <td className="px-6 py-5">
                        <Link
                          href={`/admin/dashboard/businesses/${business.id}`}
                          className="text-sm font-semibold text-[#8B1E3F] transition hover:text-[#64152E] hover:underline"
                        >
                          View Details
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
    </div>
  );
}