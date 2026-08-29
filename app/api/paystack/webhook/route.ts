import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

const ADADI_COMMISSION_RATE = 2.5;

type PaystackMetadata = {
  type?: string;
  businessId?: string;
  ownerId?: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  commissionRate?: number | string;
  commissionAmount?: number | string;
  businessAmount?: number | string;
  orderTotal?: number | string;
  businessSubaccount?: string;
  subscriptionFee?: number | string;
  subscriptionPeriod?: string;
  subscriptionDuration?: number | string;
  [key: string]: unknown;
};

type PaystackEvent = {
  event?: string;
  data?: {
    id?: number;
    reference?: string;
    amount?: number;
    currency?: string;
    channel?: string;
    status?: string;
    paid_at?: string;
    transfer_code?: string;
    failures?: unknown;
    metadata?: PaystackMetadata;
  };
};

export async function POST(request: Request) {
  try {
    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack secret key is not configured.",
        },
        { status: 500 }
      );
    }

    const signature =
      request.headers.get(
        "x-paystack-signature"
      );

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing Paystack signature.",
        },
        { status: 400 }
      );
    }

    const body =
      await request.text();

    const expectedSignature =
      crypto
        .createHmac(
          "sha512",
          paystackSecretKey
        )
        .update(body)
        .digest("hex");

    const signatureBuffer =
      Buffer.from(
        signature,
        "utf8"
      );

    const expectedSignatureBuffer =
      Buffer.from(
        expectedSignature,
        "utf8"
      );

    if (
      signatureBuffer.length !==
        expectedSignatureBuffer.length ||
      !crypto.timingSafeEqual(
        signatureBuffer,
        expectedSignatureBuffer
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid Paystack signature.",
        },
        { status: 401 }
      );
    }

    let event: PaystackEvent;

    try {
      event =
        JSON.parse(body) as PaystackEvent;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook payload.",
        },
        { status: 400 }
      );
    }

    const eventType =
      event.event;

    const payment =
      event.data;

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment data is missing.",
        },
        { status: 400 }
      );
    }

    const supabase =
      createAdminClient();

    /*
     * =====================================================
     * TRANSFER EVENTS
     * =====================================================
     */

    if (
      eventType ===
        "transfer.success" ||
      eventType ===
        "transfer.failed" ||
      eventType ===
        "transfer.reversed"
    ) {
      const transferReference =
        payment.reference;

      if (!transferReference) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Transfer reference is missing.",
          },
          { status: 400 }
        );
      }

      let payoutStatus =
        "processing";

      if (
        eventType ===
        "transfer.success"
      ) {
        payoutStatus =
          "paid";
      }

      if (
        eventType ===
        "transfer.failed"
      ) {
        payoutStatus =
          "failed";
      }

      if (
        eventType ===
        "transfer.reversed"
      ) {
        payoutStatus =
          "reversed";
      }

      const {
        data: payout,
        error: payoutFetchError,
      } =
        await supabase
          .from(
            "business_payouts"
          )
          .select(
            `
              id,
              business_id,
              order_id,
              amount,
              paystack_transfer_code,
              transfer_reference,
              status
            `
          )
          .eq(
            "transfer_reference",
            transferReference
          )
          .maybeSingle();

      if (payoutFetchError) {
        console.error(
          "PAYOUT LOOKUP ERROR:",
          payoutFetchError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to find payout record.",
          },
          { status: 500 }
        );
      }

      if (!payout) {
        console.warn(
          "PAYOUT RECORD NOT FOUND:",
          transferReference
        );

        return NextResponse.json({
          success: true,
          message:
            "Transfer event received but payout record was not found.",
        });
      }

      const updateData: {
        status: string;
        paystack_transfer_code?: string;
      } = {
        status:
          payoutStatus,
      };

      if (
        payment.transfer_code
      ) {
        updateData.paystack_transfer_code =
          payment.transfer_code;
      }

      const {
        error: payoutUpdateError,
      } =
        await supabase
          .from(
            "business_payouts"
          )
          .update(
            updateData
          )
          .eq(
            "id",
            payout.id
          );

      if (payoutUpdateError) {
        console.error(
          "PAYOUT STATUS UPDATE ERROR:",
          payoutUpdateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to update payout status.",
          },
          { status: 500 }
        );
      }

      console.log(
        "BUSINESS PAYOUT STATUS UPDATED:",
        {
          payoutId:
            payout.id,
          orderId:
            payout.order_id,
          transferReference,
          transferCode:
            payment.transfer_code,
          status:
            payoutStatus,
        }
      );

      return NextResponse.json({
        success: true,
        message:
          `Transfer event ${eventType} processed successfully.`,
        transferReference,
        payoutId:
          payout.id,
        status:
          payoutStatus,
      });
    }

    /*
     * =====================================================
     * ONLY PROCESS SUCCESSFUL CUSTOMER PAYMENTS
     * =====================================================
     */

    if (
      eventType !==
      "charge.success"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Event received but not processed.",
        event:
          eventType || null,
      });
    }

    const reference =
      payment.reference;

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment reference is missing.",
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
            "Payment was not successful.",
        },
        { status: 400 }
      );
    }

    if (
      payment.currency !==
      "NGN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment currency must be NGN.",
        },
        { status: 400 }
      );
    }

    const metadata =
      payment.metadata ||
      {};

    const paymentType =
      metadata.type;

    /*
     * =====================================================
     * BUSINESS SUBSCRIPTION PAYMENT
     * =====================================================
     *
     * Keep your existing subscription processing here.
     * The subscription section below is unchanged in logic.
     */

    if (
      paymentType ===
      "business_subscription"
    ) {
      const businessId =
        metadata.businessId;

      const ownerId =
        metadata.ownerId;

      if (!businessId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Business ID missing from payment metadata.",
          },
          { status: 400 }
        );
      }

      const {
        data: business,
        error: businessFetchError,
      } =
        await supabase
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
        businessFetchError ||
        !business
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to find business.",
          },
          { status: 500 }
        );
      }

      if (
        ownerId &&
        ownerId !==
          business.owner_id
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payment does not belong to this business owner.",
          },
          { status: 403 }
        );
      }

      const {
        data: platformSettings,
        error:
          platformSettingsError,
      } =
        await supabase
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
        platformSettingsError ||
        !platformSettings
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to retrieve ADADI subscription settings.",
          },
          { status: 500 }
        );
      }

      const subscriptionFee =
        Number(
          platformSettings.business_subscription_fee
        );

      const subscriptionPeriod =
        platformSettings.subscription_period;

      const subscriptionDuration =
        Number(
          platformSettings.subscription_duration
        );

      const expectedAmountKobo =
        Math.round(
          subscriptionFee * 100
        );

      const actualAmountKobo =
        Number(
          payment.amount || 0
        );

      if (
        actualAmountKobo !==
        expectedAmountKobo
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Subscription payment amount does not match the current ADADI subscription fee.",
          },
          { status: 400 }
        );
      }

      const {
        data: existingPayment,
        error:
          existingPaymentError,
      } =
        await supabase
          .from(
            "subscription_payments"
          )
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
          .eq(
            "reference",
            reference
          )
          .maybeSingle();

      if (
        existingPaymentError
      ) {
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
        existingPayment
      ) {
        return NextResponse.json({
          success: true,
          message:
            "Subscription payment already processed.",
          type:
            "business_subscription",
          reference,
          businessId:
            business.id,
          subscriptionId:
            existingPayment.subscription_id,
        });
      }

      const {
        data: existingSubscription,
      } =
        await supabase
          .from(
            "subscriptions"
          )
          .select(
            `
              id,
              status,
              starts_at,
              expires_at
            `
          )
          .eq(
            "business_id",
            businessId
          )
          .eq(
            "status",
            "active"
          )
          .order(
            "expires_at",
            {
              ascending:
                false,
            }
          )
          .limit(1)
          .maybeSingle();

      const now =
        new Date();

      let startsAt =
        new Date();

      if (
        existingSubscription?.expires_at
      ) {
        const existingExpiry =
          new Date(
            existingSubscription.expires_at
          );

        if (
          existingExpiry.getTime() >
          now.getTime()
        ) {
          startsAt =
            existingExpiry;
        }
      }

      const expiresAt =
        new Date(startsAt);

      if (
        subscriptionPeriod ===
        "weekly"
      ) {
        expiresAt.setDate(
          expiresAt.getDate() +
            7 *
              subscriptionDuration
        );
      } else {
        expiresAt.setMonth(
          expiresAt.getMonth() +
            subscriptionDuration
        );
      }

      const planName =
        subscriptionPeriod ===
        "weekly"
          ? subscriptionDuration ===
            1
            ? "1 week"
            : `${subscriptionDuration} weeks`
          : subscriptionDuration ===
            1
          ? "1 month"
          : `${subscriptionDuration} months`;

      const {
        data: subscription,
        error:
          subscriptionError,
      } =
        await supabase
          .from(
            "subscriptions"
          )
          .insert({
            business_id:
              businessId,
            plan_name:
              planName,
            amount:
              subscriptionFee,
            status:
              "active",
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
        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to create subscription.",
          },
          { status: 500 }
        );
      }

      const {
        data: paymentRecord,
        error:
          paymentRecordError,
      } =
        await supabase
          .from(
            "subscription_payments"
          )
          .insert({
            subscription_id:
              subscription.id,
            business_id:
              businessId,
            reference,
            amount:
              subscriptionFee,
            status:
              "paid",
            payment_method:
              payment.channel ||
              "paystack",
            paid_at:
              payment.paid_at ||
              new Date().toISOString(),
          })
          .select()
          .single();

      if (
        paymentRecordError ||
        !paymentRecord
      ) {
        await supabase
          .from(
            "subscriptions"
          )
          .delete()
          .eq(
            "id",
            subscription.id
          );

        return NextResponse.json(
          {
            success: false,
            error:
              "Subscription was created, but payment could not be recorded.",
          },
          { status: 500 }
        );
      }

      const {
        data: updatedBusiness,
        error:
          businessUpdateError,
      } =
        await supabase
          .from("businesses")
          .update({
            status:
              "approved",
            onboarding_status:
              "complete",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            businessId
          )
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
        businessUpdateError ||
        !updatedBusiness
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was recorded, but business activation failed.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Subscription payment processed successfully.",
        type:
          "business_subscription",
        reference,
        businessId,
        businessName:
          updatedBusiness.name,
        subscriptionId:
          subscription.id,
        paymentId:
          paymentRecord.id,
        subscriptionFee,
        subscriptionPeriod,
        subscriptionDuration,
        startsAt:
          startsAt.toISOString(),
        expiresAt:
          expiresAt.toISOString(),
      });
    }

    /*
     * =====================================================
     * CUSTOMER ORDER PAYMENT
     * =====================================================
     */

    if (
      paymentType !==
      "customer_order"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Payment received but payment type was not recognized.",
        reference,
        type:
          paymentType ||
          null,
      });
    }

    const orderId =
      metadata.orderId;

    const businessId =
      metadata.businessId;

    if (
      !orderId ||
      !businessId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order ID and business ID are required.",
        },
        { status: 400 }
      );
    }

    const {
      data: order,
      error: orderFetchError,
    } =
      await supabase
        .from("orders")
        .select(
          `
            id,
            customer_id,
            business_id,
            order_number,
            subtotal,
            total,
            total_amount,
            delivery_fee,
            status,
            payment_status,
            order_status,
            paystack_reference
          `
        )
        .eq(
          "id",
          orderId
        )
        .maybeSingle();

    if (
      orderFetchError ||
      !order
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to find order.",
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
            "Order business does not match payment.",
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
            "Payment reference does not match order.",
        },
        { status: 400 }
      );
    }

    const expectedOrderTotal =
      Number(
        order.total ??
          order.total_amount ??
          0
      );

    if (
      !Number.isFinite(
        expectedOrderTotal
      ) ||
      expectedOrderTotal <=
        0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid order total.",
        },
        { status: 500 }
      );
    }

    const expectedAmountInKobo =
      Math.round(
        expectedOrderTotal * 100
      );

    const actualAmountInKobo =
      Number(
        payment.amount || 0
      );

    if (
      actualAmountInKobo !==
      expectedAmountInKobo
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment amount does not match order total.",
        },
        { status: 400 }
      );
    }

    const orderSubtotal =
      Number(
        order.subtotal
      );

    const deliveryFee =
      Number(
        order.delivery_fee ||
          0
      );

    if (
      !Number.isFinite(
        orderSubtotal
      ) ||
      orderSubtotal < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid order subtotal.",
        },
        { status: 500 }
      );
    }

    if (
      !Number.isFinite(
        deliveryFee
      ) ||
      deliveryFee < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid delivery fee.",
        },
        { status: 500 }
      );
    }

    const commissionAmount =
      Math.round(
        orderSubtotal *
          (ADADI_COMMISSION_RATE /
            100) *
          100
      ) / 100;

    const businessAmount =
      Math.round(
        (orderSubtotal -
          commissionAmount) *
          100
      ) / 100;

    const businessKobo =
      Math.round(
        businessAmount *
          100
      );

    /*
     * =====================================================
     * COMMISSION
     * =====================================================
     */

    const {
      data: commission,
      error:
        commissionFetchError,
    } =
      await supabase
        .from(
          "commissions"
        )
        .select(
          `
            id,
            order_id,
            business_id,
            commission_rate,
            commission_amount,
            business_amount,
            status,
            paystack_reference
          `
        )
        .eq(
          "order_id",
          orderId
        )
        .eq(
          "paystack_reference",
          reference
        )
        .maybeSingle();

    if (
      commissionFetchError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order was paid, but commission could not be checked.",
        },
        { status: 500 }
      );
    }

    if (
      !commission
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order was paid, but commission record was not found.",
        },
        { status: 500 }
      );
    }

    const storedRate =
      Number(
        commission.commission_rate
      );

    const storedCommission =
      Number(
        commission.commission_amount
      );

    const storedBusiness =
      Number(
        commission.business_amount
      );

    if (
      storedRate !==
      ADADI_COMMISSION_RATE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Commission rate is not configured correctly.",
        },
        { status: 500 }
      );
    }

    if (
      Math.abs(
        storedCommission -
          commissionAmount
      ) > 0.01
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Commission amount does not match verified order.",
        },
        { status: 500 }
      );
    }

    if (
      Math.abs(
        storedBusiness -
          businessAmount
      ) > 0.01
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Business amount does not match verified order.",
        },
        { status: 500 }
      );
    }

    /*
     * =====================================================
     * MARK ORDER PAID
     * =====================================================
     */

    const {
      error: orderUpdateError,
    } =
      await supabase
        .from("orders")
        .update({
          payment_status:
            "paid",
          order_status:
            "confirmed",
          status:
            "confirmed",
          paid_at:
            payment.paid_at ||
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          orderId
        );

    if (
      orderUpdateError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was received, but order confirmation failed.",
        },
        { status: 500 }
      );
    }

    /*
     * =====================================================
     * MARK COMMISSION PAID
     * =====================================================
     */

    if (
      commission.status !==
      "paid"
    ) {
      const {
        error:
          commissionUpdateError,
      } =
        await supabase
          .from(
            "commissions"
          )
          .update({
            status:
              "paid",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            commission.id
          );

      if (
        commissionUpdateError
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payment succeeded but commission could not be marked as paid.",
          },
          { status: 500 }
        );
      }
    }

    /*
     * =====================================================
     * GET BUSINESS PAYOUT ACCOUNT
     * =====================================================
     */

    const {
      data: payoutAccount,
      error:
        payoutAccountError,
    } =
      await supabase
        .from(
          "business_payout_accounts"
        )
        .select(
          `
            id,
            business_id,
            bank_name,
            account_number,
            account_name,
            paystack_recipient_code
          `
        )
        .eq(
          "business_id",
          businessId
        )
        .maybeSingle();

    if (
      payoutAccountError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment succeeded, but the business payout account could not be loaded.",
        },
        { status: 500 }
      );
    }

    if (
      !payoutAccount ||
      !payoutAccount.paystack_recipient_code
    ) {
      console.error(
        "BUSINESS PAYOUT RECIPIENT MISSING:",
        {
          businessId,
          orderId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment succeeded, but this business does not have an active payout account.",
        },
        { status: 500 }
      );
    }

    /*
     * =====================================================
     * CHECK EXISTING PAYOUT
     * =====================================================
     */

    const {
      data: existingPayout,
      error:
        existingPayoutError,
    } =
      await supabase
        .from(
          "business_payouts"
        )
        .select(
          `
            id,
            business_id,
            order_id,
            amount,
            paystack_transfer_code,
            transfer_reference,
            status
          `
        )
        .eq(
          "order_id",
          orderId
        )
        .maybeSingle();

    if (
      existingPayoutError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment succeeded, but payout status could not be checked.",
        },
        { status: 500 }
      );
    }

    if (
      existingPayout
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Customer payment processed and business payout already exists.",
        type:
          "customer_order",
        reference,
        orderId,
        orderNumber:
          order.order_number,
        amount:
          expectedOrderTotal,
        commissionRate:
          ADADI_COMMISSION_RATE,
        commissionAmount,
        businessAmount,
        payoutStatus:
          existingPayout.status,
        transferReference:
          existingPayout.transfer_reference,
        transferCode:
          existingPayout.paystack_transfer_code,
      });
    }

    /*
     * =====================================================
     * CREATE PAYOUT RECORD
     * =====================================================
     */

    const transferReference =
      `adadi_${orderId.replace(
        /-/g,
        ""
      )}`;

    const {
      data: payout,
      error:
        payoutInsertError,
    } =
      await supabase
        .from(
          "business_payouts"
        )
        .insert({
          business_id:
            businessId,
          order_id:
            orderId,
          amount:
            businessAmount,
          status:
            "processing",
          transfer_reference:
            transferReference,
        })
        .select()
        .single();

    if (
      payoutInsertError ||
      !payout
    ) {
      console.error(
        "PAYOUT CREATION ERROR:",
        payoutInsertError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment succeeded, but the business payout could not be prepared.",
        },
        { status: 500 }
      );
    }

    /*
     * =====================================================
     * INITIATE PAYSTACK TRANSFER
     * =====================================================
     */

    const transferResponse =
      await fetch(
        "https://api.paystack.co/transfer",
        {
          method:
            "POST",
          headers: {
            Authorization:
              `Bearer ${paystackSecretKey}`,
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              source:
                "balance",
              amount:
                businessKobo,
              recipient:
                payoutAccount.paystack_recipient_code,
              reference:
                transferReference,
              reason:
                `ADADI payout for order ${order.order_number}`,
              currency:
                "NGN",
            }),
          cache:
            "no-store",
        }
      );

    const transferData =
      await transferResponse.json();

    if (
      !transferResponse.ok ||
      !transferData.status ||
      !transferData.data
    ) {
      console.error(
        "PAYSTACK TRANSFER ERROR:",
        transferData
      );

      await supabase
        .from(
          "business_payouts"
        )
        .update({
          status:
            "failed",
        })
        .eq(
          "id",
          payout.id
        );

      return NextResponse.json(
        {
          success: false,
          error:
            "Customer payment succeeded, but the business payout could not be initiated.",
          transferError:
            transferData.message ||
            null,
        },
        { status: 500 }
      );
    }

    const transferCode =
      transferData.data
        .transfer_code;

    const transferStatus =
      transferData.data
        .status;

    await supabase
      .from(
        "business_payouts"
      )
      .update({
        paystack_transfer_code:
          transferCode ||
          null,
        status:
          transferStatus ===
          "success"
            ? "paid"
            : "processing",
      })
      .eq(
        "id",
        payout.id
      );

    console.log(
      "BUSINESS PAYOUT INITIATED:",
      {
        orderId,
        orderNumber:
          order.order_number,
        businessId,
        businessAmount,
        businessKobo,
        recipient:
          payoutAccount.paystack_recipient_code,
        transferReference,
        transferCode,
        transferStatus,
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Customer payment processed and business payout initiated successfully.",
      type:
        "customer_order",
      reference,
      orderId,
      orderNumber:
        order.order_number,
      amount:
        expectedOrderTotal,
      commissionRate:
        ADADI_COMMISSION_RATE,
      commissionAmount,
      businessAmount,
      payoutStatus:
        transferStatus ===
        "success"
          ? "paid"
          : "processing",
      transferReference,
      transferCode:
        transferCode ||
        null,
    });
  } catch (error) {
    console.error(
      "PAYSTACK WEBHOOK PROCESSING ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}