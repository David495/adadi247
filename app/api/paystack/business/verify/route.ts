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

type Subscription = {
  id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  plan_name: string;
  amount: number | string;
};

export async function POST(request: Request) {
  let paymentReference = "";

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

    paymentReference = reference.trim();

    console.log("BUSINESS VERIFICATION START:", {
      reference: paymentReference,
    });

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error(
        "BUSINESS VERIFICATION ERROR: PAYSTACK_SECRET_KEY missing"
      );

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

    let paystackData: any;

    try {
      paystackData = await paystackResponse.json();
    } catch {
      console.error("PAYSTACK VERIFICATION INVALID RESPONSE:", {
        reference: paymentReference,
        httpStatus: paystackResponse.status,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Unable to read the payment verification response.",
        },
        { status: 502 }
      );
    }

    console.log("BUSINESS PAYSTACK VERIFICATION RESPONSE:", {
      reference: paymentReference,
      httpStatus: paystackResponse.status,
      ok: paystackResponse.ok,
      status: paystackData?.status,
      message: paystackData?.message,
      transactionStatus: paystackData?.data?.status,
      amount: paystackData?.data?.amount,
      currency: paystackData?.data?.currency,
      paystackReference: paystackData?.data?.reference,
      metadata: paystackData?.data?.metadata,
    });

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData?.data
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
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
      console.error("BUSINESS VERIFICATION REFERENCE MISMATCH:", {
        requestedReference: paymentReference,
        paystackReference: transaction.reference,
      });

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

    console.log("BUSINESS VERIFICATION METADATA:", {
      reference: paymentReference,
      type: metadata.type,
      businessId: metadata.businessId,
      ownerId: metadata.ownerId,
      subscriptionFee: metadata.subscriptionFee,
      subscriptionPeriod: metadata.subscriptionPeriod,
      subscriptionDuration: metadata.subscriptionDuration,
    });

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

    if (businessError || !business) {
      console.error("BUSINESS LOOKUP ERROR:", {
        reference: paymentReference,
        businessId,
        error: businessError,
      });

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
      console.error("BUSINESS OWNER MISMATCH:", {
        reference: paymentReference,
        businessId,
        metadataOwnerId: metadata.ownerId,
        businessOwnerId: business.owner_id,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "The payment does not belong to this business account.",
        },
        { status: 403 }
      );
    }

    const {
      data: platformSettings,
      error: settingsError,
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

    if (settingsError || !platformSettings) {
      console.error("PLATFORM SETTINGS ERROR:", {
        reference: paymentReference,
        error: settingsError,
      });

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

    console.log("BUSINESS VERIFICATION SETTINGS:", {
      reference: paymentReference,
      subscriptionFee,
      subscriptionPeriod,
      subscriptionDuration,
    });

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

    if (subscriptionPeriod !== "monthly") {
      return NextResponse.json(
        {
          success: false,
          error:
            "The current ADADI business subscription must use a monthly billing period.",
        },
        { status: 500 }
      );
    }

    if (subscriptionDuration !== 3) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The current ADADI business subscription must have a duration of 3 months.",
        },
        { status: 500 }
      );
    }

    const expectedAmountKobo = Math.round(
      subscriptionFee * 100
    );

    const paidAmountKobo = Number(transaction.amount);

    console.log("BUSINESS VERIFICATION AMOUNT CHECK:", {
      reference: paymentReference,
      expectedAmountKobo,
      paidAmountKobo,
      expectedNaira: subscriptionFee,
      paidNaira: paidAmountKobo / 100,
    });

    if (paidAmountKobo !== expectedAmountKobo) {
      console.error("BUSINESS PAYMENT AMOUNT MISMATCH:", {
        reference: paymentReference,
        expectedAmountKobo,
        paidAmountKobo,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "The payment amount does not match the current ADADI subscription fee.",
        },
        { status: 400 }
      );
    }

    const {
      data: existingPayment,
      error: paymentLookupError,
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

    if (paymentLookupError) {
      console.error(
        "SUBSCRIPTION PAYMENT LOOKUP ERROR:",
        {
          reference: paymentReference,
          error: paymentLookupError,
        }
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
      console.error("PAYMENT BUSINESS MISMATCH:", {
        reference: paymentReference,
        paymentBusinessId: existingPayment.business_id,
        verifiedBusinessId: business.id,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "This payment reference belongs to another business.",
        },
        { status: 403 }
      );
    }

    console.log("BUSINESS PAYMENT RECORD:", {
      reference: paymentReference,
      exists: Boolean(existingPayment),
      status: existingPayment?.status,
      subscriptionId: existingPayment?.subscription_id,
    });

    if (
      existingPayment?.status === "success" &&
      existingPayment.subscription_id
    ) {
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
            expires_at,
            plan_name,
            amount
          `
        )
        .eq("id", existingPayment.subscription_id)
        .maybeSingle();

      if (existingSubscriptionError) {
        console.error(
          "EXISTING SUBSCRIPTION LOOKUP ERROR:",
          {
            reference: paymentReference,
            error: existingSubscriptionError,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to retrieve your existing subscription.",
          },
          { status: 500 }
        );
      }

      if (!existingSubscription) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This payment was recorded, but its subscription could not be found. Please contact ADADI support.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Business payment was already processed successfully.",
        businessId: business.id,
        businessName: business.name,
        reference: paymentReference,
        subscriptionFee,
        subscriptionPeriod,
        subscriptionDuration,
        subscriptionId: existingSubscription.id,
        businessStatus: business.status,
        paymentStatus: "success",
        awaitingApproval:
          business.status !== "approved",
      });
    }

    if (
      existingPayment?.status === "success" &&
      !existingPayment.subscription_id
    ) {
      console.log(
        "BUSINESS VERIFICATION: payment marked successful but subscription missing; checking for recovery",
        {
          reference: paymentReference,
          businessId: business.id,
        }
      );

      const {
        data: activeSubscription,
        error: activeSubscriptionError,
      } = await adminSupabase
        .from("subscriptions")
        .select(
          `
            id,
            status,
            starts_at,
            expires_at,
            plan_name,
            amount
          `
        )
        .eq("business_id", business.id)
        .eq("status", "active")
        .order("expires_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (activeSubscriptionError) {
        console.error(
          "RECOVERY ACTIVE SUBSCRIPTION LOOKUP ERROR:",
          {
            reference: paymentReference,
            error: activeSubscriptionError,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was successful, but we could not recover the subscription automatically. Please contact ADADI support.",
          },
          { status: 500 }
        );
      }

      if (activeSubscription) {
        await adminSupabase
          .from("subscription_payments")
          .update({
            subscription_id: activeSubscription.id,
            business_id: business.id,
            amount: subscriptionFee,
            status: "success",
          })
          .eq("id", existingPayment.id);

        return NextResponse.json({
          success: true,
          message:
            "Business payment was already processed successfully.",
          businessId: business.id,
          businessName: business.name,
          reference: paymentReference,
          subscriptionFee,
          subscriptionPeriod,
          subscriptionDuration,
          subscriptionId: activeSubscription.id,
          businessStatus: business.status,
          paymentStatus: "success",
          awaitingApproval:
            business.status !== "approved",
        });
      }
    }

    if (!existingPayment) {
      console.error(
        "BUSINESS PAYMENT RECORD MISSING FOR VERIFIED PAYSTACK TRANSACTION:",
        {
          reference: paymentReference,
          businessId: business.id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack confirmed your payment, but ADADI could not find its payment record. Please contact ADADI support. Do not pay again.",
        },
        { status: 500 }
      );
    }

    if (existingPayment.status === "pending") {
      console.log(
        "BUSINESS VERIFICATION: pending payment confirmed by Paystack",
        {
          reference: paymentReference,
          paymentId: existingPayment.id,
        }
      );
    }

    const {
      data: existingActiveSubscription,
      error: activeError,
    } = await adminSupabase
      .from("subscriptions")
      .select(
        `
          id,
          status,
          starts_at,
          expires_at,
          plan_name,
          amount
        `
      )
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("expires_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (activeError) {
      console.error(
        "ACTIVE SUBSCRIPTION LOOKUP ERROR:",
        {
          reference: paymentReference,
          businessId: business.id,
          error: activeError,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to retrieve your current subscription.",
        },
        { status: 500 }
      );
    }

    const now = new Date();

    let subscription: Subscription;

    if (existingActiveSubscription) {
      console.log(
        "BUSINESS VERIFICATION: extending existing subscription",
        {
          reference: paymentReference,
          subscriptionId:
            existingActiveSubscription.id,
          currentExpiresAt:
            existingActiveSubscription.expires_at,
        }
      );

      const currentExpiry = new Date(
        existingActiveSubscription.expires_at
      );

      const startsAt =
        currentExpiry.getTime() > now.getTime()
          ? currentExpiry
          : now;

      const expiresAt = new Date(startsAt);

      expiresAt.setMonth(
        expiresAt.getMonth() + 3
      );

      const {
        data: updatedSubscription,
        error: updateError,
      } = await adminSupabase
        .from("subscriptions")
        .update({
          plan_name: "3 months",
          amount: subscriptionFee,
          status: "active",
          starts_at:
            existingActiveSubscription.starts_at,
          expires_at: expiresAt.toISOString(),
        })
        .eq(
          "id",
          existingActiveSubscription.id
        )
        .select()
        .single();

      if (updateError || !updatedSubscription) {
        console.error(
          "SUBSCRIPTION UPDATE ERROR:",
          {
            reference: paymentReference,
            subscriptionId:
              existingActiveSubscription.id,
            error: updateError,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was successful, but we could not update your subscription. Please try verification again. Do not pay again.",
          },
          { status: 500 }
        );
      }

      subscription =
        updatedSubscription as Subscription;
    } else {
      console.log(
        "BUSINESS VERIFICATION: creating new 3-month subscription",
        {
          reference: paymentReference,
          businessId: business.id,
        }
      );

      const startsAt = now;
      const expiresAt = new Date(startsAt);

      expiresAt.setMonth(
        expiresAt.getMonth() + 3
      );

      const {
        data: createdSubscription,
        error: subscriptionError,
      } = await adminSupabase
        .from("subscriptions")
        .insert({
          business_id: business.id,
          plan_name: "3 months",
          amount: subscriptionFee,
          status: "active",
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (
        subscriptionError ||
        !createdSubscription
      ) {
        console.error(
          "SUBSCRIPTION CREATION ERROR:",
          {
            reference: paymentReference,
            businessId: business.id,
            error: subscriptionError,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was successful, but we could not activate your subscription yet. Please try verification again. Do not pay again.",
          },
          { status: 500 }
        );
      }

      subscription =
        createdSubscription as Subscription;
    }

    console.log(
      "BUSINESS VERIFICATION: subscription ready",
      {
        reference: paymentReference,
        subscriptionId: subscription.id,
        businessId: business.id,
        expiresAt: subscription.expires_at,
      }
    );

    const {
      error: paymentUpdateError,
    } = await adminSupabase
      .from("subscription_payments")
      .update({
        subscription_id: subscription.id,
        business_id: business.id,
        amount: subscriptionFee,
        status: "success",
      })
      .eq("id", existingPayment.id);

    if (paymentUpdateError) {
      console.error(
        "SUBSCRIPTION PAYMENT UPDATE ERROR:",
        {
          reference: paymentReference,
          paymentId: existingPayment.id,
          subscriptionId: subscription.id,
          error: paymentUpdateError,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was successful and your subscription was created, but we could not finish linking the payment record. Please try verification again. Do not pay again.",
        },
        { status: 500 }
      );
    }

    console.log(
      "BUSINESS VERIFICATION COMPLETE:",
      {
        reference: paymentReference,
        businessId: business.id,
        businessName: business.name,
        subscriptionId: subscription.id,
        paymentStatus: "success",
        subscriptionStatus: subscription.status,
        expiresAt: subscription.expires_at,
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Payment verified successfully. Your business subscription is active.",
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
      {
        reference: paymentReference,
        error,
      }
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while verifying your business payment. If money was deducted, do not pay again. Please try verification again.",
      },
      { status: 500 }
    );
  }
}