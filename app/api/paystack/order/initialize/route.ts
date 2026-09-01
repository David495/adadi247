import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

type CartItem = {
  productId: string;
  quantity: number;
};

export async function GET() {
  try {
    const adminSupabase = createAdminClient();

    const {
      data: platformSettings,
      error: platformSettingsError,
    } = await adminSupabase
      .from("platform_settings")
      .select("delivery_fee, maintenance_mode, commission_rate")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (platformSettingsError || !platformSettings) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to load platform settings.",
        },
        { status: 500 }
      );
    }

    const deliveryFee = Number(platformSettings.delivery_fee);
    const commissionRate = Number(platformSettings.commission_rate);

    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid platform delivery fee configuration.",
        },
        { status: 500 }
      );
    }

    if (
      !Number.isFinite(commissionRate) ||
      commissionRate < 0 ||
      commissionRate > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid platform commission configuration.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deliveryFee,
      commissionRate,
      maintenanceMode: Boolean(platformSettings.maintenance_mode),
    });
  } catch (error) {
    console.error("ORDER PAYMENT SETTINGS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load platform payment settings.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      businessId,
      items,
      customerName,
      customerEmail,
      customerPhone,
      deliveryMethod,
      deliveryAddress,
    } = body as {
      businessId?: string;
      items?: CartItem[];
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      deliveryMethod?: "delivery" | "pickup";
      deliveryAddress?: string;
    };

    const cleanBusinessId = businessId?.trim() || "";
    const cleanCustomerName = customerName?.trim() || "";
    const cleanCustomerEmail = customerEmail?.trim() || "";
    const cleanCustomerPhone = customerPhone?.trim() || "";
    const cleanDeliveryAddress = deliveryAddress?.trim() || "";

    if (!cleanBusinessId) {
      return NextResponse.json(
        {
          success: false,
          error: "Business ID is required.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Your cart is empty.",
        },
        { status: 400 }
      );
    }

    if (!cleanCustomerName) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer name is required.",
        },
        { status: 400 }
      );
    }

    if (!cleanCustomerEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer email is required.",
        },
        { status: 400 }
      );
    }

    if (!cleanCustomerPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer phone number is required.",
        },
        { status: 400 }
      );
    }

    if (
      deliveryMethod !== "delivery" &&
      deliveryMethod !== "pickup"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Please select a valid delivery method.",
        },
        { status: 400 }
      );
    }

    if (
      deliveryMethod === "delivery" &&
      !cleanDeliveryAddress
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Delivery address is required.",
        },
        { status: 400 }
      );
    }

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY IS NOT CONFIGURED"
      );

      return NextResponse.json(
        {
          success: false,
          error: "Payment service is not properly configured.",
        },
        { status: 500 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim();

    if (!appUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Application URL is not configured.",
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "BUSINESS CUSTOMER AUTHENTICATION ERROR:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in to place an order.",
        },
        { status: 401 }
      );
    }

    const paymentEmail =
      cleanCustomerEmail || user.email?.trim();

    if (!paymentEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid customer email is required.",
        },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const {
      data: platformSettings,
      error: platformSettingsError,
    } = await adminSupabase
      .from("platform_settings")
      .select(
        "commission_rate, transaction_fee, delivery_fee, maintenance_mode"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (platformSettingsError || !platformSettings) {
      console.error(
        "PLATFORM SETTINGS ERROR:",
        platformSettingsError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load platform payment settings.",
        },
        { status: 500 }
      );
    }

    if (platformSettings.maintenance_mode) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ADADI is currently under maintenance. Please try again later.",
        },
        { status: 503 }
      );
    }

    const commissionRate = Number(
      platformSettings.commission_rate
    );

    if (
      !Number.isFinite(commissionRate) ||
      commissionRate < 0 ||
      commissionRate > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid platform commission configuration.",
        },
        { status: 500 }
      );
    }

    const configuredDeliveryFee = Number(
      platformSettings.delivery_fee
    );

    if (
      !Number.isFinite(configuredDeliveryFee) ||
      configuredDeliveryFee < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid platform delivery fee configuration.",
        },
        { status: 500 }
      );
    }

    const deliveryFee =
      deliveryMethod === "delivery"
        ? Math.round(configuredDeliveryFee * 100) / 100
        : 0;

    const {
      data: business,
      error: businessError,
    } = await adminSupabase
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
      .eq("id", cleanBusinessId)
      .single();

    if (businessError || !business) {
      console.error(
        "BUSINESS LOOKUP ERROR:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Business not found.",
        },
        { status: 404 }
      );
    }

    if (
      business.status !== "active" &&
      business.status !== "approved"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business is not currently available for orders.",
        },
        { status: 400 }
      );
    }

    if (business.is_open === false) {
      return NextResponse.json(
        {
          success: false,
          error: "This business is currently closed.",
        },
        { status: 400 }
      );
    }

    if (!business.paystack_subaccount_code) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business has not completed its Paystack payment setup.",
        },
        { status: 400 }
      );
    }

    if (business.paystack_subaccount_active === false) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business Paystack payment account is not active.",
        },
        { status: 400 }
      );
    }

    const productIds = items.map(
      (item) => item.productId
    );

    const uniqueProductIds = [
      ...new Set(productIds),
    ];

    if (
      uniqueProductIds.length !==
      productIds.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Duplicate products were found in your cart.",
        },
        { status: 400 }
      );
    }

    const {
      data: products,
      error: productsError,
    } = await adminSupabase
      .from("products")
      .select(
        "id, business_id, name, price, is_available"
      )
      .in("id", uniqueProductIds);

    if (productsError) {
      console.error(
        "PRODUCT LOOKUP ERROR:",
        productsError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify your cart items.",
        },
        { status: 500 }
      );
    }

    if (
      !products ||
      products.length !== uniqueProductIds.length
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

    let subtotal = 0;

    const validatedItems: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const item of items) {
      const product = products.find(
        (p) => p.id === item.productId
      );

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A product in your cart could not be found.",
          },
          { status: 400 }
        );
      }

      if (product.business_id !== cleanBusinessId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your cart contains products from different businesses.",
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

      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid product quantity.",
          },
          { status: 400 }
        );
      }

      const unitPrice = Number(product.price);

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid price configured for ${product.name}.`,
          },
          { status: 400 }
        );
      }

      const itemSubtotal =
        Math.round(
          unitPrice * quantity * 100
        ) / 100;

      subtotal =
        Math.round(
          (subtotal + itemSubtotal) * 100
        ) / 100;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        subtotal: itemSubtotal,
      });
    }

    const total =
      Math.round(
        (subtotal + deliveryFee) * 100
      ) / 100;

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

    const commissionAmount =
      Math.round(
        subtotal *
          (commissionRate / 100) *
          100
      ) / 100;

    const businessAmount =
      Math.round(
        (subtotal - commissionAmount) *
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

    /*
     * This is the exact amount ADADI
     * should receive from Paystack.
     *
     * ADADI receives:
     * - commission
     * - delivery fee
     *
     * Business receives:
     * - product subtotal minus commission
     *
     * Paystack's transaction_charge overrides
     * the subaccount percentage split for this
     * transaction.
     */
    const adadiChargeKobo =
      commissionKobo +
      deliveryFeeKobo;

    const businessKobo =
      Math.round(
        businessAmount * 100
      );

    const totalKobo =
      Math.round(
        total * 100
      );

    if (businessKobo < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid business payout amount.",
        },
        { status: 400 }
      );
    }

    if (adadiChargeKobo >= totalKobo) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The platform charges cannot be greater than the order total.",
        },
        { status: 400 }
      );
    }

    const orderNumber =
      `ADADI-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;

    const reference =
      `ADADI-ORDER-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    const callbackUrl =
      `${appUrl.replace(/\/+$/, "")}/payment/callback?type=order`;

    const {
      data: order,
      error: orderError,
    } = await adminSupabase
      .from("orders")
      .insert({
        customer_id: user.id,
        business_id: cleanBusinessId,
        order_number: orderNumber,
        total_amount: total,
        status: "pending",
        delivery_address:
          deliveryMethod === "delivery"
            ? cleanDeliveryAddress || null
            : null,
        customer_phone: cleanCustomerPhone,
        customer_name: cleanCustomerName,
        customer_email: paymentEmail,
        delivery_method: deliveryMethod,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        payment_status: "pending",
        order_status: "pending",
        paystack_reference: reference,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error(
        "ORDER CREATION ERROR:",
        orderError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            orderError?.message ||
            "Unable to create your order.",
        },
        { status: 500 }
      );
    }

    const orderItems =
      validatedItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
      }));

    const {
      error: orderItemsError,
    } = await adminSupabase
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      console.error(
        "ORDER ITEMS CREATION ERROR:",
        orderItemsError
      );

      await adminSupabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to create your order items.",
        },
        { status: 500 }
      );
    }

    /*
     * Create the commission record BEFORE
     * initializing Paystack.
     *
     * This prevents a situation where Paystack
     * successfully creates a payment but ADADI
     * fails to create its commission record.
     */
    const {
      data: commission,
      error: commissionError,
    } = await adminSupabase
      .from("commissions")
      .insert({
        order_id: order.id,
        business_id: cleanBusinessId,
        order_total: total,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        business_amount: businessAmount,
        currency: "NGN",
        status: "pending",
        paystack_reference: reference,
      })
      .select()
      .single();

    if (
      commissionError ||
      !commission
    ) {
      console.error(
        "COMMISSION CREATION ERROR:",
        commissionError
      );

      await adminSupabase
        .from("order_items")
        .delete()
        .eq("order_id", order.id);

      await adminSupabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to prepare payment commission record.",
        },
        { status: 500 }
      );
    }

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
          body: JSON.stringify({
            email: paymentEmail,
            amount: totalKobo,
            currency: "NGN",
            reference,

            /*
             * The business subaccount receives the
             * remainder of the transaction.
             */
            subaccount:
              business.paystack_subaccount_code,

            /*
             * This overrides the percentage_charge
             * configured on the subaccount for this
             * particular transaction.
             *
             * ADADI receives:
             * commission + delivery fee.
             */
            transaction_charge:
              adadiChargeKobo,

            /*
             * Paystack transaction fees remain with
             * the main ADADI account by default.
             */
            bearer: "account",

            callback_url: callbackUrl,

            metadata: {
              type: "customer_order",
              orderId: order.id,
              orderNumber: order.order_number,
              businessId: cleanBusinessId,
              customerId: user.id,

              commissionRate,
              commissionAmount,
              commissionKobo,

              deliveryFee,
              deliveryFeeKobo,

              adadiChargeKobo,

              businessAmount,
              businessKobo,

              subtotal,

              deliveryMethod,

              orderTotal: total,
              orderTotalKobo: totalKobo,

              payoutMethod:
                "paystack_split",

              payoutTrigger:
                "payment_initialization",

              splitType:
                "subaccount",

              subaccount:
                business.paystack_subaccount_code,
            },
          }),
        }
      );

    let paystackData: any;

    try {
      paystackData =
        await paystackResponse.json();
    } catch (parseError) {
      console.error(
        "PAYSTACK RESPONSE PARSE ERROR:",
        parseError
      );

      await adminSupabase
        .from("commissions")
        .delete()
        .eq("id", commission.id);

      await adminSupabase
        .from("order_items")
        .delete()
        .eq("order_id", order.id);

      await adminSupabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to read the response from Paystack.",
        },
        { status: 502 }
      );
    }

    console.log(
      "PAYSTACK INITIALIZATION RESPONSE:",
      paystackData
    );

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData?.data
    ) {
      console.error(
        "PAYSTACK INITIALIZATION ERROR:",
        {
          httpStatus:
            paystackResponse.status,
          response: paystackData,
        }
      );

      await adminSupabase
        .from("commissions")
        .delete()
        .eq("id", commission.id);

      await adminSupabase
        .from("order_items")
        .delete()
        .eq("order_id", order.id);

      await adminSupabase
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
        {
          status:
            paystackResponse.status >= 400 &&
            paystackResponse.status < 500
              ? 400
              : 502,
        }
      );
    }

    console.log(
      "ADADI CUSTOMER PAYMENT INITIALIZED:",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        reference,
        total,
        subtotal,
        deliveryFee,
        commissionRate,
        commissionAmount,
        businessAmount,
        adadiChargeKobo,
        businessKobo,
        totalKobo,
        subaccount:
          business.paystack_subaccount_code,
        payoutMethod:
          "paystack_split",
        payoutTrigger:
          "payment_initialization",
      }
    );

    return NextResponse.json({
      success: true,

      authorizationUrl:
        paystackData.data.authorization_url,

      accessCode:
        paystackData.data.access_code,

      reference:
        paystackData.data.reference || reference,

      orderId:
        order.id,

      orderNumber:
        order.order_number,

      subtotal,

      deliveryMethod,

      deliveryFee,

      deliveryFeeKobo,

      total,

      totalKobo,

      commissionRate,

      commissionAmount,

      commissionKobo,

      adadiChargeKobo,

      businessAmount,

      businessKobo,

      subaccount:
        business.paystack_subaccount_code,

      payoutMethod:
        "paystack_split",

      payoutTrigger:
        "payment_initialization",
    });
  } catch (error) {
    console.error(
      "CUSTOMER ORDER PAYMENT INITIALIZATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while initializing your order payment.",
      },
      { status: 500 }
    );
  }
}