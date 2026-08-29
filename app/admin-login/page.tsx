"use client";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAdmin } from "./action";

export default function AdminLoginPage() {
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
  const formData = new FormData(e.currentTarget);

  console.log("STARTING ADMIN LOGIN...");

  const result = await loginAdmin(formData);

  console.log("ADMIN LOGIN RESULT:", result);

  if (result && !result.success) {
    setError(result.error || "Login failed.");
    return;
  }
} catch (error) {
  console.error("ADMIN LOGIN ERROR:", error);
  setError("Something went wrong. Please try again.");
} finally {
  setLoading(false);
}

};

return (
<> <Navbar />

  <main className="min-h-screen flex items-center justify-center bg-[#faf7f8] p-6">
    <div className="w-full max-w-lg">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#8B1E3F]">
          ADADI
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Administration Portal
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-[#ead6dd] p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Admin Portal
          </p>

          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            Administrator Login
          </h2>

          <p className="mt-2 text-gray-600">
            Sign in to manage the ADADI platform.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
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
              Admin Email
            </label>

            <input
              id="email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-medium text-gray-800"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/20"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((prev) => !prev)
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

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B1E3F] py-3 font-semibold text-white transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Authenticating...
              </>
            ) : (
              "Log In to Admin Portal"
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-gray-200 pt-6 text-center">
          <p className="text-gray-600">
            Are you a business owner?
          </p>

          <Link
            href="/business-login"
            className="mt-2 inline-block font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
          >
            Business Owner Login
          </Link>
        </div>

        <div className="mt-5 text-center">
          <p className="text-sm text-gray-500">
            Looking to shop on ADADI?
          </p>

          <Link
            href="/login"
            className="mt-1 inline-block text-sm font-semibold text-[#8B1E3F] hover:text-[#64152E] hover:underline"
          >
            Customer Login
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        ADADI Administration Portal
      </p>
    </div>
  </main>

  <Footer />
</>

);
}
