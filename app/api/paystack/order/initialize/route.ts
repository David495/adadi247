import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

type CartItem = {
  productId: string;
  quantity: number;
};

const ADADI_COMMISSION_RATE = 5;

export async function POST(request: Request) {
  try {
    // =========================================
    // 1. GET REQUEST DATA
    // =========================================

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

    // =========================================
    // 2. VALIDATE REQUEST
    // =========================================

    if (!businessId) {
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

    if (!customerName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer name is required.",
        },
        { status: 400 }
      );
    }

    if (!customerEmail?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer email is required.",
        },
        { status: 400 }
      );
    }

    if (!customerPhone?.trim()) {
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
      !deliveryAddress?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Delivery address is required.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 3. CHECK PAYSTACK SECRET KEY
    // =========================================

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY IS NOT CONFIGURED"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment service is not properly configured.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 4. AUTHENTICATE CUSTOMER
    // =========================================

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "CUSTOMER AUTHENTICATION ERROR:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in to place an order.",
        },
        { status: 401 }
      );
    }

    // =========================================
    // 5. VALIDATE PAYMENT EMAIL
    // =========================================

    const paymentEmail =
      customerEmail.trim() || user.email;

    if (!paymentEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid customer email is required.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 6. CREATE ADMIN CLIENT
    // =========================================

    const adminSupabase = createAdminClient();

    // =========================================
    // 7. GET BUSINESS
    // =========================================

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
          paystack_subaccount_active
        `
      )
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      console.error(
        "BUSINESS NOT FOUND:",
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

    // =========================================
    // 8. CHECK BUSINESS STATUS
    // =========================================

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

    // =========================================
    // 9. CHECK PAYSTACK SUBACCOUNT
    // =========================================

    if (!business.paystack_subaccount_code) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business is not ready to receive payments yet.",
        },
        { status: 400 }
      );
    }

    if (business.paystack_subaccount_active !== true) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business payment account is not active yet.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 10. VALIDATE CART ITEM IDS
    // =========================================

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

    // =========================================
    // 11. FETCH REAL PRODUCTS
    // =========================================

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
        "PRODUCT FETCH ERROR:",
        productsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify your cart items.",
        },
        { status: 500 }
      );
    }

    if (
      !products ||
      products.length !==
        uniqueProductIds.length
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

    // =========================================
    // 12. VALIDATE PRODUCTS AND CALCULATE TOTAL
    // =========================================

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

      if (
        product.business_id !==
        businessId
      ) {
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
            error:
              `${product.name} is currently unavailable.`,
          },
          { status: 400 }
        );
      }

      const quantity = Number(
        item.quantity
      );

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

      const unitPrice = Number(
        product.price
      );

      if (
        !Number.isFinite(unitPrice) ||
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
        unitPrice * quantity;

      subtotal += itemSubtotal;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        subtotal: itemSubtotal,
      });
    }

    // =========================================
    // 13. CALCULATE TOTAL
    // =========================================

    const deliveryFee = 0;

    const total =
      subtotal + deliveryFee;

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

    // =========================================
    // 14. CALCULATE ADADI COMMISSION
    // =========================================
    //
    // ADADI = 5%
    // BUSINESS = 95%
    //
    // IMPORTANT:
    // Paystack transaction_charge is in kobo.
    //
    // Example:
    // Total = ₦10,000
    // ADADI = ₦500
    // Business = ₦9,500
    //
    // =========================================

    const commissionAmount =
      Math.round(
        total *
          (ADADI_COMMISSION_RATE / 100) *
          100
      ) / 100;

    const businessAmount =
      Math.round(
        (total - commissionAmount) *
          100
      ) / 100;

    // =========================================
    // 15. CREATE ORDER NUMBER
    // =========================================

    const orderNumber =
      `ADADI-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;

    // =========================================
    // 16. CREATE PAYSTACK REFERENCE
    // =========================================

    const reference =
      `ADADI-ORDER-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    // =========================================
    // 17. CHECK APP URL
    // =========================================

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

    // =========================================
    // 18. CREATE PENDING ORDER
    // =========================================

    const {
      data: order,
      error: orderError,
    } = await adminSupabase
      .from("orders")
      .insert({
        customer_id: user.id,
        business_id: businessId,
        order_number: orderNumber,
        total_amount: total,

        status: "pending",

        delivery_address:
          deliveryMethod === "delivery"
            ? deliveryAddress?.trim() || null
            : null,

        customer_phone:
          customerPhone.trim(),

        customer_name:
          customerName.trim(),

        customer_email:
          paymentEmail,

        delivery_method:
          deliveryMethod,

        subtotal,

        delivery_fee:
          deliveryFee,

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

    // =========================================
    // 19. CREATE ORDER ITEMS
    // =========================================

    const orderItems =
      validatedItems.map(
        (item) => ({
          order_id: order.id,

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

    // =========================================
    // 20. INITIALIZE PAYSTACK
    // =========================================

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
              paymentEmail,

            amount:
              Math.round(
                total * 100
              ),

            currency:
              "NGN",

            reference,

            callback_url:
              `${appUrl}/payment/callback?type=order`,

            subaccount:
              business.paystack_subaccount_code,

            transaction_charge:
              Math.round(
                commissionAmount * 100
              ),

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

              commissionRate:
                ADADI_COMMISSION_RATE,

              commissionAmount,

              businessAmount,

              orderTotal:
                total,
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

    // =========================================
    // 21. CREATE PENDING COMMISSION RECORD
    // =========================================

    const {
      data: commission,
      error: commissionError,
    } = await adminSupabase
      .from("commissions")
      .insert({
        order_id:
          order.id,

        business_id:
          businessId,

        order_total:
          total,

        commission_rate:
          ADADI_COMMISSION_RATE,

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

    // =========================================
    // 22. RETURN PAYMENT DETAILS
    // =========================================

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

      total,

      commissionRate:
        ADADI_COMMISSION_RATE,

      commissionAmount,

      businessAmount,
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