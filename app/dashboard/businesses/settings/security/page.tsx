import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BusinessSecuritySettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

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
          Security
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
          Manage the security of your ADADI business account.
        </p>
      </div>

      {/* SECURITY STATUS */}
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <ShieldCheck className="h-6 w-6 text-green-700" />
          </div>

          <div>
            <h2 className="font-bold text-green-900">
              Account Security
            </h2>

            <p className="mt-1 text-sm leading-6 text-green-700">
              Your account is protected by Supabase
              authentication and your active login session.
            </p>

            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Authentication active
            </div>
          </div>
        </div>
      </div>

      {/* SECURITY OPTIONS */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* PASSWORD */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
            <KeyRound className="h-6 w-6 text-[#8B1E3F]" />
          </div>

          <h2 className="mt-5 text-lg font-bold text-[#242424]">
            Password
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Keep your account secure by using a strong password
            and changing it if you believe it has been exposed.
          </p>

          <p className="mt-4 text-xs text-gray-400">
            Signed in as
          </p>

          <p className="mt-1 truncate text-sm font-semibold text-gray-700">
            {user.email || "Account email unavailable"}
          </p>
        </div>

        {/* SESSION */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
            <LockKeyhole className="h-6 w-6 text-[#8B1E3F]" />
          </div>

          <h2 className="mt-5 text-lg font-bold text-[#242424]">
            Login Session
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Your current browser session is authenticated with
            your ADADI account.
          </p>

          <Link
            href="/logout"
            className="mt-5 inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Sign Out
          </Link>
        </div>
      </div>

      {/* SECURITY GUIDANCE */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#242424]">
          Security recommendations
        </h2>

        <div className="mt-5 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

            <p className="text-sm leading-6 text-gray-600">
              Never share your ADADI password with another person.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

            <p className="text-sm leading-6 text-gray-600">
              Use a strong password that you do not reuse on
              other websites.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

            <p className="text-sm leading-6 text-gray-600">
              Sign out whenever you use your business account on
              a shared computer.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

            <p className="text-sm leading-6 text-gray-600">
              Contact ADADI support if you notice suspicious
              activity on your account.
            </p>
          </div>
        </div>
      </div>

      {/* ACCOUNT ID */}
      <div className="rounded-2xl border border-gray-200 bg-[#faf7f7] p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Account Identifier
        </p>

        <p className="mt-2 break-all font-mono text-xs text-gray-500">
          {user.id}
        </p>
      </div>
    </div>
  );
}