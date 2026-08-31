import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

const ADADI_COMMISSION_RATE = 2.5;

type Payout = {
  id: string;
  business_id: string;
  order_id: string;
  amount: number;
  paystack_transfer_code: string | null;
  transfer_reference: string;
  status: string;
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
            "Payment service is not properly configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const { orderId } = body as {
      orderId?: string;
    };

    if (!orderId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID is required.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    const {
      data: order,
      error: orderError,
    } = await adminSupabase
      .from("orders")
      .select(
        `
          id,
          business_id,
          order_number,
          subtotal,
          total,
          total_amount,
          delivery_fee,
          payment_status,
          order_status,
          status,
          paystack_reference
        `
      )
      .eq("id", orderId.trim())
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        {
          success: false,
          error: "Order could not be found.",
        },
        { status: 404 }
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
          owner_id,
          name
        `
      )
      .eq("id", order.business_id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Business account could not be found.",
        },
        { status: 404 }
      );
    }

    if (business.owner_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to confirm this order.",
        },
        { status: 403 }
      );
    }

    if (order.payment_status !== "paid") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This order has not been successfully paid for.",
        },
        { status: 400 }
      );
    }

    if (
      order.order_status !==
        "awaiting_confirmation" &&
      order.status !==
        "awaiting_confirmation"
    ) {
      if (
        order.order_status === "confirmed" ||
        order.status === "confirmed"
      ) {
        return NextResponse.json({
          success: true,
          message:
            "Order has already been confirmed.",
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "This order is not waiting for confirmation.",
        },
        { status: 400 }
      );
    }

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
      .eq("order_id", order.id)
      .maybeSingle();

    if (existingPayoutError) {
      console.error(
        "EXISTING PAYOUT LOOKUP ERROR:",
        existingPayoutError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check existing business payout.",
        },
        { status: 500 }
      );
    }

    if (existingPayout?.status === "paid") {
      return NextResponse.json({
        success: true,
        message:
          "Business payout has already been completed.",
        payoutStatus: "paid",
        transferReference:
          existingPayout.transfer_reference,
        transferCode:
          existingPayout.paystack_transfer_code,
      });
    }

    if (
      existingPayout?.status === "processing"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Business payout is already being processed.",
        payoutStatus: "processing",
        transferReference:
          existingPayout.transfer_reference,
        transferCode:
          existingPayout.paystack_transfer_code,
      });
    }

    const subtotal = Number(order.subtotal);

    if (
      !Number.isFinite(subtotal) ||
      subtotal <= 0
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

    const commissionAmount =
      Math.round(
        subtotal *
          (ADADI_COMMISSION_RATE / 100) *
          100
      ) / 100;

    const businessAmount =
      Math.round(
        (subtotal - commissionAmount) *
          100
      ) / 100;

    const businessKobo =
      Math.round(
        businessAmount * 100
      );

    if (businessKobo <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid business payout amount.",
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
      .eq("business_id", business.id)
      .maybeSingle();

    if (payoutAccountError) {
      console.error(
        "PAYOUT ACCOUNT LOOKUP ERROR:",
        payoutAccountError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load the business payout account.",
        },
        { status: 500 }
      );
    }

    if (
      !payoutAccount ||
      !payoutAccount.paystack_recipient_code
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business has not completed its payout account setup.",
        },
        { status: 400 }
      );
    }

    const transferReference =
      existingPayout?.transfer_reference ||
      `adadi_${order.id.replace(/-/g, "")}`;

    let payout: Payout;

    if (existingPayout) {
      const {
        data: updatedPayout,
        error: payoutUpdateError,
      } = await adminSupabase
        .from("business_payouts")
        .update({
          amount: businessAmount,
          status: "processing",
        })
        .eq("id", existingPayout.id)
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
        payoutUpdateError ||
        !updatedPayout
      ) {
        console.error(
          "PAYOUT UPDATE ERROR:",
          payoutUpdateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to prepare the business payout.",
          },
          { status: 500 }
        );
      }

      payout = updatedPayout as Payout;
    } else {
      const {
        data: createdPayout,
        error: payoutInsertError,
      } = await adminSupabase
        .from("business_payouts")
        .insert({
          business_id: business.id,
          order_id: order.id,
          amount: businessAmount,
          status: "processing",
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
          "PAYOUT CREATION ERROR:",
          payoutInsertError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to create business payout record.",
          },
          { status: 500 }
        );
      }

      payout = createdPayout as Payout;
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
              amount: businessKobo,
              recipient:
                payoutAccount.paystack_recipient_code,
              reference:
                payout.transfer_reference,
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
          .eq("id", payout.id);

        return NextResponse.json(
          {
            success: false,
            error:
              transferData?.message ||
              "Business payout could not be initiated. The customer payment remains successful.",
            payoutStatus: "failed",
            orderId: order.id,
          },
          { status: 400 }
        );
      }

      const transferCode =
        transferData.data.transfer_code ||
        null;

      const transferStatus =
        transferData.data.status;

      const payoutStatus =
        transferStatus === "success"
          ? "paid"
          : "processing";

      await adminSupabase
        .from("business_payouts")
        .update({
          paystack_transfer_code:
            transferCode,
          status: payoutStatus,
        })
        .eq("id", payout.id);

      const {
        data: confirmedOrder,
        error: orderUpdateError,
      } = await adminSupabase
        .from("orders")
        .update({
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
            payment_status,
            order_status,
            status
          `
        )
        .single();

      if (
        orderUpdateError ||
        !confirmedOrder
      ) {
        console.error(
          "ORDER CONFIRMATION UPDATE ERROR:",
          orderUpdateError
        );
      }

      console.log(
        "BUSINESS PAYOUT INITIATED:",
        {
          orderId: order.id,
          orderNumber:
            order.order_number,
          businessId: business.id,
          businessAmount,
          businessKobo,
          transferReference:
            payout.transfer_reference,
          transferCode,
          transferStatus,
        }
      );

      return NextResponse.json({
        success: true,
        message:
          payoutStatus === "paid"
            ? "Order confirmed and business payout completed."
            : "Order confirmed and business payout is processing.",
        orderId: order.id,
        orderNumber:
          order.order_number,
        paymentStatus: "paid",
        orderStatus: "confirmed",
        businessAmount,
        commissionAmount,
        payoutStatus,
        transferReference:
          payout.transfer_reference,
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
        .eq("id", payout.id);

      return NextResponse.json(
        {
          success: false,
          error:
            "The customer payment is successful, but the business payout could not be initiated yet.",
          payoutStatus: "failed",
          orderId: order.id,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error(
      "PAYSTACK TRANSFER CREATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while processing the business payout.",
      },
      { status: 500 }
    );
  }
}