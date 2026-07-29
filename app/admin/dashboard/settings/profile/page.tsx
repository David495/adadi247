import Link from "next/link";
import { ArrowLeft, Mail, Phone, Save, ShieldCheck, User } from "lucide-react";
import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

type AdminProfilePageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function AdminProfilePage({
  searchParams,
}: AdminProfilePageProps) {
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
    .select(
      "id, full_name, email, phone, role, created_at, updated_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    redirect("/dashboard/customer");
  }

  const formatDate = (
    date: string | null
  ) => {
    if (!date) {
      return "Unknown date";
    }

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

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
          Admin Profile
        </h1>

        <p className="mt-2 text-gray-500">
          Manage your administrator account information.
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
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#F7E9EE] text-3xl font-bold text-[#8B1E3F]">
              {profile.full_name
                ?.charAt(0)
                .toUpperCase() ||
                "A"}
            </div>

            <h2 className="mt-5 text-xl font-bold text-[#242424]">
              {profile.full_name ||
                "Administrator"}
            </h2>

            <p className="mt-1 break-all text-sm text-gray-500">
              {profile.email ||
                user.email ||
                "No email"}
            </p>

            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-xs font-semibold capitalize text-green-700">
              <ShieldCheck size={15} />
              {profile.role}
            </span>
          </div>

          <div className="mt-8 space-y-5 border-t border-gray-100 pt-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Account ID
              </p>

              <p className="mt-2 break-all text-xs text-gray-500">
                {profile.id}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Account Created
              </p>

              <p className="mt-2 text-sm font-medium text-[#242424]">
                {formatDate(
                  profile.created_at
                )}
              </p>
            </div>

            {profile.updated_at && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Last Updated
                </p>

                <p className="mt-2 text-sm font-medium text-[#242424]">
                  {formatDate(
                    profile.updated_at
                  )}
                </p>
              </div>
            )}
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

              const fullName =
                String(
                  formData.get(
                    "full_name"
                  ) ?? ""
                ).trim();

              const email =
                String(
                  formData.get(
                    "email"
                  ) ?? ""
                )
                  .trim()
                  .toLowerCase();

              const phone =
                String(
                  formData.get(
                    "phone"
                  ) ?? ""
                ).trim();

              if (!fullName) {
                redirect(
                  "/admin/dashboard/settings/profile?error=Full name is required."
                );
              }

              if (!email) {
                redirect(
                  "/admin/dashboard/settings/profile?error=Email address is required."
                );
              }

              const {
                error: profileUpdateError,
              } = await supabase
                .from("profiles")
                .update({
                  full_name:
                    fullName,
                  email,
                  phone:
                    phone || null,
                  updated_at:
                    new Date().toISOString(),
                })
                .eq(
                  "id",
                  currentUser.id
                );

              if (
                profileUpdateError
              ) {
                console.error(
                  "ADMIN PROFILE UPDATE ERROR:",
                  profileUpdateError
                );

                redirect(
                  "/admin/dashboard/settings/profile?error=Unable to update your profile."
                );
              }

              if (
                email !==
                currentUser.email
              ) {
                const {
                  error:
                    emailUpdateError,
                } =
                  await supabase.auth.updateUser(
                    {
                      email,
                    }
                  );

                if (
                  emailUpdateError
                ) {
                  console.error(
                    "ADMIN EMAIL UPDATE ERROR:",
                    emailUpdateError
                  );

                  redirect(
                    "/admin/dashboard/settings/profile?error=Profile saved, but email update failed. Please check your email settings."
                  );
                }

                redirect(
                  "/admin/dashboard/settings/profile?success=Profile updated. Please check your email to confirm your new email address."
                );
              }

              redirect(
                "/admin/dashboard/settings/profile?success=Your profile has been updated successfully."
              );
            }}
            className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex items-center gap-3 border-b border-gray-100 pb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <User size={22} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#242424]">
                  Profile Information
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Update the information associated
                  with your admin account.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <label
                  htmlFor="full_name"
                  className="block text-sm font-semibold text-[#242424]"
                >
                  Full Name
                </label>

                <div className="relative mt-2">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    defaultValue={
                      profile.full_name ||
                      ""
                    }
                    required
                    className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-[#242424]"
                >
                  Email Address
                </label>

                <div className="relative mt-2">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={
                      profile.email ||
                      user.email ||
                      ""
                    }
                    required
                    className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                    placeholder="admin@example.com"
                  />
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Changing your email may require
                  confirmation through your new email
                  address.
                </p>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold text-[#242424]"
                >
                  Phone Number
                </label>

                <div className="relative mt-2">
                  <Phone
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={
                      profile.phone ||
                      ""
                    }
                    className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                    placeholder="08012345678"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />

                  <div>
                    <p className="font-semibold text-blue-900">
                      Administrator Account
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-700">
                      Your administrator role cannot be
                      changed from this page. Only authorized
                      platform administrators should have
                      access to this account.
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
                  <Save size={17} />
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}