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

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment service is not properly configured.",
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
      .eq("paystack_reference", paymentReference)
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
      return NextResponse.json(
        {
          success: false,
          error:
            "We could not find an order associated with this payment.",
        },
        { status: 404 }
      );
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        paymentReference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const paystackData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData?.data
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
            "Unable to verify payment with Paystack.",
        },
        { status: 400 }
      );
    }

    const transaction =
      paystackData.data;

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

    if (
      transaction.status !==
      "success"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Payment was not successful. Paystack status: ${
              transaction.status || "unknown"
            }.`,
        },
        { status: 400 }
      );
    }

    if (
      transaction.currency !==
      "NGN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The payment currency does not match the order currency.",
        },
        { status: 400 }
      );
    }

    const orderTotal =
      Number(order.total_amount);

    const orderSubtotal =
      Number(order.subtotal);

    const deliveryFee =
      Number(order.delivery_fee || 0);

    if (
      !Number.isFinite(orderTotal) ||
      orderTotal <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The order contains an invalid payment amount.",
        },
        { status: 500 }
      );
    }

    if (
      !Number.isFinite(orderSubtotal) ||
      orderSubtotal < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The order contains an invalid subtotal.",
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
          error:
            "The order contains an invalid delivery fee.",
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
      return NextResponse.json(
        {
          success: false,
          error:
            "The payment amount does not match the order total.",
        },
        { status: 400 }
      );
    }

    const metadata =
      transaction.metadata || {};

    if (
      metadata.orderId &&
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
      metadata.businessId &&
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

    const {
      data: business,
      error: businessError,
    } = await adminSupabase
      .from("businesses")
      .select(
        `
          id,
          name
        `
      )
      .eq("id", order.business_id)
      .maybeSingle();

    if (
      businessError ||
      !business
    ) {
      console.error(
        "BUSINESS LOOKUP ERROR:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The business account could not be verified.",
        },
        { status: 500 }
      );
    }

    const commissionAmount =
      Math.round(
        orderSubtotal *
          (ADADI_COMMISSION_RATE / 100) *
          100
      ) / 100;

    const businessAmount =
      Math.round(
        (orderSubtotal -
          commissionAmount) *
          100
      ) / 100;

    const commissionKobo =
      Math.round(
        commissionAmount * 100
      );

    const deliveryFeeKobo =
      Math.round(
        deliveryFee * 100
      );

    const adadiChargeKobo =
      commissionKobo +
      deliveryFeeKobo;

    const businessKobo =
      Math.round(
        businessAmount * 100
      );

    if (businessKobo <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The calculated business payout amount is invalid.",
        },
        { status: 500 }
      );
    }

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
      .eq("order_id", order.id)
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
        await adminSupabase
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
      }
    } else {
      const {
        error: recoveryCommissionError,
      } = await adminSupabase
        .from("commissions")
        .insert({
          order_id: order.id,
          business_id: order.business_id,
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
        });

      if (recoveryCommissionError) {
        console.error(
          "COMMISSION CREATION ERROR:",
          recoveryCommissionError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was successful, but the commission record could not be created.",
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
        status: "confirmed",
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
        "ORDER UPDATE ERROR:",
        updateOrderError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was successful, but we could not confirm your order.",
        },
        { status: 500 }
      );
    }

    const {
      data: payoutAccount,
      error: payoutAccountError,
    } = await adminSupabase
      .from("business_payout_accounts")
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
        business.id
      )
      .maybeSingle();

    if (payoutAccountError) {
      console.error(
        "PAYOUT ACCOUNT LOOKUP ERROR:",
        payoutAccountError
      );

      return NextResponse.json({
        success: true,
        message:
          "Payment verified and order confirmed, but the business payout account could not be checked.",
        orderId: updatedOrder.id,
        orderNumber:
          updatedOrder.order_number,
        paymentStatus:
          updatedOrder.payment_status,
        orderStatus:
          updatedOrder.order_status,
        status:
          updatedOrder.status,
        subtotal: orderSubtotal,
        deliveryFee,
        total: orderTotal,
        reference:
          paymentReference,
        commissionRate:
          ADADI_COMMISSION_RATE,
        commissionAmount,
        commissionKobo,
        adadiChargeKobo,
        businessAmount,
        businessKobo,
        payoutStatus:
          "not_started",
      });
    }

    if (
      !payoutAccount ||
      !payoutAccount.paystack_recipient_code
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Payment verified and order confirmed. The business payout account is not configured yet.",
        orderId: updatedOrder.id,
        orderNumber:
          updatedOrder.order_number,
        paymentStatus:
          updatedOrder.payment_status,
        orderStatus:
          updatedOrder.order_status,
        status:
          updatedOrder.status,
        subtotal: orderSubtotal,
        deliveryFee,
        total: orderTotal,
        reference:
          paymentReference,
        commissionRate:
          ADADI_COMMISSION_RATE,
        commissionAmount,
        commissionKobo,
        adadiChargeKobo,
        businessAmount,
        businessKobo,
        payoutStatus:
          "not_started",
      });
    }

    const transferReference =
      `adadi_${order.id.replace(
        /-/g,
        ""
      )}`;

    const {
      data: existingPayout,
      error: existingPayoutError,
    } = await adminSupabase
      .from("business_payouts")
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
        order.id
      )
      .maybeSingle();

    if (existingPayoutError) {
      console.error(
        "PAYOUT LOOKUP ERROR:",
        existingPayoutError
      );

      return NextResponse.json({
        success: true,
        message:
          "Payment verified and order confirmed, but the business payout could not be checked.",
        orderId: updatedOrder.id,
        orderNumber:
          updatedOrder.order_number,
        paymentStatus:
          updatedOrder.payment_status,
        orderStatus:
          updatedOrder.order_status,
        status:
          updatedOrder.status,
        subtotal: orderSubtotal,
        deliveryFee,
        total: orderTotal,
        reference:
          paymentReference,
        commissionRate:
          ADADI_COMMISSION_RATE,
        commissionAmount,
        commissionKobo,
        adadiChargeKobo,
        businessAmount,
        businessKobo,
        payoutStatus:
          "not_started",
      });
    }

    if (
      existingPayout?.status ===
      "paid"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Payment verified, order confirmed, and business payout already completed.",
        orderId: updatedOrder.id,
        orderNumber:
          updatedOrder.order_number,
        paymentStatus:
          updatedOrder.payment_status,
        orderStatus:
          updatedOrder.order_status,
        status:
          updatedOrder.status,
        subtotal: orderSubtotal,
        deliveryFee,
        total: orderTotal,
        reference:
          paymentReference,
        commissionRate:
          ADADI_COMMISSION_RATE,
        commissionAmount,
        commissionKobo,
        adadiChargeKobo,
        businessAmount,
        businessKobo,
        payoutStatus:
          "paid",
        transferReference:
          existingPayout.transfer_reference,
        transferCode:
          existingPayout.paystack_transfer_code,
      });
    }

    let payoutId =
      existingPayout?.id || null;

    if (!payoutId) {
      const {
        data: createdPayout,
        error: payoutInsertError,
      } = await adminSupabase
        .from("business_payouts")
        .insert({
          business_id:
            business.id,
          order_id:
            order.id,
          amount:
            businessAmount,
          status:
            "processing",
          transfer_reference:
            transferReference,
        })
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
        .single();

      if (
        payoutInsertError ||
        !createdPayout
      ) {
        console.error(
          "PAYOUT INSERT ERROR:",
          payoutInsertError
        );

        return NextResponse.json({
          success: true,
          message:
            "Payment verified and order confirmed, but the business payout record could not be created.",
          orderId: updatedOrder.id,
          orderNumber:
            updatedOrder.order_number,
          paymentStatus:
            updatedOrder.payment_status,
          orderStatus:
            updatedOrder.order_status,
          status:
            updatedOrder.status,
          subtotal: orderSubtotal,
          deliveryFee,
          total: orderTotal,
          reference:
            paymentReference,
          commissionRate:
            ADADI_COMMISSION_RATE,
          commissionAmount,
          commissionKobo,
          adadiChargeKobo,
          businessAmount,
          businessKobo,
          payoutStatus:
            "failed",
        });
      }

      payoutId =
        createdPayout.id;
    } else {
      await adminSupabase
        .from("business_payouts")
        .update({
          amount:
            businessAmount,
          status:
            "processing",
          transfer_reference:
            transferReference,
        })
        .eq(
          "id",
          payoutId
        );
    }

    try {
      const transferResponse =
        await fetch(
          "https://api.paystack.co/transfer",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${paystackSecretKey}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              source: "balance",
              amount:
                businessKobo,
              recipient:
                payoutAccount.paystack_recipient_code,
              reference:
                transferReference,
              reason:
                `ADADI payout for order ${order.order_number}`,
              currency: "NGN",
            }),
            cache: "no-store",
          }
        );

      const transferData =
        await transferResponse.json();

      if (
        !transferResponse.ok ||
        !transferData?.status ||
        !transferData?.data
      ) {
        console.error(
          "PAYSTACK TRANSFER ERROR:",
          transferData
        );

        await adminSupabase
          .from("business_payouts")
          .update({
            status: "failed",
          })
          .eq(
            "id",
            payoutId
          );

        return NextResponse.json({
          success: true,
          message:
            "Payment verified and order confirmed, but the business payout could not be initiated. The customer payment remains successful.",
          orderId:
            updatedOrder.id,
          orderNumber:
            updatedOrder.order_number,
          paymentStatus:
            updatedOrder.payment_status,
          orderStatus:
            updatedOrder.order_status,
          status:
            updatedOrder.status,
          subtotal: orderSubtotal,
          deliveryFee,
          total: orderTotal,
          reference:
            paymentReference,
          commissionRate:
            ADADI_COMMISSION_RATE,
          commissionAmount,
          commissionKobo,
          adadiChargeKobo,
          businessAmount,
          businessKobo,
          payoutStatus:
            "failed",
          transferReference,
        });
      }

      const transferCode =
        transferData.data
          ?.transfer_code || null;

      const transferStatus =
        transferData.data
          ?.status || "processing";

      const payoutStatus =
        transferStatus === "success"
          ? "paid"
          : "processing";

      await adminSupabase
        .from("business_payouts")
        .update({
          paystack_transfer_code:
            transferCode,
          status:
            payoutStatus,
        })
        .eq(
          "id",
          payoutId
        );

      return NextResponse.json({
        success: true,
        message:
          payoutStatus === "paid"
            ? "Payment verified, order confirmed, and business payout completed."
            : "Payment verified, order confirmed, and business payout is processing.",
        orderId:
          updatedOrder.id,
        orderNumber:
          updatedOrder.order_number,
        paymentStatus:
          updatedOrder.payment_status,
        orderStatus:
          updatedOrder.order_status,
        status:
          updatedOrder.status,
        subtotal:
          orderSubtotal,
        deliveryFee,
        total:
          orderTotal,
        reference:
          paymentReference,
        commissionRate:
          ADADI_COMMISSION_RATE,
        commissionAmount,
        commissionKobo,
        adadiChargeKobo,
        businessAmount,
        businessKobo,
        payoutStatus,
        transferReference,
        transferCode,
      });
    } catch (transferError) {
      console.error(
        "PAYSTACK TRANSFER REQUEST ERROR:",
        transferError
      );

      await adminSupabase
        .from("business_payouts")
        .update({
          status: "failed",
        })
        .eq(
          "id",
          payoutId
        );

      return NextResponse.json({
        success: true,
        message:
          "Payment verified and order confirmed, but the business payout could not be initiated yet.",
        orderId:
          updatedOrder.id,
        orderNumber:
          updatedOrder.order_number,
        paymentStatus:
          updatedOrder.payment_status,
        orderStatus:
          updatedOrder.order_status,
        status:
          updatedOrder.status,
        subtotal:
          orderSubtotal,
        deliveryFee,
        total:
          orderTotal,
        reference:
          paymentReference,
        commissionRate:
          ADADI_COMMISSION_RATE,
        commissionAmount,
        commissionKobo,
        adadiChargeKobo,
        businessAmount,
        businessKobo,
        payoutStatus:
          "failed",
        transferReference,
      });
    }
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