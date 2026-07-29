"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/app/lib/supabase/server";

type UpdateOrderStatusResult = {
  success: boolean;
  error?: string;
};

type OrderStatus =
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export async function updateOrderStatus(
  orderId: string,
  newStatus: string
): Promise<UpdateOrderStatusResult> {
  // =========================================
  // 1. VALIDATE ORDER ID
  // =========================================

  if (!orderId || orderId.trim() === "") {
    return {
      success: false,
      error: "Order ID is required.",
    };
  }

  // =========================================
  // 2. VALIDATE STATUS
  // =========================================

  const allowedStatuses: OrderStatus[] = [
    "preparing",
    "ready",
    "completed",
    "cancelled",
  ];

  if (!allowedStatuses.includes(newStatus as OrderStatus)) {
    return {
      success: false,
      error: "Invalid order status.",
    };
  }

  const status = newStatus as OrderStatus;

  // =========================================
  // 3. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 4. GET CURRENT USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "UPDATE ORDER STATUS - AUTH ERROR:",
      userError
    );

    return {
      success: false,
      error:
        "Unable to verify your account. Please try again.",
    };
  }

  if (!user) {
    return {
      success: false,
      error:
        "You must be logged in to update an order.",
    };
  }

  console.log(
    "UPDATE ORDER STATUS - USER:",
    user.id
  );

  // =========================================
  // 5. FETCH ORDER
  // =========================================

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(
      "id, business_id, payment_status, order_status, status"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error(
      "UPDATE ORDER STATUS - ORDER FETCH ERROR:",
      {
        message: orderError.message,
        code: orderError.code,
        details: orderError.details,
        hint: orderError.hint,
      }
    );

    return {
      success: false,
      error:
        orderError.message ||
        "Unable to load this order.",
    };
  }

  if (!order) {
    console.error(
      "UPDATE ORDER STATUS - ORDER NOT FOUND:",
      orderId
    );

    return {
      success: false,
      error:
        "Order not found or you do not have permission to access it.",
    };
  }

  console.log(
    "UPDATE ORDER STATUS - ORDER FOUND:",
    {
      id: order.id,
      businessId: order.business_id,
      paymentStatus: order.payment_status,
      orderStatus: order.order_status,
      status: order.status,
    }
  );

  // =========================================
  // 6. VERIFY BUSINESS OWNERSHIP
  // =========================================

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", order.business_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (businessError) {
    console.error(
      "UPDATE ORDER STATUS - BUSINESS FETCH ERROR:",
      {
        message: businessError.message,
        code: businessError.code,
        details: businessError.details,
        hint: businessError.hint,
      }
    );

    return {
      success: false,
      error:
        businessError.message ||
        "Unable to verify business ownership.",
    };
  }

  if (!business) {
    console.error(
      "UPDATE ORDER STATUS - BUSINESS NOT FOUND OR UNAUTHORIZED:",
      {
        businessId: order.business_id,
        userId: user.id,
      }
    );

    return {
      success: false,
      error:
        "You are not authorized to manage this order.",
    };
  }

  console.log(
    "UPDATE ORDER STATUS - BUSINESS VERIFIED:",
    business.id
  );

  // =========================================
  // 7. GET CURRENT STATUS
  // =========================================

  const currentStatus =
    order.order_status ||
    order.status ||
    "pending";

  // =========================================
  // 8. CHECK PAYMENT BEFORE ACCEPTING
  // =========================================

  if (
    status === "preparing" &&
    order.payment_status?.toLowerCase() !== "paid"
  ) {
    return {
      success: false,
      error:
        "This order cannot be accepted because payment has not been confirmed.",
    };
  }

  // =========================================
  // 9. PREVENT INVALID TRANSITIONS
  // =========================================

  if (currentStatus === "cancelled") {
    return {
      success: false,
      error:
        "A cancelled order cannot be moved to another status.",
    };
  }

  if (currentStatus === "completed") {
    return {
      success: false,
      error:
        "A completed order cannot be moved to another status.",
    };
  }

  // =========================================
  // 10. PREVENT UNNECESSARY UPDATE
  // =========================================

  if (currentStatus === status) {
    return {
      success: true,
    };
  }

  // =========================================
  // 11. UPDATE ORDER
  // =========================================

  console.log(
    "UPDATE ORDER STATUS - STARTING UPDATE:",
    {
      orderId,
      businessId: order.business_id,
      currentStatus,
      newStatus: status,
    }
  );

  const {
    error: updateError,
  } = await supabase
    .from("orders")
    .update({
      order_status: status,
      status: status,
    })
    .eq("id", orderId)
    .eq("business_id", order.business_id);

  // =========================================
  // 12. HANDLE UPDATE ERROR
  // =========================================

  if (updateError) {
    console.error(
      "UPDATE ORDER STATUS - UPDATE ERROR:",
      {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        orderId,
        businessId: order.business_id,
        newStatus: status,
      }
    );

    return {
      success: false,
      error:
        updateError.message ||
        "Unable to update order status.",
    };
  }

  // =========================================
  // 13. UPDATE SUCCEEDED
  // =========================================

  console.log(
    "UPDATE ORDER STATUS - DATABASE UPDATE SUCCEEDED:",
    {
      orderId,
      newStatus: status,
    }
  );

  // =========================================
  // 14. REVALIDATE ORDER PAGES
  // =========================================

  revalidatePath(
    `/dashboard/businesses/orders/${orderId}`
  );

  revalidatePath(
    "/dashboard/businesses/orders"
  );

  revalidatePath(
    "/dashboard/businesses"
  );

  // =========================================
  // 15. RETURN SUCCESS
  // =========================================

  return {
    success: true,
  };
}
