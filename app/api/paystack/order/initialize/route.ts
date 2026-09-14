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
  is_available: boolean | null;
};

const ADADI_FIXED_FEE = 100;
const ADADI_FIXED_FEE_THRESHOLD = 2500;

const ADADI_COMMISSION_RATE = 1.5;
const MAIN_ACCOUNT_SHARE_RATE = 3;
const BUSINESS_SHARE_RATE = 97;

const PAYSTACK_RATE = 0.015;
const PAYSTACK_FLAT_FEE = 100;
const PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD = 2500;
const PAYSTACK_FEE_CAP = 2000;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculatePaystackFee(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const percentageFee = amount * PAYSTACK_RATE;

  const flatFee =
    amount >= PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD
      ? PAYSTACK_FLAT_FEE
      : 0;

  return roundMoney(
    Math.min(
      percentageFee + flatFee,
      PAYSTACK_FEE_CAP
    )
  );
}

function calculateCustomerFixedFee(subtotal: number) {
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return 0;
  }

  return subtotal >= ADADI_FIXED_FEE_THRESHOLD
    ? ADADI_FIXED_FEE
    : 0;
}

function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const itemMap = new Map<string, number>();

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null
    ) {
      continue;
    }

    const rawItem = item as RawCartItem;

    const productId =
      typeof rawItem.productId === "string"
        ? rawItem.productId.trim()
        : "";

    const quantity = Number(rawItem.quantity);

    if (
      !productId ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      continue;
    }

    const normalizedQuantity =
      Math.floor(quantity);

    if (normalizedQuantity <= 0) {
      continue;
    }

    itemMap.set(
      productId,
      (itemMap.get(productId) ?? 0) +
        normalizedQuantity
    );
  }

  return Array.from(
    itemMap.entries()
  ).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export async function GET() {
  try {
    const admin = createAdminClient();

    const {
      data: settings,
      error: settingsError,
    } = await admin
      .from("platform_settings")
      .select(`
        delivery_fee,
        maintenance_mode,
        commission_rate
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error(
        "Unable to load payment settings:",
        settingsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load payment settings.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deliveryFee: roundMoney(
        Number(settings?.delivery_fee ?? 0)
      ),
      maintenanceMode: Boolean(
        settings?.maintenance_mode ?? false
      ),
      commissionRate: Number(
        settings?.commission_rate ??
          ADADI_COMMISSION_RATE
      ),
      fixedFee: ADADI_FIXED_FEE,
      fixedFeeThreshold:
        ADADI_FIXED_FEE_THRESHOLD,
    });
  } catch (error) {
    console.error(
      "Payment settings GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load payment settings.",
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
          success: false,
          error:
            "You must be logged in to place an order.",
        },
        { status: 401 }
      );
    }

    let body: {
      businessId?: unknown;
      items?: unknown;
      customerName?: unknown;
      customerEmail?: unknown;
      customerPhone?: unknown;
      deliveryMethod?: unknown;
      deliveryAddress?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const businessId =
      typeof body.businessId === "string"
        ? body.businessId.trim()
        : "";

    const items = normalizeCartItems(
      body.items
    );

    const customerName =
      typeof body.customerName === "string"
        ? body.customerName.trim()
        : "";

    const customerEmail =
      typeof body.customerEmail === "string"
        ? body.customerEmail.trim()
        : user.email ?? "";

    const customerPhone =
      typeof body.customerPhone === "string"
        ? body.customerPhone.trim()
        : "";

    const deliveryMethod =
      body.deliveryMethod === "pickup"
        ? "pickup"
        : "delivery";

    const deliveryAddress =
      typeof body.deliveryAddress === "string"
        ? body.deliveryAddress.trim()
        : "";

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "Business is required.",
        },
        { status: 400 }
      );
    }

    if (!items.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Your cart is empty.",
        },
        { status: 400 }
      );
    }

    if (!customerName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer name is required.",
        },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer email is required.",
        },
        { status: 400 }
      );
    }

    if (!customerPhone) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer phone number is required.",
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
          success: false,
          error:
            "Delivery address is required.",
        },
        { status: 400 }
      );
    }

    const {
      data: settings,
      error: settingsError,
    } = await admin
      .from("platform_settings")
      .select(`
        delivery_fee,
        maintenance_mode,
        commission_rate
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error(
        "Unable to load payment settings:",
        settingsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load payment settings.",
        },
        { status: 500 }
      );
    }

    if (settings?.maintenance_mode) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payments are temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    const configuredDeliveryFee =
      roundMoney(
        Number(
          settings?.delivery_fee ?? 0
        )
      );

    const deliveryFee =
      deliveryMethod === "delivery"
        ? configuredDeliveryFee
        : 0;

    const commissionRate = Number(
      settings?.commission_rate ??
        ADADI_COMMISSION_RATE
    );

    const {
      data: business,
      error: businessError,
    } = await admin
      .from("businesses")
      .select(`
        id,
        name,
        slug,
        status,
        is_open,
        paystack_subaccount_code,
        paystack_subaccount_id,
        paystack_subaccount_active,
        paystack_subaccount_verified
      `)
      .eq("id", businessId)
      .maybeSingle();

    if (businessError) {
      console.error(
        "Business lookup error:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load business information.",
        },
        { status: 500 }
      );
    }

    const paymentBusiness =
      business as BusinessPaymentData | null;

    if (!paymentBusiness) {
      return NextResponse.json(
        {
          success: false,
          error: "Business not found.",
        },
        { status: 404 }
      );
    }

    if (
      paymentBusiness.status !==
      "approved"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business is not currently approved to receive orders.",
        },
        { status: 400 }
      );
    }

    if (
      paymentBusiness.is_open === false
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business is currently closed and cannot receive orders.",
        },
        { status: 400 }
      );
    }

    if (
      !paymentBusiness.paystack_subaccount_code
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business has not completed its payment setup.",
        },
        { status: 400 }
      );
    }

    if (
      paymentBusiness.paystack_subaccount_active !==
      true
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business payment account is not active yet.",
        },
        { status: 400 }
      );
    }

    const productIds = [
      ...new Set(
        items.map(
          (item) => item.productId
        )
      ),
    ];

    const {
      data: products,
      error: productsError,
    } = await admin
      .from("products")
      .select(`
        id,
        business_id,
        name,
        price,
        is_available
      `)
      .in("id", productIds);

    if (productsError) {
      console.error(
        "Product lookup error:",
        productsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load your cart items.",
        },
        { status: 500 }
      );
    }

    const productList =
      (products ?? []) as ProductData[];

    if (
      productList.length !==
      productIds.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more products in your cart are no longer available.",
        },
        { status: 400 }
      );
    }

    const productMap = new Map(
      productList.map((product) => [
        product.id,
        product,
      ])
    );

    let subtotal = 0;

    const orderItems: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }> = [];

    for (const item of items) {
      const product = productMap.get(
        item.productId
      );

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error:
              "One or more products in your cart could not be found.",
          },
          { status: 400 }
        );
      }

      if (
        product.business_id !==
        businessId
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your cart contains a product from another business.",
          },
          { status: 400 }
        );
      }

      if (
        product.is_available === false
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `${product.name} is currently unavailable.`,
          },
          { status: 400 }
        );
      }

      const unitPrice = roundMoney(
        Number(product.price)
      );

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid price for ${product.name}.`,
          },
          { status: 400 }
        );
      }

      const itemSubtotal = roundMoney(
        unitPrice * item.quantity
      );

      subtotal = roundMoney(
        subtotal + itemSubtotal
      );

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: itemSubtotal,
      });
    }

    if (subtotal <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your cart total must be greater than zero.",
        },
        { status: 400 }
      );
    }

    /*
     * Customer-facing fee:
     * - Below ₦2,500: ₦0
     * - ₦2,500 and above: ₦100
     *
     * No 1.5% Paystack fee is added to the
     * customer's checkout total.
     */
    const fixedFee =
      calculateCustomerFixedFee(subtotal);

    const total = roundMoney(
      subtotal +
        fixedFee +
        deliveryFee
    );

    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid order total.",
        },
        { status: 400 }
      );
    }

    /*
     * Payment split:
     * Business receives 97%.
     * ADADI's main account receives 3%.
     *
     * The 3% represents:
     * - 1.5% ADADI
     * - 1.5% Paystack
     */
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

    /*
     * This is Paystack's actual processing fee
     * for reporting/accounting purposes.
     *
     * It is NOT added again to the customer total.
     */
    const paystackFee =
      calculatePaystackFee(total);

    const adadiNetAfterPaystackFee =
      roundMoney(
        mainAccountGross -
          paystackFee
      );

    const transactionChargeKobo =
      Math.round(
        mainAccountGross * 100
      );

    const orderNumber =
      `AD-${Date.now()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

    const {
      data: order,
      error: orderError,
    } = await admin
      .from("orders")
      .insert({
        customer_id: user.id,
        business_id: businessId,
        order_number: orderNumber,
        total_amount: total,
        total,
        subtotal,
        delivery_fee: deliveryFee,
        service_fee: fixedFee,
        status: "pending",
        payment_status: "pending",
        order_status: "pending",
        delivery_address:
          deliveryMethod === "delivery"
            ? deliveryAddress
            : null,
        customer_phone: customerPhone,
        customer_name: customerName,
        customer_email: customerEmail,
        delivery_method: deliveryMethod,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error(
        "Order creation error:",
        orderError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to create your order.",
        },
        { status: 500 }
      );
    }

    const orderItemsPayload =
      orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

    const {
      error: orderItemsError,
    } = await admin
      .from("order_items")
      .insert(orderItemsPayload);

    if (orderItemsError) {
      console.error(
        "Order items creation error:",
        orderItemsError
      );

      await admin
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to create your order items.",
        },
        { status: 500 }
      );
    }

    const {
      error: commissionError,
    } = await admin
      .from("commissions")
      .insert({
        order_id: order.id,
        business_id: businessId,
        order_total: total,
        commission_rate: commissionRate,
        commission_amount:
          commissionAmount,
        business_amount:
          businessAmount,
        currency: "NGN",
        status: "pending",
      });

    if (commissionError) {
      console.error(
        "Commission creation error:",
        commissionError
      );

      await admin
        .from("order_items")
        .delete()
        .eq("order_id", order.id);

      await admin
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to create order payment details.",
        },
        { status: 500 }
      );
    }

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY is not configured."
      );

      await admin
        .from("commissions")
        .delete()
        .eq("order_id", order.id);

      await admin
        .from("order_items")
        .delete()
        .eq("order_id", order.id);

      await admin
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment service is not configured. Please try again later.",
        },
        { status: 500 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://adadi247.com";

    const callbackUrl =
      `${siteUrl.replace(/\/$/, "")}/payment/callback`;

    const reference =
      `ADADI-${order.id}-${Date.now()}`;

    const metadata = {
      type: "customer_order",
      orderId: order.id,
      order_id: order.id,
      orderNumber,
      order_number: orderNumber,
      businessId,
      business_id: businessId,
      businessName:
        paymentBusiness.name,
      customerId: user.id,
      customer_id: user.id,
      customerName,
      customerEmail,
      customerPhone,
      businessSubaccount:
        paymentBusiness.paystack_subaccount_code,
      subtotal,
      fixedFee,
      fixedFeeThreshold:
        ADADI_FIXED_FEE_THRESHOLD,
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
      deliveryMethod,
    };

    const paystackPayload = {
      email: customerEmail,

      /*
       * This is EXACTLY what the customer pays.
       *
       * Examples:
       * ₦100 product  -> ₦100
       * ₦2,000 product -> ₦2,000
       * ₦2,500 product -> ₦2,600
       * ₦10,500 product -> ₦10,600
       */
      amount: Math.round(total * 100),

      currency: "NGN",
      reference,
      callback_url: callbackUrl,
      subaccount:
        paymentBusiness.paystack_subaccount_code,

      /*
       * ADADI main account receives 3% gross.
       * Business receives the remaining 97%.
       */
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
            Authorization:
              `Bearer ${paystackSecretKey}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            paystackPayload
          ),
        }
      );

    const paystackData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData?.data
        ?.authorization_url
    ) {
      console.error(
        "Paystack initialization error:",
        paystackData
      );

      await admin
        .from("commissions")
        .delete()
        .eq("order_id", order.id);

      await admin
        .from("order_items")
        .delete()
        .eq("order_id", order.id);

      await admin
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
            "Unable to initialize payment.",
        },
        { status: 502 }
      );
    }

    const paystackReference =
      paystackData.data.reference ||
      reference;

    const {
      error: referenceError,
    } = await admin
      .from("orders")
      .update({
        paystack_reference:
          paystackReference,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", order.id);

    if (referenceError) {
      console.error(
        "Order reference update error:",
        referenceError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was initialized, but the order reference could not be saved.",
        },
        { status: 500 }
      );
    }

    const {
      error: commissionReferenceError,
    } = await admin
      .from("commissions")
      .update({
        paystack_reference:
          paystackReference,
        updated_at:
          new Date().toISOString(),
      })
      .eq("order_id", order.id);

    if (commissionReferenceError) {
      console.error(
        "Commission reference update error:",
        commissionReferenceError
      );
    }

    return NextResponse.json({
      success: true,
      authorizationUrl:
        paystackData.data.authorization_url,
      accessCode:
        paystackData.data.access_code,
      reference:
        paystackReference,
      orderId: order.id,
      orderNumber,
      breakdown: {
        subtotal,
        fixedFee,
        fixedFeeThreshold:
          ADADI_FIXED_FEE_THRESHOLD,
        deliveryFee,
        total,
        businessAmount,
        mainAccountGross,
        commissionRate,
        commissionAmount,
        paystackFee,
        adadiNetAfterPaystackFee,
      },
    });
  } catch (error) {
    console.error(
      "Paystack order initialization error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while preparing your payment.",
      },
      { status: 500 }
    );
  }
}