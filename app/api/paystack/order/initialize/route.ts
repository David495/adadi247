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
const ADADI_COMMISSION_RATE = 1.5;

const MAIN_ACCOUNT_SHARE_RATE = 3;
const BUSINESS_SHARE_RATE = 97;

const PAYSTACK_RATE = 0.015;
const PAYSTACK_FLAT_FEE = 100;
const PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD = 2500;
const PAYSTACK_FEE_CAP = 2000;

function calculatePaystackFee(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const percentageFee = amount * PAYSTACK_RATE;

  const flatFee =
    amount >= PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD
      ? PAYSTACK_FLAT_FEE
      : 0;

  return Math.min(
    percentageFee + flatFee,
    PAYSTACK_FEE_CAP
  );
}

function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item: RawCartItem) => {
      const productId =
        typeof item?.productId === "string"
          ? item.productId.trim()
          : "";

      const quantity = Number(item?.quantity);

      if (
        !productId ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return null;
      }

      return {
        productId,
        quantity: Math.floor(quantity),
      };
    })
    .filter((item): item is CartItem => item !== null);
}

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: settings, error: settingsError } =
      await admin
        .from("platform_settings")
        .select(`
          delivery_fee,
          maintenance_mode,
          commission_rate
        `)
        .order("created_at", { ascending: false })
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
          error: "Unable to load payment settings",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deliveryFee: Number(
        settings?.delivery_fee ?? 0
      ),
      maintenanceMode: Boolean(
        settings?.maintenance_mode ?? false
      ),
      commissionRate: Number(
        settings?.commission_rate ??
          ADADI_COMMISSION_RATE
      ),
      fixedFee: ADADI_FIXED_FEE,
    });
  } catch (error) {
    console.error(
      "Payment settings GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
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

    const items = normalizeCartItems(body.items);

    const customerName =
      typeof body.customerName === "string"
        ? body.customerName.trim()
        : "";

    const customerEmail =
      typeof body.customerEmail === "string"
        ? body.customerEmail.trim()
        : "";

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
          error: "Customer name is required.",
        },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer email is required.",
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
          error: "Delivery address is required.",
        },
        { status: 400 }
      );
    }

    const { data: settings, error: settingsError } =
      await admin
        .from("platform_settings")
        .select(`
          delivery_fee,
          maintenance_mode,
          commission_rate
        `)
        .order("created_at", { ascending: false })
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

    const maintenanceMode = Boolean(
      settings?.maintenance_mode ?? false
    );

    if (maintenanceMode) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payments are temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    const configuredDeliveryFee = Number(
      settings?.delivery_fee ?? 0
    );

    const deliveryFee =
      deliveryMethod === "delivery"
        ? configuredDeliveryFee
        : 0;

    const commissionRate = Number(
      settings?.commission_rate ??
        ADADI_COMMISSION_RATE
    );

    const { data: business, error: businessError } =
      await admin
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

    if (paymentBusiness.status !== "approved") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business is not currently approved to receive orders.",
        },
        { status: 400 }
      );
    }

    if (paymentBusiness.is_open === false) {
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

    const productIds = items.map(
      (item) => item.productId
    );

    const { data: products, error: productsError } =
      await admin
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

    if (productList.length !== productIds.length) {
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
        product.business_id !== businessId
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

      if (product.is_available === false) {
        return NextResponse.json(
          {
            success: false,
            error: `${product.name} is currently unavailable.`,
          },
          { status: 400 }
        );
      }

      const price = Number(product.price);

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Invalid price for ${product.name}.`,
          },
          { status: 400 }
        );
      }

      subtotal +=
        price * item.quantity;
    }

    subtotal = Number(
      subtotal.toFixed(2)
    );

    const total = Number(
      (
        subtotal +
        ADADI_FIXED_FEE +
        deliveryFee
      ).toFixed(2)
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

    const businessAmount = Number(
      (
        (total * BUSINESS_SHARE_RATE) /
        100
      ).toFixed(2)
    );

    const mainAccountGross = Number(
      (
        (total * MAIN_ACCOUNT_SHARE_RATE) /
        100
      ).toFixed(2)
    );

    const commissionAmount = Number(
      (
        (total * commissionRate) /
        100
      ).toFixed(2)
    );

    const paystackFee = Number(
      calculatePaystackFee(total).toFixed(2)
    );

    const adadiNetAfterPaystackFee =
      Number(
        (
          mainAccountGross -
          paystackFee
        ).toFixed(2)
      );

    const transactionChargeKobo =
      Math.round(
        mainAccountGross * 100
      );

    const orderNumber = `AD-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const { data: order, error: orderError } =
      await admin
        .from("orders")
        .insert({
          customer_id: user.id,
          business_id: businessId,
          order_number: orderNumber,
          total_amount: total,
          total,
          subtotal,
          delivery_fee: deliveryFee,
          service_fee: paystackFee,
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

    const orderItems = items.map(
      (item) => {
        const product = productMap.get(
          item.productId
        )!;

        const unitPrice = Number(
          product.price
        );

        const itemSubtotal = Number(
          (
            unitPrice *
            item.quantity
          ).toFixed(2)
        );

        return {
          order_id: order.id,
          product_id: product.id,
          product_name: product.name,
          quantity: item.quantity,
          unit_price: unitPrice,
          subtotal: itemSubtotal,
        };
      }
    );

    const { error: orderItemsError } =
      await admin
        .from("order_items")
        .insert(orderItems);

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

    const { error: commissionError } =
      await admin
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

    const callbackUrl =
      process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/payment/callback`
        : undefined;

    const metadata = {
      type: "customer_order",
      order_id: order.id,
      orderId: order.id,
      order_number: orderNumber,
      business_id: businessId,
      businessId,
      customer_id: user.id,
      customerId: user.id,
    };

    const paystackPayload: Record<
      string,
      unknown
    > = {
      email: customerEmail,
      amount: Math.round(
        total * 100
      ),
      currency: "NGN",
      reference: `ADADI-${order.id}-${Date.now()}`,
      subaccount:
        paymentBusiness.paystack_subaccount_code,
      transaction_charge:
        transactionChargeKobo,
      bearer: "account",
      metadata,
    };

    if (callbackUrl) {
      paystackPayload.callback_url =
        callbackUrl;
    }

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

    const paystackData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData?.status
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
      paystackData?.data?.reference;

    if (!paystackReference) {
      console.error(
        "Paystack returned no transaction reference:",
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
            "Payment could not be initialized. Please try again.",
        },
        { status: 502 }
      );
    }

    const { error: referenceError } =
      await admin
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
            "Payment was initialized, but the order reference could not be saved. Please contact support.",
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
      reference: paystackReference,
      orderId: order.id,
      orderNumber,
      breakdown: {
        subtotal,
        deliveryFee,
        fixedFee: ADADI_FIXED_FEE,
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