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
      // =========================================
      // 1. GET FORM DATA
      // =========================================

      const formData = new FormData(e.currentTarget);

      const email = formData.get("email");

      if (typeof email !== "string" || !email) {
        setError("Please provide a valid email address.");
        return;
      }

      // =========================================
      // 2. CREATE AUTH USER, PROFILE & BUSINESS
      // =========================================

      console.log(
        "STARTING BUSINESS REGISTRATION..."
      );

      const result = await registerBusiness(formData);

      console.log(
        "REGISTRATION RESULT:",
        result
      );

      // =========================================
      // 3. HANDLE REGISTRATION ERROR
      // =========================================

      if (!result.success) {
        setError(
          result.error ||
            "Registration failed."
        );

        return;
      }

      // =========================================
      // 4. CHECK BUSINESS ID
      // =========================================

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

      // =========================================
      // 5. SHOW PAYMENT MESSAGE
      // =========================================

      setSuccess(
        "Business created successfully. Preparing payment..."
      );

      // =========================================
      // 6. INITIALIZE PAYSTACK PAYMENT
      // =========================================

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
            email,
            businessId: result.businessId,
          }),
        }
      );

      // =========================================
      // 7. READ PAYSTACK RESPONSE
      // =========================================

      const paymentResult =
        await paymentResponse.json();

      console.log(
        "PAYSTACK INITIALIZATION RESULT:",
        paymentResult
      );

      // =========================================
      // 8. HANDLE PAYSTACK ERROR
      // =========================================

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

      // =========================================
      // 9. CHECK PAYMENT URL
      // =========================================

      if (
        !paymentResult.authorizationUrl
      ) {
        setError(
          "Paystack did not return a payment URL."
        );

        setSuccess("");

        return;
      }

      // =========================================
      // 10. REDIRECT TO PAYSTACK
      // =========================================

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

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-[#ead6dd] p-8">

        {/* =========================================
            HEADER
        ========================================= */}

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

        {/* =========================================
            ERROR MESSAGE
        ========================================= */}

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* =========================================
            SUCCESS MESSAGE
        ========================================= */}

        {success && (
          <div className="mb-5 rounded-lg bg-[#f7e9ee] border border-[#d9aebe] p-4 text-[#64152E]">
            {success}
          </div>
        )}

        {/* =========================================
            FORM
        ========================================= */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* OWNER NAME */}

          <div>
            <label
              htmlFor="ownerName"
              className="block mb-2 font-medium text-gray-800"
            >
              Your Full Name
            </label>

            <input
              id="ownerName"
              type="text"
              name="ownerName"
              required
              placeholder="Enter your full name"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
            />
          </div>

          {/* EMAIL */}

          <div>
            <label
              htmlFor="email"
              className="block mb-2 font-medium text-gray-800"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
            />
          </div>

          {/* PHONE */}

          <div>
            <label
              htmlFor="phone"
              className="block mb-2 font-medium text-gray-800"
            >
              Phone Number
            </label>

            <input
              id="phone"
              type="tel"
              name="phone"
              required
              placeholder="08012345678"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
            />
          </div>

          {/* PASSWORD */}

          <div>
            <label
              htmlFor="password"
              className="block mb-2 font-medium text-gray-800"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="Create a password"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
            />

            <p className="mt-2 text-sm text-gray-500">
              Password must be at least 6 characters.
            </p>
          </div>

          {/* BUSINESS NAME */}

          <div>
            <label
              htmlFor="businessName"
              className="block mb-2 font-medium text-gray-800"
            >
              Business Name
            </label>

            <input
              id="businessName"
              type="text"
              name="businessName"
              required
              placeholder="e.g. Mama's Kitchen"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
            />
          </div>

          {/* CATEGORY */}

          <div>
            <label
              htmlFor="category"
              className="block mb-2 font-medium text-gray-800"
            >
              Business Category
            </label>

            <select
              id="category"
              name="category"
              required
              defaultValue=""
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
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

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8B1E3F] text-white rounded-lg py-3 font-semibold hover:bg-[#64152E] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Creating Account & Preparing Payment..."
              : "Continue to Payment"}
          </button>

        </form>

        {/* BUSINESS LOGIN */}

        <div className="mt-8 pt-6 border-t border-[#ead6dd] text-center">

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