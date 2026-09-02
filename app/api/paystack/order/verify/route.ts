import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

type VerifyBody = {
  reference?: string;
};

export async function POST(request: Request) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Paystack secret key is not configured.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as VerifyBody;
    const reference = body.reference?.trim();

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment reference is required.",
        },
        { status: 400 }
      );
    }

    const verifyResponse = await fetch(
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

    const verifyData = await verifyResponse.json();

    console.log("PAYSTACK ORDER VERIFICATION:", {
      reference,
      httpStatus: verifyResponse.status,
      paystackStatus: verifyData?.status,
      transactionStatus: verifyData?.data?.status,
      amount: verifyData?.data?.amount,
      currency: verifyData?.data?.currency,
      metadata: verifyData?.data?.metadata,
    });

    if (
      !verifyResponse.ok ||
      !verifyData?.status ||
      !verifyData?.data
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            verifyData?.message || "Unable to verify payment.",
        },
        { status: 400 }
      );
    }

    const payment = verifyData.data;

    if (payment.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment has not been completed successfully.",
          paymentStatus: payment.status,
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

    if (payment.reference !== reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment reference does not match.",
        },
        { status: 400 }
      );
    }

    const metadata = payment.metadata || {};
    const supabase = createAdminClient();

    let order: any = null;
    let orderFetchError: any = null;

    const metadataOrderId =
      typeof metadata.orderId === "string"
        ? metadata.orderId
        : null;

    if (metadataOrderId) {
      const result = await supabase
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
        .eq("id", metadataOrderId)
        .maybeSingle();

      order = result.data;
      orderFetchError = result.error;
    }

    if (!order) {
      const result = await supabase
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
        .eq("paystack_reference", reference)
        .maybeSingle();

      order = result.data;
      orderFetchError = result.error;
    }

    if (orderFetchError || !order) {
      console.error("ORDER FETCH ERROR:", {
        orderFetchError,
        reference,
        metadata,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to find the order associated with this payment.",
        },
        { status: 404 }
      );
    }

    if (
      order.paystack_reference &&
      order.paystack_reference !== reference
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

    const metadataBusinessId =
      typeof metadata.businessId === "string"
        ? metadata.businessId
        : null;

    if (
      metadataBusinessId &&
      order.business_id !== metadataBusinessId
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

    const expectedAmountKobo = Math.round(
      expectedOrderTotal * 100
    );

    const actualAmountKobo = Number(
      payment.amount || 0
    );

    if (actualAmountKobo !== expectedAmountKobo) {
      console.error("PAYMENT AMOUNT MISMATCH:", {
        reference,
        expectedAmountKobo,
        actualAmountKobo,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment amount does not match order total.",
          expectedAmount: expectedOrderTotal,
          paidAmount: actualAmountKobo / 100,
        },
        { status: 400 }
      );
    }

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
          commission_rate,
          commission_amount,
          business_amount,
          status,
          paystack_reference
        `
      )
      .eq("order_id", order.id)
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
            "Order was paid, but commission could not be checked.",
        },
        { status: 500 }
      );
    }

    if (!commission) {
      console.error(
        "COMMISSION RECORD MISSING:",
        {
          orderId: order.id,
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

    if (
      commission.business_id !== order.business_id
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
            "Commission payment reference does not match payment.",
        },
        { status: 400 }
      );
    }

    const storedRate = Number(
      commission.commission_rate
    );

    const storedCommission = Number(
      commission.commission_amount
    );

    const storedBusiness = Number(
      commission.business_amount
    );

    if (
      !Number.isFinite(storedRate) ||
      storedRate < 0 ||
      storedRate > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid commission rate stored for this order.",
        },
        { status: 500 }
      );
    }

    const orderSubtotal = Number(
      order.subtotal
    );

    const deliveryFee = Number(
      order.delivery_fee || 0
    );

    if (
      !Number.isFinite(orderSubtotal) ||
      orderSubtotal < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid order subtotal.",
        },
        { status: 500 }
      );
    }

    if (
      !Number.isFinite(deliveryFee) ||
      deliveryFee < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid delivery fee.",
        },
        { status: 500 }
      );
    }

    const expectedCommissionAmount =
      Math.round(
        orderSubtotal *
          (storedRate / 100) *
          100
      ) / 100;

    const expectedBusinessAmount =
      Math.round(
        (orderSubtotal -
          expectedCommissionAmount) *
          100
      ) / 100;

    if (
      Math.abs(
        storedCommission -
          expectedCommissionAmount
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
          expectedBusinessAmount
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

    if (order.payment_status !== "paid") {
      const {
        data: updatedOrder,
        error: orderUpdateError,
      } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          order_status:
            "awaiting_confirmation",
          status:
            "awaiting_confirmation",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", order.id)
        .select(
          `
            id,
            order_number,
            payment_status,
            order_status,
            status
          `
        )
        .single();

      if (
        orderUpdateError ||
        !updatedOrder
      ) {
        console.error(
          "ORDER PAYMENT UPDATE ERROR:",
          orderUpdateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was received, but order confirmation status could not be updated.",
          },
          { status: 500 }
        );
      }

      order = {
        ...order,
        ...updatedOrder,
      };
    }

    if (commission.status !== "paid") {
      const {
        error: commissionUpdateError,
      } = await supabase
        .from("commissions")
        .update({
          status: "paid",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", commission.id);

      if (commissionUpdateError) {
        console.error(
          "COMMISSION UPDATE ERROR:",
          commissionUpdateError
        );
      }
    }

    console.log(
      "CUSTOMER PAYMENT VERIFIED SUCCESSFULLY:",
      {
        orderId: order.id,
        orderNumber:
          order.order_number,
        reference,
        total:
          expectedOrderTotal,
        commissionRate:
          storedRate,
        commissionAmount:
          expectedCommissionAmount,
        businessAmount:
          expectedBusinessAmount,
        payoutMethod:
          "paystack_split",
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Payment successful. Your order is awaiting business confirmation.",
      type: "customer_order",
      reference,
      orderId: order.id,
      orderNumber:
        order.order_number,
      amount:
        expectedOrderTotal,
      paymentStatus: "paid",
      orderStatus:
        "awaiting_confirmation",
      commissionRate:
        storedRate,
      commissionAmount:
        expectedCommissionAmount,
      businessAmount:
        expectedBusinessAmount,
      payoutStatus:
        "paid_via_paystack_split",
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
          "Something went wrong while verifying your order payment.",
      },
      { status: 500 }
    );
  }
}