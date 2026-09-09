"use client";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const supabase = createClient();

      const redirectTo = `${window.location.origin}/auth/reset-password`;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo,
        });

      if (resetError) {
        console.error(
          "PASSWORD RESET EMAIL ERROR:",
          resetError
        );

        setError(
          resetError.message ||
            "Unable to send the password reset email. Please try again."
        );

        return;
      }

      setSuccess(true);
    } catch (error) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        error
      );

      setError(
        "Unable to send the password reset email. Please try again."
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
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-[#8B1E3F]">
              ADADI
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Secure your account
            </p>
          </div>

          <div className="rounded-2xl border border-[#ead6dd] bg-white p-8 shadow-lg">
            {success ? (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CheckCircle2 size={32} />
                </div>

                <h2 className="mt-6 text-2xl font-bold text-gray-900">
                  Check Your Email
                </h2>

                <p className="mt-3 text-gray-600">
                  If an ADADI account exists with this email,
                  we've sent you a password reset link.
                </p>

                <p className="mt-2 break-all text-sm font-medium text-[#8B1E3F]">
                  {email}
                </p>

                <div className="mt-6 rounded-lg bg-[#faf7f8] p-4 text-left">
                  <p className="text-sm text-gray-600">
                    Check your inbox and spam folder. The reset
                    link will take you back to ADADI where you
                    can create a new password.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setError("");
                  }}
                  className="mt-6 font-semibold text-[#8B1E3F] transition hover:text-[#64152E] hover:underline"
                >
                  Try another email
                </button>

                <div className="mt-6 border-t border-gray-200 pt-6">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 font-semibold text-[#8B1E3F] transition hover:text-[#64152E] hover:underline"
                  >
                    <ArrowLeft size={17} />
                    Back to Customer Login
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B1E3F]/10 text-[#8B1E3F]">
                    <Mail size={24} />
                  </div>

                  <h2 className="text-3xl font-bold text-gray-900">
                    Forgot Password?
                  </h2>

                  <p className="mt-2 text-gray-600">
                    Enter the email address associated with your
                    ADADI account and we'll send you a secure
                    password reset link.
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
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
                      className="mb-2 block font-medium text-gray-800"
                    >
                      Email Address
                    </label>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      required
                      autoComplete="email"
                      disabled={loading}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B1E3F] py-3 font-semibold text-white transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Sending Reset Link...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        <span>Send Reset Link</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 border-t border-gray-200 pt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 font-semibold text-[#8B1E3F] transition hover:text-[#64152E] hover:underline"
                  >
                    <ArrowLeft size={17} />
                    Back to Customer Login
                  </Link>
                </div>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Welcome back to ADADI.
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}