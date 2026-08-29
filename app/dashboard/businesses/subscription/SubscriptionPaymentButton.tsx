"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

export default function SubscriptionPaymentButton({
  businessId,
  subscriptionFee,
}: {
  businessId: string;
  subscriptionFee: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePayment() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to initialize payment."
        );
      }

      window.location.href = data.authorizationUrl;
    } catch (error) {
      console.error("SUBSCRIPTION PAYMENT ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );

      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading || subscriptionFee <= 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Redirecting to Paystack...
          </>
        ) : (
          <>
            <CreditCard size={18} />
            Pay ₦
            {new Intl.NumberFormat("en-NG").format(
              subscriptionFee
            )}
          </>
        )}
      </button>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}