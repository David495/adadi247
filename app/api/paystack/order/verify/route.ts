import { NextResponse } from "next/server";

import { createAdminClient } from "@/app/lib/supabase/admin";

const ADADI_COMMISSION_RATE = 5;

export async function POST(request: Request) {
  try {
    // =========================================
    // 1. GET REQUEST DATA
    // =========================================

    const body = await request.json();

    const { reference } = body as {
      reference?: string;
    };

    // =========================================
    // 2. VALIDATE REFERENCE
    // =========================================

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

    console.log(
      "=========================================="
    );

    console.log(
      "STARTING CUSTOMER ORDER PAYMENT VERIFICATION"
    );

    console.log({
      reference: paymentReference,
    });

    console.log(
      "=========================================="
    );

    // =========================================
    // 3. CHECK PAYSTACK SECRET KEY
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
            "Payment service is not properly configured.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 4. CREATE ADMIN SUPABASE CLIENT
    // =========================================

    const adminSupabase =
      createAdminClient();

    // =========================================
    // 5. FIND ORDER BY PAYSTACK REFERENCE
    // =========================================
    //
    // IMPORTANT:
    //
    // We intentionally do NOT require the customer
    // to still be authenticated.
    //
    // Paystack redirects the customer back to the
    // callback page after payment. The browser
    // session should not be required to identify
    // the order.
    //
    // The Paystack reference is unique and will
    // later be verified directly against Paystack.
    //
    // =========================================

    const {
      data: order,
      error: orderFetchError,
    } = await adminSupabase
      .from("orders")
      .select(
        `
          id,
          customer_id,
          business_id,
          order_number,
          total_amount,
          subtotal,
          delivery_fee,
          status,
          payment_status,
          order_status,
          paystack_reference
        `
      )
      .eq(
        "paystack_reference",
        paymentReference
      )
      .maybeSingle();

    if (orderFetchError) {
      console.error(
        "ORDER LOOKUP ERROR:",
        orderFetchError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "We could not look up your order. Please contact ADADI support.",
        },
        { status: 500 }
      );
    }

    if (!order) {
      console.error(
        "ORDER NOT FOUND FOR PAYMENT REFERENCE:",
        {
          reference:
            paymentReference,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "We could not find an order associated with this payment.",
        },
        { status: 404 }
      );
    }

    console.log(
      "ORDER FOUND FOR PAYMENT VERIFICATION:",
      {
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        customerId:
          order.customer_id,

        businessId:
          order.business_id,

        total:
          order.total_amount,

        paymentStatus:
          order.payment_status,

        orderStatus:
          order.order_status,

        status:
          order.status,

        reference:
          order.paystack_reference,
      }
    );

    // =========================================
    // 6. VERIFY ORDER REFERENCE
    // =========================================

    if (
      order.paystack_reference !==
      paymentReference
    ) {
      console.error(
        "ORDER REFERENCE MISMATCH:",
        {
          databaseReference:
            order.paystack_reference,

          requestReference:
            paymentReference,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment reference does not match the order.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 7. VERIFY PAYMENT DIRECTLY WITH PAYSTACK
    // =========================================

    console.log(
      "VERIFYING TRANSACTION WITH PAYSTACK:",
      {
        reference:
          paymentReference,
      }
    );

    const paystackResponse =
      await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          paymentReference
        )}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${paystackSecretKey}`,

            "Content-Type":
              "application/json",
          },

          cache: "no-store",
        }
      );

    const paystackData =
      await paystackResponse.json();

    console.log(
      "PAYSTACK VERIFICATION RESPONSE:",
      paystackData
    );

    // =========================================
    // 8. HANDLE PAYSTACK API ERROR
    // =========================================

    if (
      !paystackResponse.ok ||
      !paystackData.status ||
      !paystackData.data
    ) {
      console.error(
        "PAYSTACK TRANSACTION VERIFICATION FAILED:",
        paystackData
      );

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

    // =========================================
    // 9. GET PAYSTACK TRANSACTION DATA
    // =========================================

    const transaction =
      paystackData.data;

    const paystackStatus =
      transaction.status;

    const paystackReference =
      transaction.reference;

    const paystackAmountKobo =
      Number(
        transaction.amount
      );

    const paystackCurrency =
      transaction.currency;

    // =========================================
    // 10. VERIFY PAYSTACK REFERENCE
    // =========================================

    if (
      paystackReference !==
      paymentReference
    ) {
      console.error(
        "PAYSTACK REFERENCE MISMATCH:",
        {
          expected:
            paymentReference,

          received:
            paystackReference,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The verified payment reference does not match the order.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 11. VERIFY PAYMENT STATUS
    // =========================================

    if (
      paystackStatus !==
      "success"
    ) {
      console.error(
        "PAYMENT WAS NOT SUCCESSFUL:",
        {
          reference:
            paymentReference,

          status:
            paystackStatus,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            `Payment was not successful. Paystack status: ${
              paystackStatus ||
              "unknown"
            }.`,
        },
        { status: 400 }
      );
    }

    // =========================================
    // 12. VERIFY CURRENCY
    // =========================================

    if (
      paystackCurrency !==
      "NGN"
    ) {
      console.error(
        "INVALID PAYMENT CURRENCY:",
        {
          expected:
            "NGN",

          received:
            paystackCurrency,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The payment currency does not match the order currency.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 13. CALCULATE EXPECTED ORDER AMOUNT
    // =========================================

    const orderTotal =
      Number(
        order.total_amount
      );

    if (
      !Number.isFinite(
        orderTotal
      ) ||
      orderTotal <= 0
    ) {
      console.error(
        "INVALID ORDER TOTAL:",
        {
          orderId:
            order.id,

          orderTotal,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The order contains an invalid payment amount.",
        },
        { status: 500 }
      );
    }

    const expectedAmountKobo =
      Math.round(
        orderTotal * 100
      );

    // =========================================
    // 14. VERIFY PAYMENT AMOUNT
    // =========================================

    if (
      paystackAmountKobo !==
      expectedAmountKobo
    ) {
      console.error(
        "PAYMENT AMOUNT MISMATCH:",
        {
          orderId:
            order.id,

          orderNumber:
            order.order_number,

          expectedAmountKobo,

          paystackAmountKobo,

          expectedNaira:
            orderTotal,

          receivedNaira:
            paystackAmountKobo / 100,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The payment amount does not match the order total.",
        },
        { status: 400 }
      );
    }

    console.log(
      "PAYMENT AMOUNT VERIFIED:",
      {
        orderTotal,

        expectedAmountKobo,

        paystackAmountKobo,

        currency:
          paystackCurrency,
      }
    );

    // =========================================
    // 15. VERIFY PAYSTACK METADATA
    // =========================================

    const metadata =
      transaction.metadata;

    if (
      metadata?.orderId &&
      metadata.orderId !==
        order.id
    ) {
      console.error(
        "PAYSTACK METADATA ORDER ID MISMATCH:",
        {
          expectedOrderId:
            order.id,

          receivedOrderId:
            metadata.orderId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The payment metadata does not match the order.",
        },
        { status: 400 }
      );
    }

    if (
      metadata?.businessId &&
      metadata.businessId !==
        order.business_id
    ) {
      console.error(
        "PAYSTACK METADATA BUSINESS ID MISMATCH:",
        {
          expectedBusinessId:
            order.business_id,

          receivedBusinessId:
            metadata.businessId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The payment business information does not match the order.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 16. CALCULATE COMMISSION
    // =========================================

    const commissionAmount =
      Math.round(
        orderTotal *
          (ADADI_COMMISSION_RATE / 100) *
          100
      ) / 100;

    const businessAmount =
      Math.round(
        (orderTotal -
          commissionAmount) *
          100
      ) / 100;

    console.log(
      "VERIFIED PAYMENT COMMISSION:",
      {
        orderTotal,

        commissionRate:
          ADADI_COMMISSION_RATE,

        commissionAmount,

        businessAmount,
      }
    );

    // =========================================
    // 17. UPDATE ORDER AS PAID AND CONFIRMED
    // =========================================
    //
    // We update all three status fields.
    //
    // payment_status = paid
    // order_status   = confirmed
    // status         = paid
    //
    // =========================================

    const {
      data:
        updatedOrder,
      error:
        updateOrderError,
    } =
      await adminSupabase
        .from("orders")
        .update({
          payment_status:
            "paid",

          order_status:
            "confirmed",

          status:
            "paid",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          order.id
        )
        .select(
          `
            id,
            order_number,
            total_amount,
            payment_status,
            order_status,
            status,
            paystack_reference
          `
        )
        .single();

    if (
      updateOrderError ||
      !updatedOrder
    ) {
      console.error(
        "FAILED TO UPDATE ORDER AFTER SUCCESSFUL PAYMENT:",
        updateOrderError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was successful, but we could not confirm your order. Please contact ADADI support.",
        },
        { status: 500 }
      );
    }

    console.log(
      "ORDER UPDATED AFTER PAYMENT VERIFICATION:",
      updatedOrder
    );

    // =========================================
    // 18. VERIFY THAT ALL STATUS VALUES UPDATED
    // =========================================

    if (
      updatedOrder.payment_status !==
        "paid" ||
      updatedOrder.order_status !==
        "confirmed" ||
      updatedOrder.status !==
        "paid"
    ) {
      console.error(
        "ORDER STATUS UPDATE DID NOT PRODUCE EXPECTED VALUES:",
        updatedOrder
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was verified, but the order status could not be updated correctly. Please contact ADADI support.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 19. FIND COMMISSION RECORD
    // =========================================

    const {
      data:
        commission,
      error:
        commissionFetchError,
    } =
      await adminSupabase
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
            currency,
            status,
            paystack_reference
          `
        )
        .eq(
          "order_id",
          order.id
        )
        .eq(
          "paystack_reference",
          paymentReference
        )
        .maybeSingle();

    if (
      commissionFetchError
    ) {
      console.error(
        "COMMISSION LOOKUP ERROR:",
        commissionFetchError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was successful, but we could not verify the commission record.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 20. UPDATE EXISTING COMMISSION
    // =========================================

    if (
      commission
    ) {
      const databaseCommissionAmount =
        Number(
          commission.commission_amount
        );

      const databaseBusinessAmount =
        Number(
          commission.business_amount
        );

      const databaseCommissionRate =
        Number(
          commission.commission_rate
        );

      // =========================================
      // VERIFY COMMISSION RATE
      // =========================================

      if (
        databaseCommissionRate !==
        ADADI_COMMISSION_RATE
      ) {
        console.error(
          "COMMISSION RATE MISMATCH:",
          {
            expected:
              ADADI_COMMISSION_RATE,

            database:
              databaseCommissionRate,

            commissionId:
              commission.id,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "The commission configuration does not match the expected payment configuration.",
          },
          { status: 500 }
        );
      }

      // =========================================
      // VERIFY COMMISSION AMOUNT
      // =========================================

      if (
        Math.abs(
          databaseCommissionAmount -
            commissionAmount
        ) >
        0.01
      ) {
        console.error(
          "COMMISSION AMOUNT MISMATCH:",
          {
            expected:
              commissionAmount,

            database:
              databaseCommissionAmount,

            commissionId:
              commission.id,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "The commission amount does not match the verified order payment.",
          },
          { status: 500 }
        );
      }

      // =========================================
      // VERIFY BUSINESS AMOUNT
      // =========================================

      if (
        Math.abs(
          databaseBusinessAmount -
            businessAmount
        ) >
        0.01
      ) {
        console.error(
          "BUSINESS AMOUNT MISMATCH:",
          {
            expected:
              businessAmount,

            database:
              databaseBusinessAmount,

            commissionId:
              commission.id,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "The business amount does not match the verified order payment.",
          },
          { status: 500 }
        );
      }

      // =========================================
      // MARK COMMISSION AS PAID
      // =========================================

      const {
        error:
          commissionUpdateError,
      } =
        await adminSupabase
          .from("commissions")
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
        console.error(
          "COMMISSION UPDATE ERROR:",
          commissionUpdateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was successful, but the commission record could not be updated.",
          },
          { status: 500 }
        );
      }

      console.log(
        "COMMISSION MARKED AS PAID:",
        {
          commissionId:
            commission.id,

          orderId:
            order.id,

          reference:
            paymentReference,

          commissionAmount,

          businessAmount,
        }
      );
    } else {
      // =========================================
      // 21. CREATE RECOVERY COMMISSION
      // =========================================

      console.warn(
        "COMMISSION RECORD NOT FOUND. CREATING RECOVERY RECORD:",
        {
          orderId:
            order.id,

          businessId:
            order.business_id,

          reference:
            paymentReference,
        }
      );

      const {
        data:
          recoveryCommission,
        error:
          recoveryCommissionError,
      } =
        await adminSupabase
          .from("commissions")
          .insert({
            order_id:
              order.id,

            business_id:
              order.business_id,

            order_total:
              orderTotal,

            commission_rate:
              ADADI_COMMISSION_RATE,

            commission_amount:
              commissionAmount,

            business_amount:
              businessAmount,

            currency:
              "NGN",

            status:
              "paid",

            paystack_reference:
              paymentReference,

            updated_at:
              new Date().toISOString(),
          })
          .select()
          .single();

      if (
        recoveryCommissionError ||
        !recoveryCommission
      ) {
        console.error(
          "FAILED TO CREATE RECOVERY COMMISSION:",
          recoveryCommissionError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was successful and your order was confirmed, but the commission record could not be created. Please contact ADADI support.",
          },
          { status: 500 }
        );
      }

      console.log(
        "RECOVERY COMMISSION CREATED:",
        {
          commissionId:
            recoveryCommission.id,

          orderId:
            order.id,

          reference:
            paymentReference,
        }
      );
    }

    // =========================================
    // 22. FINAL SUCCESS RESPONSE
    // =========================================

    console.log(
      "=========================================="
    );

    console.log(
      "CUSTOMER ORDER PAYMENT VERIFIED SUCCESSFULLY"
    );

    console.log({
      orderId:
        updatedOrder.id,

      orderNumber:
        updatedOrder.order_number,

      reference:
        paymentReference,

      total:
        orderTotal,

      paymentStatus:
        updatedOrder.payment_status,

      orderStatus:
        updatedOrder.order_status,

      status:
        updatedOrder.status,

      commissionRate:
        ADADI_COMMISSION_RATE,

      commissionAmount,

      businessAmount,
    });

    console.log(
      "=========================================="
    );

    return NextResponse.json({
      success: true,

      message:
        "Payment verified and order confirmed successfully.",

      orderId:
        updatedOrder.id,

      orderNumber:
        updatedOrder.order_number,

      paymentStatus:
        updatedOrder.payment_status,

      orderStatus:
        updatedOrder.order_status,

      total:
        orderTotal,

      reference:
        paymentReference,
    });
  } catch (error) {
    console.error(
      "CUSTOMER ORDER PAYMENT VERIFICATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while verifying your payment.",
      },
      { status: 500 }
    );
  }
}