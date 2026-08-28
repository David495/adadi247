"use client";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginCustomer } from "./action";
import { createClient } from "@/app/lib/supabase/client";
import Link from "next/link";

export default function CustomerLoginPage() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);

      console.log("STARTING CUSTOMER LOGIN...");

      const result = await loginCustomer(formData);

      console.log("CUSTOMER LOGIN RESULT:", result);

      if (!result.success) {
        setError(result.error || "Login failed.");
        return;
      }
    } catch (error) {
      console.error("CUSTOMER LOGIN ERROR:", error);

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const redirectTo =
        `${window.location.origin}/auth/callback`;

      console.log(
        "STARTING GOOGLE CUSTOMER LOGIN..."
      );

      const {
        data,
        error: googleError,
      } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (googleError) {
        console.error(
          "GOOGLE LOGIN ERROR:",
          googleError
        );

        setError(
          googleError.message ||
            "Unable to continue with Google."
        );

        setGoogleLoading(false);
        return;
      }

      if (!data.url) {
        setError(
          "Google login could not be started."
        );

        setGoogleLoading(false);
        return;
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error(
        "GOOGLE CUSTOMER LOGIN ERROR:",
        error
      );

      setError(
        "Something went wrong while connecting to Google."
      );

      setGoogleLoading(false);
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
            Discover. Connect. Shop.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-[#ead6dd] p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Welcome Back
            </h2>

            <p className="mt-2 text-gray-600">
              Log in to your ADADI account
              to continue shopping.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {googleLoading ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#8B1E3F]" />

                <span>
                  Connecting to Google...
                </span>
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
                    d="M21.35 12.23c0-.79-.07-1.55-.22-2.27H12v4.3h5.22a4.46 4.46 0 0 1-1.94 2.93v2.44h3.14c1.84-1.69 2.93-4.18 2.93-7.4Z"
                  />

                  <path
                    fill="#34A853"
                    d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.5Z"
                  />

                  <path
                    fill="#FBBC05"
                    d="M6.54 13.59A5.85 5.85 0 0 1 6.24 12c0-.55.1-1.09.3-1.59V7.89H3.3A9.5 9.5 0 0 0 2.5 12c0 1.53.37 2.98 1.03 4.11l3.01-2.52Z"
                  />

                  <path
                    fill="#EA4335"
                    d="M12 6.38c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.46 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.7 5.39l3.01 2.52C7.31 8.1 9.46 6.38 12 6.38Z"
                  />
                </svg>

                <span>
                  Continue with Google
                </span>
              </>
            )}
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="h-px flex-1 bg-gray-200" />

            <span className="text-sm text-gray-400">
              OR
            </span>

            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
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
                disabled={
                  loading || googleLoading
                }
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
              />
            </div>

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
                  disabled={
                    loading || googleLoading
                  }
                  placeholder="Enter your password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  disabled={
                    loading || googleLoading
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-[#8B1E3F] focus:outline-none focus:ring-2 focus:ring-[#8B1E3F]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? (
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
                loading || googleLoading
              }
              className="w-full bg-[#8B1E3F] text-white rounded-lg py-3 font-semibold transition hover:bg-[#64152E] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                  <span>
                    Logging In...
                  </span>
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              Don't have an ADADI account?
            </p>

            <Link
              href="/customer/signup"
              className="mt-2 inline-block font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
            >
              Create a Customer Account
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Want to sell on ADADI?
            </p>

            <Link
              href="/register/businesses"
              className="mt-1 inline-block text-sm font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
            >
              Register Your Business
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Welcome back to ADADI.
        </p>
      </div>
      </main>
      <Footer/>
      </>
  );
}