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
  `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
    },
    cache: "no-store",
  }
);

const verifyData = await verifyResponse.json();

if (
  !verifyResponse.ok ||
  !verifyData.status ||
  !verifyData.data
) {
  console.error(
    "PAYSTACK VERIFICATION ERROR:",
    verifyData
  );

  return NextResponse.json(
    {
      success: false,
      error:
        verifyData.message ||
        "Unable to verify payment.",
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

if (metadata.type !== "customer_order") {
  return NextResponse.json(
    {
      success: false,
      error:
        "This payment is not a customer order payment.",
    },
    { status: 400 }
  );
}

const orderId = metadata.orderId;
const businessId = metadata.businessId;

if (!orderId || !businessId) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Order ID and business ID are required in payment metadata.",
    },
    { status: 400 }
  );
}

const supabase = createAdminClient();

const {
  data: order,
  error: orderFetchError,
} = await supabase
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
      paystack_reference,
      paid_at
    `
  )
  .eq("id", orderId)
  .maybeSingle();

if (orderFetchError || !order) {
  console.error(
    "ORDER FETCH ERROR:",
    orderFetchError
  );

  return NextResponse.json(
    {
      success: false,
      error: "Unable to find order.",
    },
    { status: 404 }
  );
}

if (order.business_id !== businessId) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Order business does not match payment.",
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
      error:
        "Payment reference does not match order.",
    },
    { status: 400 }
  );
}

const expectedOrderTotal = Number(
  order.total ??
    order.total_amount ??
    0
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

if (
  actualAmountKobo !==
  expectedAmountKobo
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Payment amount does not match order total.",
      expectedAmount: expectedOrderTotal,
      paidAmount:
        actualAmountKobo / 100,
    },
    { status: 400 }
  );
}

if (order.payment_status === "paid") {
  const {
    data: existingCommission,
  } = await supabase
    .from("commissions")
    .select(
      `
        commission_rate,
        commission_amount,
        business_amount,
        status
      `
    )
    .eq("order_id", orderId)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    message:
      "Order payment was already processed.",
    type: "customer_order",
    reference,
    orderId,
    orderNumber: order.order_number,
    paymentStatus: "paid",
    orderStatus:
      order.order_status ||
      "awaiting_confirmation",
    commissionRate:
      existingCommission
        ? Number(
            existingCommission.commission_rate
          )
        : null,
    commissionAmount:
      existingCommission
        ? Number(
            existingCommission.commission_amount
          )
        : null,
    businessAmount:
      existingCommission
        ? Number(
            existingCommission.business_amount
          )
        : null,
    payoutStatus:
      "paid_via_paystack_split",
  });
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
  .eq("order_id", orderId)
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
  commission.paystack_reference !==
    reference
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

const metadataRate = Number(
  metadata.commissionRate
);

if (
  Number.isFinite(metadataRate) &&
  Math.abs(
    metadataRate - storedRate
  ) > 0.0001
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Payment commission rate does not match the order commission record.",
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

const paidAt =
  payment.paid_at ||
  new Date().toISOString();

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
    paid_at: paidAt,
    updated_at:
      new Date().toISOString(),
  })
  .eq("id", orderId)
  .select(
    `
      id,
      order_number,
      payment_status,
      order_status,
      status,
      paid_at
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
    orderId,
    orderNumber:
      updatedOrder.order_number,
    reference,
    total:
      expectedOrderTotal,
    commissionRate: storedRate,
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
  orderId,
  orderNumber:
    updatedOrder.order_number,
  amount: expectedOrderTotal,
  paymentStatus: "paid",
  orderStatus:
    "awaiting_confirmation",
  commissionRate: storedRate,
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
