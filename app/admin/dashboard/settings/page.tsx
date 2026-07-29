import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CreditCard,
  LockKeyhole,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

export default async function AdminSettingsPage() {
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

  const settings = [
    {
      title: "Admin Profile",
      description:
        "View and manage your administrator profile information, name, email, and phone number.",
      href: "/admin/dashboard/profile",
      icon: User,
      iconClass:
        "bg-[#F7E9EE] text-[#8B1E3F]",
    },
    {
      title: "Platform Settings",
      description:
        "Manage ADADI platform information, support details, business subscription fees, transaction fees, and maintenance mode.",
      href: "/admin/dashboard/settings/platform",
      icon: Settings,
      iconClass:
        "bg-[#F7E9EE] text-[#8B1E3F]",
    },
    {
      title: "Security",
      description:
        "Manage your administrator account security and password settings.",
      href: "/admin/dashboard/settings/security",
      icon: LockKeyhole,
      iconClass:
        "bg-blue-50 text-blue-600",
    },
    {
      title: "Payment Settings",
      description:
        "Manage payment-related configuration and review the financial operations of the ADADI marketplace.",
      href: "/admin/dashboard/settings/payments",
      icon: CreditCard,
      iconClass:
        "bg-green-50 text-green-600",
    },
  ];

  return (
    <main className="min-h-screen">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Administration
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#242424]">
          Settings
        </h1>

        <p className="mt-2 max-w-2xl text-gray-500">
          Manage your administrator account and configure
          important settings across the ADADI marketplace.
        </p>
      </div>

      <div className="mb-8 rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F7E9EE] text-[#8B1E3F]">
              <ShieldCheck size={28} />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">
                Signed in as administrator
              </p>

              <h2 className="mt-1 font-bold text-[#242424]">
                {profile.full_name ||
                  "ADADI Administrator"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {profile.email ||
                  user.email ||
                  "No email available"}
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center rounded-full bg-green-100 px-4 py-2 text-xs font-semibold capitalize text-green-700">
            {profile.role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {settings.map((setting) => {
          const Icon = setting.icon;

          return (
            <Link
              key={setting.href}
              href={setting.href}
              className="group rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-5">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${setting.iconClass}`}
                >
                  <Icon size={23} />
                </div>

                <ArrowRight
                  size={20}
                  className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-[#8B1E3F]"
                />
              </div>

              <h2 className="mt-6 text-xl font-bold text-[#242424]">
                {setting.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {setting.description}
              </p>

              <div className="mt-6 text-sm font-semibold text-[#8B1E3F]">
                Manage {setting.title}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-[#E8D5DC] bg-[#FCF7F9] p-6">
        <h2 className="font-bold text-[#242424]">
          Administrator Information
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Account ID
            </p>

            <p className="mt-2 break-all text-sm text-gray-600">
              {profile.id}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Account Role
            </p>

            <p className="mt-2 text-sm font-semibold capitalize text-[#242424]">
              {profile.role}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}