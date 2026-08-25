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

type PaystackTransaction = {
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  channel?: string;
  paid_at?: string;
  metadata?: PaystackMetadata;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { reference } = body as {
      reference?: string;
    };

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

    const adminSupabase = createAdminClient();

    // =========================================
    // 1. VERIFY PAYMENT WITH PAYSTACK
    // =========================================

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

    const transaction =
      paystackData.data as PaystackTransaction;

    // =========================================
    // 2. VERIFY PAYMENT STATUS
    // =========================================

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

    // =========================================
    // 3. VERIFY REFERENCE
    // =========================================

    if (transaction.reference !== paymentReference) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The verified payment reference does not match.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 4. VERIFY CURRENCY
    // =========================================

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

    // =========================================
    // 5. VERIFY METADATA
    // =========================================

    const metadata = transaction.metadata;

    if (!metadata) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment does not contain the required business information.",
        },
        { status: 400 }
      );
    }

    if (
      metadata.type !==
      "business_subscription"
    ) {
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
          error:
            "The payment is missing the business ID.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 6. GET CURRENT SUBSCRIPTION SETTINGS
    // =========================================

    const {
      data: platformSettings,
      error: platformSettingsError,
    } = await adminSupabase
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
      return NextResponse.json(
        {
          success: false,
          error:
            "The ADADI subscription fee is not configured correctly.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 7. VERIFY PAYMENT AMOUNT
    // =========================================

    const expectedAmountKobo = Math.round(
      subscriptionFee * 100
    );

    const paidAmountKobo = Number(
      transaction.amount || 0
    );

    if (
      paidAmountKobo !== expectedAmountKobo
    ) {
      console.error(
        "BUSINESS PAYMENT AMOUNT MISMATCH:",
        {
          businessId,
          expectedAmountKobo,
          paidAmountKobo,
          expectedNaira: subscriptionFee,
          receivedNaira:
            paidAmountKobo / 100,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The payment amount does not match the current ADADI subscription fee.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 8. FIND BUSINESS
    // =========================================

    const {
      data: business,
      error: businessError,
    } = await adminSupabase
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

    if (businessError) {
      console.error(
        "BUSINESS LOOKUP ERROR:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to find your business account.",
        },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error: "Business account not found.",
        },
        { status: 404 }
      );
    }

    // =========================================
    // 9. VERIFY OWNER
    // =========================================

    if (
      metadata.ownerId &&
      metadata.ownerId !== business.owner_id
    ) {
      console.error(
        "BUSINESS OWNER MISMATCH:",
        {
          businessOwner: business.owner_id,
          paymentOwner: metadata.ownerId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The payment does not belong to this business account.",
        },
        { status: 403 }
      );
    }

    // =========================================
    // 10. CHECK WHETHER THIS PAYMENT ALREADY EXISTS
    // =========================================

    const {
      data: existingPayment,
      error: existingPaymentError,
    } = await adminSupabase
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

    if (existingPaymentError) {
      console.error(
        "SUBSCRIPTION PAYMENT LOOKUP ERROR:",
        existingPaymentError
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

    // =========================================
    // 11. IF ALREADY FULLY PROCESSED, RETURN SUCCESS
    // =========================================

    if (
      existingPayment &&
      existingPayment.business_id === business.id &&
      existingPayment.subscription_id
    ) {
      console.log(
        "BUSINESS PAYMENT ALREADY PROCESSED:",
        paymentReference
      );

      return NextResponse.json({
        success: true,
        message:
          "Business payment was already processed successfully.",
        businessId: business.id,
        businessName: business.name,
        reference: paymentReference,
        subscriptionId:
          existingPayment.subscription_id,
        subscriptionFee,
        subscriptionPeriod,
        subscriptionDuration,
      });
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

    // =========================================
    // 12. FIND ACTIVE SUBSCRIPTION
    // =========================================

    const {
      data: existingSubscription,
      error: existingSubscriptionError,
    } = await adminSupabase
      .from("subscriptions")
      .select(
        `
          id,
          status,
          starts_at,
          expires_at
        `
      )
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("expires_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (existingSubscriptionError) {
      console.error(
        "EXISTING SUBSCRIPTION ERROR:",
        existingSubscriptionError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check the existing subscription.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 13. CALCULATE SUBSCRIPTION DATES
    // =========================================

    const now = new Date();

    let startsAt = new Date();

    if (existingSubscription?.expires_at) {
      const existingExpiry = new Date(
        existingSubscription.expires_at
      );

      if (
        existingExpiry.getTime() >
        now.getTime()
      ) {
        startsAt = existingExpiry;
      }
    }

    const expiresAt = new Date(startsAt);

    if (subscriptionPeriod === "weekly") {
      expiresAt.setDate(
        expiresAt.getDate() +
          7 * subscriptionDuration
      );
    } else if (
      subscriptionPeriod === "monthly"
    ) {
      expiresAt.setMonth(
        expiresAt.getMonth() +
          subscriptionDuration
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid subscription period configured.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 14. CREATE SUBSCRIPTION
    // =========================================

    const planName =
      subscriptionPeriod === "weekly"
        ? subscriptionDuration === 1
          ? "1 week"
          : `${subscriptionDuration} weeks`
        : subscriptionDuration === 1
        ? "1 month"
        : `${subscriptionDuration} months`;

    const {
      data: subscription,
      error: subscriptionError,
    } = await adminSupabase
      .from("subscriptions")
      .insert({
        business_id: business.id,
        plan_name: planName,
        amount: subscriptionFee,
        status: "active",
        starts_at:
          startsAt.toISOString(),
        expires_at:
          expiresAt.toISOString(),
      })
      .select()
      .single();

    if (
      subscriptionError ||
      !subscription
    ) {
      console.error(
        "SUBSCRIPTION CREATION ERROR:",
        subscriptionError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to create your subscription.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 15. RECORD PAYMENT
    // =========================================

    if (existingPayment) {
      const {
        error: paymentUpdateError,
      } = await adminSupabase
        .from("subscription_payments")
        .update({
          subscription_id:
            subscription.id,
          amount: subscriptionFee,
          status: "paid",
        })
        .eq("id", existingPayment.id);

      if (paymentUpdateError) {
        console.error(
          "SUBSCRIPTION PAYMENT UPDATE ERROR:",
          paymentUpdateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Subscription was created, but the payment record could not be updated.",
          },
          { status: 500 }
        );
      }
    } else {
      const {
        error: paymentInsertError,
      } = await adminSupabase
        .from("subscription_payments")
        .insert({
          subscription_id:
            subscription.id,
          business_id: business.id,
          reference: paymentReference,
          amount: subscriptionFee,
          status: "paid",
          payment_method:
            transaction.channel || "paystack",
          paid_at:
            transaction.paid_at ||
            new Date().toISOString(),
        });

      if (paymentInsertError) {
        console.error(
          "SUBSCRIPTION PAYMENT INSERT ERROR:",
          paymentInsertError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Subscription was created, but the payment could not be recorded.",
          },
          { status: 500 }
        );
      }
    }

    // =========================================
    // 16. ACTIVATE BUSINESS
    // =========================================

    const {
      data: updatedBusiness,
      error: updateBusinessError,
    } = await adminSupabase
      .from("businesses")
      .update({
        status: "approved",
        onboarding_status: "complete",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", business.id)
      .select(
        `
          id,
          name,
          owner_id,
          status,
          onboarding_status
        `
      )
      .single();

    if (
      updateBusinessError ||
      !updatedBusiness
    ) {
      console.error(
        "BUSINESS UPDATE ERROR:",
        updateBusinessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was successful, but we could not activate your business account. Please contact ADADI support.",
        },
        { status: 500 }
      );
    }

    console.log(
      "BUSINESS SUBSCRIPTION VERIFIED SUCCESSFULLY:",
      {
        businessId:
          updatedBusiness.id,
        businessName:
          updatedBusiness.name,
        reference: paymentReference,
        amount: subscriptionFee,
        subscriptionId:
          subscription.id,
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Business payment verified and business account activated successfully.",
      businessId:
        updatedBusiness.id,
      businessName:
        updatedBusiness.name,
      reference: paymentReference,
      subscriptionFee,
      subscriptionPeriod,
      subscriptionDuration,
      subscriptionId:
        subscription.id,
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
          "Something went wrong while verifying your business payment.",
      },
      { status: 500 }
    );
  }
}