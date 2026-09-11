import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

type CartItem = {
  productId: string;
  quantity: number;
};

const ADADI_FIXED_FEE = 100;

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
    amount < PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD
      ? 0
      : PAYSTACK_FLAT_FEE;

  const fee = percentageFee + flatFee;

  return Math.min(
    Math.round(fee * 100) / 100,
    PAYSTACK_FEE_CAP
  );
}

export async function GET() {
  try {
    const adminSupabase = createAdminClient();

    const { data: settings, error } =
      await adminSupabase
        .from("platform_settings")
        .select(
          `
            delivery_fee,
            maintenance_mode,
            commission_rate
          `
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        "ORDER PAYMENT SETTINGS ERROR:",
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

    return NextResponse.json({
      success: true,
      deliveryFee:
        Number(settings?.delivery_fee) || 0,
      maintenanceMode:
        Boolean(settings?.maintenance_mode),
      commissionRate:
        Number(settings?.commission_rate) || 0,
      fixedFee: ADADI_FIXED_FEE,
    });
  } catch (error) {
    console.error(
      "ORDER PAYMENT GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while loading payment settings.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

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
      deliveryMethod?: string;
      deliveryAddress?: string;
    };

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "Business is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Your cart is empty.",
        },
        { status: 400 }
      );
    }

    if (
      !customerName?.trim() ||
      !customerEmail?.trim() ||
      !customerPhone?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer information is required.",
        },
        { status: 400 }
      );
    }

    if (
      deliveryMethod !== "pickup" &&
      deliveryMethod !== "delivery"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please select a valid delivery method.",
        },
        { status: 400 }
      );
    }

    if (
      deliveryMethod === "delivery" &&
      !deliveryAddress?.trim()
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

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error(
        "PAYSTACK SECRET KEY IS MISSING."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment service is not configured.",
        },
        { status: 500 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Application URL is not configured.",
        },
        { status: 500 }
      );
    }

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !authData?.user
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in to place an order.",
        },
        { status: 401 }
      );
    }

    const user = authData.user;

    const {
      data: settings,
      error: settingsError,
    } = await adminSupabase
      .from("platform_settings")
      .select(
        `
          delivery_fee,
          maintenance_mode,
          commission_rate
        `
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
        "PLATFORM SETTINGS ERROR:",
        settingsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load the current payment settings.",
        },
        { status: 500 }
      );
    }

    if (settings.maintenance_mode) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payments are temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    const commissionRate =
      Number(settings.commission_rate);

    const configuredDeliveryFee =
      Number(settings.delivery_fee);

    if (
      !Number.isFinite(
        commissionRate
      ) ||
      commissionRate < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The ADADI commission setting is not configured correctly.",
        },
        { status: 500 }
      );
    }

    if (
      !Number.isFinite(
        configuredDeliveryFee
      ) ||
      configuredDeliveryFee < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The delivery fee is not configured correctly.",
        },
        { status: 500 }
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
      .maybeSingle();

    if (
      businessError ||
      !business
    ) {
      console.error(
        "BUSINESS FETCH ERROR:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Business could not be found.",
        },
        { status: 404 }
      );
    }

    if (
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

    if (
      business.is_open === false
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business is currently closed.",
        },
        { status: 400 }
      );
    }

    if (
      !business.paystack_subaccount_code
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
      business.paystack_subaccount_active ===
      false
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business payment account is currently inactive.",
        },
        { status: 400 }
      );
    }

    const uniqueProductIds =
      new Set<string>();

    for (const item of items) {
      if (
        !item?.productId ||
        uniqueProductIds.has(
          item.productId
        )
      ) {
        if (
          uniqueProductIds.has(
            item?.productId
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Duplicate products are not allowed in the cart.",
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid product in cart.",
          },
          { status: 400 }
        );
      }

      uniqueProductIds.add(
        item.productId
      );
    }

    const productIds =
      Array.from(uniqueProductIds);

    const {
      data: products,
      error: productsError,
    } = await adminSupabase
      .from("products")
      .select(
        `
          id,
          name,
          price,
          is_available,
          business_id
        `
      )
      .in("id", productIds);

    if (productsError) {
      console.error(
        "PRODUCT FETCH ERROR:",
        productsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load the products in your cart.",
        },
        { status: 500 }
      );
    }

    if (
      !products ||
      products.length !==
        productIds.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more products in your cart could not be found.",
        },
        { status: 400 }
      );
    }

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ])
    );

    let subtotal = 0;

    const validatedItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }> = [];

    for (const item of items) {
      const product =
        productMap.get(
          item.productId
        );

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error:
              "One or more products could not be found.",
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
              "A product in your cart does not belong to this business.",
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
            error:
              `${product.name} is currently unavailable.`,
          },
          { status: 400 }
        );
      }

      const quantity =
        Number(item.quantity);

      if (
        !Number.isInteger(
          quantity
        ) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid product quantity.",
          },
          { status: 400 }
        );
      }

      const unitPrice =
        Number(product.price);

      if (
        !Number.isFinite(
          unitPrice
        ) ||
        unitPrice < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Invalid price configured for ${product.name}.`,
          },
          { status: 400 }
        );
      }

      const itemSubtotal =
        Math.round(
          unitPrice *
            quantity *
            100
        ) / 100;

      subtotal =
        Math.round(
          (subtotal +
            itemSubtotal) *
            100
        ) / 100;

      validatedItems.push({
        productId:
          item.productId,
        productName:
          product.name,
        quantity,
        unitPrice,
        subtotal:
          itemSubtotal,
      });
    }

    const deliveryFee =
      deliveryMethod ===
      "delivery"
        ? configuredDeliveryFee
        : 0;

    const total =
      Math.round(
        (
          subtotal +
          ADADI_FIXED_FEE +
          deliveryFee
        ) * 100
      ) / 100;

    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid order total.",
        },
        { status: 400 }
      );
    }

    const paystackFee =
      calculatePaystackFee(total);

    const commissionAmount =
      Math.round(
        total *
          (commissionRate / 100) *
          100
      ) / 100;

    const businessAmount =
      Math.round(
        (
          total -
          commissionAmount -
          paystackFee
        ) * 100
      ) / 100;

    const mainAccountCharge =
      Math.round(
        (
          commissionAmount +
          paystackFee
        ) * 100
      ) / 100;

    if (
      businessAmount < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to calculate the business payment correctly.",
        },
        { status: 500 }
      );
    }

    const totalKobo =
      Math.round(total * 100);

    const commissionKobo =
      Math.round(
        commissionAmount * 100
      );

    const paystackFeeKobo =
      Math.round(
        paystackFee * 100
      );

    const mainAccountChargeKobo =
      Math.round(
        mainAccountCharge * 100
      );

    const businessKobo =
      Math.round(
        businessAmount * 100
      );

    const orderNumber =
      `ADADI-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;

    const reference =
      `ADADI-ORDER-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    const {
      data: order,
      error: orderError,
    } = await adminSupabase
      .from("orders")
      .insert({
        customer_id:
          user.id,
        business_id:
          businessId,
        order_number:
          orderNumber,
        total_amount:
          total,
        status:
          "pending",
        delivery_address:
          deliveryMethod ===
          "delivery"
            ? deliveryAddress?.trim() ||
              null
            : null,
        customer_phone:
          customerPhone.trim(),
        customer_name:
          customerName.trim(),
        customer_email:
          customerEmail.trim(),
        delivery_method:
          deliveryMethod,
        subtotal,
        delivery_fee:
          deliveryFee,
        service_fee:
          paystackFee,
        total,
        payment_status:
          "pending",
        order_status:
          "pending",
        paystack_reference:
          reference,
      })
      .select()
      .single();

    if (
      orderError ||
      !order
    ) {
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
      validatedItems.map(
        (item) => ({
          order_id:
            order.id,
          product_id:
            item.productId,
          product_name:
            item.productName,
          quantity:
            item.quantity,
          unit_price:
            item.unitPrice,
          subtotal:
            item.subtotal,
        })
      );

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
        .eq(
          "id",
          order.id
        );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to create your order items.",
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
            email:
              customerEmail.trim(),
            amount:
              totalKobo,
            currency:
              "NGN",
            reference,
            callback_url:
              `${appUrl.replace(
                /\/+$/,
                ""
              )}/payment/callback?type=order`,
            subaccount:
              business.paystack_subaccount_code,
            transaction_charge:
              mainAccountChargeKobo,
            bearer:
              "account",
            metadata: {
              type:
                "customer_order",
              orderId:
                order.id,
              orderNumber:
                order.order_number,
              businessId,
              customerId:
                user.id,
              businessSubaccount:
                business.paystack_subaccount_code,
              subtotal,
              adadiFixedFee:
                ADADI_FIXED_FEE,
              deliveryFee,
              total,
              orderTotal:
                total,
              orderTotalKobo:
                totalKobo,
              commissionRate:
                commissionRate,
              commissionAmount,
              commissionKobo,
              paystackFee,
              paystackFeeKobo,
              mainAccountCharge,
              mainAccountChargeKobo,
              businessAmount,
              businessKobo,
              deliveryMethod,
            },
          }),
        }
      );

    const paystackData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData.status ||
      !paystackData.data
    ) {
      console.error(
        "PAYSTACK INITIALIZATION ERROR:",
        paystackData
      );

      await adminSupabase
        .from("order_items")
        .delete()
        .eq(
          "order_id",
          order.id
        );

      await adminSupabase
        .from("orders")
        .delete()
        .eq(
          "id",
          order.id
        );

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData.message ||
            "Unable to initialize payment.",
        },
        { status: 400 }
      );
    }

    const {
      data: commission,
      error: commissionError,
    } =
      await adminSupabase
        .from("commissions")
        .insert({
          order_id:
            order.id,
          business_id:
            businessId,
          order_total:
            total,
          commission_rate:
            commissionRate,
          commission_amount:
            commissionAmount,
          business_amount:
            businessAmount,
          currency:
            "NGN",
          status:
            "pending",
          paystack_reference:
            reference,
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
        .eq(
          "order_id",
          order.id
        );

      await adminSupabase
        .from("orders")
        .delete()
        .eq(
          "id",
          order.id
        );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to prepare payment commission record.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      authorizationUrl:
        paystackData.data
          .authorization_url,
      accessCode:
        paystackData.data
          .access_code,
      reference:
        paystackData.data
          .reference,
      orderId:
        order.id,
      orderNumber:
        order.order_number,
      subtotal,
      adadiFixedFee:
        ADADI_FIXED_FEE,
      deliveryFee,
      total,
      commissionRate,
      commissionAmount,
      paystackFee,
      mainAccountCharge,
      businessAmount,
    });
  } catch (error) {
    console.error(
      "ORDER PAYMENT INITIALIZATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while initializing your payment.",
      },
      { status: 500 }
    );
  }
}