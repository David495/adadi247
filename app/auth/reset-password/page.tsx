"use client";

import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase =
          createClient();

        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session) {
          setError(
            "This password reset link is invalid or has expired. Please request a new one."
          );
        }
      } catch (error) {
        console.error(
          "RESET SESSION CHECK ERROR:",
          error
        );

        setError(
          "Unable to verify your reset session. Please request a new reset link."
        );
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    if (password.length < 8) {
      setError(
        "Your new password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "The passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const supabase =
        createClient();

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session) {
        setError(
          "Your password reset session has expired. Please request a new reset link."
        );
        return;
      }

      const {
        error: updateError,
      } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        console.error(
          "PASSWORD UPDATE ERROR:",
          updateError
        );

        setError(
          updateError.message ||
            "Unable to update your password."
        );

        return;
      }

      setSuccess(true);

      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "PASSWORD RESET ERROR:",
        error
      );

      setError(
        "Something went wrong while updating your password. Please try again."
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
              Secure your account
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-[#ead6dd] p-8">
            {checkingSession ? (
              <div className="py-10 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#ead6dd] border-t-[#8B1E3F]" />

                <p className="mt-4 text-gray-600">
                  Verifying your reset link...
                </p>
              </div>
            ) : success ? (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
                  ✓
                </div>

                <h2 className="mt-5 text-2xl font-bold text-gray-900">
                  Password Updated
                </h2>

                <p className="mt-2 text-gray-600">
                  Your password has been successfully changed.
                </p>

                <Link
                  href="/customer/login"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#8B1E3F] px-4 py-3 font-semibold text-white transition hover:bg-[#64152E]"
                >
                  Log In to ADADI
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900">
                    Create New Password
                  </h2>

                  <p className="mt-2 text-gray-600">
                    Choose a new password for your ADADI account.
                  </p>
                </div>

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
                      htmlFor="password"
                      className="block mb-2 font-medium text-gray-800"
                    >
                      New Password
                    </label>

                    <div className="relative">
                      <input
                        id="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={password}
                        onChange={(e) =>
                          setPassword(
                            e.target.value
                          )
                        }
                        required
                        minLength={8}
                        autoComplete="new-password"
                        disabled={loading}
                        placeholder="Enter your new password"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 text-gray-900 bg-white placeholder:text-gray-400 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (value) =>
                              !value
                          )
                        }
                        disabled={loading}
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-[#8B1E3F] disabled:opacity-50"
                      >
                        {showPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      Use at least 8 characters.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block mb-2 font-medium text-gray-800"
                    >
                      Confirm New Password
                    </label>

                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          confirmPassword
                        }
                        onChange={(e) =>
                          setConfirmPassword(
                            e.target.value
                          )
                        }
                        required
                        minLength={8}
                        autoComplete="new-password"
                        disabled={loading}
                        placeholder="Confirm your new password"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 text-gray-900 bg-white placeholder:text-gray-400 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (value) =>
                              !value
                          )
                        }
                        disabled={loading}
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-[#8B1E3F] disabled:opacity-50"
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
                    disabled={
                      loading ||
                      checkingSession
                    }
                    className="w-full bg-[#8B1E3F] text-white rounded-lg py-3 font-semibold transition hover:bg-[#64152E] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                        <span>
                          Updating Password...
                        </span>
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                  <Link
                    href="/customer/login"
                    className="font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
                  >
                    ← Back to Customer Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}