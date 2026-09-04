import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { businessId } = await req.json();

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "Business ID is required.",
        },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY is missing.");

      return NextResponse.json(
        {
          success: false,
          error: "Payment service is not configured.",
        },
        { status: 500 }
      );
    }

    if (!appUrl) {
      console.error("NEXT_PUBLIC_APP_URL is missing.");

      return NextResponse.json(
        {
          success: false,
          error: "Application URL is not configured.",
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .single();

    if (businessError || !business) {
      console.error("BUSINESS FETCH ERROR:", businessError);

      return NextResponse.json(
        {
          success: false,
          error: "Business not found.",
        },
        { status: 404 }
      );
    }

    if (
      business.onboarding_status === "complete" &&
      business.status === "approved"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "This business already has an active subscription.",
        },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: existingPendingPayment, error: pendingError } =
      await adminSupabase
        .from("subscription_payments")
        .select("id, reference, amount, status, created_at")
        .eq("business_id", business.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (pendingError) {
      console.error(
        "PENDING SUBSCRIPTION PAYMENT CHECK ERROR:",
        pendingError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to check your existing payment.",
        },
        { status: 500 }
      );
    }

    if (existingPendingPayment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You already have a payment in progress. Please complete that payment before starting another one.",
          reference: existingPendingPayment.reference,
        },
        { status: 409 }
      );
    }

    const { data: settings, error: settingsError } = await adminSupabase
      .from("platform_settings")
      .select(
        "business_subscription_fee, subscription_period, subscription_duration"
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsError || !settings) {
      console.error("PLATFORM SETTINGS ERROR:", settingsError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load subscription settings.",
        },
        { status: 500 }
      );
    }

    const subscriptionFee = Number(settings.business_subscription_fee);
    const subscriptionPeriod = String(settings.subscription_period);
    const subscriptionDuration = Number(settings.subscription_duration);

    if (!Number.isFinite(subscriptionFee) || subscriptionFee <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid subscription fee configuration.",
        },
        { status: 500 }
      );
    }

    if (!["weekly", "monthly"].includes(subscriptionPeriod)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid subscription period configuration.",
        },
        { status: 500 }
      );
    }

    if (
      !Number.isInteger(subscriptionDuration) ||
      subscriptionDuration < 1 ||
      subscriptionDuration > 3
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid subscription duration configuration.",
        },
        { status: 500 }
      );
    }

    if (subscriptionPeriod === "weekly" && subscriptionDuration !== 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Weekly subscriptions must have a duration of 1.",
        },
        { status: 500 }
      );
    }

    const reference = `ADADI-${business.id}-${Date.now()}`;

    const { data: paymentRecord, error: paymentInsertError } =
      await adminSupabase
        .from("subscription_payments")
        .insert({
          business_id: business.id,
          subscription_id: null,
          reference,
          amount: subscriptionFee,
          status: "pending",
        })
        .select("id, business_id, subscription_id, reference, amount, status")
        .single();

    if (paymentInsertError || !paymentRecord) {
      console.error(
        "SUBSCRIPTION PAYMENT RECORD CREATION ERROR:",
        paymentInsertError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to create your payment record. Please try again.",
        },
        { status: 500 }
      );
    }

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(subscriptionFee * 100),
          currency: "NGN",
          reference,
          callback_url: `${appUrl}/payment/callback?type=business`,
          metadata: {
            type: "business_subscription",
            businessId: business.id,
            ownerId: user.id,
            businessName: business.name,
            subscriptionFee,
            subscriptionPeriod,
            subscriptionDuration,
          },
        }),
      }
    );

    const paystackData = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData?.data
    ) {
      console.error("PAYSTACK INITIALIZATION ERROR:", paystackData);

      await adminSupabase
        .from("subscription_payments")
        .update({
          status: "failed",
        })
        .eq("id", paymentRecord.id)
        .eq("status", "pending");

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
            "Unable to initialize payment. Please try again.",
        },
        { status: 502 }
      );
    }

    if (paystackData.data.reference !== reference) {
      console.error("PAYSTACK REFERENCE MISMATCH:", {
        expected: reference,
        received: paystackData.data.reference,
      });

      await adminSupabase
        .from("subscription_payments")
        .update({
          status: "failed",
        })
        .eq("id", paymentRecord.id)
        .eq("status", "pending");

      return NextResponse.json(
        {
          success: false,
          error: "Payment initialization failed. Please try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference,
      payment_id: paymentRecord.id,
    });
  } catch (error) {
    console.error("BUSINESS PAYMENT INITIALIZATION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong while initializing your payment.",
      },
      { status: 500 }
    );
  }
}