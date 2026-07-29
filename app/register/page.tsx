"use client";

import { useState } from "react";
import { registerCustomer } from "./action";

export default function CustomerRegistrationPage() {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

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

      const formData = new FormData(
        e.currentTarget
      );

      // =========================================
      // 2. REGISTER CUSTOMER
      // =========================================

      console.log(
        "STARTING CUSTOMER REGISTRATION..."
      );

      const result =
        await registerCustomer(formData);

      console.log(
        "CUSTOMER REGISTRATION RESULT:",
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
      // 4. HANDLE EMAIL CONFIRMATION
      // =========================================

      if (
        result.requiresEmailConfirmation
      ) {
        setSuccess(
          result.message ||
            "Account created successfully. Please check your email to confirm your account."
        );

        return;
      }

      // =========================================
      // 5. SUCCESS
      // =========================================

      setSuccess(
        "Account created successfully. Redirecting..."
      );

    } catch (error) {
      console.error(
        "CUSTOMER REGISTRATION ERROR:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#faf7f8] p-6">

      <div className="w-full max-w-lg">

        {/* BRAND */}

        <div className="text-center mb-8">

          <h1 className="text-4xl font-bold text-[#8B1E3F]">
            ADADI
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Discover. Connect. Shop.
          </p>

        </div>

        {/* REGISTRATION CARD */}

        <div className="bg-white rounded-2xl shadow-lg border border-[#ead6dd] p-8">

          {/* HEADER */}

          <div className="mb-8">

            <h2 className="text-3xl font-bold text-gray-900">
              Create Your Account
            </h2>

            <p className="mt-2 text-gray-600">
              Create an account to discover
              businesses and shop on ADADI.
            </p>

          </div>

          {/* ERROR MESSAGE */}

          {error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* SUCCESS MESSAGE */}

          {success && (
            <div className="mb-5 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
              {success}
            </div>
          )}

          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* FULL NAME */}

            <div>

              <label
                htmlFor="fullName"
                className="block mb-2 font-medium text-gray-800"
              >
                Full Name
              </label>

              <input
                id="fullName"
                type="text"
                name="fullName"
                required
                minLength={2}
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
                Password must be at least 6
                characters.
              </p>

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8B1E3F] text-white rounded-lg py-3 font-semibold transition hover:bg-[#64152E] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}
            </button>

          </form>

          {/* BUSINESS REGISTRATION */}

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">

            <p className="text-gray-600">
              Want to sell on ADADI?
            </p>

            <a
              href="/register/businesses"
              className="mt-2 inline-block font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
            >
              Register Your Business
            </a>

          </div>

        </div>

        {/* FOOTER */}

        <p className="mt-6 text-center text-sm text-gray-500">
          By creating an account, you agree to
          ADADI's terms and conditions.
        </p>

      </div>

    </main>
  );
}