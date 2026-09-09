"use client";

import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Link from "next/link";
import { useState } from "react";
import { requestBusinessPasswordReset } from "./action";

export default function BusinessForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData(
        e.currentTarget
      );

      const result =
        await requestBusinessPasswordReset(
          formData
        );

      if (!result.success) {
        setError(
          result.error ||
            "Unable to send password reset email."
        );
        return;
      }

      setMessage(
        "If a business account exists with that email, we've sent a password reset link."
      );
    } catch (error) {
      console.error(
        "BUSINESS PASSWORD RESET REQUEST ERROR:",
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
    <>
      <Navbar />

      <main className="min-h-screen flex items-center justify-center bg-[#faf7f8] p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#8B1E3F]">
              ADADI
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Recover your business account
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-[#ead6dd] p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
                Business Portal
              </p>

              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                Forgot Password?
              </h2>

              <p className="mt-2 text-gray-600">
                Enter your business account email and
                we'll send you a link to reset your
                password.
              </p>
            </div>

            {message && (
              <div
                role="status"
                className="mb-5 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700"
              >
                {message}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700"
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="email"
                  className="block mb-2 font-medium text-gray-800"
                >
                  Business Owner Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  disabled={loading}
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white placeholder:text-gray-400 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#8B1E3F] text-white rounded-lg py-3 font-semibold transition hover:bg-[#64152E] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                    <span>
                      Sending Reset Link...
                    </span>
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <Link
                href="/business-login"
                className="font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
              >
                ← Back to Business Login
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            ADADI Business Portal
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}