import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

type PaystackMetadata = {
  type?: string;
  businessId?: string;
  ownerId?: string;
  subscriptionFee?: number | string;
  subscriptionPeriod?: string;
  subscriptionDuration?: number | string;
  [key: string]: unknown;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference } = body as { reference?: string };

    if (!reference?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment reference is required.",
        },
        { status: 400 }
      );
    }

    const paymentReference = reference.trim();
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment service is not properly configured.",
        },
        { status: 500 }
      );
    }

    const adminSupabase = createAdminClient();

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        paymentReference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const paystackData = await paystackResponse.json();

    console.log(
      "BUSINESS PAYSTACK VERIFICATION RESPONSE:",
      paystackData
    );

    if (
      !paystackResponse.ok ||
      !paystackData.status ||
      !paystackData.data
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            paystackData.message ||
            "Unable to verify payment with Paystack.",
        },
        { status: 400 }
      );
    }

    const transaction = paystackData.data;

    if (transaction.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          error: `Payment was not successful. Paystack status: ${
            transaction.status || "unknown"
          }.`,
        },
        { status: 400 }
      );
    }

    if (transaction.reference !== paymentReference) {
      return NextResponse.json(
        {
          success: false,
          error: "The verified payment reference does not match.",
        },
        { status: 400 }
      );
    }

    if (transaction.currency !== "NGN") {
      return NextResponse.json(
        {
          success: false,
          error:
            "The payment currency does not match the expected currency.",
        },
        { status: 400 }
      );
    }

    const metadata = (transaction.metadata || {}) as PaystackMetadata;

    if (metadata.type !== "business_subscription") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment is not a business subscription payment.",
        },
        { status: 400 }
      );
    }

    const businessId = metadata.businessId;

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "The payment is missing the business ID.",
        },
        { status: 400 }
      );
    }

    const { data: platformSettings, error: settingsError } =
      await adminSupabase
        .from("platform_settings")
        .select(
          `
            business_subscription_fee,
            subscription_period,
            subscription_duration
          `
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (settingsError || !platformSettings) {
      console.error("PLATFORM SETTINGS ERROR:", settingsError);

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to retrieve the current ADADI subscription settings.",
        },
        { status: 500 }
      );
    }

    const subscriptionFee = Number(
      platformSettings.business_subscription_fee
    );

    const subscriptionPeriod =
      platformSettings.subscription_period;

    const subscriptionDuration = Number(
      platformSettings.subscription_duration
    );

    if (
      !Number.isFinite(subscriptionFee) ||
      subscriptionFee <= 0 ||
      !["weekly", "monthly"].includes(subscriptionPeriod || "") ||
      !Number.isInteger(subscriptionDuration) ||
      subscriptionDuration <= 0 ||
      subscriptionDuration > 3
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The ADADI subscription settings are not configured correctly.",
        },
        { status: 500 }
      );
    }

    const expectedAmountKobo = Math.round(subscriptionFee * 100);
    const paidAmountKobo = Number(transaction.amount);

    if (paidAmountKobo !== expectedAmountKobo) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The payment amount does not match the current ADADI subscription fee.",
        },
        { status: 400 }
      );
    }

    const { data: business, error: businessError } =
      await adminSupabase
        .from("businesses")
        .select(
          `
            id,
            owner_id,
            name,
            status,
            onboarding_status
          `
        )
        .eq("id", businessId)
        .maybeSingle();

    if (businessError || !business) {
      console.error("BUSINESS LOOKUP ERROR:", businessError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to find your business account.",
        },
        { status: 404 }
      );
    }

    if (
      metadata.ownerId &&
      metadata.ownerId !== business.owner_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The payment does not belong to this business account.",
        },
        { status: 403 }
      );
    }

    const { data: existingPayment, error: paymentLookupError } =
      await adminSupabase
        .from("subscription_payments")
        .select(
          `
            id,
            business_id,
            subscription_id,
            reference,
            amount,
            status
          `
        )
        .eq("reference", paymentReference)
        .maybeSingle();

    if (paymentLookupError) {
      console.error(
        "SUBSCRIPTION PAYMENT LOOKUP ERROR:",
        paymentLookupError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify the subscription payment record.",
        },
        { status: 500 }
      );
    }

    if (
      existingPayment &&
      existingPayment.business_id !== business.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment reference belongs to another business.",
        },
        { status: 403 }
      );
    }

    if (
      existingPayment?.subscription_id &&
      ["success", "paid"].includes(existingPayment.status)
    ) {
      const { data: existingSubscription } =
        await adminSupabase
          .from("subscriptions")
          .select(
            "id, status, starts_at, expires_at"
          )
          .eq("id", existingPayment.subscription_id)
          .maybeSingle();

      if (existingSubscription) {
        return NextResponse.json({
          success: true,
          message:
            "Business payment was already processed successfully.",
          businessId: business.id,
          businessName: business.name,
          reference: paymentReference,
          subscriptionId: existingSubscription.id,
          subscriptionFee,
          subscriptionPeriod,
          subscriptionDuration,
          businessStatus: business.status,
          paymentStatus: "success",
          awaitingApproval:
            business.status !== "approved",
        });
      }
    }

    let subscription = null;

    if (existingPayment?.subscription_id) {
      const { data: linkedSubscription } =
        await adminSupabase
          .from("subscriptions")
          .select(
            "id, status, starts_at, expires_at"
          )
          .eq("id", existingPayment.subscription_id)
          .maybeSingle();

      subscription = linkedSubscription;
    }

    if (!subscription) {
      const now = new Date();

      const { data: existingActiveSubscription } =
        await adminSupabase
          .from("subscriptions")
          .select(
            "id, status, starts_at, expires_at"
          )
          .eq("business_id", business.id)
          .eq("status", "active")
          .order("expires_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      let startsAt = new Date();

      if (existingActiveSubscription?.expires_at) {
        const existingExpiry = new Date(
          existingActiveSubscription.expires_at
        );

        if (existingExpiry.getTime() > now.getTime()) {
          startsAt = existingExpiry;
        }
      }

      const expiresAt = new Date(startsAt);

      if (subscriptionPeriod === "weekly") {
        expiresAt.setDate(
          expiresAt.getDate() +
            7 * subscriptionDuration
        );
      } else {
        expiresAt.setMonth(
          expiresAt.getMonth() +
            subscriptionDuration
        );
      }

      const planName =
        subscriptionPeriod === "weekly"
          ? subscriptionDuration === 1
            ? "1 week"
            : `${subscriptionDuration} weeks`
          : subscriptionDuration === 1
          ? "1 month"
          : `${subscriptionDuration} months`;

      const {
        data: createdSubscription,
        error: subscriptionError,
      } = await adminSupabase
        .from("subscriptions")
        .insert({
          business_id: business.id,
          plan_name: planName,
          amount: subscriptionFee,
          status: "active",
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (subscriptionError || !createdSubscription) {
        console.error(
          "SUBSCRIPTION CREATION ERROR:",
          subscriptionError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was successful, but we could not activate your subscription yet. Please try again.",
          },
          { status: 500 }
        );
      }

      subscription = createdSubscription;
    }

    let paymentRecordError = null;

    if (existingPayment) {
      const { error } = await adminSupabase
        .from("subscription_payments")
        .update({
          subscription_id: subscription.id,
          business_id: business.id,
          amount: subscriptionFee,
          status: "success",
          payment_method:
            transaction.channel || "paystack",
          paid_at:
            transaction.paid_at ||
            new Date().toISOString(),
        })
        .eq("id", existingPayment.id);

      paymentRecordError = error;
    } else {
      const { error } = await adminSupabase
        .from("subscription_payments")
        .insert({
          subscription_id: subscription.id,
          business_id: business.id,
          reference: paymentReference,
          amount: subscriptionFee,
          status: "success",
          payment_method:
            transaction.channel || "paystack",
          paid_at:
            transaction.paid_at ||
            new Date().toISOString(),
        });

      paymentRecordError = error;
    }

    if (paymentRecordError) {
      console.error(
        "SUBSCRIPTION PAYMENT RECORD ERROR:",
        paymentRecordError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was successful, but we could not finish recording it. Please try verification again. Do not pay again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Payment verified successfully. Your business is now awaiting admin approval.",
      businessId: business.id,
      businessName: business.name,
      reference: paymentReference,
      subscriptionFee,
      subscriptionPeriod,
      subscriptionDuration,
      subscriptionId: subscription.id,
      businessStatus: business.status,
      paymentStatus: "success",
      awaitingApproval:
        business.status !== "approved",
    });
  } catch (error) {
    console.error(
      "BUSINESS PAYMENT VERIFICATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while verifying your business payment. Please try again.",
      },
      { status: 500 }
    );
  }
}