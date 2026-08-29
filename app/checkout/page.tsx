"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
  User,
} from "lucide-react";
import { useCart } from "@/app/components/cart/CartProvider";

export default function CheckoutPage() {
  const { items, itemCount, subtotal } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<
    "delivery" | "pickup"
  >("delivery");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const businessId = items[0]?.businessId || "";
  const businessName = items[0]?.businessName || "";

  const hasMultipleBusinesses = useMemo(() => {
    if (items.length === 0) {
      return false;
    }

    const businessIds = new Set(items.map((item) => item.businessId));

    return businessIds.size > 1;
  }, [items]);

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#faf7f7]">
        <header className="sticky top-0 z-50 border-b border-[#5b1020]/20 bg-[#6b1224] text-white shadow-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-90"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#6b1224]">
                <Store className="h-5 w-5" />
              </div>

              <span className="text-xl font-bold tracking-tight">
                ADADI
              </span>
            </Link>

            <Link
              href="/businesses"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />

              <span className="hidden sm:inline">
                Back to Marketplace
              </span>

              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </header>

        <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#6b1224]/10">
              <ShoppingBag className="h-9 w-9 text-[#6b1224]" />
            </div>

            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Your cart is empty
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Add a product to your cart before proceeding to checkout.
            </p>

            <Link
              href="/businesses"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#6b1224] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#6b1224]/20 transition hover:bg-[#53101c]"
            >
              Explore Marketplace
            </Link>
          </div>
        </section>
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!businessId) {
      setError(
        "We could not identify the business for this order."
      );
      return;
    }

    if (hasMultipleBusinesses) {
      setError(
        "Your cart contains products from multiple businesses. Please checkout one business at a time."
      );
      return;
    }

    if (!customerName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (deliveryMethod === "delivery" && !address.trim()) {
      setError("Please enter your delivery address.");
      return;
    }

    try {
      setIsProcessing(true);

      const orderItems = items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }));

      const response = await fetch(
        "/api/paystack/order/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessId,
            items: orderItems,
            customerName: customerName.trim(),
            customerEmail: email.trim(),
            customerPhone: phone.trim(),
            deliveryMethod,
            deliveryAddress:
              deliveryMethod === "delivery"
                ? address.trim()
                : "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to initialize payment."
        );
      }

      if (!data.authorizationUrl) {
        throw new Error(
          "Paystack payment link was not returned."
        );
      }

      window.location.href = data.authorizationUrl;
    } catch (error) {
      console.error("CHECKOUT PAYMENT ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while starting your payment."
      );

      setIsProcessing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf7f7]">
      <header className="sticky top-0 z-50 border-b border-[#5b1020]/20 bg-[#6b1224] text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#6b1224]">
              <Store className="h-5 w-5" />
            </div>

            <span className="text-xl font-bold tracking-tight">
              ADADI
            </span>
          </Link>

          <div className="flex items-center gap-2 text-sm font-medium text-white/90">
            <CreditCard className="h-5 w-5" />

            <span className="hidden sm:inline">
              Secure Checkout
            </span>

            <span className="sm:hidden">Checkout</span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href="/cart"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#6b1224] transition hover:text-[#53101c]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </Link>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#6b1224]">
            Almost there
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Checkout
          </h1>

          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Enter your details to complete your order.
          </p>
        </div>

        {hasMultipleBusinesses && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Multiple businesses in your cart
                </h3>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  ADADI currently processes one business order at a
                  time. Please remove products from other businesses
                  before continuing to checkout.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                !
              </div>

              <div>
                <h3 className="text-sm font-bold text-red-900">
                  Unable to continue
                </h3>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <form
            id="checkout-form"
            onSubmit={handleSubmit}
            className="space-y-6 lg:col-span-2"
          >
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6b1224]/10">
                  <User className="h-5 w-5 text-[#6b1224]" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Customer Information
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Tell us how we can reach you.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="customerName"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Full Name
                  </label>

                  <input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(event.target.value)
                    }
                    placeholder="Enter your full name"
                    required
                    disabled={isProcessing}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#6b1224] focus:bg-white focus:ring-2 focus:ring-[#6b1224]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Phone Number
                  </label>

                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value)
                      }
                      placeholder="08012345678"
                      required
                      disabled={isProcessing}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#6b1224] focus:bg-white focus:ring-2 focus:ring-[#6b1224]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    required
                    disabled={isProcessing}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#6b1224] focus:bg-white focus:ring-2 focus:ring-[#6b1224]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6b1224]/10">
                  <MapPin className="h-5 w-5 text-[#6b1224]" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Order Fulfillment
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Choose how you'd like to receive your order.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    deliveryMethod === "delivery"
                      ? "border-[#6b1224] bg-[#6b1224]/5 ring-2 ring-[#6b1224]/10"
                      : "border-gray-200 bg-white hover:border-[#6b1224]/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="delivery"
                    checked={deliveryMethod === "delivery"}
                    onChange={() =>
                      setDeliveryMethod("delivery")
                    }
                    disabled={isProcessing}
                    className="sr-only"
                  />

                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                        deliveryMethod === "delivery"
                          ? "border-[#6b1224]"
                          : "border-gray-300"
                      }`}
                    >
                      {deliveryMethod === "delivery" && (
                        <div className="h-2.5 w-2.5 rounded-full bg-[#6b1224]" />
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">
                        Delivery
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Have your order delivered to your location.
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    deliveryMethod === "pickup"
                      ? "border-[#6b1224] bg-[#6b1224]/5 ring-2 ring-[#6b1224]/10"
                      : "border-gray-200 bg-white hover:border-[#6b1224]/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="pickup"
                    checked={deliveryMethod === "pickup"}
                    onChange={() =>
                      setDeliveryMethod("pickup")
                    }
                    disabled={isProcessing}
                    className="sr-only"
                  />

                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                        deliveryMethod === "pickup"
                          ? "border-[#6b1224]"
                          : "border-gray-300"
                      }`}
                    >
                      {deliveryMethod === "pickup" && (
                        <div className="h-2.5 w-2.5 rounded-full bg-[#6b1224]" />
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">
                        Pickup
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Pick up your order directly from the business.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {deliveryMethod === "delivery" && (
                <div className="mt-6">
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Delivery Address
                  </label>

                  <textarea
                    id="address"
                    value={address}
                    onChange={(event) =>
                      setAddress(event.target.value)
                    }
                    placeholder="Enter your full delivery address"
                    required
                    disabled={isProcessing}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#6b1224] focus:bg-white focus:ring-2 focus:ring-[#6b1224]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#6b1224]/10 bg-[#6b1224]/5 p-5">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-[#6b1224]" />

                <div>
                  <h3 className="text-sm font-semibold text-[#6b1224]">
                    Secure Online Payment
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#6b1224]/70">
                    After submitting your order details, you'll be
                    securely redirected to Paystack to complete your
                    payment.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || hasMultipleBusinesses}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6b1224] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#6b1224]/20 transition hover:bg-[#53101c] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none lg:hidden"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting to Paystack...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Continue to Payment
                </>
              )}
            </button>
          </form>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Your Order
                </h2>

                <span className="rounded-full bg-[#6b1224]/10 px-3 py-1 text-xs font-semibold text-[#6b1224]">
                  {itemCount}{" "}
                  {itemCount === 1 ? "Item" : "Items"}
                </span>
              </div>

              <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#faf7f7] p-3">
                <Store className="h-4 w-4 text-[#6b1224]" />

                <span className="text-sm font-semibold text-gray-700">
                  {businessName}
                </span>
              </div>

              <div className="mt-6 space-y-5">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f3eeee]">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                        {item.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {item.quantity} × ₦
                        {item.price.toLocaleString("en-US")}
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-gray-900">
                      ₦
                      {(
                        item.price * item.quantity
                      ).toLocaleString("en-US")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="my-6 h-px bg-gray-200" />

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>

                <span className="font-semibold text-gray-900">
                  ₦{subtotal.toLocaleString("en-US")}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-500">Delivery</span>

                <span className="font-medium text-gray-500">
                  Calculated later
                </span>
              </div>

              <div className="my-6 h-px bg-gray-200" />

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">
                  Total
                </span>

                <span className="text-2xl font-bold text-[#6b1224]">
                  ₦{subtotal.toLocaleString("en-US")}
                </span>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isProcessing || hasMultipleBusinesses}
                className="mt-6 hidden w-full items-center justify-center gap-2 rounded-xl bg-[#6b1224] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-[#6b1224]/20 transition hover:bg-[#53101c] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none lg:flex"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Connecting to Paystack...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Pay ₦{subtotal.toLocaleString("en-US")}
                  </>
                )}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-gray-400">
                By continuing, you agree to complete your purchase
                through ADADI's secure payment process.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <footer className="border-t border-[#6b1224]/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div>
            <p className="font-bold text-[#6b1224]">ADADI</p>

            <p className="mt-1 text-sm text-gray-500">
              Discover and shop from local businesses.
            </p>
          </div>

          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} ADADI. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}