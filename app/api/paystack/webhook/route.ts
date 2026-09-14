import { NextResponse } from "next/server";

import crypto from "crypto";

import { createAdminClient } from "@/app/lib/supabase/admin";

function amountsMatch(
  first: number,
  second: number
) {
  return (
    Math.abs(
      Number(first) - Number(second)
    ) <= 0.01
  );
}

export async function POST(request: Request) {
  const adminSupabase =
    createAdminClient();

  try {
    const signature =
      request.headers.get(
        "x-paystack-signature"
      );

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error(
        "PAYSTACK SECRET KEY IS MISSING."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment service is not configured.",
        },
        { status: 500 }
      );
    }

    const rawBody =
      await request.text();

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing Paystack signature.",
        },
        { status: 401 }
      );
    }

    const expectedSignature =
      crypto
        .createHmac(
          "sha512",
          paystackSecretKey
        )
        .update(rawBody)
        .digest("hex");

    if (
      signature !==
      expectedSignature
    ) {
      console.error(
        "INVALID PAYSTACK WEBHOOK SIGNATURE."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook signature.",
        },
        { status: 401 }
      );
    }

    const event =
      JSON.parse(rawBody);

    if (
      event?.event !==
      "charge.success"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Event received.",
      });
    }

    const payment =
      event?.data;

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid Paystack webhook payload.",
        },
        { status: 400 }
      );
    }

    const metadata =
      payment.metadata || {};

    const paymentType =
      metadata.type;

    /*
     * BUSINESS SUBSCRIPTION
     */
    if (
      paymentType ===
      "business_subscription"
    ) {
      const businessId =
        metadata.businessId;

      const ownerId =
        metadata.ownerId;

      const reference =
        payment.reference;

      const amount =
        Number(payment.amount) /
        100;

      if (
        !businessId ||
        !ownerId ||
        !reference
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid business subscription webhook metadata.",
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
        .eq(
          "id",
          businessId
        )
        .maybeSingle();

      if (
        businessError ||
        !business
      ) {
        console.error(
          "BUSINESS WEBHOOK LOOKUP ERROR:",
          businessError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Business could not be found.",
          },
          { status: 404 }
        );
      }

      if (
        business.owner_id !==
        ownerId
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Business owner information does not match.",
          },
          { status: 400 }
        );
      }

      const {
        data: settings,
        error: settingsError,
      } = await adminSupabase
        .from(
          "platform_settings"
        )
        .select(
          `
            business_subscription_fee,
            subscription_period,
            subscription_duration
          `
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (
        settingsError ||
        !settings
      ) {
        console.error(
          "SUBSCRIPTION SETTINGS ERROR:",
          settingsError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to load subscription settings.",
          },
          { status: 500 }
        );
      }

      const subscriptionFee =
        Number(
          settings.business_subscription_fee
        );

      const subscriptionPeriod =
        settings.subscription_period;

      const subscriptionDuration =
        Number(
          settings.subscription_duration
        );

      if (
        !amountsMatch(
          amount,
          subscriptionFee
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Subscription payment amount does not match.",
          },
          { status: 400 }
        );
      }

      const {
        data: existingPayment,
        error:
          existingPaymentError,
      } = await adminSupabase
        .from(
          "subscription_payments"
        )
        .select(
          `
            id,
            status
          `
        )
        .eq(
          "reference",
          reference
        )
        .maybeSingle();

      if (
        existingPaymentError
      ) {
        console.error(
          "SUBSCRIPTION PAYMENT LOOKUP ERROR:",
          existingPaymentError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to check subscription payment.",
          },
          { status: 500 }
        );
      }

      if (
        existingPayment?.status ===
        "success"
      ) {
        await adminSupabase
          .from("businesses")
          .update({
            status: "approved",
            onboarding_status:
              "complete",
          })
          .eq(
            "id",
            businessId
          );

        return NextResponse.json({
          success: true,
          message:
            "Subscription payment already processed.",
        });
      }

      const paymentDate =
        payment.paid_at ||
        new Date().toISOString();

      const startsAt =
        new Date(paymentDate);

      const expiresAt =
        new Date(startsAt);

      if (
        subscriptionPeriod ===
        "weekly"
      ) {
        expiresAt.setDate(
          expiresAt.getDate() +
            subscriptionDuration *
              7
        );
      } else {
        expiresAt.setMonth(
          expiresAt.getMonth() +
            subscriptionDuration
        );
      }

      const {
        data: subscription,
        error:
          subscriptionError,
      } = await adminSupabase
        .from("subscriptions")
        .insert({
          business_id:
            businessId,
          plan_name: `${subscriptionDuration} ${subscriptionPeriod}`,
          amount:
            subscriptionFee,
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
              "Unable to create the business subscription.",
          },
          { status: 500 }
        );
      }

      if (existingPayment) {
        const {
          error:
            paymentUpdateError,
        } = await adminSupabase
          .from(
            "subscription_payments"
          )
          .update({
            subscription_id:
              subscription.id,
            amount:
              subscriptionFee,
            status: "success",
            payment_method:
              "paystack",
            paid_at:
              paymentDate,
          })
          .eq(
            "id",
            existingPayment.id
          );

        if (paymentUpdateError) {
          console.error(
            "SUBSCRIPTION PAYMENT UPDATE ERROR:",
            paymentUpdateError
          );
        }
      } else {
        const {
          error:
            paymentInsertError,
        } = await adminSupabase
          .from(
            "subscription_payments"
          )
          .insert({
            business_id:
              businessId,
            subscription_id:
              subscription.id,
            reference,
            amount:
              subscriptionFee,
            status: "success",
            payment_method:
              "paystack",
            paid_at:
              paymentDate,
          });

        if (paymentInsertError) {
          console.error(
            "SUBSCRIPTION PAYMENT INSERT ERROR:",
            paymentInsertError
          );
        }
      }

      const {
        error:
          businessUpdateError,
      } = await adminSupabase
        .from("businesses")
        .update({
          status: "approved",
          onboarding_status:
            "complete",
        })
        .eq(
          "id",
          businessId
        );

      if (
        businessUpdateError
      ) {
        console.error(
          "BUSINESS SUBSCRIPTION STATUS UPDATE ERROR:",
          businessUpdateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment succeeded but business status could not be updated.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Business subscription payment processed successfully.",
      });
    }

    /*
     * Ignore unrelated Paystack events.
     */
    if (
      paymentType !==
      "customer_order"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Webhook received.",
      });
    }

    /*
     * CUSTOMER ORDER
     */
    const orderId =
      metadata.orderId ||
      metadata.order_id;

    const businessId =
      metadata.businessId;

    const reference =
      payment.reference;

    if (
      !orderId ||
      !businessId ||
      !reference
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid customer order webhook metadata.",
        },
        { status: 400 }
      );
    }

    const {
      data: order,
      error: orderError,
    } = await adminSupabase
      .from("orders")
      .select(
        `
          id,
          order_number,
          customer_id,
          business_id,
          total,
          total_amount,
          payment_status,
          order_status,
          status,
          paystack_reference
        `
      )
      .eq(
        "id",
        orderId
      )
      .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      console.error(
        "CUSTOMER ORDER WEBHOOK ORDER LOOKUP ERROR:",
        orderError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Order could not be found.",
        },
        { status: 404 }
      );
    }

    if (
      order.business_id !==
      businessId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment business information does not match the order.",
        },
        { status: 400 }
      );
    }

    if (
      order.paystack_reference &&
      order.paystack_reference !==
        reference
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment reference does not match the order.",
        },
        { status: 400 }
      );
    }

    if (
      payment.status !==
      "success"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack payment is not successful.",
        },
        { status: 400 }
      );
    }

    if (
      payment.currency &&
      payment.currency !== "NGN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid payment currency.",
        },
        { status: 400 }
      );
    }

    const metadataBusinessId =
      metadata.businessId;

    if (
      metadataBusinessId &&
      order.business_id &&
      metadataBusinessId !==
        order.business_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment business information does not match the order.",
        },
        { status: 400 }
      );
    }

    const orderTotal =
      Number(
        order.total ??
          order.total_amount
      );

    const paymentAmount =
      Number(payment.amount) /
      100;

    if (
      !Number.isFinite(
        orderTotal
      ) ||
      orderTotal <= 0
    ) {
      console.error(
        "WEBHOOK INVALID ORDER TOTAL:",
        {
          orderId,
          orderTotal,
          reference,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The order total is invalid.",
        },
        { status: 500 }
      );
    }

    if (
      !amountsMatch(
        paymentAmount,
        orderTotal
      )
    ) {
      console.error(
        "WEBHOOK PAYMENT AMOUNT MISMATCH:",
        {
          paymentAmount,
          orderTotal,
          reference,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment amount does not match the order total.",
        },
        { status: 400 }
      );
    }

    /*
     * CRITICAL ORDER UPDATE
     *
     * The customer has successfully paid.
     *
     * payment_status = paid
     *
     * The order itself remains pending until the business
     * confirms it.
     *
     * These are the valid values according to the current
     * orders table constraints.
     */
    const {
      error: orderUpdateError,
    } = await adminSupabase
      .from("orders")
      .update({
        payment_status: "paid",
        order_status: "pending",
        status: "pending",
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        order.id
      );

    if (orderUpdateError) {
      console.error(
        "WEBHOOK ORDER UPDATE ERROR:",
        orderUpdateError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was successful but the order could not be updated.",
        },
        { status: 500 }
      );
    }

    /*
     * Payment record bookkeeping.
     */
    const {
      data: existingPayment,
      error:
        existingPaymentError,
    } = await adminSupabase
      .from("payments")
      .select("id")
      .eq(
        "order_id",
        order.id
      )
      .maybeSingle();

    if (existingPaymentError) {
      console.error(
        "WEBHOOK PAYMENT LOOKUP ERROR:",
        existingPaymentError
      );
    } else if (existingPayment) {
      const {
        error:
          paymentUpdateError,
      } = await adminSupabase
        .from("payments")
        .update({
          reference,
          amount: orderTotal,
          status: "success",
        })
        .eq(
          "id",
          existingPayment.id
        );

      if (paymentUpdateError) {
        console.error(
          "WEBHOOK PAYMENT UPDATE ERROR:",
          paymentUpdateError
        );
      }
    } else {
      const {
        error:
          paymentInsertError,
      } = await adminSupabase
        .from("payments")
        .insert({
          order_id:
            order.id,
          customer_id:
            order.customer_id,
          reference,
          amount:
            orderTotal,
          status:
            "success",
        });

      if (paymentInsertError) {
        console.error(
          "WEBHOOK PAYMENT INSERT ERROR:",
          paymentInsertError
        );
      }
    }

    /*
     * Commission bookkeeping.
     *
     * Commission problems are logged but do not prevent
     * the order from remaining paid.
     */
    const {
      data: commission,
      error:
        commissionError,
    } = await adminSupabase
      .from("commissions")
      .select(
        `
          id,
          status,
          paystack_reference
        `
      )
      .eq(
        "order_id",
        order.id
      )
      .maybeSingle();

    if (commissionError) {
      console.error(
        "WEBHOOK COMMISSION LOOKUP ERROR:",
        commissionError
      );
    } else if (!commission) {
      console.error(
        "WEBHOOK COMMISSION NOT FOUND:",
        {
          orderId:
            order.id,
          reference,
        }
      );
    } else if (
      commission.paystack_reference &&
      commission.paystack_reference !==
        reference
    ) {
      console.error(
        "WEBHOOK COMMISSION REFERENCE MISMATCH:",
        {
          orderId:
            order.id,
          commissionReference:
            commission.paystack_reference,
          paymentReference:
            reference,
        }
      );
    } else if (
      commission.status !==
      "paid"
    ) {
      const {
        error:
          commissionUpdateError,
      } = await adminSupabase
        .from("commissions")
        .update({
          status:
            "paid",
        })
        .eq(
          "id",
          commission.id
        );

      if (
        commissionUpdateError
      ) {
        console.error(
          "WEBHOOK COMMISSION UPDATE ERROR:",
          commissionUpdateError
        );
      }
    }

    console.log(
      "CUSTOMER ORDER PAYMENT PROCESSED SUCCESSFULLY:",
      {
        orderId:
          order.id,
        orderNumber:
          order.order_number,
        reference,
        orderTotal,
        paymentStatus:
          "paid",
        orderStatus:
          "pending",
        status:
          "pending",
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Customer order payment processed successfully.",
      orderId:
        order.id,
      orderNumber:
        order.order_number,
      reference,
      paymentStatus:
        "paid",
      orderStatus:
        "pending",
      status:
        "pending",
    });
  } catch (error) {
    console.error(
      "PAYSTACK WEBHOOK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while processing the webhook.",
      },
      { status: 500 }
    );
  }
}