import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

type PaystackMetadata = {
  type?: string;
  businessId?: string;
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
    // =========================================
    // 1. CHECK PAYSTACK SECRET KEY
    // =========================================

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

    // =========================================
    // 2. GET PAYSTACK SIGNATURE
    // =========================================

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

    // =========================================
    // 3. GET RAW REQUEST BODY
    // =========================================

    const body = await request.text();

    // =========================================
    // 4. VERIFY PAYSTACK SIGNATURE
    // =========================================

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

    // =========================================
    // 5. PARSE PAYSTACK EVENT
    // =========================================

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

    console.log("==========================================");
    console.log("PAYSTACK WEBHOOK EVENT:", event.event);
    console.log("==========================================");

    // =========================================
    // 6. ONLY PROCESS SUCCESSFUL PAYMENTS
    // =========================================

    if (event.event !== "charge.success") {
      console.log(
        "PAYSTACK EVENT NOT PROCESSED:",
        event.event
      );

      return NextResponse.json({
        success: true,
        message: "Event received but not processed.",
        event: event.event || null,
      });
    }

    // =========================================
    // 7. GET PAYMENT DATA
    // =========================================

    const payment = event.data;

    if (!payment) {
      console.error("PAYSTACK PAYMENT DATA MISSING");

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
      console.error("PAYSTACK PAYMENT REFERENCE MISSING");

      return NextResponse.json(
        {
          success: false,
          error: "Payment reference is missing.",
        },
        { status: 400 }
      );
    }

    const amount = Number(payment.amount || 0) / 100;
    const metadata = payment.metadata || {};

    console.log("PAYSTACK SUCCESSFUL PAYMENT:", {
      reference,
      amount,
      currency: payment.currency,
      channel: payment.channel,
      paymentStatus: payment.status,
      metadata,
    });

    // =========================================
    // 8. CREATE ADMIN SUPABASE CLIENT
    // =========================================

    const supabase = createAdminClient();

    // =========================================
    // 9. DETERMINE PAYMENT TYPE
    // =========================================

    const paymentType = metadata.type;

    // =========================================
    // 10. HANDLE CUSTOMER ORDER PAYMENT
    // =========================================

    if (paymentType === "customer_order") {
      console.log("PROCESSING CUSTOMER ORDER PAYMENT");

      const orderId = metadata.orderId;
      const businessId = metadata.businessId;

      if (!orderId) {
        console.error(
          "ORDER ID MISSING FROM CUSTOMER ORDER PAYMENT"
        );

        return NextResponse.json(
          {
            success: false,
            error: "Order ID missing from payment metadata.",
          },
          { status: 400 }
        );
      }

      if (!businessId) {
        console.error(
          "BUSINESS ID MISSING FROM CUSTOMER ORDER PAYMENT"
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Business ID missing from payment metadata.",
          },
          { status: 400 }
        );
      }

      // =========================================
      // 11. GET ORDER
      // =========================================

      const {
        data: order,
        error: orderFetchError,
      } = await supabase
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
        console.error(
          "ORDER FETCH ERROR:",
          orderFetchError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Unable to find order.",
          },
          { status: 500 }
        );
      }

      if (!order) {
        console.error("ORDER NOT FOUND:", orderId);

        return NextResponse.json(
          {
            success: false,
            error: "Order not found.",
          },
          { status: 404 }
        );
      }

      // =========================================
      // 12. VERIFY ORDER BUSINESS
      // =========================================

      if (order.business_id !== businessId) {
        console.error("ORDER BUSINESS MISMATCH:", {
          orderBusinessId: order.business_id,
          metadataBusinessId: businessId,
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "Order business does not match payment.",
          },
          { status: 400 }
        );
      }

      // =========================================
      // 13. VERIFY PAYSTACK REFERENCE
      // =========================================

      if (
        order.paystack_reference &&
        order.paystack_reference !== reference
      ) {
        console.error(
          "PAYSTACK REFERENCE MISMATCH:",
          {
            orderReference: order.paystack_reference,
            paymentReference: reference,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment reference does not match order.",
          },
          { status: 400 }
        );
      }

      // =========================================
      // 14. VERIFY PAYMENT AMOUNT
      // =========================================

      const expectedOrderTotal = Number(
        order.total ?? order.total_amount ?? 0
      );

      if (
        !Number.isFinite(expectedOrderTotal) ||
        expectedOrderTotal <= 0
      ) {
        console.error("INVALID ORDER TOTAL:", {
          orderId,
          expectedOrderTotal,
        });

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

      if (
        actualAmountInKobo !== expectedAmountInKobo
      ) {
        console.error(
          "PAYMENT AMOUNT MISMATCH:",
          {
            orderId,
            expectedAmountInKobo,
            actualAmountInKobo,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment amount does not match order total.",
          },
          { status: 400 }
        );
      }

      // =========================================
      // 15. IDEMPOTENCY CHECK
      // =========================================

      if (
        order.status === "confirmed" ||
        order.status === "paid" ||
        order.status === "completed"
      ) {
        console.log(
          "ORDER PAYMENT ALREADY PROCESSED:",
          {
            orderId,
            orderNumber: order.order_number,
            reference,
          }
        );

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

      // =========================================
      // 16. UPDATE ORDER
      // =========================================

      const {
        data: updatedOrder,
        error: orderUpdateError,
      } = await supabase
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

      if (
        orderUpdateError ||
        !updatedOrder
      ) {
        console.error(
          "ORDER PAYMENT STATUS UPDATE ERROR:",
          orderUpdateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to confirm customer order.",
          },
          { status: 500 }
        );
      }

      console.log(
        "CUSTOMER ORDER MARKED AS PAID:",
        {
          orderId: updatedOrder.id,
          orderNumber:
            updatedOrder.order_number,
          reference,
          amount,
        }
      );

      // =========================================
      // 17. UPDATE COMMISSION
      // =========================================

      const {
        data: commission,
        error: commissionFetchError,
      } = await supabase
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
              "Order was paid, but commission record could not be checked.",
          },
          { status: 500 }
        );
      }

      if (commission) {
        // =========================================
        // VERIFY COMMISSION REFERENCE
        // =========================================

        if (
          commission.paystack_reference &&
          commission.paystack_reference !== reference
        ) {
          console.error(
            "COMMISSION REFERENCE MISMATCH:",
            {
              commissionReference:
                commission.paystack_reference,
              paymentReference: reference,
            }
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "Commission payment reference mismatch.",
            },
            { status: 400 }
          );
        }

        // =========================================
        // UPDATE COMMISSION
        // =========================================

        if (commission.status !== "paid") {
          const {
            error: commissionUpdateError,
          } = await supabase
            .from("commissions")
            .update({
              status: "paid",
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

          console.log(
            "COMMISSION MARKED AS PAID:",
            {
              commissionId: commission.id,
              orderId,
              reference,
              commissionAmount:
                commission.commission_amount,
              businessAmount:
                commission.business_amount,
            }
          );
        }
      } else {
        console.error(
          "COMMISSION RECORD NOT FOUND FOR PAID ORDER:",
          {
            orderId,
            reference,
          }
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

      // =========================================
      // 18. CUSTOMER ORDER PAYMENT COMPLETE
      // =========================================

      console.log(
        "=========================================="
      );

      console.log(
        "CUSTOMER ORDER PAYMENT PROCESSED SUCCESSFULLY"
      );

      console.log({
        orderId,
        orderNumber:
          updatedOrder.order_number,
        reference,
        amount,
        orderStatus: "confirmed",
      });

      console.log(
        "=========================================="
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
      });
    }

    // =========================================
    // 19. HANDLE BUSINESS SUBSCRIPTION PAYMENT
    // =========================================

    if (
      paymentType === "business_subscription"
    ) {
      console.log(
        "PROCESSING BUSINESS SUBSCRIPTION PAYMENT"
      );

      const businessId = metadata.businessId;

      if (!businessId) {
        console.error(
          "BUSINESS ID MISSING FROM SUBSCRIPTION PAYMENT"
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Business ID missing from payment metadata.",
          },
          { status: 400 }
        );
      }

      const metadataSubscriptionFee = Number(
        metadata.subscriptionFee || 0
      );

      const subscriptionPeriod =
        metadata.subscriptionPeriod;

      const subscriptionDuration = Number(
        metadata.subscriptionDuration || 0
      );

      if (
        !Number.isFinite(
          metadataSubscriptionFee
        ) ||
        metadataSubscriptionFee <= 0
      ) {
        console.error(
          "INVALID SUBSCRIPTION FEE IN METADATA:",
          metadata.subscriptionFee
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid subscription amount.",
          },
          { status: 400 }
        );
      }

      if (
        !["weekly", "monthly"].includes(
          subscriptionPeriod || ""
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
              "Invalid subscription period.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(
          subscriptionDuration
        ) ||
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
              "Invalid subscription duration.",
          },
          { status: 400 }
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
          { status: 400 }
        );
      }

      const expectedSubscriptionAmount =
        Math.round(
          metadataSubscriptionFee * 100
        );

      const actualPaymentAmount = Number(
        payment.amount || 0
      );

      if (
        actualPaymentAmount !==
        expectedSubscriptionAmount
      ) {
        console.error(
          "SUBSCRIPTION PAYMENT AMOUNT MISMATCH:",
          {
            expectedSubscriptionAmount,
            actualPaymentAmount,
            reference,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Subscription payment amount does not match the configured subscription.",
          },
          { status: 400 }
        );
      }

      // =========================================
      // 20. CHECK EXISTING SUBSCRIPTION PAYMENT
      // =========================================

      const {
        data: existingPayment,
        error: existingPaymentError,
      } = await supabase
        .from("subscription_payments")
        .select(
          "id, subscription_id, status"
        )
        .eq("reference", reference)
        .maybeSingle();

      if (existingPaymentError) {
        console.error(
          "CHECK EXISTING SUBSCRIPTION PAYMENT ERROR:",
          existingPaymentError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to check existing subscription payment.",
          },
          { status: 500 }
        );
      }

      // =========================================
      // 21. IDEMPOTENCY
      // =========================================

      if (existingPayment) {
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
          subscriptionId:
            existingPayment.subscription_id,
        });
      }

      // =========================================
      // 22. GET BUSINESS
      // =========================================

      const {
        data: business,
        error: businessFetchError,
      } = await supabase
        .from("businesses")
        .select("id, name, status")
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
        console.error(
          "BUSINESS NOT FOUND:",
          businessId
        );

        return NextResponse.json(
          {
            success: false,
            error: "Business not found.",
          },
          { status: 404 }
        );
      }

      // =========================================
      // 23. DETERMINE SUBSCRIPTION DATES
      // =========================================

      const now = new Date();

      const {
        data: existingSubscription,
        error: existingSubscriptionError,
      } = await supabase
        .from("subscriptions")
        .select(
          "id, status, starts_at, expires_at"
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
              "Unable to check the existing subscription.",
          },
          { status: 500 }
        );
      }

      let startsAt = new Date();

      if (
        existingSubscription?.expires_at
      ) {
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

      if (
        subscriptionPeriod === "weekly"
      ) {
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

      // =========================================
      // 24. CREATE SUBSCRIPTION
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
      } = await supabase
        .from("subscriptions")
        .insert({
          business_id: businessId,
          plan_name: planName,
          amount,
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

      // =========================================
      // 25. RECORD SUBSCRIPTION PAYMENT
      // =========================================

      const {
        data: paymentRecord,
        error: paymentError,
      } = await supabase
        .from("subscription_payments")
        .insert({
          subscription_id:
            subscription.id,
          business_id: businessId,
          reference,
          amount,
          status: "success",
          payment_method:
            payment.channel || "paystack",
          paid_at:
            payment.paid_at ||
            new Date().toISOString(),
        })
        .select()
        .single();

      if (
        paymentError ||
        !paymentRecord
      ) {
        console.error(
          "SUBSCRIPTION PAYMENT RECORD ERROR:",
          paymentError
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

      // =========================================
      // 26. APPROVE BUSINESS
      // =========================================

      const {
        error: businessUpdateError,
      } = await supabase
        .from("businesses")
        .update({
          status: "approved",
        })
        .eq("id", businessId);

      if (businessUpdateError) {
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

      // =========================================
      // 27. SUBSCRIPTION PAYMENT COMPLETE
      // =========================================

      console.log(
        "=========================================="
      );

      console.log(
        "BUSINESS SUBSCRIPTION PAYMENT PROCESSED"
      );

      console.log({
        reference,
        businessId,
        amount,
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
      });

      console.log(
        "=========================================="
      );

      return NextResponse.json({
        success: true,
        message:
          "Subscription payment processed successfully.",
        type: "business_subscription",
        reference,
        businessId,
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
      });
    }

    // =========================================
    // UNKNOWN PAYMENT TYPE
    // =========================================

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