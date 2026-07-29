import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  Mail,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Store,
  User,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";
import OrderStatusActions from "./orderStatusAction";

type Business = {
  id: string;
  name: string;
  slug: string;
};

type Order = {
  id: string;
  order_number: string;
  business_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  subtotal: number | null;
  delivery_fee: number | null;
  total: number | null;
  total_amount: number | null;
  payment_status: string | null;
  order_status: string | null;
  status: string | null;
  delivery_method: string | null;
  delivery_address: string | null;
  created_at: string | null;
  paystack_reference: string | null;
};

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
};

type PageProps = {
  params: Promise<{
    orderID: string;
  }>;
};

export default async function BusinessOrderDetailsPage({
  params,
}: PageProps) {
  // =========================================
  // 1. GET ORDER ID
  // =========================================

  const { orderID } = await params;

  // =========================================
  // 2. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 3. GET CURRENT USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // =========================================
  // 4. AUTHENTICATION CHECK
  // =========================================

  if (userError || !user) {
    console.error(
      "ORDER DETAILS - AUTH ERROR:",
      userError
        ? {
            message: userError.message,
            name: userError.name,
          }
        : "No authenticated user"
    );

    return (
      <main className="min-h-screen bg-[#faf7f7]">
        <section className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Authentication Required
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Please log in to view this order.
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

  // =========================================
  // 5. VALIDATE ORDER ID
  // =========================================

  if (!orderID) {
    return (
      <main className="min-h-screen bg-[#faf7f7]">
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="font-bold text-red-800">
              Invalid Order
            </h1>

            <p className="mt-2 text-sm text-red-700">
              No order ID was provided.
            </p>
          </div>
        </section>
      </main>
    );
  }

  // =========================================
  // 6. FETCH ORDER
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
        business_id,
        customer_id,
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
        delivery_address,
        created_at,
        paystack_reference
      `
    )
    .eq("id", orderID)
    .maybeSingle();

  if (orderError) {
    console.error(
      "ORDER DETAILS - ORDER FETCH ERROR:",
      {
        message: orderError.message,
        code: orderError.code,
        details: orderError.details,
        hint: orderError.hint,
      }
    );
  }

  // =========================================
  // 7. ORDER NOT FOUND
  // =========================================

  if (orderError || !order) {
    return (
      <main className="min-h-screen bg-[#faf7f7]">
        <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
              <ShoppingBag className="h-7 w-7 text-red-600" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Order Not Found
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              We could not find this order. It may have been
              deleted or the order ID may be incorrect.
            </p>

            <Link
              href="/dashboard/businesses/orders"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6b1224] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#53101c]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // =========================================
  // 8. VERIFY BUSINESS OWNERSHIP
  // =========================================

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("id", order.business_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (businessError) {
    console.error(
      "ORDER DETAILS - BUSINESS FETCH ERROR:",
      {
        message: businessError.message,
        code: businessError.code,
        details: businessError.details,
        hint: businessError.hint,
      }
    );
  }

  if (businessError || !business) {
    return (
      <main className="min-h-screen bg-[#faf7f7]">
        <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
              <Store className="h-7 w-7 text-red-600" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Access Denied
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              You are not authorized to view this order.
            </p>

            <Link
              href="/dashboard/businesses/orders"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6b1224] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#53101c]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // =========================================
  // 9. FETCH ORDER ITEMS
  //
  // IMPORTANT:
  // total_price DOES NOT EXIST in your
  // order_items table.
  //
  // We only fetch columns that exist:
  // id
  // product_id
  // product_name
  // quantity
  // unit_price
  // =========================================

  let orderItems: OrderItem[] = [];

  const {
    data: items,
    error: itemsError,
  } = await supabase
    .from("order_items")
    .select(
      `
        id,
        product_id,
        product_name,
        quantity,
        unit_price
      `
    )
    .eq("order_id", order.id)
    .order("id", {
      ascending: true,
    });

  if (itemsError) {
    console.error(
      "ORDER DETAILS - ORDER ITEMS FETCH ERROR:",
      {
        message: itemsError.message,
        code: itemsError.code,
        details: itemsError.details,
        hint: itemsError.hint,
        orderId: order.id,
      }
    );
  } else {
    orderItems = (items as OrderItem[]) || [];
  }

  // =========================================
  // 10. FORMAT HELPERS
  // =========================================

  function formatStatus(
    status: string | null
  ) {
    if (!status) {
      return "Pending";
    }

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      );
  }

  function getPaymentStatusClass(
    status: string | null
  ) {
    const normalized =
      status?.toLowerCase();

    if (normalized === "paid") {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "failed" ||
      normalized === "cancelled"
    ) {
      return "bg-red-100 text-red-700";
    }

    return "bg-amber-100 text-amber-700";
  }

  function getOrderStatusClass(
    status: string | null
  ) {
    const normalized =
      status?.toLowerCase();

    if (normalized === "completed") {
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
      normalized === "ready"
    ) {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-amber-100 text-amber-700";
  }

  // =========================================
  // 11. CALCULATE ORDER TOTAL
  // =========================================

  const orderTotal =
    order.total ??
    order.total_amount ??
    0;

  // =========================================
  // 12. RENDER PAGE
  // =========================================

  return (
    <main className="min-h-screen bg-[#faf7f7]">
      {/* =========================================
          MAIN
      ========================================= */}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* BACK */}

        <Link
          href="/dashboard/businesses/orders"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6b1224] transition hover:text-[#53101c]"
        >
          <ArrowLeft className="h-4 w-4" />

          Back to Orders
        </Link>

        {/* PAGE HEADER */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#6b1224]">
              {business.name}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Order Details
            </h1>

            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              Order #{order.order_number}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${getPaymentStatusClass(
                order.payment_status
              )}`}
            >
              Payment:{" "}
              {formatStatus(
                order.payment_status
              )}
            </span>

            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${getOrderStatusClass(
                order.order_status ||
                  order.status
              )}`}
            >
              Order:{" "}
              {formatStatus(
                order.order_status ||
                  order.status
              )}
            </span>
          </div>
        </div>

        {/* =========================================
            STATUS ACTIONS
        ========================================= */}

        <div className="mt-8">
          <OrderStatusActions
            orderId={order.id}
            currentStatus={
              order.order_status ||
              order.status
            }
            paymentStatus={
              order.payment_status
            }
          />
        </div>

        {/* =========================================
            ORDER INFORMATION
        ========================================= */}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* CUSTOMER */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6b1224]/10">
                <User className="h-5 w-5 text-[#6b1224]" />
              </div>

              <h2 className="font-bold text-gray-900">
                Customer
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Name
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {order.customer_name ||
                    "Customer"}
                </p>
              </div>

              {order.customer_email && (
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-gray-400" />

                  <div>
                    <p className="text-xs text-gray-400">
                      Email
                    </p>

                    <p className="mt-1 break-all text-sm text-gray-700">
                      {order.customer_email}
                    </p>
                  </div>
                </div>
              )}

              {order.customer_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-gray-400" />

                  <div>
                    <p className="text-xs text-gray-400">
                      Phone
                    </p>

                    <p className="mt-1 text-sm text-gray-700">
                      {order.customer_phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DELIVERY */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6b1224]/10">
                <MapPin className="h-5 w-5 text-[#6b1224]" />
              </div>

              <h2 className="font-bold text-gray-900">
                Fulfillment
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Delivery Method
                </p>

                <p className="mt-1 font-medium capitalize text-gray-900">
                  {order.delivery_method ||
                    "Not specified"}
                </p>
              </div>

              {order.delivery_address && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Delivery Address
                  </p>

                  <p className="mt-1 text-sm leading-6 text-gray-700">
                    {order.delivery_address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ORDER META */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6b1224]/10">
                <Clock3 className="h-5 w-5 text-[#6b1224]" />
              </div>

              <h2 className="font-bold text-gray-900">
                Order Information
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Order Number
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {order.order_number}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Date
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {order.created_at
                    ? new Date(
                        order.created_at
                      ).toLocaleString(
                        "en-US"
                      )
                    : "Date unavailable"}
                </p>
              </div>

              {order.paystack_reference && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Payment Reference
                  </p>

                  <p className="mt-1 break-all text-xs text-gray-600">
                    {order.paystack_reference}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================
            ITEMS
        ========================================= */}

        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-[#6b1224]" />

              <h2 className="text-xl font-bold text-gray-900">
                Order Items
              </h2>
            </div>
          </div>

          {orderItems.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-gray-300" />

              <p className="mt-3 text-sm text-gray-500">
                No order items found.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orderItems.map((item) => {
                const quantity =
                  Number(item.quantity ?? 0);

                const unitPrice =
                  Number(item.unit_price ?? 0);

                const itemTotal =
                  unitPrice * quantity;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-5 px-6 py-5"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {item.product_name ||
                          "Product"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Quantity:{" "}
                        {quantity}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-bold text-[#6b1224]">
                        ₦
                        {itemTotal.toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        ₦
                        {unitPrice.toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}{" "}
                        each
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TOTALS */}

          <div className="border-t border-gray-200 bg-[#faf7f7] px-6 py-5">
            <div className="ml-auto max-w-sm space-y-3">
              {order.subtotal !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Subtotal
                  </span>

                  <span className="font-medium text-gray-900">
                    ₦
                    {Number(
                      order.subtotal
                    ).toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
              )}

              {order.delivery_fee !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Delivery Fee
                  </span>

                  <span className="font-medium text-gray-900">
                    ₦
                    {Number(
                      order.delivery_fee
                    ).toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                <span className="font-bold text-gray-900">
                  Total
                </span>

                <span className="text-xl font-bold text-[#6b1224]">
                  ₦
                  {Number(
                    orderTotal
                  ).toLocaleString(
                    "en-US",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          FOOTER
      ========================================= */}

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