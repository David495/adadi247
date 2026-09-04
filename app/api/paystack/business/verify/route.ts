import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function POST(req: Request) {
  try {
    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment reference is required.",
        },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

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

    const adminSupabase = createAdminClient();

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
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

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData?.data
    ) {
      console.error("PAYSTACK VERIFY ERROR:", paystackData);

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
            "Unable to verify payment with Paystack.",
        },
        { status: 502 }
      );
    }

    const transaction = paystackData.data;

    if (transaction.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          error: `Payment is currently ${
            transaction.status || "not successful"
          }.`,
          status: transaction.status,
        },
        { status: 400 }
      );
    }

    if (transaction.reference !== reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment reference mismatch.",
        },
        { status: 400 }
      );
    }

    if (String(transaction.currency).toUpperCase() !== "NGN") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment currency.",
        },
        { status: 400 }
      );
    }

    const metadata = transaction.metadata;

    if (!metadata || metadata.type !== "business_subscription") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid subscription payment metadata.",
        },
        { status: 400 }
      );
    }

    const businessId = metadata.businessId;
    const ownerId = metadata.ownerId;

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "Business information is missing from this payment.",
        },
        { status: 400 }
      );
    }

    const { data: business, error: businessError } = await adminSupabase
      .from("businesses")
      .select("id, owner_id, name, status, onboarding_status")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      console.error("BUSINESS LOOKUP ERROR:", businessError);

      return NextResponse.json(
        {
          success: false,
          error: "Business associated with this payment was not found.",
        },
        { status: 404 }
      );
    }

    if (ownerId && business.owner_id !== ownerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment ownership verification failed.",
        },
        { status: 403 }
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

    if (subscriptionPeriod !== "monthly" || subscriptionDuration !== 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid subscription configuration.",
        },
        { status: 500 }
      );
    }

    const expectedAmount = Math.round(subscriptionFee * 100);

    if (Number(transaction.amount) !== expectedAmount) {
      console.error("PAYMENT AMOUNT MISMATCH:", {
        expected: expectedAmount,
        received: transaction.amount,
        reference,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Payment amount does not match the subscription fee.",
        },
        { status: 400 }
      );
    }

    let { data: existingPayment, error: paymentLookupError } =
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
        .eq("reference", reference)
        .maybeSingle();

    if (paymentLookupError) {
      console.error(
        "SUBSCRIPTION PAYMENT LOOKUP ERROR:",
        paymentLookupError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to locate your payment record.",
        },
        { status: 500 }
      );
    }

    /*
     * Paystack says the payment succeeded.
     * If ADADI somehow doesn't have the payment row, recover it.
     */
    if (!existingPayment) {
      console.warn(
        "RECOVERING MISSING VERIFIED BUSINESS PAYMENT:",
        reference
      );

      const { data: recoveredPayment, error: recoveryError } =
        await adminSupabase
          .from("subscription_payments")
          .insert({
            business_id: business.id,
            subscription_id: null,
            reference,
            amount: subscriptionFee,
            status: "success",
          })
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
          .single();

      if (recoveryError || !recoveredPayment) {
        const { data: concurrentPayment } = await adminSupabase
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
          .eq("reference", reference)
          .maybeSingle();

        if (!concurrentPayment) {
          console.error(
            "PAYMENT RECOVERY ERROR:",
            recoveryError
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "Paystack confirmed your payment, but ADADI could not save the payment record. Please contact ADADI support. Do not pay again.",
            },
            { status: 500 }
          );
        }

        existingPayment = concurrentPayment;
      } else {
        existingPayment = recoveredPayment;
      }
    }

    if (existingPayment.business_id !== business.id) {
      return NextResponse.json(
        {
          success: false,
          error: "This payment does not belong to this business.",
        },
        { status: 403 }
      );
    }

    /*
     * Already completely processed.
     * This prevents a refresh from creating another subscription.
     */
    if (
      existingPayment.status === "success" &&
      existingPayment.subscription_id
    ) {
      const { data: subscription } = await adminSupabase
        .from("subscriptions")
        .select(
          "id, business_id, plan_name, amount, status, starts_at, expires_at"
        )
        .eq("id", existingPayment.subscription_id)
        .maybeSingle();

      if (subscription) {
        await adminSupabase
          .from("businesses")
          .update({
            status: "approved",
            onboarding_status: "complete",
          })
          .eq("id", business.id);

        return NextResponse.json({
          success: true,
          message: "Payment has already been processed.",
          businessName: business.name,
          businessId: business.id,
          subscriptionId: subscription.id,
          subscription,
          reference,
          paymentStatus: "success",
        });
      }
    }

    /*
     * If the payment is success but wasn't linked, first see whether
     * another verification request already created the subscription.
     */
    if (
      existingPayment.status === "success" &&
      !existingPayment.subscription_id
    ) {
      const { data: activeSubscription } = await adminSupabase
        .from("subscriptions")
        .select(
          "id, business_id, plan_name, amount, status, starts_at, expires_at"
        )
        .eq("business_id", business.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSubscription) {
        const { error: linkError } = await adminSupabase
          .from("subscription_payments")
          .update({
            subscription_id: activeSubscription.id,
          })
          .eq("id", existingPayment.id)
          .eq("business_id", business.id);

        if (linkError) {
          console.error(
            "PAYMENT SUBSCRIPTION LINK ERROR:",
            linkError
          );
        }

        await adminSupabase
          .from("businesses")
          .update({
            status: "approved",
            onboarding_status: "complete",
          })
          .eq("id", business.id);

        return NextResponse.json({
          success: true,
          message: "Payment has already been processed.",
          businessName: business.name,
          businessId: business.id,
          subscriptionId: activeSubscription.id,
          subscription: activeSubscription,
          reference,
          paymentStatus: "success",
        });
      }
    }

    const { data: activeSubscription, error: activeSubscriptionError } =
      await adminSupabase
        .from("subscriptions")
        .select(
          "id, business_id, plan_name, amount, status, starts_at, expires_at"
        )
        .eq("business_id", business.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (activeSubscriptionError) {
      console.error(
        "ACTIVE SUBSCRIPTION LOOKUP ERROR:",
        activeSubscriptionError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to check your subscription.",
        },
        { status: 500 }
      );
    }

    let subscription;

    if (activeSubscription) {
      const now = new Date();
      const currentExpiry = new Date(activeSubscription.expires_at);

      const extensionStart =
        currentExpiry.getTime() > now.getTime()
          ? currentExpiry
          : now;

      const newExpiry = addMonths(extensionStart, 3);

      const { data: updatedSubscription, error: updateError } =
        await adminSupabase
          .from("subscriptions")
          .update({
            plan_name: "3 months",
            amount: subscriptionFee,
            status: "active",
            expires_at: newExpiry.toISOString(),
          })
          .eq("id", activeSubscription.id)
          .select(
            "id, business_id, plan_name, amount, status, starts_at, expires_at"
          )
          .single();

      if (updateError || !updatedSubscription) {
        console.error(
          "SUBSCRIPTION UPDATE ERROR:",
          updateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was confirmed, but we could not update your subscription. Please contact ADADI support. Do not pay again.",
          },
          { status: 500 }
        );
      }

      subscription = updatedSubscription;
    } else {
      const startsAt = new Date();
      const expiresAt = addMonths(startsAt, 3);

      const { data: newSubscription, error: insertError } =
        await adminSupabase
          .from("subscriptions")
          .insert({
            business_id: business.id,
            plan_name: "3 months",
            amount: subscriptionFee,
            status: "active",
            starts_at: startsAt.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .select(
            "id, business_id, plan_name, amount, status, starts_at, expires_at"
          )
          .single();

      if (insertError || !newSubscription) {
        console.error(
          "SUBSCRIPTION CREATION ERROR:",
          insertError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was confirmed, but we could not create your subscription. Please contact ADADI support. Do not pay again.",
          },
          { status: 500 }
        );
      }

      subscription = newSubscription;
    }

    const { data: updatedPayment, error: paymentUpdateError } =
      await adminSupabase
        .from("subscription_payments")
        .update({
          subscription_id: subscription.id,
          business_id: business.id,
          amount: subscriptionFee,
          status: "success",
        })
        .eq("id", existingPayment.id)
        .eq("business_id", business.id)
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
        .single();

    if (paymentUpdateError || !updatedPayment) {
      console.error(
        "SUBSCRIPTION PAYMENT UPDATE ERROR:",
        paymentUpdateError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was confirmed, but ADADI could not finish recording it. Please contact ADADI support. Do not pay again.",
        },
        { status: 500 }
      );
    }

    const { error: businessUpdateError } = await adminSupabase
      .from("businesses")
      .update({
        status: "approved",
        onboarding_status: "complete",
      })
      .eq("id", business.id);

    if (businessUpdateError) {
      console.error(
        "BUSINESS STATUS UPDATE ERROR:",
        businessUpdateError
      );

      return NextResponse.json({
        success: true,
        message:
          "Payment successful. Your subscription is active, but your business status may take a moment to update.",
        businessName: business.name,
        businessId: business.id,
        subscriptionId: subscription.id,
        subscription,
        reference,
        paymentStatus: "success",
      });
    }

    return NextResponse.json({
      success: true,
      message:
        "Payment verified and subscription activated successfully.",
      businessName: business.name,
      businessId: business.id,
      subscriptionId: subscription.id,
      subscription,
      reference,
      paymentStatus: "success",
    });
  } catch (error) {
    console.error("BUSINESS PAYMENT VERIFICATION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while verifying your payment. Please do not pay again.",
      },
      { status: 500 }
    );
  }
}