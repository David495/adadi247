import Link from "next/link";
import {
  ArrowRight,
  Building2,
  LockKeyhole,
  Settings,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BusinessSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      slug,
      description,
      phone,
      address,
      category,
      status,
      onboarding_status
    `)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (businessError) {
    console.error(
      "BUSINESS SETTINGS - BUSINESS ERROR:",
      businessError
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Business Management
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#242424] sm:text-4xl">
          Settings
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
          Manage your business profile, account information and
          security settings.
        </p>
      </div>

      {/* BUSINESS SUMMARY */}
      {business ? (
        <div className="rounded-2xl border border-[#8B1E3F]/10 bg-[#64152E] p-6 text-white shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <Building2 className="h-7 w-7 text-white" />
              </div>

              <div>
                <p className="text-sm text-white/60">
                  Current Business
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {business.name}
                </h2>

                <p className="mt-1 text-sm text-white/60">
                  {business.slug
                    ? `adadi.com/businesses/${business.slug}`
                    : "Public storefront not configured"}
                </p>
              </div>
            </div>

            <div>
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                  business.status === "approved" ||
                  business.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {business.status
                  ? business.status.replaceAll("_", " ")
                  : "Pending"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <Building2 className="h-5 w-5 text-amber-700" />
            </div>

            <div>
              <h2 className="font-bold text-amber-900">
                Business information unavailable
              </h2>

              <p className="mt-1 text-sm text-amber-700">
                We couldn't load the business connected to your
                account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS OPTIONS */}
      <div>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-[#242424]">
            Account & Business Settings
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Choose what you want to manage.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* PROFILE */}
          <Link
            href="/dashboard/businesses/settings/profile"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#8B1E3F]/20 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
                  <UserCircle className="h-6 w-6 text-[#8B1E3F]" />
                </div>

                <h3 className="mt-5 text-lg font-bold text-[#242424]">
                  Profile
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Manage your account name, email and contact
                  information.
                </p>
              </div>

              <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#8B1E3F]" />
            </div>
          </Link>

          {/* BUSINESS */}
          <Link
            href="/dashboard/businesses/settings/business"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#8B1E3F]/20 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
                  <Building2 className="h-6 w-6 text-[#8B1E3F]" />
                </div>

                <h3 className="mt-5 text-lg font-bold text-[#242424]">
                  Business Profile
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Update your business name, description,
                  contact details and storefront information.
                </p>
              </div>

              <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#8B1E3F]" />
            </div>
          </Link>

          {/* SECURITY */}
          <Link
            href="/dashboard/businesses/settings/security"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#8B1E3F]/20 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
                  <LockKeyhole className="h-6 w-6 text-[#8B1E3F]" />
                </div>

                <h3 className="mt-5 text-lg font-bold text-[#242424]">
                  Security
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Manage your password and account security.
                </p>
              </div>

              <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#8B1E3F]" />
            </div>
          </Link>

          {/* ACCOUNT STATUS */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#242424]">
                  Account Status
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Your ADADI business account is currently{" "}
                  <span className="font-semibold text-gray-700">
                    {business?.status || "active"}
                  </span>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HELP */}
      <div className="rounded-2xl border border-[#8B1E3F]/10 bg-[#faf7f7] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
            <Settings className="h-5 w-5 text-[#8B1E3F]" />
          </div>

          <div>
            <h2 className="font-bold text-[#242424]">
              Need help?
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              If you need assistance managing your business on
              ADADI, contact our support team.
            </p>

            <Link
              href="/contact"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:text-[#64152E]"
            >
              Contact Support
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}