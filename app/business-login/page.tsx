"use client";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginBusinessOwner } from "./action";

export default function BusinessLoginPage() {
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [showPassword, setShowPassword] = useState(false);

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
  const formData = new FormData(e.currentTarget);

  // =========================================
  // 2. LOGIN BUSINESS OWNER
  // =========================================
  console.log(
    "STARTING BUSINESS OWNER LOGIN..."
  );

  const result = await loginBusinessOwner(
    formData
  );

  console.log(
    "BUSINESS LOGIN RESULT:",
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

  // =========================================
  // 4. BUSINESS NEEDS TO PAY
  // =========================================
  if (
    result.requiresPayment &&
    result.authorizationUrl
  ) {
    console.log(
      "BUSINESS REQUIRES PAYMENT — REDIRECTING TO PAYSTACK:",
      result.authorizationUrl
    );

    window.location.href =
      result.authorizationUrl;

    return;
  }
} catch (error) {
  console.error(
    "BUSINESS OWNER LOGIN ERROR:",
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
<> <Navbar />

  <main className="min-h-screen flex items-center justify-center bg-[#faf7f8] p-6">
    <div className="w-full max-w-lg">
      {/* ADADI BRAND */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#8B1E3F]">
          ADADI
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Grow your business with ADADI.
        </p>
      </div>

      {/* LOGIN CARD */}
      <div className="bg-white rounded-2xl shadow-lg border border-[#ead6dd] p-8">
        {/* HEADER */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Business Portal
          </p>

          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            Business Owner Login
          </h2>

          <p className="mt-2 text-gray-600">
            Log in to manage your business
            on ADADI.
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
              Business Owner Email
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

            <div className="relative">
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                required
                placeholder="Enter your password"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (prev) => !prev
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#8B1E3F]"
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8B1E3F] text-white rounded-lg py-3 font-semibold transition hover:bg-[#64152E] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Logging In...
              </>
            ) : (
              "Log In to Business Portal"
            )}
          </button>
        </form>

        {/* CUSTOMER LOGIN */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-600">
            Looking to shop on ADADI?
          </p>

          <a
            href="/login"
            className="mt-2 inline-block font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
          >
            Customer Login
          </a>
        </div>

        {/* BUSINESS REGISTRATION */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Don't have a business account?
          </p>

          <Link
            href="/register/businesses"
            className="mt-1 inline-block text-sm font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
          >
            Register Your Business
          </Link>
        </div>
      </div>

      {/* FOOTER */}
      <p className="mt-6 text-center text-sm text-gray-500">
        ADADI Business Portal
      </p>
    </div>
  </main>

  <Footer />
</>

);
}
