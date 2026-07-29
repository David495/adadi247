import crypto from "crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/app/lib/supabase/admin";

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

    metadata?: {
      type?: string;

      businessId?: string;

      orderId?: string;

      orderNumber?: string;

      customerId?: string;

      commissionRate?: number;

      commissionAmount?: number;

      businessAmount?: number;

      orderTotal?: number;

      businessSubaccount?: string;

      [key: string]: unknown;
    };
  };
};

export async function POST(
  request: Request
) {
  try {
    // =========================================
    // 1. CHECK PAYSTACK SECRET KEY
    // =========================================

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
            "Paystack secret key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================
    // 2. GET PAYSTACK SIGNATURE
    // =========================================

    const signature =
      request.headers.get(
        "x-paystack-signature"
      );

    if (!signature) {
      console.error(
        "MISSING PAYSTACK SIGNATURE"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Missing Paystack signature.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // 3. GET RAW REQUEST BODY
    // =========================================
    //
    // IMPORTANT:
    //
    // The signature must be generated from
    // the exact raw request body.
    //
    // Do NOT call request.json() before this.
    //

    const body =
      await request.text();

    // =========================================
    // 4. VERIFY PAYSTACK SIGNATURE
    // =========================================

    const expectedSignature =
      crypto
        .createHmac(
          "sha512",
          paystackSecretKey
        )
        .update(body)
        .digest("hex");

    // Use timingSafeEqual instead of a
    // direct string comparison.

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
      console.error(
        "INVALID PAYSTACK SIGNATURE"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid Paystack signature.",
        },
        {
          status: 401,
        }
      );
    }

    console.log(
      "PAYSTACK SIGNATURE VERIFIED"
    );

    // =========================================
    // 5. PARSE PAYSTACK EVENT
    // =========================================

    let event: PaystackEvent;

    try {
      event =
        JSON.parse(body) as PaystackEvent;
    } catch (error) {
      console.error(
        "INVALID PAYSTACK WEBHOOK JSON:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook payload.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "=========================================="
    );

    console.log(
      "PAYSTACK WEBHOOK EVENT:",
      event.event
    );

    console.log(
      "=========================================="
    );

    // =========================================
    // 6. ONLY PROCESS SUCCESSFUL PAYMENTS
    // =========================================

    if (
      event.event !==
      "charge.success"
    ) {
      console.log(
        "PAYSTACK EVENT NOT PROCESSED:",
        event.event
      );

      return NextResponse.json({
        success: true,

        message:
          "Event received but not processed.",

        event:
          event.event ||
          null,
      });
    }

    // =========================================
    // 7. GET PAYMENT DATA
    // =========================================

    const payment =
      event.data;

    if (!payment) {
      console.error(
        "PAYSTACK PAYMENT DATA MISSING"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment data is missing.",
        },
        {
          status: 400,
        }
      );
    }

    const reference =
      payment.reference;

    if (!reference) {
      console.error(
        "PAYSTACK PAYMENT REFERENCE MISSING"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment reference is missing.",
        },
        {
          status: 400,
        }
      );
    }

    const amount =
      Number(
        payment.amount || 0
      ) / 100;

    const metadata =
      payment.metadata || {};

    console.log(
      "PAYSTACK SUCCESSFUL PAYMENT:",
      {
        reference,

        amount,

        currency:
          payment.currency,

        channel:
          payment.channel,

        paymentStatus:
          payment.status,

        metadata,
      }
    );

    // =========================================
    // 8. CREATE ADMIN SUPABASE CLIENT
    // =========================================

    const supabase =
      createAdminClient();

    // =========================================
    // 9. DETERMINE PAYMENT TYPE
    // =========================================

    const paymentType =
      metadata.type;

    // =========================================
    // 10. HANDLE CUSTOMER ORDER PAYMENT
    // =========================================

    if (
      paymentType ===
      "customer_order"
    ) {
      console.log(
        "PROCESSING CUSTOMER ORDER PAYMENT"
      );

      const orderId =
        metadata.orderId;

      const businessId =
        metadata.businessId;

      if (!orderId) {
        console.error(
          "ORDER ID MISSING FROM CUSTOMER ORDER PAYMENT"
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Order ID missing from payment metadata.",
          },
          {
            status: 400,
          }
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
          {
            status: 400,
          }
        );
      }

      // =========================================
      // 11. GET ORDER
      // =========================================

      const {
        data: order,
        error: orderFetchError,
      } =
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

      if (orderFetchError) {
        console.error(
          "ORDER FETCH ERROR:",
          orderFetchError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to find order.",
          },
          {
            status: 500,
          }
        );
      }

      if (!order) {
        console.error(
          "ORDER NOT FOUND:",
          orderId
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Order not found.",
          },
          {
            status: 404,
          }
        );
      }

      // =========================================
      // 12. VERIFY ORDER BUSINESS
      // =========================================

      if (
        order.business_id !==
        businessId
      ) {
        console.error(
          "ORDER BUSINESS MISMATCH:",
          {
            orderBusinessId:
              order.business_id,

            metadataBusinessId:
              businessId,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Order business does not match payment.",
          },
          {
            status: 400,
          }
        );
      }

      // =========================================
      // 13. VERIFY PAYSTACK REFERENCE
      // =========================================

      if (
        order.paystack_reference &&
        order.paystack_reference !==
          reference
      ) {
        console.error(
          "PAYSTACK REFERENCE MISMATCH:",
          {
            orderReference:
              order.paystack_reference,

            paymentReference:
              reference,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment reference does not match order.",
          },
          {
            status: 400,
          }
        );
      }

      // =========================================
      // 14. VERIFY PAYMENT AMOUNT
      // =========================================
      //
      // NEVER trust the amount from metadata.
      //
      // We compare Paystack's actual successful
      // payment amount against the order total
      // stored in our database.
      //

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
        expectedOrderTotal <= 0
      ) {
        console.error(
          "INVALID ORDER TOTAL:",
          {
            orderId,
            expectedOrderTotal,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid order total.",
          },
          {
            status: 500,
          }
        );
      }

      const expectedAmountInKobo =
        Math.round(
          expectedOrderTotal *
            100
        );

      const actualAmountInKobo =
        Number(
          payment.amount || 0
        );

      if (
        actualAmountInKobo !==
        expectedAmountInKobo
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
          {
            status: 400,
          }
        );
      }

      // =========================================
      // 15. IDEMPOTENCY CHECK
      // =========================================
      //
      // If the webhook arrives again after
      // the order has already been marked paid,
      // do not process it again.
      //

      if (
        order.payment_status ===
          "paid" ||
        order.order_status ===
          "confirmed"
      ) {
        console.log(
          "ORDER PAYMENT ALREADY PROCESSED:",
          {
            orderId,

            orderNumber:
              order.order_number,

            reference,
          }
        );

        return NextResponse.json({
          success: true,

          message:
            "Customer order payment already processed.",

          type:
            "customer_order",

          reference,

          orderId,

          orderNumber:
            order.order_number,
        });
      }

      // =========================================
      // 16. UPDATE ORDER PAYMENT STATUS
      // =========================================

      const {
        data: updatedOrder,
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
          })
          .eq(
            "id",
            orderId
          )
          .select(
            `
              id,
              order_number,
              payment_status,
              order_status,
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
          {
            status: 500,
          }
        );
      }

      console.log(
        "CUSTOMER ORDER MARKED AS PAID:",
        {
          orderId:
            updatedOrder.id,

          orderNumber:
            updatedOrder.order_number,

          reference,

          amount,
        }
      );

      // =========================================
      // 17. UPDATE COMMISSION
      // =========================================
      //
      // The commission record was created as
      // "pending" during payment initialization.
      //
      // Now that Paystack confirms payment,
      // mark it as paid.
      //

      const {
        data: commission,
        error: commissionFetchError,
      } =
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
          .eq(
            "order_id",
            orderId
          )
          .maybeSingle();

      if (
        commissionFetchError
      ) {
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
          {
            status: 500,
          }
        );
      }

      if (commission) {
        // =========================================
        // VERIFY COMMISSION REFERENCE
        // =========================================

        if (
          commission.paystack_reference &&
          commission.paystack_reference !==
            reference
        ) {
          console.error(
            "COMMISSION REFERENCE MISMATCH:",
            {
              commissionReference:
                commission.paystack_reference,

              paymentReference:
                reference,
            }
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "Commission payment reference mismatch.",
            },
            {
              status: 400,
            }
          );
        }

        // =========================================
        // UPDATE COMMISSION
        // =========================================

        if (
          commission.status !==
          "paid"
        ) {
          const {
            error:
              commissionUpdateError,
          } =
            await supabase
              .from("commissions")
              .update({
                status:
                  "paid",

                paid_at:
                  payment.paid_at ||
                  new Date().toISOString(),
              })
              .eq(
                "id",
                commission.id
              );

          if (
            commissionUpdateError
          ) {
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
              {
                status: 500,
              }
            );
          }

          console.log(
            "COMMISSION MARKED AS PAID:",
            {
              commissionId:
                commission.id,

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
        // =========================================
        // COMMISSION RECORD MISSING
        // =========================================
        //
        // The payment is already successful.
        // We do NOT reverse or delete the order.
        //
        // We return an error so the webhook can
        // be retried or the issue can be handled.
        //

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
          {
            status: 500,
          }
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

        paymentStatus:
          "paid",

        orderStatus:
          "confirmed",
      });

      console.log(
        "=========================================="
      );

      return NextResponse.json({
        success: true,

        message:
          "Customer order payment processed successfully.",

        type:
          "customer_order",

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
      paymentType ===
      "business_subscription"
    ) {
      console.log(
        "PROCESSING BUSINESS SUBSCRIPTION PAYMENT"
      );

      const businessId =
        metadata.businessId;

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
          {
            status: 400,
          }
        );
      }

      // =========================================
      // 20. CHECK EXISTING SUBSCRIPTION PAYMENT
      // =========================================

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
            "id, subscription_id, status"
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
          "CHECK EXISTING SUBSCRIPTION PAYMENT ERROR:",
          existingPaymentError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to check existing subscription payment.",
          },
          {
            status: 500,
          }
        );
      }

      // =========================================
      // 21. IDEMPOTENCY
      // =========================================

      if (
        existingPayment
      ) {
        console.log(
          "SUBSCRIPTION PAYMENT ALREADY PROCESSED:",
          reference
        );

        return NextResponse.json({
          success: true,

          message:
            "Subscription payment already processed.",

          type:
            "business_subscription",

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
        error:
          businessFetchError,
      } =
        await supabase
          .from("businesses")
          .select(
            "id, name, status"
          )
          .eq(
            "id",
            businessId
          )
          .maybeSingle();

      if (
        businessFetchError
      ) {
        console.error(
          "BUSINESS FETCH ERROR:",
          businessFetchError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to find business.",
          },
          {
            status: 500,
          }
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
            error:
              "Business not found.",
          },
          {
            status: 404,
          }
        );
      }

      // =========================================
      // 23. CREATE 7-DAY SUBSCRIPTION
      // =========================================

      const startsAt =
        new Date();

      const expiresAt =
        new Date();

      expiresAt.setDate(
        expiresAt.getDate() +
          7
      );

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
              "starter",

            amount,

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
          {
            status: 500,
          }
        );
      }

      // =========================================
      // 24. RECORD SUBSCRIPTION PAYMENT
      // =========================================

      const {
        data: paymentRecord,
        error:
          paymentError,
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

            amount,

            status:
              "success",

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
          {
            status: 500,
          }
        );
      }

      // =========================================
      // 25. APPROVE BUSINESS
      // =========================================

      const {
        error:
          businessUpdateError,
      } =
        await supabase
          .from("businesses")
          .update({
            status:
              "approved",
          })
          .eq(
            "id",
            businessId
          );

      if (
        businessUpdateError
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
          {
            status: 500,
          }
        );
      }

      // =========================================
      // 26. SUBSCRIPTION PAYMENT COMPLETE
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

        type:
          "business_subscription",

        reference,

        businessId,

        subscriptionId:
          subscription.id,

        paymentId:
          paymentRecord.id,
      });
    }

    // =========================================
    // 27. UNKNOWN PAYMENT TYPE
    // =========================================

    console.warn(
      "UNKNOWN PAYSTACK PAYMENT TYPE:",
      {
        reference,

        paymentType,

        metadata,
      }
    );

    return NextResponse.json({
      success: true,

      message:
        "Payment received but payment type was not recognized.",

      reference,

      paymentType:
        paymentType ||
        null,
    });

  } catch (error) {
    console.error(
      "=========================================="
    );

    console.error(
      "PAYSTACK WEBHOOK PROCESSING ERROR:"
    );

    console.error(
      error
    );

    console.error(
      "=========================================="
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}