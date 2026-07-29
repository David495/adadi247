import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle,
  CreditCard,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  User,
  XCircle,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";
import OrderStatusControl from "./OrderStatusControl";

type AdminOrderDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminOrderDetailsPage({
  params,
}: AdminOrderDetailsPageProps) {
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
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    redirect("/customer/dashboard");
  }

  if (!id) {
    notFound();
  }

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(
      `
        id,
        customer_id,
        business_id,
        order_number,
        total_amount,
        status,
        delivery_address,
        customer_phone,
        created_at,
        updated_at,
        customer_name,
        customer_email,
        delivery_method,
        subtotal,
        delivery_fee,
        total,
        payment_status,
        order_status,
        paystack_reference,
        businesses (
          id,
          name,
          slug,
          phone,
          address,
          logo_url
        )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (orderError) {
    console.error(
      "ADMIN ORDER DETAILS ERROR:",
      orderError
    );

    throw new Error(
      "Unable to load this order."
    );
  }

  if (!order) {
    notFound();
  }

  const {
    data: orderItems,
    error: orderItemsError,
  } = await supabase
    .from("order_items")
    .select(
      `
        id,
        order_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        subtotal
      `
    )
    .eq("order_id", order.id)
    .order("id", {
      ascending: true,
    });

  if (orderItemsError) {
    console.error(
      "ADMIN ORDER ITEMS ERROR:",
      orderItemsError
    );
  }

  const business = Array.isArray(
    order.businesses
  )
    ? order.businesses[0]
    : order.businesses;

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
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  const paymentStatus =
    order.payment_status || "pending";

  const orderStatus =
    order.order_status ||
    order.status ||
    "pending";

  const isPaid =
    paymentStatus === "paid";

  const isCancelled =
    orderStatus === "cancelled";

  const isCompleted =
    orderStatus === "completed";

  return (
    <main className="min-h-screen">
      <Link
        href="/admin/orders"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
      >
        <ArrowLeft size={17} />
        Back to Orders
      </Link>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Order Details
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#242424]">
            {order.order_number}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Created{" "}
            {formatDateTime(
              order.created_at
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold capitalize ${
              isPaid
                ? "bg-green-100 text-green-700"
                : paymentStatus === "failed"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {isPaid ? (
              <CheckCircle size={17} />
            ) : paymentStatus === "failed" ? (
              <XCircle size={17} />
            ) : (
              <CreditCard size={17} />
            )}

            Payment: {paymentStatus}
          </span>

          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold capitalize ${
              isCompleted
                ? "bg-green-100 text-green-700"
                : isCancelled
                ? "bg-red-100 text-red-700"
                : orderStatus === "processing"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {isCompleted ? (
              <CheckCircle size={17} />
            ) : isCancelled ? (
              <XCircle size={17} />
            ) : (
              <ShoppingBag size={17} />
            )}

            Order: {orderStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm">
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                  <Package size={21} />
                </div>

                <div>
                  <h2 className="font-bold text-[#242424]">
                    Order Items
                  </h2>

                  <p className="text-sm text-gray-500">
                    {orderItems?.length || 0}{" "}
                    {orderItems?.length === 1
                      ? "item"
                      : "items"}
                  </p>
                </div>
              </div>
            </div>

            {orderItemsError ? (
              <div className="p-6 text-sm text-red-600">
                Unable to load order items.
              </div>
            ) : !orderItems ||
              orderItems.length === 0 ? (
              <div className="p-10 text-center">
                <Package
                  size={32}
                  className="mx-auto text-gray-300"
                />

                <p className="mt-3 text-sm text-gray-500">
                  No items found for this order.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orderItems.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 p-6"
                    >
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[#242424]">
                          {item.product_name}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          Quantity:{" "}
                          {item.quantity}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          Unit price:{" "}
                          {formatCurrency(
                            item.unit_price
                          )}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-bold text-[#242424]">
                          {formatCurrency(
                            item.subtotal
                          )}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="border-t border-gray-200 bg-[#FCF7F9] p-6">
              <div className="ml-auto max-w-sm space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Subtotal
                  </span>

                  <span className="font-medium text-[#242424]">
                    {formatCurrency(
                      order.subtotal ??
                        order.total_amount
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Delivery Fee
                  </span>

                  <span className="font-medium text-[#242424]">
                    {formatCurrency(
                      order.delivery_fee
                    )}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-[#242424]">
                      Total
                    </span>

                    <span className="text-xl font-bold text-[#8B1E3F]">
                      {formatCurrency(
                        order.total ??
                          order.total_amount
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <User size={21} />
              </div>

              <h2 className="font-bold text-[#242424]">
                Customer Information
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Name
                </p>

                <p className="mt-2 font-medium text-[#242424]">
                  {order.customer_name ||
                    "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Email
                </p>

                <p className="mt-2 break-all font-medium text-[#242424]">
                  {order.customer_email ||
                    "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Phone
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <Phone
                    size={15}
                    className="text-gray-400"
                  />

                  <span className="font-medium text-[#242424]">
                    {order.customer_phone ||
                      "Not provided"}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Customer ID
                </p>

                <p className="mt-2 break-all text-sm text-gray-500">
                  {order.customer_id ||
                    "Guest customer"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <MapPin size={21} />
              </div>

              <h2 className="font-bold text-[#242424]">
                Delivery Information
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Delivery Method
                </p>

                <p className="mt-2 font-medium capitalize text-[#242424]">
                  {order.delivery_method ||
                    "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Delivery Address
                </p>

                <p className="mt-2 whitespace-pre-wrap text-[#242424]">
                  {order.delivery_address ||
                    "No delivery address provided"}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <OrderStatusControl
            orderId={order.id}
            currentStatus={
              order.order_status ||
              order.status ||
              "pending"
            }
          />

          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <Building2 size={21} />
              </div>

              <h2 className="font-bold text-[#242424]">
                Business
              </h2>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                {business?.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={
                      business.name ||
                      "Business logo"
                    }
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] font-bold text-[#8B1E3F]">
                    {business?.name
                      ?.charAt(0)
                      .toUpperCase() ||
                      "B"}
                  </div>
                )}

                <div>
                  <p className="font-bold text-[#242424]">
                    {business?.name ||
                      "Unknown Business"}
                  </p>

                  {business?.slug && (
                    <Link
                      href={`/businesses/${business.slug}`}
                      target="_blank"
                      className="mt-1 inline-block text-sm font-medium text-[#8B1E3F] hover:underline"
                    >
                      View business
                    </Link>
                  )}
                </div>
              </div>

              {business?.phone && (
                <div className="mt-5 flex items-start gap-3">
                  <Phone
                    size={17}
                    className="mt-0.5 text-gray-400"
                  />

                  <span className="text-sm text-gray-600">
                    {business.phone}
                  </span>
                </div>
              )}

              {business?.address && (
                <div className="mt-4 flex items-start gap-3">
                  <MapPin
                    size={17}
                    className="mt-0.5 text-gray-400"
                  />

                  <span className="text-sm text-gray-600">
                    {business.address}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <CreditCard size={21} />
              </div>

              <h2 className="font-bold text-[#242424]">
                Payment Information
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Payment Status
                </p>

                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    isPaid
                      ? "bg-green-100 text-green-700"
                      : paymentStatus ===
                        "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {paymentStatus}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Paystack Reference
                </p>

                <p className="mt-2 break-all text-sm font-medium text-[#242424]">
                  {order.paystack_reference ||
                    "No payment reference"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <CalendarDays size={21} />
              </div>

              <h2 className="font-bold text-[#242424]">
                Order Timeline
              </h2>
            </div>

            <div className="mt-6 space-y-6">
              <div className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#8B1E3F]" />

                <div>
                  <p className="text-sm font-semibold text-[#242424]">
                    Order Created
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatDateTime(
                      order.created_at
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    isPaid
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                />

                <div>
                  <p className="text-sm font-semibold text-[#242424]">
                    Payment{" "}
                    {isPaid
                      ? "Completed"
                      : "Pending"}
                  </p>

                  <p className="mt-1 text-xs capitalize text-gray-500">
                    {paymentStatus}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    isCompleted
                      ? "bg-green-500"
                      : isCancelled
                      ? "bg-red-500"
                      : "bg-gray-300"
                  }`}
                />

                <div>
                  <p className="text-sm font-semibold text-[#242424]">
                    Order Status
                  </p>

                  <p className="mt-1 text-xs capitalize text-gray-500">
                    {orderStatus}
                  </p>
                </div>
              </div>

              {order.updated_at && (
                <div className="flex gap-3">
                  <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />

                  <div>
                    <p className="text-sm font-semibold text-[#242424]">
                      Last Updated
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatDateTime(
                        order.updated_at
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}