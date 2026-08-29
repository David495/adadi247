"use client";

import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

type VerificationState =
  | "verifying"
  | "success"
  | "failed";

type VerificationResult = {
  success: boolean;
  error?: string;
  orderNumber?: string;
  businessId?: string;
  businessName?: string;
  reference?: string;
  type?: string;
};

export default function PaymentCallbackClient() {
  const searchParams = useSearchParams();

  const [status, setStatus] =
    useState<VerificationState>("verifying");

  const [message, setMessage] = useState(
    "Please wait while we confirm your payment."
  );

  const [orderNumber, setOrderNumber] =
    useState<string | null>(null);

  const [businessName, setBusinessName] =
    useState<string | null>(null);

  const [paymentType, setPaymentType] =
    useState<"order" | "business" | null>(null);

  useEffect(() => {
    const reference =
      searchParams.get("reference") ||
      searchParams.get("trxref");

    const type = searchParams.get("type");

    console.log("PAYSTACK CALLBACK PARAMS:", {
      reference,
      trxref: searchParams.get("trxref"),
      type,
    });

    if (!reference) {
      setStatus("failed");
      setMessage(
        "We could not find your payment reference."
      );
      return;
    }

    async function verifyOrderPayment() {
      try {
        const response = await fetch(
          "/api/paystack/order/verify",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reference,
            }),
          }
        );

        const data =
          (await response.json()) as VerificationResult;

        console.log(
          "ORDER PAYMENT VERIFICATION RESULT:",
          data
        );

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Payment verification failed."
          );
        }

        setPaymentType("order");

        setOrderNumber(
          data.orderNumber || null
        );

        setStatus("success");

        setMessage(
          "Your payment was successful and your order has been confirmed."
        );
      } catch (error) {
        console.error(
          "ORDER PAYMENT VERIFICATION ERROR:",
          error
        );

        setStatus("failed");

        setMessage(
          error instanceof Error
            ? error.message
            : "Payment verification failed. Please contact support if money was deducted from your account."
        );
      }
    }

    async function verifyBusinessPayment() {
      try {
        const response = await fetch(
          "/api/paystack/business/verify",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reference,
            }),
          }
        );

        const data =
          (await response.json()) as VerificationResult;

        console.log(
          "BUSINESS PAYMENT VERIFICATION RESULT:",
          data
        );

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Payment verification failed."
          );
        }

        setPaymentType("business");

        setBusinessName(
          data.businessName || null
        );

        setStatus("success");

        setMessage(
          "Your business registration payment was successful. Your ADADI business account has been confirmed."
        );
      } catch (error) {
        console.error(
          "BUSINESS PAYMENT VERIFICATION ERROR:",
          error
        );

        setStatus("failed");

        setMessage(
          error instanceof Error
            ? error.message
            : "Payment verification failed. Please contact support if money was deducted from your account."
        );
      }
    }

    if (type === "order") {
      verifyOrderPayment();
    } else if (type === "business") {
      verifyBusinessPayment();
    } else {
      verifyOrderPayment();
    }
  }, [searchParams]);

  if (status === "verifying") {
    return (
      <main className="min-h-screen bg-[#faf7f7]">
        <Navbar />

        <section className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#6b1224]/10">
              <Loader2 className="h-10 w-10 animate-spin text-[#6b1224]" />
            </div>

            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Verifying Your Payment
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              {message}
            </p>

            <p className="mt-6 text-xs text-gray-400">
              Please do not close this page.
            </p>
          </div>
        </section>

        <Footer />
      </main>
    );
  }

  if (status === "success") {
    const isBusinessPayment =
      paymentType === "business";

    return (
      <main className="min-h-screen bg-[#faf7f7]">
        <Navbar />

        <section className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-[#6b1224]">
              Payment Successful
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {isBusinessPayment
                ? "Welcome to ADADI!"
                : "Thank You for Your Order!"}
            </h1>

            <p className="mt-4 text-sm leading-6 text-gray-500">
              {message}
            </p>

            {isBusinessPayment &&
              businessName && (
                <div className="mt-6 rounded-2xl bg-[#faf7f7] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Business
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#6b1224]">
                    {businessName}
                  </p>
                </div>
              )}

            {!isBusinessPayment &&
              orderNumber && (
                <div className="mt-6 rounded-2xl bg-[#faf7f7] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Order Number
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#6b1224]">
                    {orderNumber}
                  </p>
                </div>
              )}

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href={
                  isBusinessPayment
                    ? "/dashboard/businesses"
                    : "/businesses"
                }
                className="flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3.5 text-sm font-semibold text-gray-700 transition hover:border-[#6b1224]/30 hover:bg-[#faf7f7]"
              >
                {isBusinessPayment
                  ? "Go to Dashboard"
                  : "Continue Shopping"}
              </Link>

              <Link
                href="/"
                className="flex items-center justify-center rounded-xl bg-[#6b1224] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#6b1224]/20 transition hover:bg-[#53101c]"
              >
                Back to ADADI
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f7]">
      <Navbar />

      <section className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-red-600">
            Verification Failed
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            We Couldn't Confirm Your Payment
          </h1>

          <p className="mt-4 text-sm leading-6 text-gray-500">
            {message}
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-sm font-semibold text-amber-800">
              Money was deducted?
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-700">
              If your bank account was charged,
              please do not pay again immediately.
              Contact ADADI support with your
              payment details so we can investigate
              and confirm your payment.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/checkout"
              className="flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3.5 text-sm font-semibold text-gray-700 transition hover:border-[#6b1224]/30 hover:bg-[#faf7f7]"
            >
              Back to Checkout
            </Link>

            <Link
              href="/businesses"
              className="flex items-center justify-center rounded-xl bg-[#6b1224] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#6b1224]/20 transition hover:bg-[#53101c]"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}