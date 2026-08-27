import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "Business ID is required.",
        },
        { status: 400 }
      );
    }

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY IS NOT CONFIGURED"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment service is not properly configured.",
        },
        { status: 500 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      console.error(
        "NEXT_PUBLIC_APP_URL IS NOT CONFIGURED"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Application URL is not configured.",
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "AUTHENTICATION ERROR:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in to make this payment.",
        },
        { status: 401 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your account does not have a valid email address.",
        },
        { status: 400 }
      );
    }

    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select(
        "id, owner_id, name, status, onboarding_status"
      )
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      console.error(
        "BUSINESS NOT FOUND:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Business account not found. Please complete your business registration first.",
        },
        { status: 404 }
      );
    }

    if (business.owner_id !== user.id) {
      console.error(
        "BUSINESS OWNERSHIP ERROR:",
        {
          businessOwner: business.owner_id,
          currentUser: user.id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to pay for this business.",
        },
        { status: 403 }
      );
    }

    if (
      business.onboarding_status === "complete" &&
      business.status === "approved"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business has already completed registration and been approved.",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const {
      data: platformSettings,
      error: platformSettingsError,
    } = await supabaseAdmin
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

    if (
      platformSettingsError ||
      !platformSettings
    ) {
      console.error(
        "PLATFORM SETTINGS ERROR:",
        platformSettingsError
      );

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
      subscriptionFee <= 0
    ) {
      console.error(
        "INVALID SUBSCRIPTION FEE:",
        platformSettings.business_subscription_fee
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The ADADI subscription fee is not configured correctly.",
        },
        { status: 500 }
      );
    }

    if (
      !["weekly", "monthly"].includes(
        subscriptionPeriod
      )
    ) {
      console.error(
        "INVALID SUBSCRIPTION PERIOD:",
        subscriptionPeriod
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The ADADI subscription period is not configured correctly.",
        },
        { status: 500 }
      );
    }

    if (
      !Number.isInteger(subscriptionDuration) ||
      subscriptionDuration < 1 ||
      subscriptionDuration > 3
    ) {
      console.error(
        "INVALID SUBSCRIPTION DURATION:",
        subscriptionDuration
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The ADADI subscription duration is not configured correctly.",
        },
        { status: 500 }
      );
    }

    if (
      subscriptionPeriod === "weekly" &&
      subscriptionDuration !== 1
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Weekly subscriptions must have a duration of 1 week.",
        },
        { status: 500 }
      );
    }

    const paystackAmount = Math.round(
      subscriptionFee * 100
    );

    const reference = `ADADI-${business.id}-${Date.now()}`;

    console.log(
      "ADADI SUBSCRIPTION PAYMENT INITIALIZATION:",
      {
        businessId: business.id,
        businessName: business.name,
        subscriptionFee,
        subscriptionPeriod,
        subscriptionDuration,
        paystackAmount,
        reference,
      }
    );

    const {
      data: existingPayment,
      error: existingPaymentError,
    } = await supabaseAdmin
      .from("subscription_payments")
      .select(
        "id, business_id, reference, amount, status"
      )
      .eq("business_id", business.id)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (existingPaymentError) {
      console.error(
        "EXISTING PAYMENT LOOKUP ERROR:",
        existingPaymentError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check the existing payment record.",
        },
        { status: 500 }
      );
    }

    if (existingPayment) {
      await supabaseAdmin
        .from("subscription_payments")
        .delete()
        .eq("id", existingPayment.id);
    }

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: paystackAmount,
          currency: "NGN",
          reference,
          metadata: {
            type: "business_subscription",
            businessId: business.id,
            ownerId: business.owner_id,
            businessName: business.name,
            subscriptionFee,
            subscriptionPeriod,
            subscriptionDuration,
          },
          callback_url: `${appUrl}/payment/callback`,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error(
        "PAYSTACK INITIALIZATION ERROR:",
        data
      );

      return NextResponse.json(
        {
          success: false,
          error:
            data.message ||
            "Unable to initialize payment.",
        },
        { status: 400 }
      );
    }

    const paystackReference =
      data.data.reference;

    const {
      error: paymentInsertError,
    } = await supabaseAdmin
      .from("subscription_payments")
      .insert({
        business_id: business.id,
        subscription_id: null,
        reference: paystackReference,
        amount: subscriptionFee,
        status: "pending",
      });

    if (paymentInsertError) {
      console.error(
        "SUBSCRIPTION PAYMENT RECORD CREATION ERROR:",
        paymentInsertError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was initialized, but we could not create the payment record. Please contact support before making another payment.",
        },
        { status: 500 }
      );
    }

    console.log(
      "PAYSTACK PAYMENT INITIALIZED SUCCESSFULLY:",
      {
        businessId: business.id,
        businessName: business.name,
        subscriptionFee,
        subscriptionPeriod,
        subscriptionDuration,
        paystackAmount,
        reference: paystackReference,
        authorizationUrl:
          data.data.authorization_url,
      }
    );

    return NextResponse.json({
      success: true,
      authorizationUrl:
        data.data.authorization_url,
      accessCode:
        data.data.access_code,
      reference: paystackReference,
      businessId: business.id,
      subscriptionFee,
      subscriptionPeriod,
      subscriptionDuration,
    });
  } catch (error) {
    console.error(
      "PAYSTACK INITIALIZATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while initializing payment.",
      },
      { status: 500 }
    );
  }
}