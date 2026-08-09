import Link from "next/link";
import { ArrowLeft, Mail, Phone, UserCircle } from "lucide-react";

import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BusinessProfileSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      phone,
      email
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "BUSINESS PROFILE SETTINGS ERROR:",
      profileError
    );
  }

  const fullName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "";

  const phone =
    profile?.phone ||
    user.user_metadata?.phone ||
    "";

  const email =
    profile?.email ||
    user.email ||
    "";

  return (
    <div className="space-y-8">
      {/* BACK */}
      <Link
        href="/dashboard/businesses/settings"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] transition hover:text-[#64152E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      {/* HEADER */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Account Settings
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#242424] sm:text-4xl">
          Profile
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
          View and manage the personal information associated
          with your ADADI business account.
        </p>
      </div>

      {/* PROFILE CARD */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-[#faf7f7] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
              <UserCircle className="h-6 w-6 text-[#8B1E3F]" />
            </div>

            <div>
              <h2 className="font-bold text-[#242424]">
                Personal Information
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Information connected to your account.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          {/* NAME */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Full Name
            </label>

            <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-800">
              {fullName || "Not provided"}
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Mail className="h-4 w-4" />
              Email Address
            </label>

            <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-800">
              {email || "Not provided"}
            </div>
          </div>

          {/* PHONE */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Phone className="h-4 w-4" />
              Phone Number
            </label>

            <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-800">
              {phone || "Not provided"}
            </div>
          </div>

          {/* USER ID */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Account ID
            </label>

            <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-xs text-gray-500">
              {user.id}
            </div>
          </div>
        </div>
      </div>

      {/* NOTICE */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="font-bold text-blue-900">
          Profile changes
        </h2>

        <p className="mt-2 text-sm leading-6 text-blue-700">
          Your login email and other account-level information
          are managed through your ADADI account. Business
          information such as your store name, description and
          address can be changed from Business Profile.
        </p>

        <Link
          href="/dashboard/businesses/settings/business"
          className="mt-4 inline-flex items-center rounded-xl bg-[#8B1E3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#64152E]"
        >
          Manage Business Profile
        </Link>
      </div>
    </div>
  );
}