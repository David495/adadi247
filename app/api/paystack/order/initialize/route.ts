import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

type CartItem = {
  productId: string;
  quantity: number;
};

type RawCartItem = {
  productId?: unknown;
  quantity?: unknown;
};

type BusinessPaymentData = {
  id: string;
  name: string;
  slug: string;
  status: string;
  is_open: boolean | null;
  paystack_subaccount_code: string | null;
  paystack_subaccount_id: number | null;
  paystack_subaccount_active: boolean | null;
  paystack_subaccount_verified: boolean | null;
};

type ProductData = {
  id: string;
  business_id: string;
  name: string;
  price: number;
  stock: number | null;
  is_available: boolean | null;
};

const ADADI_FIXED_FEE = 100;

const ADADI_COMMISSION_RATE = 1.5;
const MAIN_ACCOUNT_SHARE_RATE = 3;
const BUSINESS_SHARE_RATE = 97;

const PAYSTACK_RATE = 0.015;
const PAYSTACK_FLAT_FEE = 100;
const PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD = 2500;
const PAYSTACK_FEE_CAP = 2000;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculatePaystackFee(amount: number): number {
  const percentageFee = amount * PAYSTACK_RATE;

  const flatFee =
    amount >= PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD
      ? PAYSTACK_FLAT_FEE
      : 0;

  return Math.min(
    roundMoney(percentageFee + flatFee),
    PAYSTACK_FEE_CAP
  );
}

function generateReference(): string {
  return `ADADI-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase()}`;
}

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: settings, error: settingsError } = await admin
      .from("platform_settings")
      .select(
        `
        delivery_fee,
        maintenance_mode,
        commission_rate
      `
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error(
        "Failed to load Paystack order settings:",
        settingsError
      );

      return NextResponse.json(
        {
          error: "Unable to load payment settings",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      deliveryFee: Number(settings?.delivery_fee ?? 0),
      maintenanceMode: Boolean(settings?.maintenance_mode ?? false),
      commissionRate: Number(
        settings?.commission_rate ?? ADADI_COMMISSION_RATE
      ),
      fixedFee: ADADI_FIXED_FEE,
    });
  } catch (error) {
    console.error("Paystack order settings error:", error);

    return NextResponse.json(
      {
        error: "Unable to load payment settings",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "You must be logged in to place an order.",
        },
        { status: 401 }
      );
    }

    const body: Record<string, unknown> = await request.json();

    const businessId = String(body.businessId ?? "").trim();

    const rawItems: unknown[] = Array.isArray(body.items)
      ? body.items
      : [];

    const items: CartItem[] = rawItems
      .map((item: unknown): CartItem | null => {
        if (
          typeof item !== "object" ||
          item === null
        ) {
          return null;
        }

        const value = item as RawCartItem;

        const productId = String(
          value.productId ?? ""
        ).trim();

        const quantity = Number(
          value.quantity ?? 0
        );

        if (
          !productId ||
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          return null;
        }

        return {
          productId,
          quantity,
        };
      })
      .filter(
        (item: CartItem | null): item is CartItem =>
          item !== null
      );

    const customerName = String(
      body.customerName ?? ""
    ).trim();

    const customerPhone = String(
      body.customerPhone ?? ""
    ).trim();

    const customerEmail = String(
      body.customerEmail ?? user.email ?? ""
    ).trim();

    const deliveryMethod = String(
      body.deliveryMethod ?? "pickup"
    ).trim();

    const deliveryAddress =
      body.deliveryAddress === null ||
      body.deliveryAddress === undefined
        ? null
        : String(body.deliveryAddress).trim();

    if (!businessId) {
      return NextResponse.json(
        {
          error: "Business is required.",
        },
        { status: 400 }
      );
    }

    if (!items.length) {
      return NextResponse.json(
        {
          error: "Your cart is empty.",
        },
        { status: 400 }
      );
    }

    if (!customerName) {
      return NextResponse.json(
        {
          error: "Customer name is required.",
        },
        { status: 400 }
      );
    }

    if (!customerPhone) {
      return NextResponse.json(
        {
          error: "Customer phone number is required.",
        },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        {
          error: "Customer email is required.",
        },
        { status: 400 }
      );
    }

    if (
      deliveryMethod === "delivery" &&
      !deliveryAddress
    ) {
      return NextResponse.json(
        {
          error: "Delivery address is required.",
        },
        { status: 400 }
      );
    }

    const { data: settings, error: settingsError } = await admin
      .from("platform_settings")
      .select(
        `
        delivery_fee,
        maintenance_mode,
        commission_rate
      `
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error(
        "Failed to load platform settings:",
        settingsError
      );

      return NextResponse.json(
        {
          error: "Unable to load payment settings.",
        },
        { status: 500 }
      );
    }

    if (settings?.maintenance_mode) {
      return NextResponse.json(
        {
          error:
            "Payments are temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    const deliveryFee =
      deliveryMethod === "delivery"
        ? roundMoney(
            Number(settings?.delivery_fee ?? 0)
          )
        : 0;

    const commissionRate = Number(
      settings?.commission_rate ??
        ADADI_COMMISSION_RATE
    );

    const { data: business, error: businessError } =
      await admin
        .from("businesses")
        .select(
          `
          id,
          name,
          slug,
          status,
          is_open,
          paystack_subaccount_code,
          paystack_subaccount_id,
          paystack_subaccount_active,
          paystack_subaccount_verified
        `
        )
        .eq("id", businessId)
        .maybeSingle()
        .overrideTypes<
          BusinessPaymentData,
          { merge: false }
        >();

    if (businessError) {
      console.error(
        "Failed to load business for payment:",
        businessError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load business payment details.",
        },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          error: "Business not found.",
        },
        { status: 404 }
      );
    }

    if (business.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "This business is not currently approved to receive orders.",
        },
        { status: 400 }
      );
    }

    if (business.is_open === false) {
      return NextResponse.json(
        {
          error: "This business is currently closed.",
        },
        { status: 400 }
      );
    }

    if (
      !business.paystack_subaccount_code ||
      business.paystack_subaccount_active !== true
    ) {
      return NextResponse.json(
        {
          error:
            "This business has not completed its payment setup.",
        },
        { status: 400 }
      );
    }

    const productIds: string[] = items.map(
      (item: CartItem): string => item.productId
    );

    const {
      data: productsData,
      error: productsError,
    } = await admin
      .from("products")
      .select(
        `
        id,
        business_id,
        name,
        price,
        stock,
        is_available
      `
      )
      .in("id", productIds);

    if (productsError) {
      console.error(
        "Failed to load products:",
        productsError
      );

      return NextResponse.json(
        {
          error: "Unable to load cart products.",
        },
        { status: 500 }
      );
    }

    const products: ProductData[] =
      (productsData ?? []) as ProductData[];

    if (products.length !== productIds.length) {
      return NextResponse.json(
        {
          error:
            "One or more products in your cart are no longer available.",
        },
        { status: 400 }
      );
    }

    const productMap = new Map<string, ProductData>(
      products.map(
        (product: ProductData) => [
          product.id,
          product,
        ]
      )
    );

    let subtotal = 0;

    const orderItems: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }> = [];

    for (const item of items) {
      const product = productMap.get(
        item.productId
      );

      if (!product) {
        return NextResponse.json(
          {
            error:
              "A product in your cart could not be found.",
          },
          { status: 400 }
        );
      }

      if (product.business_id !== businessId) {
        return NextResponse.json(
          {
            error:
              "All items in an order must belong to the same business.",
          },
          { status: 400 }
        );
      }

      if (product.is_available === false) {
        return NextResponse.json(
          {
            error: `${product.name} is currently unavailable.`,
          },
          { status: 400 }
        );
      }

      if (
        product.stock !== null &&
        item.quantity > product.stock
      ) {
        return NextResponse.json(
          {
            error: `${product.name} does not have enough stock available.`,
          },
          { status: 400 }
        );
      }

      const itemTotal = roundMoney(
        Number(product.price) *
          item.quantity
      );

      subtotal = roundMoney(
        subtotal + itemTotal
      );

      orderItems.push({
        product_id: product.id,
        quantity: item.quantity,
        unit_price: Number(product.price),
        total_price: itemTotal,
      });
    }

    if (subtotal <= 0) {
      return NextResponse.json(
        {
          error:
            "Your cart total must be greater than zero.",
        },
        { status: 400 }
      );
    }

    const total = roundMoney(
      subtotal +
        ADADI_FIXED_FEE +
        deliveryFee
    );

    const businessAmount = roundMoney(
      total *
        (BUSINESS_SHARE_RATE / 100)
    );

    const mainAccountGross = roundMoney(
      total *
        (MAIN_ACCOUNT_SHARE_RATE / 100)
    );

    const commissionAmount = roundMoney(
      total *
        (commissionRate / 100)
    );

    const paystackFee =
      calculatePaystackFee(total);

    const adadiNetAfterPaystackFee =
      roundMoney(
        mainAccountGross -
          paystackFee
      );

    const reference =
      generateReference();

    const { data: existingOrder } =
      await admin
        .from("orders")
        .select("id")
        .eq(
          "paystack_reference",
          reference
        )
        .maybeSingle();

    if (existingOrder) {
      return NextResponse.json(
        {
          error:
            "Unable to create a unique payment reference. Please try again.",
        },
        { status: 500 }
      );
    }

    const orderNumber = `AD-${Date.now()
      .toString()
      .slice(-8)}`;

    const orderPayload = {
      customer_id: user.id,
      business_id: businessId,
      order_number: orderNumber,
      total_amount: total,
      status: "pending",
      delivery_address: deliveryAddress,
      customer_phone: customerPhone,
      created_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
      customer_name: customerName,
      customer_email: customerEmail,
      delivery_method: deliveryMethod,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      payment_status: "pending",
      order_status: "pending",
      paystack_reference: reference,
      service_fee: paystackFee,
    };

    const {
      data: order,
      error: orderError,
    } = await admin
      .from("orders")
      .insert(orderPayload)
      .select(
        `
        id,
        order_number,
        total,
        subtotal,
        delivery_fee,
        payment_status,
        order_status,
        status,
        paystack_reference
      `
      )
      .single();

    if (orderError || !order) {
      console.error(
        "Failed to create order:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Unable to create your order.",
        },
        { status: 500 }
      );
    }

    const orderItemsPayload =
      orderItems.map(
        (
          item: {
            product_id: string;
            quantity: number;
            unit_price: number;
            total_price: number;
          }
        ) => ({
          ...item,
          order_id: order.id,
        })
      );

    const {
      error: orderItemsError,
    } = await admin
      .from("order_items")
      .insert(
        orderItemsPayload
      );

    if (orderItemsError) {
      console.error(
        "Failed to create order items:",
        orderItemsError
      );

      await admin
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          error:
            "Unable to create the order items. Please try again.",
        },
        { status: 500 }
      );
    }

    const commissionPayload = {
      order_id: order.id,
      business_id: businessId,
      order_total: total,
      commission_rate:
        commissionRate,
      commission_amount:
        commissionAmount,
      business_amount:
        businessAmount,
      currency: "NGN",
      status: "pending",
      paystack_reference:
        reference,
      created_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
    };

    const {
      error: commissionError,
    } = await admin
      .from("commissions")
      .insert(
        commissionPayload
      );

    if (commissionError) {
      console.error(
        "Failed to create commission record:",
        commissionError
      );

      await admin
        .from("order_items")
        .delete()
        .eq(
          "order_id",
          order.id
        );

      await admin
        .from("orders")
        .delete()
        .eq(
          "id",
          order.id
        );

      return NextResponse.json(
        {
          error:
            "Unable to prepare the payment record. Please try again.",
        },
        { status: 500 }
      );
    }

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY is missing."
      );

      await admin
        .from("commissions")
        .delete()
        .eq(
          "order_id",
          order.id
        );

      await admin
        .from("order_items")
        .delete()
        .eq(
          "order_id",
          order.id
        );

      await admin
        .from("orders")
        .delete()
        .eq(
          "id",
          order.id
        );

      return NextResponse.json(
        {
          error:
            "Payment service is not configured correctly.",
        },
        { status: 500 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://adadi247.com";

    const callbackUrl =
      `${appUrl.replace(
        /\/$/,
        ""
      )}/payment/callback?type=order&reference=${encodeURIComponent(
        reference
      )}`;

    const totalKobo =
      Math.round(total * 100);

    const transactionChargeKobo =
      Math.round(
        mainAccountGross * 100
      );

    const metadata = {
      type: "order",
      orderId: order.id,
      orderNumber:
        order.order_number,
      businessId,
      businessName:
        business.name,
      customerId:
        user.id,
      customerName,
      customerEmail,
      customerPhone,
      businessSubaccount:
        business.paystack_subaccount_code,
      subtotal,
      adadiFixedFee:
        ADADI_FIXED_FEE,
      deliveryFee,
      total,
      totalKobo,
      commissionRate,
      commissionAmount,
      commissionKobo:
        Math.round(
          commissionAmount * 100
        ),
      businessShareRate:
        BUSINESS_SHARE_RATE,
      businessAmount,
      businessKobo:
        Math.round(
          businessAmount * 100
        ),
      mainAccountShareRate:
        MAIN_ACCOUNT_SHARE_RATE,
      mainAccountGross,
      mainAccountGrossKobo:
        transactionChargeKobo,
      paystackFee,
      deliveryMethod,
    };

    const paystackPayload = {
      email: customerEmail,
      amount: totalKobo,
      currency: "NGN",
      reference,
      callback_url: callbackUrl,
      subaccount:
        business.paystack_subaccount_code,
      transaction_charge:
        transactionChargeKobo,
      bearer: "account",
      metadata,
    };

    const paystackResponse =
      await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            paystackPayload
          ),
        }
      );

    const paystackResult =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackResult?.status ||
      !paystackResult?.data
        ?.authorization_url
    ) {
      console.error(
        "Paystack initialization failed:",
        paystackResult
      );

      await admin
        .from("commissions")
        .delete()
        .eq(
          "order_id",
          order.id
        );

      await admin
        .from("order_items")
        .delete()
        .eq(
          "order_id",
          order.id
        );

      await admin
        .from("orders")
        .delete()
        .eq(
          "id",
          order.id
        );

      return NextResponse.json(
        {
          error:
            paystackResult?.message ||
            "Unable to initialize Paystack payment.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,

      authorizationUrl:
        paystackResult.data
          .authorization_url,

      accessCode:
        paystackResult.data
          .access_code,

      reference:
        paystackResult.data
          .reference ||
        reference,

      orderId:
        order.id,

      orderNumber:
        order.order_number,

      subtotal,

      fixedFee:
        ADADI_FIXED_FEE,

      deliveryFee,

      total,

      commissionRate,

      commissionAmount,

      businessShareRate:
        BUSINESS_SHARE_RATE,

      businessAmount,

      mainAccountShareRate:
        MAIN_ACCOUNT_SHARE_RATE,

      mainAccountGross,

      paystackFee,

      adadiNetAfterPaystackFee,

      deliveryMethod,
    });
  } catch (error) {
    console.error(
      "Paystack order initialization error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while preparing your payment. Please try again.",
      },
      { status: 500 }
    );
  }
}
