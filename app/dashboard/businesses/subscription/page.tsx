import {
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Store,
  Clock3,
  CalendarDays,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";
import SubscriptionPaymentButton from "./SubscriptionPaymentButton";

export default async function SubscriptionPage() {
  const supabase = await createClient();

  const { data: platformSettings, error: settingsError } =
    await supabase
      .from("platform_settings")
      .select(
        `
          business_subscription_fee,
          subscription_period,
          subscription_duration
        `
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (settingsError) {
    console.error(
      "SUBSCRIPTION SETTINGS ERROR:",
      settingsError
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let business: {
    id: string;
    name: string;
  } | null = null;

  if (user) {
    const {
      data: businessData,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

    if (businessError) {
      console.error(
        "BUSINESS FETCH ERROR:",
        businessError
      );
    }

    business = businessData;
  }

  const subscriptionFee = Number(
    platformSettings?.business_subscription_fee ?? 0
  );

  const subscriptionPeriod =
    platformSettings?.subscription_period ?? "weekly";

  const subscriptionDuration = Number(
    platformSettings?.subscription_duration ?? 1
  );

  const formattedFee = new Intl.NumberFormat(
    "en-NG"
  ).format(subscriptionFee);

  const periodLabel =
    subscriptionPeriod === "weekly"
      ? subscriptionDuration === 1
        ? "per week"
        : `per ${subscriptionDuration} weeks`
      : subscriptionDuration === 1
        ? "per month"
        : `per ${subscriptionDuration} months`;

  let subscription: {
    id: string;
    plan_name: string | null;
    amount: number | null;
    status: string | null;
    starts_at: string | null;
    expires_at: string | null;
  } | null = null;

  if (business) {
    const {
      data: subscriptionData,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select(
        `
          id,
          plan_name,
          amount,
          status,
          starts_at,
          expires_at
        `
      )
      .eq("business_id", business.id)
      .order("expires_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      console.error(
        "SUBSCRIPTION FETCH ERROR:",
        subscriptionError
      );
    }

    subscription = subscriptionData;
  }

  const now = new Date();

  const expiresAt = subscription?.expires_at
    ? new Date(subscription.expires_at)
    : null;

  const startsAt = subscription?.starts_at
    ? new Date(subscription.starts_at)
    : null;

  const normalizedSubscriptionStatus =
    subscription?.status?.trim().toLowerCase() || "";

  const successfulStatuses = [
    "active",
    "paid",
    "success",
    "successful",
    "completed",
    "confirmed",
  ];

  const paymentLooksSuccessful =
    successfulStatuses.includes(
      normalizedSubscriptionStatus
    );

  const dateIsValid =
    !!expiresAt &&
    !Number.isNaN(expiresAt.getTime());

  const hasStarted =
    !startsAt ||
    Number.isNaN(startsAt.getTime()) ||
    startsAt.getTime() <= now.getTime();

  const hasNotExpired =
    dateIsValid &&
    expiresAt.getTime() > now.getTime();

  const isActive =
    !!subscription &&
    paymentLooksSuccessful &&
    hasStarted &&
    hasNotExpired;

  const isExpired =
    !isActive;

  const daysRemaining =
    isActive && expiresAt
      ? Math.max(
          0,
          Math.ceil(
            (expiresAt.getTime() -
              now.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  const formattedExpiry =
    expiresAt &&
    !Number.isNaN(expiresAt.getTime())
      ? new Intl.DateTimeFormat("en-NG", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(expiresAt)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Account
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
          Subscription
        </h1>

        <p className="mt-2 text-gray-500">
          Manage your ADADI business subscription and plan.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-[#faf7f7] px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
              <CreditCard
                size={22}
                className="text-[#8B1E3F]"
              />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
                Current Plan
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Your ADADI business subscription
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  ADADI Business
                </h2>

                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
                    <CheckCircle2 size={14} />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                    <Clock3 size={14} />
                    Expired
                  </span>
                )}
              </div>

              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
                Your ADADI business subscription gives you
                access to your storefront, product management
                and secure customer payments.
              </p>

              {isActive && formattedExpiry && (
                <div className="mt-6 flex flex-wrap gap-4">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <CalendarDays
                      size={18}
                      className="text-[#8B1E3F]"
                    />

                    <div>
                      <p className="text-xs text-gray-500">
                        Renews / expires
                      </p>

                      <p className="text-sm font-semibold text-gray-900">
                        {formattedExpiry}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <Clock3
                      size={18}
                      className="text-[#8B1E3F]"
                    />

                    <div>
                      <p className="text-xs text-gray-500">
                        Time remaining
                      </p>

                      <p className="text-sm font-semibold text-gray-900">
                        {daysRemaining}{" "}
                        {daysRemaining === 1
                          ? "day"
                          : "days"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isExpired && (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">
                    Your subscription has expired.
                  </p>

                  <p className="mt-1 text-sm leading-5 text-red-700">
                    Renew your subscription to continue using
                    your ADADI business account.
                  </p>
                </div>
              )}
            </div>

            <div className="w-full shrink-0 lg:w-auto">
              <div className="rounded-2xl bg-[#64152E] px-6 py-5 text-white">
                <p className="text-sm text-white/70">
                  Subscription
                </p>

                <p className="mt-1 text-3xl font-bold">
                  ₦{formattedFee}
                </p>

                <p className="mt-1 text-sm text-white/70">
                  {periodLabel}
                </p>

                {isExpired &&
                  business &&
                  subscriptionFee > 0 && (
                    <div className="mt-5">
                      <SubscriptionPaymentButton
                        businessId={business.id}
                        subscriptionFee={
                          subscriptionFee
                        }
                      />
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            Plan Benefits
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Everything included with your ADADI Business
            subscription.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
              <Store
                size={22}
                className="text-[#8B1E3F]"
              />
            </div>

            <h3 className="mt-5 font-bold text-gray-900">
              Digital Storefront
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Maintain your own public ADADI storefront where
              customers can discover your business.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
              <CheckCircle2
                size={22}
                className="text-[#8B1E3F]"
              />
            </div>

            <h3 className="mt-5 font-bold text-gray-900">
              Product Management
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Add, edit and manage the products and services
              displayed in your storefront.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
              <ShieldCheck
                size={22}
                className="text-[#8B1E3F]"
              />
            </div>

            <h3 className="mt-5 font-bold text-gray-900">
              Secure Payments
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Receive customer payments securely through the
              ADADI payment system.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8B1E3F]/10">
            <CreditCard
              size={21}
              className="text-[#8B1E3F]"
            />
          </div>

          <div>
            <h2 className="font-bold text-gray-900">
              Subscription Payments
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Your subscription payments and renewal
              information will appear here as your payment
              history becomes available.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#8B1E3F]/10 bg-[#8B1E3F]/5 p-6">
        <p className="text-sm font-semibold text-[#64152E]">
          Need help with your subscription?
        </p>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          If you have a question about your plan, payment,
          renewal or business account, contact the ADADI
          support team.
        </p>
      </div>
    </div>
  );
}