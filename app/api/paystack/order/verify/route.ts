import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

const ADADI_COMMISSION_RATE = 2.5;

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

    console.log("==========================================");
    console.log(
      "STARTING CUSTOMER ORDER PAYMENT VERIFICATION"
    );
    console.log({
      reference: paymentReference,
    });
    console.log("==========================================");

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
        "ORDER NOT FOUND:",
        paymentReference
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

    if (
      order.paystack_reference !==
      paymentReference
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

    const paystackData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData.status ||
      !paystackData.data
    ) {
      console.error(
        "PAYSTACK VERIFICATION FAILED:",
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

    const transaction = paystackData.data;

    if (
      transaction.reference !==
      paymentReference
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The verified payment reference does not match the order.",
        },
        { status: 400 }
      );
    }

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

    if (transaction.currency !== "NGN") {
      return NextResponse.json(
        {
          success: false,
          error:
            "The payment currency does not match the order currency.",
        },
        { status: 400 }
      );
    }

    const orderTotal = Number(
      order.total_amount
    );

    if (
      !Number.isFinite(orderTotal) ||
      orderTotal <= 0
    ) {
      console.error(
        "INVALID ORDER TOTAL:",
        order.total_amount
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
      Math.round(orderTotal * 100);

    const paystackAmountKobo =
      Number(transaction.amount);

    if (
      paystackAmountKobo !==
      expectedAmountKobo
    ) {
      console.error(
        "PAYMENT AMOUNT MISMATCH:",
        {
          expectedAmountKobo,
          paystackAmountKobo,
          orderTotal,
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

    const metadata = transaction.metadata;

    if (
      metadata?.orderId &&
      metadata.orderId !== order.id
    ) {
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
      return NextResponse.json(
        {
          success: false,
          error:
            "The payment business information does not match the order.",
        },
        { status: 400 }
      );
    }

    const commissionAmount =
      Math.round(
        orderTotal *
          (ADADI_COMMISSION_RATE / 100) *
          100
      ) / 100;

    const businessAmount =
      Math.round(
        (orderTotal - commissionAmount) *
          100
      ) / 100;

    console.log(
      "ADADI COMMISSION:",
      {
        orderTotal,
        commissionRate:
          ADADI_COMMISSION_RATE,
        commissionAmount,
        businessAmount,
      }
    );

    const {
      data: existingCommission,
      error: commissionFetchError,
    } = await adminSupabase
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

    if (commissionFetchError) {
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

    if (existingCommission) {
      const databaseCommissionAmount =
        Number(
          existingCommission.commission_amount
        );

      const databaseBusinessAmount =
        Number(
          existingCommission.business_amount
        );

      const databaseCommissionRate =
        Number(
          existingCommission.commission_rate
        );

      if (
        Math.abs(
          databaseCommissionRate -
            ADADI_COMMISSION_RATE
        ) > 0.01
      ) {
        console.error(
          "COMMISSION RATE MISMATCH:",
          {
            expected:
              ADADI_COMMISSION_RATE,
            database:
              databaseCommissionRate,
            commissionId:
              existingCommission.id,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "The commission rate does not match ADADI's 2.5% commission.",
          },
          { status: 500 }
        );
      }

      if (
        Math.abs(
          databaseCommissionAmount -
            commissionAmount
        ) > 0.01
      ) {
        console.error(
          "COMMISSION AMOUNT MISMATCH:",
          {
            expected:
              commissionAmount,
            database:
              databaseCommissionAmount,
            commissionId:
              existingCommission.id,
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

      if (
        Math.abs(
          databaseBusinessAmount -
            businessAmount
        ) > 0.01
      ) {
        console.error(
          "BUSINESS AMOUNT MISMATCH:",
          {
            expected:
              businessAmount,
            database:
              databaseBusinessAmount,
            commissionId:
              existingCommission.id,
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

      if (
        existingCommission.status !==
        "paid"
      ) {
        const {
          error: commissionUpdateError,
        } = await adminSupabase
          .from("commissions")
          .update({
            status: "paid",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existingCommission.id
          );

        if (commissionUpdateError) {
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
      }
    } else {
      console.warn(
        "COMMISSION NOT FOUND. CREATING RECOVERY RECORD."
      );

      const {
        data: recoveryCommission,
        error: recoveryCommissionError,
      } = await adminSupabase
        .from("commissions")
        .insert({
          order_id: order.id,
          business_id:
            order.business_id,
          order_total: orderTotal,
          commission_rate:
            ADADI_COMMISSION_RATE,
          commission_amount:
            commissionAmount,
          business_amount:
            businessAmount,
          currency: "NGN",
          status: "paid",
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
              "Payment was successful, but the commission record could not be created. Please contact ADADI support.",
          },
          { status: 500 }
        );
      }
    }

    const {
      data: updatedOrder,
      error: updateOrderError,
    } = await adminSupabase
      .from("orders")
      .update({
        payment_status: "paid",
        order_status: "confirmed",
        status: "paid",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", order.id)
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
        "FAILED TO UPDATE ORDER:",
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

    if (
      updatedOrder.payment_status !==
        "paid" ||
      updatedOrder.order_status !==
        "confirmed" ||
      updatedOrder.status !== "paid"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was verified, but the order status could not be updated correctly. Please contact ADADI support.",
        },
        { status: 500 }
      );
    }

    console.log("==========================================");
    console.log(
      "CUSTOMER ORDER PAYMENT VERIFIED SUCCESSFULLY"
    );
    console.log({
      orderId: updatedOrder.id,
      orderNumber:
        updatedOrder.order_number,
      reference: paymentReference,
      total: orderTotal,
      commissionRate:
        ADADI_COMMISSION_RATE,
      commissionAmount,
      businessAmount,
      paymentStatus:
        updatedOrder.payment_status,
      orderStatus:
        updatedOrder.order_status,
    });
    console.log("==========================================");

    return NextResponse.json({
      success: true,
      message:
        "Payment verified and order confirmed successfully.",
      orderId: updatedOrder.id,
      orderNumber:
        updatedOrder.order_number,
      paymentStatus:
        updatedOrder.payment_status,
      orderStatus:
        updatedOrder.order_status,
      total: orderTotal,
      reference: paymentReference,
      commissionRate:
        ADADI_COMMISSION_RATE,
      commissionAmount,
      businessAmount,
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