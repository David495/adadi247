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
      console.error("BUSINESS VERIFICATION ERROR: PAYSTACK_SECRET_KEY missing");

      return NextResponse.json(
        {
          success: false,
          error: "Payment service is not properly configured.",
        },
        { status: 500 }
      );
    }

    const adminSupabase = createAdminClient();

    console.log("BUSINESS VERIFICATION: verifying with Paystack", {
      reference: paymentReference,
    });

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

    console.log("BUSINESS PAYSTACK VERIFICATION RESPONSE:", {
      reference: paymentReference,
      httpStatus: paystackResponse.status,
      ok: paystackResponse.ok,
      status: paystackData?.status,
      message: paystackData?.message,
      transactionStatus: paystackData?.data?.status,
      amount: paystackData?.data?.amount,
      currency: paystackData?.data?.currency,
      metadata: paystackData?.data?.metadata,
    });

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

    console.log("BUSINESS VERIFICATION: looking up business", {
      reference: paymentReference,
      businessId,
    });

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

    console.log("BUSINESS VERIFICATION: business found", {
      reference: paymentReference,
      businessId: business.id,
      businessName: business.name,
      businessStatus: business.status,
    });

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

    console.log("BUSINESS VERIFICATION: loading platform settings", {
      reference: paymentReference,
    });

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
        settings: platformSettings,
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

    console.log("BUSINESS VERIFICATION: subscription settings", {
      reference: paymentReference,
      subscriptionFee,
      subscriptionPeriod,
      subscriptionDuration,
    });

    if (
      !Number.isFinite(subscriptionFee) ||
      subscriptionFee <= 0 ||
      !["weekly", "monthly"].includes(
        subscriptionPeriod || ""
      ) ||
      !Number.isInteger(subscriptionDuration) ||
      subscriptionDuration < 1 ||
      subscriptionDuration > 3
    ) {
      console.error("INVALID SUBSCRIPTION SETTINGS:", {
        reference: paymentReference,
        subscriptionFee,
        subscriptionPeriod,
        subscriptionDuration,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "The ADADI subscription settings are not configured correctly.",
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

    const expectedAmountKobo = Math.round(
      subscriptionFee * 100
    );

    const paidAmountKobo = Number(transaction.amount);

    console.log("BUSINESS VERIFICATION: amount check", {
      reference: paymentReference,
      expectedAmountKobo,
      paidAmountKobo,
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

    console.log(
      "BUSINESS VERIFICATION: checking existing payment record",
      {
        reference: paymentReference,
      }
    );

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

    console.log(
      "BUSINESS VERIFICATION: existing payment result",
      {
        reference: paymentReference,
        exists: Boolean(existingPayment),
        existingPayment,
      }
    );

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
      existingPayment?.status === "success" &&
      existingPayment.subscription_id
    ) {
      console.log(
        "BUSINESS VERIFICATION: payment already processed",
        {
          reference: paymentReference,
          subscriptionId:
            existingPayment.subscription_id,
        }
      );

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
        .eq(
          "id",
          existingPayment.subscription_id
        )
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

    console.log(
      "BUSINESS VERIFICATION: looking for active subscription",
      {
        reference: paymentReference,
        businessId: business.id,
      }
    );

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
        data: updatedSubscription,
        error: updateError,
      } = await adminSupabase
        .from("subscriptions")
        .update({
          plan_name: planName,
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

      if (
        updateError ||
        !updatedSubscription
      ) {
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
        "BUSINESS VERIFICATION: creating new subscription",
        {
          reference: paymentReference,
          businessId: business.id,
        }
      );

      const startsAt = now;
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

      console.log(
        "BUSINESS VERIFICATION: subscription created",
        {
          reference: paymentReference,
          subscriptionId: subscription.id,
          businessId: business.id,
          expiresAt: subscription.expires_at,
        }
      );
    }

    console.log(
      "BUSINESS VERIFICATION: recording successful payment",
      {
        reference: paymentReference,
        subscriptionId: subscription.id,
        businessId: business.id,
      }
    );

    if (existingPayment) {
      const { error } =
        await adminSupabase
          .from("subscription_payments")
          .update({
            subscription_id:
              subscription.id,
            business_id: business.id,
            amount: subscriptionFee,
            status: "success",
          })
          .eq(
            "id",
            existingPayment.id
          );

      if (error) {
        console.error(
          "SUBSCRIPTION PAYMENT UPDATE ERROR:",
          {
            reference: paymentReference,
            subscriptionId: subscription.id,
            error,
          }
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
    } else {
      const { error } =
        await adminSupabase
          .from("subscription_payments")
          .insert({
            subscription_id:
              subscription.id,
            business_id: business.id,
            reference: paymentReference,
            amount: subscriptionFee,
            status: "success",
          });

      if (error) {
        console.error(
          "SUBSCRIPTION PAYMENT INSERT ERROR:",
          {
            reference: paymentReference,
            subscriptionId: subscription.id,
            businessId: business.id,
            error,
          }
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
    }

    console.log(
      "BUSINESS VERIFICATION COMPLETE:",
      {
        reference: paymentReference,
        businessId: business.id,
        businessName: business.name,
        subscriptionId: subscription.id,
        paymentStatus: "success",
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
          "Something went wrong while verifying your business payment. Please try again. If money was deducted, do not pay again.",
      },
      { status: 500 }
    );
  }
}