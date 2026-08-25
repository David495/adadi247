import {
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Store,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

export default async function SubscriptionPage() {
  const supabase = await createClient();

  const { data: platformSettings, error } = await supabase
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

  if (error) {
    console.error("SUBSCRIPTION SETTINGS ERROR:", error);
  }

  const subscriptionFee = Number(
    platformSettings?.business_subscription_fee ?? 0
  );

  const subscriptionPeriod =
    platformSettings?.subscription_period ?? "weekly";

  const subscriptionDuration = Number(
    platformSettings?.subscription_duration ?? 1
  );

  const formattedFee = new Intl.NumberFormat("en-NG").format(
    subscriptionFee
  );

  const periodLabel =
    subscriptionPeriod === "weekly"
      ? subscriptionDuration === 1
        ? "per week"
        : `per ${subscriptionDuration} weeks`
      : subscriptionDuration === 1
        ? "per month"
        : `per ${subscriptionDuration} months`;

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
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

      {/* CURRENT PLAN */}
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
                Your active ADADI business subscription
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  ADADI Business
                </h2>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
                  <CheckCircle2 size={14} />
                  Active
                </span>
              </div>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                Your business subscription gives you access to
                the ADADI business dashboard and storefront
                management tools.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-[#64152E] px-6 py-5 text-white">
              <p className="text-sm text-white/70">
                Subscription
              </p>

              <p className="mt-1 text-3xl font-bold">
                ₦{formattedFee}
              </p>

              <p className="mt-1 text-sm text-white/70">
                {periodLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PLAN FEATURES */}
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
              Maintain your own public ADADI storefront
              where customers can discover your business.
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
              Receive customer payments securely through
              the ADADI payment system.
            </p>
          </div>
        </div>
      </div>

      {/* PAYMENT INFORMATION */}
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
              Subscription payment history and renewal
              information will appear here as your payment
              history becomes available.
            </p>
          </div>
        </div>
      </div>

      {/* INFORMATION NOTICE */}
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