"use client";
import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signup, signupWithGoogle } from "./action";

export default function CustomerSignupPage() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    setError("");

    const result = await signupWithGoogle();

    if (result?.error) {
      setError(result.error);
      setGoogleLoading(false);
    }
  }

  return (
      <main className="min-h-screen bg-[#FAF8F6] px-4 py-10 sm:px-6">
          <Navbar/>
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
              ADADI
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#242424]">
              Create your account
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Join ADADI and discover businesses and products around you.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading || googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#8B1E3F]" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M21.35 12.27c0-.79-.07-1.55-.23-2.27H12v4.3h5.22a4.46 4.46 0 0 1-1.94 2.93v2.43h3.14c1.84-1.69 2.93-4.18 2.93-7.39Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.43c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.5A9.75 9.75 0 0 0 12 21.5Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.54 13.61A5.86 5.86 0 0 1 6.23 12c0-.56.1-1.1.31-1.61v-2.5H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.39l3.24-2.78Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 6.36c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 3.46 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.7 5.39l3.24 2.5C7.31 8.08 9.46 6.36 12 6.36Z"
                  />
                </svg>

                Continue with Google
              </>
            )}
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />

            <span className="text-xs font-medium uppercase text-gray-400">
              or
            </span>

            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form action={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="full_name"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Full Name
              </label>

              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                autoComplete="name"
                placeholder="Your full name"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Email Address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-[#8B1E3F] focus:outline-none focus:ring-2 focus:ring-[#8B1E3F]/20"
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Confirm Password
              </label>

              <div className="relative">
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-[#8B1E3F] focus:outline-none focus:ring-2 focus:ring-[#8B1E3F]/20"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-4 py-3 font-semibold text-white transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating Account...
                </>
              ) : (
                "Create Customer Account"
              )}
            </button>
          </form>

          <div className="mt-7 border-t border-gray-100 pt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?
            </p>

            <Link
              href="/login"
              className="mt-2 inline-block text-sm font-semibold text-[#8B1E3F] hover:underline"
            >
              Log in to ADADI
            </Link>
          </div>
        </div>
          </div>
          <Footer/>
    </main>
  );
}