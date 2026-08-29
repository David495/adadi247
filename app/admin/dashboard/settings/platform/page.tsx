import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/server";

type AdminPlatformSettingsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function AdminPlatformSettingsPage({
  searchParams,
}: AdminPlatformSettingsPageProps) {
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

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/dashboard/customer");
  }

  const {
    data: settings,
    error: settingsError,
  } = await supabase
    .from("platform_settings")
    .select(`
      id,
      platform_name,
      platform_description,
      support_email,
      support_phone,
      business_subscription_fee,
      subscription_period,
      subscription_duration,
      transaction_fee,
      commission_rate,
      delivery_fee,
      maintenance_mode,
      created_at,
      updated_at
    `)
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    console.error(
      "ADMIN PLATFORM SETTINGS FETCH ERROR:",
      settingsError
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
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
            Platform Settings
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Manage ADADI-wide platform information, pricing,
            support details, commission, delivery, and maintenance
            settings.
          </p>
        </div>

        {params.success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
            <CheckCircle
              size={20}
              className="mt-0.5 shrink-0"
            />
            <p>{params.success}</p>
          </div>
        )}

        {params.error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {params.error}
          </div>
        )}

        {settingsError ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-8">
            <h2 className="text-lg font-bold text-red-800">
              Unable to load platform settings
            </h2>

            <p className="mt-2 text-sm text-red-700">
              There was a problem connecting to the platform
              settings table. Please check your Supabase
              configuration and try again.
            </p>
          </section>
        ) : !settings ? (
          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7E9EE] text-[#8B1E3F]">
              <Settings size={30} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-[#242424]">
              Platform settings not found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              No platform settings record exists yet. Run the
              SQL setup again to create the default settings
              record.
            </p>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F7E9EE] text-[#8B1E3F]">
                  <Settings size={38} />
                </div>

                <h2 className="mt-5 text-xl font-bold text-[#242424]">
                  Platform Control
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  These settings affect the ADADI marketplace
                  and platform operations.
                </p>
              </div>

              <div className="mt-8 space-y-5 border-t border-gray-100 pt-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Platform
                  </p>

                  <p className="mt-2 font-semibold text-[#242424]">
                    {settings.platform_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Business Subscription
                  </p>

                  <p className="mt-2 font-semibold text-[#8B1E3F]">
                    ₦
                    {Number(
                      settings.business_subscription_fee
                    ).toLocaleString("en-NG")}{" "}
                    {settings.subscription_period === "weekly"
                      ? settings.subscription_duration === 1
                        ? "Week"
                        : "Weeks"
                      : settings.subscription_duration === 1
                      ? "Month"
                      : "Months"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Transaction Fee
                  </p>

                  <p className="mt-2 font-semibold text-[#8B1E3F]">
                    ₦
                    {Number(
                      settings.transaction_fee
                    ).toLocaleString("en-NG")}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Delivery Fee
                  </p>

                  <p className="mt-2 font-semibold text-[#8B1E3F]">
                    ₦
                    {Number(
                      settings.delivery_fee
                    ).toLocaleString("en-NG")}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    ADADI Commission
                  </p>

                  <p className="mt-2 font-semibold text-[#8B1E3F]">
                    {Number(settings.commission_rate).toFixed(2)}%
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Platform Status
                  </p>

                  <span
                    className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      settings.maintenance_mode
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    <ShieldCheck size={14} />

                    {settings.maintenance_mode
                      ? "Maintenance Mode"
                      : "Operational"}
                  </span>
                </div>
              </div>
            </section>

            <section className="xl:col-span-2">
              <form
                action={async (formData) => {
                  "use server";

                  const supabase = await createClient();

                  const {
                    data: { user: currentUser },
                  } = await supabase.auth.getUser();

                  if (!currentUser) {
                    redirect("/admin-login");
                  }

                  const { data: adminProfile } =
                    await supabase
                      .from("profiles")
                      .select("id, role")
                      .eq("id", currentUser.id)
                      .maybeSingle();

                  if (
                    !adminProfile ||
                    adminProfile.role !== "admin"
                  ) {
                    redirect("/dashboard/customer");
                  }

                  const platformName = String(
                    formData.get("platform_name") ?? ""
                  ).trim();

                  const platformDescription = String(
                    formData.get("platform_description") ?? ""
                  ).trim();

                  const supportEmail = String(
                    formData.get("support_email") ?? ""
                  ).trim();

                  const supportPhone = String(
                    formData.get("support_phone") ?? ""
                  ).trim();

                  const businessSubscriptionFee = Number(
                    formData.get(
                      "business_subscription_fee"
                    ) ?? 0
                  );

                  const subscriptionPeriod = String(
                    formData.get("subscription_period") ?? ""
                  );

                  const subscriptionDuration = Number(
                    formData.get("subscription_duration") ?? 0
                  );

                  const transactionFee = Number(
                    formData.get("transaction_fee") ?? 0
                  );

                  const commissionRate = Number(
                    formData.get("commission_rate") ?? 0
                  );

                  const deliveryFee = Number(
                    formData.get("delivery_fee") ?? 0
                  );

                  const maintenanceMode =
                    formData.get("maintenance_mode") === "on";

                  if (!platformName) {
                    redirect(
                      "/admin/dashboard/settings/platform?error=Platform name is required."
                    );
                  }

                  if (
                    !Number.isFinite(
                      businessSubscriptionFee
                    ) ||
                    businessSubscriptionFee < 0
                  ) {
                    redirect(
                      "/admin/dashboard/settings/platform?error=Please enter a valid business subscription fee."
                    );
                  }

                  if (
                    !["weekly", "monthly"].includes(
                      subscriptionPeriod
                    )
                  ) {
                    redirect(
                      "/admin/dashboard/settings/platform?error=Please select a valid subscription period."
                    );
                  }

                  if (
                    !Number.isInteger(
                      subscriptionDuration
                    ) ||
                    subscriptionDuration < 1 ||
                    subscriptionDuration > 3
                  ) {
                    redirect(
                      "/admin/dashboard/settings/platform?error=Please select a valid subscription duration."
                    );
                  }

                  if (
                    subscriptionPeriod === "weekly" &&
                    subscriptionDuration !== 1
                  ) {
                    redirect(
                      "/admin/dashboard/settings/platform?error=Weekly subscriptions can only be 1 week."
                    );
                  }

                  if (
                    !Number.isFinite(transactionFee) ||
                    transactionFee < 0
                  ) {
                    redirect(
                      "/admin/dashboard/settings/platform?error=Please enter a valid transaction fee."
                    );
                  }

                  if (
                    !Number.isFinite(commissionRate) ||
                    commissionRate < 0 ||
                    commissionRate > 100
                  ) {
                    redirect(
                      "/admin/dashboard/settings/platform?error=Please enter a valid commission rate between 0 and 100."
                    );
                  }

                  if (
                    !Number.isFinite(deliveryFee) ||
                    deliveryFee < 0
                  ) {
                    redirect(
                      "/admin/dashboard/settings/platform?error=Please enter a valid delivery fee."
                    );
                  }

                  if (
                    supportEmail &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                      supportEmail
                    )
                  ) {
                    redirect(
                      "/admin/dashboard/settings/platform?error=Please enter a valid support email address."
                    );
                  }

                  const { error: updateError } =
                    await supabase
                      .from("platform_settings")
                      .update({
                        platform_name: platformName,
                        platform_description:
                          platformDescription || null,
                        support_email:
                          supportEmail || null,
                        support_phone:
                          supportPhone || null,
                        business_subscription_fee:
                          businessSubscriptionFee,
                        subscription_period:
                          subscriptionPeriod,
                        subscription_duration:
                          subscriptionDuration,
                        transaction_fee: transactionFee,
                        commission_rate: commissionRate,
                        delivery_fee: deliveryFee,
                        maintenance_mode: maintenanceMode,
                        updated_at:
                          new Date().toISOString(),
                      })
                      .eq("id", settings.id);

                  if (updateError) {
                    console.error(
                      "ADMIN PLATFORM SETTINGS UPDATE ERROR:",
                      updateError
                    );

                    redirect(
                      "/admin/dashboard/settings/platform?error=Unable to save platform settings. Please try again."
                    );
                  }

                  redirect(
                    "/admin/dashboard/settings/platform?success=Platform settings updated successfully."
                  );
                }}
                className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="border-b border-gray-100 pb-6">
                  <h2 className="text-xl font-bold text-[#242424]">
                    General Platform Settings
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Update the information and operational
                    settings for ADADI.
                  </p>
                </div>

                <div className="mt-8 space-y-6">
                  <div>
                    <label
                      htmlFor="platform_name"
                      className="block text-sm font-semibold text-[#242424]"
                    >
                      Platform Name
                    </label>

                    <input
                      id="platform_name"
                      name="platform_name"
                      type="text"
                      required
                      defaultValue={settings.platform_name}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="platform_description"
                      className="block text-sm font-semibold text-[#242424]"
                    >
                      Platform Description
                    </label>

                    <textarea
                      id="platform_description"
                      name="platform_description"
                      rows={4}
                      defaultValue={
                        settings.platform_description ?? ""
                      }
                      className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                      placeholder="Describe what ADADI does..."
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="support_email"
                        className="block text-sm font-semibold text-[#242424]"
                      >
                        Support Email
                      </label>

                      <input
                        id="support_email"
                        name="support_email"
                        type="email"
                        defaultValue={
                          settings.support_email ?? ""
                        }
                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                        placeholder="support@adadi.com"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="support_phone"
                        className="block text-sm font-semibold text-[#242424]"
                      >
                        Support Phone
                      </label>

                      <input
                        id="support_phone"
                        name="support_phone"
                        type="tel"
                        defaultValue={
                          settings.support_phone ?? ""
                        }
                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                        placeholder="+234 800 000 0000"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-[#242424]">
                      Platform Pricing
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Configure the fees and subscription
                      settings used by ADADI.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E8D5DC] bg-[#FCF7F9] p-5">
                    <div>
                      <h3 className="font-bold text-[#242424]">
                        Business Subscription
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Set the amount and duration businesses
                        must pay to use ADADI.
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <div>
                        <label
                          htmlFor="business_subscription_fee"
                          className="block text-sm font-semibold text-[#242424]"
                        >
                          Amount
                        </label>

                        <div className="relative mt-2">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                            ₦
                          </span>

                          <input
                            id="business_subscription_fee"
                            name="business_subscription_fee"
                            type="number"
                            min="1"
                            step="1"
                            required
                            defaultValue={Number(
                              settings.business_subscription_fee
                            )}
                            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-4 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="subscription_period"
                          className="block text-sm font-semibold text-[#242424]"
                        >
                          Billing Period
                        </label>

                        <select
                          id="subscription_period"
                          name="subscription_period"
                          defaultValue={
                            settings.subscription_period ??
                            "monthly"
                          }
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                        >
                          <option value="weekly">
                            Weekly
                          </option>

                          <option value="monthly">
                            Monthly
                          </option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="subscription_duration"
                          className="block text-sm font-semibold text-[#242424]"
                        >
                          Duration
                        </label>

                        <select
                          id="subscription_duration"
                          name="subscription_duration"
                          defaultValue={String(
                            settings.subscription_duration ?? 1
                          )}
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                        >
                          <option value="1">
                            1 Month
                          </option>

                          <option value="2">
                            2 Months
                          </option>

                          <option value="3">
                            3 Months
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-[#E8D5DC] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Current Subscription
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#8B1E3F]">
                        ₦
                        {Number(
                          settings.business_subscription_fee
                        ).toLocaleString("en-NG")}{" "}
                        {settings.subscription_period ===
                        "weekly"
                          ? settings.subscription_duration ===
                            1
                            ? "Week"
                            : "Weeks"
                          : settings.subscription_duration ===
                            1
                          ? "Month"
                          : "Months"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        This is the amount businesses will pay
                        when they subscribe.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="transaction_fee"
                        className="block text-sm font-semibold text-[#242424]"
                      >
                        Transaction Fee
                      </label>

                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                          ₦
                        </span>

                        <input
                          id="transaction_fee"
                          name="transaction_fee"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          defaultValue={Number(
                            settings.transaction_fee
                          )}
                          className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                        />
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        Transaction fee charged by the platform.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="commission_rate"
                        className="block text-sm font-semibold text-[#242424]"
                      >
                        ADADI Commission
                      </label>

                      <div className="relative mt-2">
                        <input
                          id="commission_rate"
                          name="commission_rate"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          required
                          defaultValue={Number(
                            settings.commission_rate
                          )}
                          className="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-10 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                        />

                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                          %
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        Percentage ADADI keeps from each customer
                        order.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="delivery_fee"
                        className="block text-sm font-semibold text-[#242424]"
                      >
                        Delivery Fee
                      </label>

                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                          ₦
                        </span>

                        <input
                          id="delivery_fee"
                          name="delivery_fee"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          defaultValue={Number(
                            settings.delivery_fee
                          )}
                          className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                        />
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        Delivery fee added to customer orders
                        when delivery is selected.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E8D5DC] bg-[#FCF7F9] p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Current Delivery Fee
                    </p>

                    <p className="mt-1 text-2xl font-bold text-[#8B1E3F]">
                      ₦
                      {Number(
                        settings.delivery_fee
                      ).toLocaleString("en-NG")}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      This amount is added to the customer's
                      order when they choose delivery. Pickup
                      orders do not receive a delivery charge.
                    </p>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50">
                      <input
                        type="checkbox"
                        name="maintenance_mode"
                        defaultChecked={
                          settings.maintenance_mode
                        }
                        className="mt-1 h-5 w-5 rounded border-gray-300 text-[#8B1E3F] focus:ring-[#8B1E3F]"
                      />

                      <div>
                        <p className="font-semibold text-[#242424]">
                          Enable Maintenance Mode
                        </p>

                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          Enable this when ADADI needs to be
                          temporarily taken offline for
                          maintenance or major platform updates.
                        </p>
                      </div>
                    </label>
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
                      <CheckCircle size={17} />
                      Save Platform Settings
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}