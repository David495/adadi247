import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

type AdminSecurityPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function AdminSecurityPage({
  searchParams,
}: AdminSecurityPageProps) {
  const params = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin-login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    redirect("/dashboard/customer");
  }

  return (
    <main className="min-h-screen">
      <Link
        href="/admin/dashboard/settings"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
      >
        <ArrowLeft size={17} />
        Back to Settings
      </Link>

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Administration
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#242424]">
          Security
        </h1>

        <p className="mt-2 text-gray-500">
          Manage the security of your administrator account.
        </p>
      </div>

      {params.success && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          {params.success}
        </div>
      )}

      {params.error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {params.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F7E9EE] text-[#8B1E3F]">
              <ShieldCheck size={38} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-[#242424]">
              Account Security
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Keep your administrator account secure by
              using a strong and unique password.
            </p>
          </div>

          <div className="mt-8 space-y-4 border-t border-gray-100 pt-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Account
              </p>

              <p className="mt-2 break-all text-sm font-medium text-[#242424]">
                {profile.email ||
                  user.email ||
                  "No email"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Role
              </p>

              <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold capitalize text-green-700">
                <ShieldCheck size={14} />
                {profile.role}
              </span>
            </div>
          </div>
        </section>

        <section className="xl:col-span-2">
          <form
            action={async (formData) => {
              "use server";

              const supabase =
                await createClient();

              const {
                data: {
                  user: currentUser,
                },
              } =
                await supabase.auth.getUser();

              if (!currentUser) {
                redirect("/admin-login");
              }

              const {
                data: adminProfile,
              } = await supabase
                .from("profiles")
                .select("id, role")
                .eq(
                  "id",
                  currentUser.id
                )
                .maybeSingle();

              if (
                !adminProfile ||
                adminProfile.role !==
                  "admin"
              ) {
                redirect(
                  "/dashboard/customer"
                );
              }

              const newPassword =
                String(
                  formData.get(
                    "new_password"
                  ) ?? ""
                );

              const confirmPassword =
                String(
                  formData.get(
                    "confirm_password"
                  ) ?? ""
                );

              if (!newPassword) {
                redirect(
                  "/admin/dashboard/settings/security?error=New password is required."
                );
              }

              if (
                newPassword.length < 8
              ) {
                redirect(
                  "/admin/dashboard/settings/security?error=Your new password must be at least 8 characters long."
                );
              }

              if (
                newPassword !==
                confirmPassword
              ) {
                redirect(
                  "/admin/dashboard/settings/security?error=The passwords do not match."
                );
              }

              const {
                error:
                  passwordError,
              } =
                await supabase.auth.updateUser(
                  {
                    password:
                      newPassword,
                  }
                );

              if (passwordError) {
                console.error(
                  "ADMIN PASSWORD UPDATE ERROR:",
                  passwordError
                );

                redirect(
                  "/admin/dashboard/settings/security?error=Unable to update your password. Please try again."
                );
              }

              redirect(
                "/admin/dashboard/settings/security?success=Your password has been updated successfully."
              );
            }}
            className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex items-center gap-3 border-b border-gray-100 pb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <KeyRound size={22} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#242424]">
                  Change Password
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Create a strong password to protect your
                  administrator account.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <label
                  htmlFor="new_password"
                  className="block text-sm font-semibold text-[#242424]"
                >
                  New Password
                </label>

                <input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  minLength={8}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                  placeholder="Enter your new password"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Your password must contain at least 8
                  characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirm_password"
                  className="block text-sm font-semibold text-[#242424]"
                >
                  Confirm New Password
                </label>

                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={8}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                  placeholder="Confirm your new password"
                />
              </div>

              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-yellow-700"
                  />

                  <div>
                    <p className="font-semibold text-yellow-900">
                      Security Reminder
                    </p>

                    <p className="mt-1 text-sm leading-6 text-yellow-800">
                      Never share your administrator password
                      with anyone. Use a unique password that
                      you do not use for other accounts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
                <Link
                  href="/admin/dashboard/settings"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#721832]"
                >
                  <KeyRound size={17} />
                  Update Password
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}