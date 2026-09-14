import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: Request) {
  const adminSupabase = createAdminClient();

  try {
    const body = await request.json().catch(() => ({}));

    const reference = body?.reference || body?.trxref;

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment reference is required.",
        },
        { status: 400 }
      );
    }

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error("PAYSTACK SECRET KEY IS MISSING.");

      return NextResponse.json(
        {
          success: false,
          error: "Payment service is not configured.",
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const { data: authData } =
      await supabase.auth.getUser();

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
        cache: "no-store",
      }
    );

    const paystackData = await response.json();

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

    const payment = paystackData.data;

    if (payment.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment has not been completed yet.",
        },
        { status: 409 }
      );
    }

    if (payment.currency !== "NGN") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment currency.",
        },
        { status: 400 }
      );
    }

    const metadata = payment.metadata || {};

    const orderId =
      metadata.orderId ||
      metadata.order_id;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment is not connected to an order.",
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
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error(
        "ORDER LOOKUP ERROR:",
        orderError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to find the order.",
        },
        { status: 500 }
      );
    }

    if (!order) {
      const {
        data: referenceOrder,
        error: referenceOrderError,
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
          "paystack_reference",
          reference
        )
        .maybeSingle();

      if (referenceOrderError) {
        console.error(
          "ORDER REFERENCE LOOKUP ERROR:",
          referenceOrderError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Unable to find the order.",
          },
          { status: 500 }
        );
      }

      if (!referenceOrder) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to find the order connected to this payment.",
          },
          { status: 404 }
        );
      }

      return await finalizeOrderPayment({
        adminSupabase,
        order: referenceOrder,
        payment,
        reference,
        authUserId:
          authData?.user?.id,
      });
    }

    return await finalizeOrderPayment({
      adminSupabase,
      order,
      payment,
      reference,
      authUserId:
        authData?.user?.id,
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

async function finalizeOrderPayment({
  adminSupabase,
  order,
  payment,
  reference,
  authUserId,
}: {
  adminSupabase: ReturnType<
    typeof createAdminClient
  >;
  order: {
    id: string;
    order_number: string | null;
    customer_id: string | null;
    business_id: string | null;
    total: number | string | null;
    total_amount: number | string | null;
    payment_status: string | null;
    order_status: string | null;
    status: string | null;
    paystack_reference: string | null;
  };
  payment: {
    amount?: number;
    currency?: string;
    status?: string;
    paid_at?: string;
    reference?: string;
    metadata?: {
      businessId?: string;
    };
  };
  reference: string;
  authUserId?: string;
}) {
  if (
    order.paystack_reference &&
    order.paystack_reference !== reference
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
    authUserId &&
    order.customer_id &&
    order.customer_id !== authUserId
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

  if (payment.currency !== "NGN") {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid payment currency.",
      },
      { status: 400 }
    );
  }

  if (payment.status !== "success") {
    return NextResponse.json(
      {
        success: false,
        error:
          "This payment has not been completed yet.",
      },
      { status: 409 }
    );
  }

  const metadataBusinessId =
    payment.metadata?.businessId;

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

  const orderTotal = Number(
    order.total ?? order.total_amount
  );

  const paymentAmount =
    Number(payment.amount) / 100;

  if (
    !Number.isFinite(orderTotal) ||
    orderTotal <= 0
  ) {
    console.error(
      "INVALID ORDER TOTAL:",
      {
        orderId: order.id,
        orderTotal,
        reference,
      }
    );

    return NextResponse.json(
      {
        success: false,
        error: "The order total is invalid.",
      },
      { status: 500 }
    );
  }

  if (
    Math.abs(
      paymentAmount - orderTotal
    ) > 0.01
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

  /*
   * The payment has been independently confirmed by Paystack.
   *
   * payment_status becomes "paid".
   *
   * The order itself remains "pending" until the business
   * confirms/accepts the order.
   *
   * Both values are valid according to the current orders
   * database constraints.
   */
  const {
    data: updatedOrder,
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
    .eq("id", order.id)
    .select(
      `
        id,
        order_number,
        total,
        total_amount,
        payment_status,
        order_status,
        status,
        paystack_reference
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

  /*
   * Payment record bookkeeping.
   *
   * The order has already been marked as paid above.
   * A payment-record problem must not reverse that status.
   */
  const {
    data: existingPayment,
    error:
      existingPaymentError,
  } = await adminSupabase
    .from("payments")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();

  if (existingPaymentError) {
    console.error(
      "PAYMENT RECORD LOOKUP ERROR:",
      existingPaymentError
    );
  } else if (existingPayment) {
    const {
      error: paymentUpdateError,
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
        "PAYMENT RECORD UPDATE ERROR:",
        paymentUpdateError
      );
    }
  } else {
    const {
      error: paymentInsertError,
    } = await adminSupabase
      .from("payments")
      .insert({
        order_id: order.id,
        customer_id:
          order.customer_id,
        reference,
        amount: orderTotal,
        status: "success",
      });

    if (paymentInsertError) {
      console.error(
        "PAYMENT RECORD INSERT ERROR:",
        paymentInsertError
      );
    }
  }

  /*
   * Commission bookkeeping.
   *
   * Commission problems are logged but do not prevent the
   * successfully paid order from remaining paid.
   */
  const {
    data: commission,
    error: commissionError,
  } = await adminSupabase
    .from("commissions")
    .select(
      `
        id,
        status,
        paystack_reference
      `
    )
    .eq("order_id", order.id)
    .maybeSingle();

  if (commissionError) {
    console.error(
      "COMMISSION LOOKUP ERROR:",
      commissionError
    );
  } else if (!commission) {
    console.error(
      "COMMISSION RECORD NOT FOUND:",
      {
        orderId: order.id,
        reference,
      }
    );
  } else if (
    commission.paystack_reference &&
    commission.paystack_reference !==
      reference
  ) {
    console.error(
      "COMMISSION REFERENCE MISMATCH:",
      {
        orderId: order.id,
        commissionReference:
          commission.paystack_reference,
        paymentReference:
          reference,
      }
    );
  } else if (
    commission.status !== "paid"
  ) {
    const {
      error:
        commissionUpdateError,
    } = await adminSupabase
      .from("commissions")
      .update({
        status: "paid",
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
    }
  }

  console.log(
    "CUSTOMER ORDER PAYMENT VERIFIED SUCCESSFULLY:",
    {
      orderId: updatedOrder.id,
      orderNumber:
        updatedOrder.order_number,
      reference,
      orderTotal,
      paymentStatus:
        updatedOrder.payment_status,
      orderStatus:
        updatedOrder.order_status,
      status:
        updatedOrder.status,
    }
  );

  return NextResponse.json({
    success: true,
    message:
      "Payment verified and order updated successfully.",
    orderId: updatedOrder.id,
    orderNumber:
      updatedOrder.order_number,
    paymentStatus:
      updatedOrder.payment_status,
    orderStatus:
      updatedOrder.order_status,
    status:
      updatedOrder.status,
    total: orderTotal,
    reference,
  });
}