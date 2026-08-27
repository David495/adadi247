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
    metadata?: PaystackMetadata;
  };
};

export async function POST(request: Request) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY IS NOT CONFIGURED");

      return NextResponse.json(
        {
          success: false,
          error: "Paystack secret key is not configured.",
        },
        { status: 500 }
      );
    }

    const signature = request.headers.get("x-paystack-signature");

    if (!signature) {
      console.error("MISSING PAYSTACK SIGNATURE");

      return NextResponse.json(
        {
          success: false,
          error: "Missing Paystack signature.",
        },
        { status: 400 }
      );
    }

    const body = await request.text();

    const expectedSignature = crypto
      .createHmac("sha512", paystackSecretKey)
      .update(body)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedSignatureBuffer = Buffer.from(
      expectedSignature,
      "utf8"
    );

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !crypto.timingSafeEqual(
        signatureBuffer,
        expectedSignatureBuffer
      )
    ) {
      console.error("INVALID PAYSTACK SIGNATURE");

      return NextResponse.json(
        {
          success: false,
          error: "Invalid Paystack signature.",
        },
        { status: 401 }
      );
    }

    console.log("PAYSTACK SIGNATURE VERIFIED");

    let event: PaystackEvent;

    try {
      event = JSON.parse(body) as PaystackEvent;
    } catch (error) {
      console.error("INVALID PAYSTACK WEBHOOK JSON:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook payload.",
        },
        { status: 400 }
      );
    }

    console.log("PAYSTACK WEBHOOK EVENT:", event.event);

    if (event.event !== "charge.success") {
      return NextResponse.json({
        success: true,
        message: "Event received but not processed.",
        event: event.event || null,
      });
    }

    const payment = event.data;

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment data is missing.",
        },
        { status: 400 }
      );
    }

    const reference = payment.reference;

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment reference is missing.",
        },
        { status: 400 }
      );
    }

    if (payment.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          error: "Payment was not successful.",
        },
        { status: 400 }
      );
    }

    if (payment.currency !== "NGN") {
      return NextResponse.json(
        {
          success: false,
          error: "Payment currency must be NGN.",
        },
        { status: 400 }
      );
    }

    const amount = Number(payment.amount || 0) / 100;
    const metadata = payment.metadata || {};
    const paymentType = metadata.type;

    console.log("PAYSTACK SUCCESSFUL PAYMENT:", {
      reference,
      amount,
      currency: payment.currency,
      channel: payment.channel,
      paymentStatus: payment.status,
      paymentType,
      metadata,
    });

    const supabase = createAdminClient();

    // =====================================================
    // CUSTOMER ORDER PAYMENT
    // =====================================================

    if (paymentType === "customer_order") {
      console.log("PROCESSING CUSTOMER ORDER PAYMENT");

      const orderId = metadata.orderId;
      const businessId = metadata.businessId;

      if (!orderId || !businessId) {
        return NextResponse.json(
          {
            success: false,
            error: "Order ID and business ID are required.",
          },
          { status: 400 }
        );
      }

      const { data: order, error: orderFetchError } =
        await supabase
          .from("orders")
          .select(
            `
              id,
              business_id,
              order_number,
              total,
              total_amount,
              status,
              paystack_reference
            `
          )
          .eq("id", orderId)
          .maybeSingle();

      if (orderFetchError) {
        console.error("ORDER FETCH ERROR:", orderFetchError);

        return NextResponse.json(
          {
            success: false,
            error: "Unable to find order.",
          },
          { status: 500 }
        );
      }

      if (!order) {
        return NextResponse.json(
          {
            success: false,
            error: "Order not found.",
          },
          { status: 404 }
        );
      }

      if (order.business_id !== businessId) {
        return NextResponse.json(
          {
            success: false,
            error: "Order business does not match payment.",
          },
          { status: 400 }
        );
      }

      if (
        order.paystack_reference &&
        order.paystack_reference !== reference
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Payment reference does not match order.",
          },
          { status: 400 }
        );
      }

      const expectedOrderTotal = Number(
        order.total ?? order.total_amount ?? 0
      );

      if (
        !Number.isFinite(expectedOrderTotal) ||
        expectedOrderTotal <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid order total.",
          },
          { status: 500 }
        );
      }

      const expectedAmountInKobo = Math.round(
        expectedOrderTotal * 100
      );

      const actualAmountInKobo = Number(
        payment.amount || 0
      );

      if (actualAmountInKobo !== expectedAmountInKobo) {
        console.error("PAYMENT AMOUNT MISMATCH:", {
          orderId,
          expectedAmountInKobo,
          actualAmountInKobo,
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment amount does not match order total.",
          },
          { status: 400 }
        );
      }

      if (
        order.status === "confirmed" ||
        order.status === "paid" ||
        order.status === "completed"
      ) {
        return NextResponse.json({
          success: true,
          message:
            "Customer order payment already processed.",
          type: "customer_order",
          reference,
          orderId,
          orderNumber: order.order_number,
        });
      }

      const { data: updatedOrder, error: orderUpdateError } =
        await supabase
          .from("orders")
          .update({
            status: "confirmed",
            paid_at:
              payment.paid_at ||
              new Date().toISOString(),
          })
          .eq("id", orderId)
          .select(
            `
              id,
              order_number,
              status,
              total
            `
          )
          .single();

      if (orderUpdateError || !updatedOrder) {
        console.error(
          "ORDER UPDATE ERROR:",
          orderUpdateError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Failed to confirm customer order.",
          },
          { status: 500 }
        );
      }

      // ===================================================
      // COMMISSION
      // ADADI = 2.5%
      // BUSINESS = 97.5%
      // ===================================================

      const { data: commission, error: commissionFetchError } =
        await supabase
          .from("commissions")
          .select(
            `
              id,
              order_id,
              business_id,
              order_total,
              commission_rate,
              commission_amount,
              business_amount,
              status,
              paystack_reference
            `
          )
          .eq("order_id", orderId)
          .maybeSingle();

      if (commissionFetchError) {
        console.error(
          "COMMISSION FETCH ERROR:",
          commissionFetchError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Order was paid, but commission could not be checked.",
          },
          { status: 500 }
        );
      }

      if (!commission) {
        console.error(
          "COMMISSION RECORD NOT FOUND:",
          orderId
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Order was paid, but commission record was not found.",
          },
          { status: 500 }
        );
      }

      if (
        commission.business_id !== businessId
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Commission business does not match order business.",
          },
          { status: 400 }
        );
      }

      if (
        commission.paystack_reference &&
        commission.paystack_reference !== reference
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Commission payment reference mismatch.",
          },
          { status: 400 }
        );
      }

      const commissionRate = Number(
        commission.commission_rate ??
          metadata.commissionRate ??
          ADADI_COMMISSION_RATE
      );

      if (
        !Number.isFinite(commissionRate) ||
        commissionRate !== ADADI_COMMISSION_RATE
      ) {
        console.error(
          "INVALID COMMISSION RATE:",
          commissionRate
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Commission rate is not configured correctly.",
          },
          { status: 500 }
        );
      }

      const commissionAmount = Number(
        commission.commission_amount ??
          (expectedOrderTotal *
            ADADI_COMMISSION_RATE) /
            100
      );

      const businessAmount = Number(
        commission.business_amount ??
          expectedOrderTotal - commissionAmount
      );

      if (
        !Number.isFinite(commissionAmount) ||
        !Number.isFinite(businessAmount)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid commission calculation.",
          },
          { status: 500 }
        );
      }

      if (commission.status !== "paid") {
        const { error: commissionUpdateError } =
          await supabase
            .from("commissions")
            .update({
              status: "paid",
              commission_rate:
                ADADI_COMMISSION_RATE,
              commission_amount: commissionAmount,
              business_amount: businessAmount,
              paystack_reference: reference,
              paid_at:
                payment.paid_at ||
                new Date().toISOString(),
            })
            .eq("id", commission.id);

        if (commissionUpdateError) {
          console.error(
            "COMMISSION UPDATE ERROR:",
            commissionUpdateError
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "Order was paid, but commission could not be marked as paid.",
            },
            { status: 500 }
          );
        }
      }

      console.log(
        "CUSTOMER ORDER PAYMENT PROCESSED:",
        {
          reference,
          orderId,
          orderNumber:
            updatedOrder.order_number,
          orderTotal: expectedOrderTotal,
          commissionRate:
            ADADI_COMMISSION_RATE,
          commissionAmount,
          businessAmount,
        }
      );

      return NextResponse.json({
        success: true,
        message:
          "Customer order payment processed successfully.",
        type: "customer_order",
        reference,
        orderId,
        orderNumber:
          updatedOrder.order_number,
        amount,
        commissionRate:
          ADADI_COMMISSION_RATE,
        commissionAmount,
        businessAmount,
      });
    }

    // =====================================================
    // BUSINESS SUBSCRIPTION PAYMENT
    // =====================================================

    if (paymentType === "business_subscription") {
      console.log(
        "PROCESSING BUSINESS SUBSCRIPTION PAYMENT"
      );

      const businessId = metadata.businessId;
      const ownerId = metadata.ownerId;

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
      } = await supabase
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

      if (businessFetchError) {
        console.error(
          "BUSINESS FETCH ERROR:",
          businessFetchError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Failed to find business.",
          },
          { status: 500 }
        );
      }

      if (!business) {
        return NextResponse.json(
          {
            success: false,
            error: "Business not found.",
          },
          { status: 404 }
        );
      }

      if (
        ownerId &&
        ownerId !== business.owner_id
      ) {
        console.error(
          "BUSINESS OWNER MISMATCH:",
          {
            businessOwner:
              business.owner_id,
            paymentOwner: ownerId,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment does not belong to this business owner.",
          },
          { status: 403 }
        );
      }

      // ===================================================
      // DYNAMIC PLATFORM SETTINGS
      // ===================================================

      const {
        data: platformSettings,
        error: platformSettingsError,
      } = await supabase
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
              "Unable to retrieve ADADI subscription settings.",
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
              "ADADI subscription fee is not configured correctly.",
          },
          { status: 500 }
        );
      }

      if (
        !["weekly", "monthly"].includes(
          subscriptionPeriod || ""
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid subscription period.",
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
            error:
              "Invalid subscription duration.",
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
              "Weekly subscriptions must be 1 week.",
          },
          { status: 500 }
        );
      }

      // ===================================================
      // VERIFY PAYMENT AGAINST CURRENT DYNAMIC FEE
      // ===================================================

      const expectedAmountKobo = Math.round(
        subscriptionFee * 100
      );

      const actualAmountKobo = Number(
        payment.amount || 0
      );

      if (
        actualAmountKobo !== expectedAmountKobo
      ) {
        console.error(
          "SUBSCRIPTION PAYMENT AMOUNT MISMATCH:",
          {
            businessId,
            reference,
            expectedAmountKobo,
            actualAmountKobo,
            expectedNaira:
              subscriptionFee,
            actualNaira: amount,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Subscription payment amount does not match the current ADADI subscription fee.",
          },
          { status: 400 }
        );
      }

      // ===================================================
      // CHECK EXISTING PAYMENT
      // ===================================================

      const {
        data: existingPayment,
        error: existingPaymentError,
      } = await supabase
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

      if (existingPaymentError) {
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

      // ===================================================
      // IDEMPOTENCY
      // ===================================================

      if (existingPayment) {
        if (
          existingPayment.business_id !==
          business.id
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

        console.log(
          "SUBSCRIPTION PAYMENT ALREADY PROCESSED:",
          reference
        );

        return NextResponse.json({
          success: true,
          message:
            "Subscription payment already processed.",
          type: "business_subscription",
          reference,
          businessId: business.id,
          subscriptionId:
            existingPayment.subscription_id,
        });
      }

      // ===================================================
      // GET ACTIVE SUBSCRIPTION
      // ===================================================

      const {
        data: existingSubscription,
        error: existingSubscriptionError,
      } = await supabase
        .from("subscriptions")
        .select(
          `
            id,
            status,
            starts_at,
            expires_at
          `
        )
        .eq("business_id", businessId)
        .eq("status", "active")
        .order("expires_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (existingSubscriptionError) {
        console.error(
          "EXISTING SUBSCRIPTION FETCH ERROR:",
          existingSubscriptionError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to check existing subscription.",
          },
          { status: 500 }
        );
      }

      // ===================================================
      // CALCULATE SUBSCRIPTION DATES
      // ===================================================

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

      // ===================================================
      // CREATE SUBSCRIPTION
      // ===================================================

      const {
        data: subscription,
        error: subscriptionError,
      } = await supabase
        .from("subscriptions")
        .insert({
          business_id: businessId,
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
              "Failed to create subscription.",
          },
          { status: 500 }
        );
      }

      // ===================================================
      // RECORD PAYMENT
      // ===================================================

      const {
        data: paymentRecord,
        error: paymentRecordError,
      } = await supabase
        .from("subscription_payments")
        .insert({
          subscription_id:
            subscription.id,
          business_id: businessId,
          reference,
          amount: subscriptionFee,
          status: "paid",
          payment_method:
            payment.channel || "paystack",
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
        console.error(
          "SUBSCRIPTION PAYMENT RECORD ERROR:",
          paymentRecordError
        );

        await supabase
          .from("subscriptions")
          .delete()
          .eq("id", subscription.id);

        return NextResponse.json(
          {
            success: false,
            error:
              "Subscription was created, but payment could not be recorded.",
          },
          { status: 500 }
        );
      }

      // ===================================================
      // APPROVE BUSINESS
      // ===================================================

      const {
        data: updatedBusiness,
        error: businessUpdateError,
      } = await supabase
        .from("businesses")
        .update({
          status: "approved",
          onboarding_status: "complete",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", businessId)
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
        console.error(
          "BUSINESS APPROVAL ERROR:",
          businessUpdateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was recorded, but business activation failed.",
          },
          { status: 500 }
        );
      }

      console.log(
        "BUSINESS SUBSCRIPTION PAYMENT PROCESSED:",
        {
          reference,
          businessId,
          businessName:
            updatedBusiness.name,
          amount: subscriptionFee,
          subscriptionId:
            subscription.id,
          paymentId:
            paymentRecord.id,
          subscriptionPeriod,
          subscriptionDuration,
          startsAt:
            startsAt.toISOString(),
          expiresAt:
            expiresAt.toISOString(),
        }
      );

      return NextResponse.json({
        success: true,
        message:
          "Subscription payment processed successfully.",
        type: "business_subscription",
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

    // =====================================================
    // UNKNOWN PAYMENT TYPE
    // =====================================================

    console.warn(
      "UNKNOWN PAYSTACK PAYMENT TYPE:",
      paymentType
    );

    return NextResponse.json({
      success: true,
      message:
        "Payment received but payment type was not recognized.",
      reference,
      type: paymentType || null,
    });
  } catch (error) {
    console.error(
      "PAYSTACK WEBHOOK PROCESSING ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}