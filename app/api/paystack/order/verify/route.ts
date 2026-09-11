import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

const ADADI_FIXED_FEE = 100;

const PAYSTACK_RATE = 0.015;
const PAYSTACK_FLAT_FEE = 100;
const PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD = 2500;
const PAYSTACK_FEE_CAP = 2000;

function calculatePaystackFee(
  amount: number
) {
  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return 0;
  }

  const percentageFee =
    amount * PAYSTACK_RATE;

  const flatFee =
    amount <
    PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD
      ? 0
      : PAYSTACK_FLAT_FEE;

  const fee =
    percentageFee + flatFee;

  return Math.min(
    Math.round(fee * 100) / 100,
    PAYSTACK_FEE_CAP
  );
}

function amountsMatch(
  first: number,
  second: number
) {
  return (
    Math.abs(
      Number(first) -
        Number(second)
    ) <= 0.01
  );
}

export async function POST(
  request: Request
) {
  const adminSupabase =
    createAdminClient();

  try {
    const body =
      await request.json().catch(
        () => ({})
      );

    const reference =
      body?.reference ||
      body?.trxref;

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment reference is required.",
        },
        { status: 400 }
      );
    }

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment service is not configured.",
        },
        { status: 500 }
      );
    }

    const supabase =
      await createClient();

    const {
      data: authData,
    } =
      await supabase.auth.getUser();

    const response =
      await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          reference
        )}`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${paystackSecretKey}`,
          },
          cache: "no-store",
        }
      );

    const paystackData =
      await response.json();

    if (
      !response.ok ||
      !paystackData?.status ||
      !paystackData?.data
    ) {
      console.error(
        "PAYSTACK ORDER VERIFY ERROR:",
        paystackData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
            "Unable to verify payment.",
        },
        { status: 400 }
      );
    }

    const payment =
      paystackData.data;

    if (
      payment.status !==
      "success"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment has not been completed.",
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
            "Invalid payment currency.",
        },
        { status: 400 }
      );
    }

    const metadata =
      payment.metadata || {};

    const orderId =
      metadata.orderId ||
      metadata.order_id;

    let order = null;

    if (orderId) {
      const {
        data,
        error,
      } =
        await adminSupabase
          .from("orders")
          .select(
            `
              id,
              order_number,
              customer_id,
              business_id,
              total,
              total_amount,
              subtotal,
              delivery_fee,
              service_fee,
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

      if (error) {
        console.error(
          "ORDER LOOKUP ERROR:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to find the order.",
          },
          { status: 500 }
        );
      }

      order = data;
    }

    if (!order) {
      const {
        data,
        error,
      } =
        await adminSupabase
          .from("orders")
          .select(
            `
              id,
              order_number,
              customer_id,
              business_id,
              total,
              total_amount,
              subtotal,
              delivery_fee,
              service_fee,
              payment_status,
              order_status,
              status,
              paystack_reference
            `
          )
          .eq(
            "paystack_reference",
            reference
          )
          .maybeSingle();

      if (error) {
        console.error(
          "ORDER REFERENCE LOOKUP ERROR:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to find the order.",
          },
          { status: 500 }
        );
      }

      order = data;
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to find the order connected to this payment.",
        },
        { status: 404 }
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
      metadata.businessId &&
      metadata.businessId !==
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

    if (
      authData?.user &&
      order.customer_id !==
        authData.user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to verify this order payment.",
        },
        { status: 403 }
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
        "PAYMENT AMOUNT MISMATCH:",
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
            "The payment amount does not match the order total.",
        },
        { status: 400 }
      );
    }

    const subtotal =
      Number(order.subtotal) || 0;

    const deliveryFee =
      Number(order.delivery_fee) || 0;

    const storedPaystackFee =
      Number(order.service_fee) || 0;

    const expectedTotal =
      Math.round(
        (
          subtotal +
          ADADI_FIXED_FEE +
          deliveryFee
        ) * 100
      ) / 100;

    if (
      !amountsMatch(
        expectedTotal,
        orderTotal
      )
    ) {
      console.error(
        "ORDER TOTAL CALCULATION MISMATCH:",
        {
          subtotal,
          adadiFixedFee:
            ADADI_FIXED_FEE,
          deliveryFee,
          expectedTotal,
          orderTotal,
          reference,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The order total calculation does not match the stored order.",
        },
        { status: 400 }
      );
    }

    const calculatedPaystackFee =
      calculatePaystackFee(
        orderTotal
      );

    if (
      storedPaystackFee > 0 &&
      !amountsMatch(
        storedPaystackFee,
        calculatedPaystackFee
      )
    ) {
      console.error(
        "PAYSTACK FEE MISMATCH:",
        {
          storedPaystackFee,
          calculatedPaystackFee,
          orderTotal,
          reference,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The payment fee calculation does not match the order.",
        },
        { status: 400 }
      );
    }

    const {
      data: settings,
      error: settingsError,
    } =
      await adminSupabase
        .from("platform_settings")
        .select(
          "commission_rate"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (
      settingsError ||
      !settings
    ) {
      console.error(
        "COMMISSION SETTINGS ERROR:",
        settingsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load the commission settings.",
        },
        { status: 500 }
      );
    }

    const commissionRate =
      Number(
        settings.commission_rate
      );

    const {
      data: commission,
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
            "Order was paid, but the commission record could not be checked.",
        },
        { status: 500 }
      );
    }

    if (!commission) {
      console.error(
        "COMMISSION RECORD NOT FOUND:",
        {
          orderId: order.id,
          reference,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Order was paid, but the commission record was not found.",
        },
        { status: 500 }
      );
    }

    if (
      commission.paystack_reference &&
      commission.paystack_reference !==
        reference
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

    const expectedCommissionAmount =
      Math.round(
        orderTotal *
          (commissionRate / 100) *
          100
      ) / 100;

    const expectedBusinessAmount =
      Math.round(
        (
          orderTotal -
          expectedCommissionAmount -
          calculatedPaystackFee
        ) * 100
      ) / 100;

    if (
      !amountsMatch(
        Number(
          commission.commission_amount
        ),
        expectedCommissionAmount
      )
    ) {
      console.error(
        "COMMISSION AMOUNT MISMATCH:",
        {
          database:
            commission.commission_amount,
          expected:
            expectedCommissionAmount,
          reference,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The commission amount does not match the order payment.",
        },
        { status: 400 }
      );
    }

    if (
      !amountsMatch(
        Number(
          commission.business_amount
        ),
        expectedBusinessAmount
      )
    ) {
      console.error(
        "BUSINESS AMOUNT MISMATCH:",
        {
          database:
            commission.business_amount,
          expected:
            expectedBusinessAmount,
          reference,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The business payment amount does not match the order payment.",
        },
        { status: 400 }
      );
    }

    const paidAt =
      payment.paid_at ||
      new Date().toISOString();

    const {
      data: updatedOrder,
      error:
        orderUpdateError,
    } =
      await adminSupabase
        .from("orders")
        .update({
          payment_status:
            "paid",
          order_status:
            "awaiting_confirmation",
          status:
            "awaiting_confirmation",
          paid_at:
            paidAt,
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
            paystack_reference,
            paid_at
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
            "Payment was successful, but we could not update the order.",
        },
        { status: 500 }
      );
    }

    const {
      data: existingPayment,
      error:
        existingPaymentError,
    } =
      await adminSupabase
        .from("payments")
        .select(
          "id, status"
        )
        .eq(
          "order_id",
          order.id
        )
        .maybeSingle();

    if (existingPaymentError) {
      console.error(
        "PAYMENT RECORD LOOKUP ERROR:",
        existingPaymentError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Order was paid, but the payment record could not be checked.",
        },
        { status: 500 }
      );
    }

    if (existingPayment) {
      const {
        error:
          paymentUpdateError,
      } =
        await adminSupabase
          .from("payments")
          .update({
            reference,
            amount:
              orderTotal,
            status:
              "success",
          })
          .eq(
            "id",
            existingPayment.id
          );

      if (paymentUpdateError) {
        console.error(
          "PAYMENT RECORD UPDATE ERROR:",
          paymentUpdateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Order was paid, but the payment record could not be updated.",
          },
          { status: 500 }
        );
      }
    } else {
      const {
        error:
          paymentInsertError,
      } =
        await adminSupabase
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
          "PAYMENT RECORD INSERT ERROR:",
          paymentInsertError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Order was paid, but the payment record could not be created.",
          },
          { status: 500 }
        );
      }
    }

    if (
      commission.status !==
      "paid"
    ) {
      const {
        error:
          commissionUpdateError,
      } =
        await adminSupabase
          .from("commissions")
          .update({
            status:
              "paid",
          })
          .eq(
            "id",
            commission.id
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
              "Payment was successful, but the commission could not be marked as paid.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Payment verified and order updated successfully.",
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
      reference,
      commissionRate,
      commissionAmount:
        expectedCommissionAmount,
      paystackFee:
        calculatedPaystackFee,
      businessAmount:
        expectedBusinessAmount,
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