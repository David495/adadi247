"use client";

import { useState } from "react";
import { registerBusiness } from "./action";

export default function BusinessRegistrationPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData(e.currentTarget);

      const email = formData.get("email");

      if (typeof email !== "string" || !email.trim()) {
        setError("Please provide a valid email address.");
        return;
      }

      console.log(
        "STARTING BUSINESS REGISTRATION..."
      );

      const result = await registerBusiness(formData);

      console.log(
        "REGISTRATION RESULT:",
        result
      );

      if (!result.success) {
        setError(
          result.error || "Registration failed."
        );
        return;
      }

      if (!result.businessId) {
        setError(
          "Business was created, but no business ID was returned."
        );
        return;
      }

      console.log(
        "BUSINESS CREATED:",
        result.businessId
      );

      setSuccess(
        "Business created successfully. Preparing payment..."
      );

      console.log(
        "INITIALIZING PAYSTACK PAYMENT..."
      );

      const paymentResponse = await fetch(
        "/api/paystack/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessId: result.businessId,
          }),
        }
      );

      const paymentResult =
        await paymentResponse.json();

      console.log(
        "PAYSTACK INITIALIZATION RESULT:",
        paymentResult
      );

      if (
        !paymentResponse.ok ||
        !paymentResult.success
      ) {
        setError(
          paymentResult.error ||
            "Unable to initialize payment."
        );
        setSuccess("");
        return;
      }

      if (!paymentResult.authorizationUrl) {
        setError(
          "Paystack did not return a payment URL."
        );
        setSuccess("");
        return;
      }

      console.log(
        "REDIRECTING TO PAYSTACK..."
      );

      window.location.assign(
        paymentResult.authorizationUrl
      );
    } catch (error) {
      console.error(
        "REGISTRATION/PAYMENT ERROR:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );

      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#faf7f8] p-6">
      <div className="w-full max-w-lg rounded-2xl border border-[#ead6dd] bg-white p-8 shadow-lg">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            ADADI Business Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Register Your Business
          </h1>

          <p className="mt-2 text-gray-600">
            Join ADADI and create your digital storefront.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-[#d9aebe] bg-[#f7e9ee] p-4 text-sm text-[#64152E]">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="ownerName"
              className="mb-2 block font-medium text-gray-800"
            >
              Your Full Name
            </label>

            <input
              id="ownerName"
              type="text"
              name="ownerName"
              required
              disabled={loading}
              placeholder="Enter your full name"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-medium text-gray-800"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              required
              disabled={loading}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block font-medium text-gray-800"
            >
              Phone Number
            </label>

            <input
              id="phone"
              type="tel"
              name="phone"
              required
              disabled={loading}
              placeholder="08012345678"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-medium text-gray-800"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              required
              minLength={6}
              disabled={loading}
              placeholder="Create a password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
            />

            <p className="mt-2 text-sm text-gray-500">
              Password must be at least 6 characters.
            </p>
          </div>

          <div>
            <label
              htmlFor="businessName"
              className="mb-2 block font-medium text-gray-800"
            >
              Business Name
            </label>

            <input
              id="businessName"
              type="text"
              name="businessName"
              required
              disabled={loading}
              placeholder="e.g. Mama's Kitchen"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-2 block font-medium text-gray-800"
            >
              Business Category
            </label>

            <select
              id="category"
              name="category"
              required
              defaultValue=""
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
            >
              <option value="" disabled>
                Select a category
              </option>

              <option value="restaurants">
                Restaurant
              </option>

              <option value="barbers">
                Barber
              </option>

              <option value="fashion">
                Fashion
              </option>

              <option value="accommodation">
                Accommodation
              </option>

              <option value="electronics">
                Electronics
              </option>

              <option value="laundry">
                Laundry
              </option>

              <option value="beauty">
                Beauty
              </option>

              <option value="other-services">
                Other Services
              </option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B1E3F] py-3 font-semibold text-white transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span
                  className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden="true"
                />

                <span>
                  Creating Account & Preparing Payment...
                </span>
              </>
            ) : (
              "Continue to Payment"
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-[#ead6dd] pt-6 text-center">
          <p className="text-gray-600">
            Already have a business account?
          </p>

          <a
            href="/business-login"
            className="mt-2 inline-block font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
          >
            Business Owner Login
          </a>
        </div>
      </div>
    </main>
  );
}