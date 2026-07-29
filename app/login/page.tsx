
"use client";

import { useState } from "react";
import { loginCustomer } from "./action";

export default function CustomerLoginPage() {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      // =========================================
      // 1. GET FORM DATA
      // =========================================

      const formData = new FormData(
        e.currentTarget
      );

      // =========================================
      // 2. LOGIN CUSTOMER
      // =========================================

      console.log(
        "STARTING CUSTOMER LOGIN..."
      );

      const result =
        await loginCustomer(formData);

      console.log(
        "CUSTOMER LOGIN RESULT:",
        result
      );

      // =========================================
      // 3. HANDLE LOGIN ERROR
      // =========================================

      if (!result.success) {
        setError(
          result.error ||
            "Login failed."
        );

        return;
      }

    } catch (error) {
      console.error(
        "CUSTOMER LOGIN ERROR:",
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

        {/* ADADI BRAND */}

        <div className="text-center mb-8">

          <h1 className="text-4xl font-bold text-[#8B1E3F]">
            ADADI
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Discover. Connect. Shop.
          </p>

        </div>

        {/* LOGIN CARD */}

        <div className="bg-white rounded-2xl shadow-lg border border-[#ead6dd] p-8">

          {/* HEADER */}

          <div className="mb-8">

            <h2 className="text-3xl font-bold text-gray-900">
              Welcome Back
            </h2>

            <p className="mt-2 text-gray-600">
              Log in to your ADADI account
              to continue shopping.
            </p>

          </div>

          {/* ERROR MESSAGE */}

          {error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* LOGIN FORM */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

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
                placeholder="Enter your password"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
              />

            </div>

            {/* REMEMBER ME */}

            <div className="flex items-center justify-between">

              <label className="flex items-center gap-2 cursor-pointer">

                <input
                  type="checkbox"
                  name="rememberMe"
                  className="h-4 w-4 accent-[#8B1E3F]"
                />

                <span className="text-sm text-gray-600">
                  Remember me
                </span>

              </label>

              {/* FORGOT PASSWORD */}

              <a
                href="/forgot-password"
                className="text-sm font-medium text-[#8B1E3F] hover:text-[#64152E] hover:underline"
              >
                Forgot password?
              </a>

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8B1E3F] text-white rounded-lg py-3 font-semibold transition hover:bg-[#64152E] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Logging In..."
                : "Log In"}
            </button>

          </form>

          {/* REGISTER */}

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">

            <p className="text-gray-600">
              Don't have an ADADI account?
            </p>

            <a
              href="/register"
              className="mt-2 inline-block font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
            >
              Create a Customer Account
            </a>

          </div>

          {/* BUSINESS REGISTRATION */}

          <div className="mt-6 text-center">

            <p className="text-sm text-gray-500">
              Want to sell on ADADI?
            </p>

            <a
              href="/register/businesses"
              className="mt-1 inline-block text-sm font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
            >
              Register Your Business
            </a>

          </div>

        </div>

        {/* FOOTER */}

        <p className="mt-6 text-center text-sm text-gray-500">
          Welcome back to ADADI.
        </p>

      </div>

    </main>
  );
}