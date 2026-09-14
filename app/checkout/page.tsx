"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  MapPin,
  ShoppingBag,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import Navbar from "../components/layout/Navbar";
import { useCart } from "../components/cart/CartProvider";

const FIXED_FEE = 100;
const FIXED_FEE_THRESHOLD = 2500;

function calculateCustomerFixedFee(
  subtotal: number
) {
  if (
    !Number.isFinite(subtotal) ||
    subtotal <= 0
  ) {
    return 0;
  }

  return subtotal >= FIXED_FEE_THRESHOLD
    ? FIXED_FEE
    : 0;
}

export default function CheckoutPage() {
  const { items } = useCart();

  const [customerName, setCustomerName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [deliveryMethod, setDeliveryMethod] =
    useState<"delivery" | "pickup">(
      "delivery"
    );

  const [deliveryFee, setDeliveryFee] =
    useState(0);

  const [
    isLoadingDeliveryFee,
    setIsLoadingDeliveryFee,
  ] = useState(true);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const businessId =
    items[0]?.businessId || "";

  const businessName =
    items[0]?.businessName || "";

  const hasMultipleBusinesses =
    new Set(
      items.map(
        (item) => item.businessId
      )
    ).size > 1;

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.price) *
        item.quantity,
    0
  );

  const roundedSubtotal =
    Math.round(subtotal * 100) / 100;

  const currentDeliveryFee =
    deliveryMethod === "delivery"
      ? deliveryFee
      : 0;

  const fixedFee =
    calculateCustomerFixedFee(
      roundedSubtotal
    );

  const total =
    Math.round(
      (
        roundedSubtotal +
        fixedFee +
        currentDeliveryFee
      ) * 100
    ) / 100;

  useEffect(() => {
    let cancelled = false;

    async function loadPaymentSettings() {
      try {
        setIsLoadingDeliveryFee(true);

        const response = await fetch(
          "/api/paystack/order/initialize",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.error ||
              "Unable to load delivery fee."
          );
        }

        if (!cancelled) {
          const configuredDeliveryFee =
            Number(data.deliveryFee);

          if (
            !Number.isFinite(
              configuredDeliveryFee
            ) ||
            configuredDeliveryFee < 0
          ) {
            throw new Error(
              "Invalid delivery fee configuration."
            );
          }

          setDeliveryFee(
            configuredDeliveryFee
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load checkout settings."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDeliveryFee(
            false
          );
        }
      }
    }

    loadPaymentSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatCurrency = (
    amount: number
  ) =>
    `₦${amount.toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (isProcessing) {
      return;
    }

    setError("");

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!businessId) {
      setError(
        "We could not determine the business for this order."
      );
      return;
    }

    if (hasMultipleBusinesses) {
      setError(
        "Please checkout with products from one business at a time."
      );
      return;
    }

    if (!customerName.trim()) {
      setError(
        "Please enter your full name."
      );
      return;
    }

    if (!phone.trim()) {
      setError(
        "Please enter your phone number."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (
      deliveryMethod === "delivery" &&
      !address.trim()
    ) {
      setError(
        "Please enter your delivery address."
      );
      return;
    }

    if (isLoadingDeliveryFee) {
      setError(
        "Please wait while checkout settings load."
      );
      return;
    }

    try {
      setIsProcessing(true);

      const response = await fetch(
        "/api/paystack/order/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            businessId,
            items: items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
            })),
            customerName:
              customerName.trim(),
            customerEmail:
              email.trim(),
            customerPhone:
              phone.trim(),
            deliveryMethod,
            deliveryAddress:
              deliveryMethod ===
              "delivery"
                ? address.trim()
                : "",
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success ||
        !data?.authorizationUrl
      ) {
        throw new Error(
          data?.error ||
            "Unable to initialize payment."
        );
      }

      window.location.href =
        data.authorizationUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while starting payment."
      );

      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-[#FAF8F6] px-4 py-10">
          <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#8B1E3F]/10">
              <ShoppingBag className="h-8 w-8 text-[#8B1E3F]" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              Your cart is empty
            </h1>

            <p className="mt-2 max-w-md text-sm text-gray-600">
              Add products to your cart
              before proceeding to
              checkout.
            </p>

            <Link
              href="/businesses"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#64152E]"
            >
              Browse businesses
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FAF8F6] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/cart"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#8B1E3F] hover:text-[#64152E]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to cart
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Checkout
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Complete your details to
              place your order with{" "}
              <span className="font-semibold text-gray-900">
                {businessName}
              </span>
              .
            </p>
          </div>

          {hasMultipleBusinesses && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Your cart contains products
              from multiple businesses.
              Please checkout one
              business at a time.
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="grid gap-6 lg:grid-cols-[1fr_380px]"
          >
            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-gray-900">
                  Customer details
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="customerName"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Full name
                    </label>

                    <input
                      id="customerName"
                      type="text"
                      value={customerName}
                      onChange={(event) =>
                        setCustomerName(
                          event.target.value
                        )
                      }
                      disabled={isProcessing}
                      placeholder="Enter your full name"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10 disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Phone number
                    </label>

                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(
                          event.target.value
                        )
                      }
                      disabled={isProcessing}
                      placeholder="080..."
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10 disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Email address
                    </label>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      disabled={isProcessing}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-gray-900">
                  Delivery method
                </h2>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryMethod(
                        "delivery"
                      )
                    }
                    disabled={isProcessing}
                    className={`rounded-xl border p-4 text-left transition ${
                      deliveryMethod ===
                      "delivery"
                        ? "border-[#8B1E3F] bg-[#8B1E3F]/5 ring-2 ring-[#8B1E3F]/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin
                        className={`h-5 w-5 ${
                          deliveryMethod ===
                          "delivery"
                            ? "text-[#8B1E3F]"
                            : "text-gray-500"
                        }`}
                      />

                      <div>
                        <p className="font-semibold text-gray-900">
                          Delivery
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Get your order
                          delivered
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryMethod(
                        "pickup"
                      )
                    }
                    disabled={isProcessing}
                    className={`rounded-xl border p-4 text-left transition ${
                      deliveryMethod ===
                      "pickup"
                        ? "border-[#8B1E3F] bg-[#8B1E3F]/5 ring-2 ring-[#8B1E3F]/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag
                        className={`h-5 w-5 ${
                          deliveryMethod ===
                          "pickup"
                            ? "text-[#8B1E3F]"
                            : "text-gray-500"
                        }`}
                      />

                      <div>
                        <p className="font-semibold text-gray-900">
                          Pickup
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Pick up from the
                          business
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {deliveryMethod ===
                  "delivery" && (
                  <div className="mt-5">
                    <label
                      htmlFor="address"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Delivery address
                    </label>

                    <textarea
                      id="address"
                      value={address}
                      onChange={(event) =>
                        setAddress(
                          event.target.value
                        )
                      }
                      disabled={isProcessing}
                      rows={4}
                      placeholder="Enter the address where you want your order delivered"
                      className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10 disabled:bg-gray-100"
                    />
                  </div>
                )}
              </section>
            </div>

            <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
              <h2 className="text-lg font-bold text-gray-900">
                Order summary
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-600">
                    Subtotal
                  </span>

                  <span className="font-medium text-gray-900">
                    {formatCurrency(
                      roundedSubtotal
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-600">
                    Delivery
                  </span>

                  <span className="font-medium text-gray-900">
                    {isLoadingDeliveryFee ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    ) : currentDeliveryFee >
                      0 ? (
                      formatCurrency(
                        currentDeliveryFee
                      )
                    ) : (
                      "Free"
                    )}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">
                      Flat fee
                    </span>

                    <p className="mt-1 max-w-[210px] text-xs leading-5 text-gray-400">
                      ₦100 applies only when
                      the product subtotal
                      is ₦2,500 or more.
                    </p>
                  </div>

                  <span className="whitespace-nowrap font-medium text-gray-900">
                    {formatCurrency(
                      fixedFee
                    )}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-gray-900">
                      Total
                    </span>

                    <span className="text-xl font-bold text-[#8B1E3F]">
                      {formatCurrency(
                        total
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500">
                Your payment is securely
                processed by Paystack.
                There is no flat fee below
                ₦2,500. A ₦100 flat fee
                applies from ₦2,500.
              </div>

              <button
                type="submit"
                disabled={
                  isProcessing ||
                  isLoadingDeliveryFee ||
                  hasMultipleBusinesses
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Redirecting to Paystack...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Pay{" "}
                    {formatCurrency(total)}
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-xs text-gray-400">
                You will be redirected to
                Paystack to complete your
                payment.
              </p>
            </aside>
          </form>
        </div>
      </main>
    </>
  );
}