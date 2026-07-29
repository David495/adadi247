"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/app/lib/supabase/server";

type ActionResult = {
  success: boolean;
  error?: string;
};

const allowedStatuses = [
  "pending",
  "processing",
  "completed",
  "cancelled",
] as const;

type OrderStatus =
  (typeof allowedStatuses)[number];

// =========================================
// VERIFY ADMIN
// =========================================

async function verifyAdmin() {
  const supabase = await createClient();

  // =========================================
  // GET CURRENT USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      error:
        "You must be logged in to perform this action.",
    };
  }

  // =========================================
  // GET PROFILE
  // =========================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  // =========================================
  // VERIFY ADMIN ROLE
  // =========================================

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    console.error(
      "UNAUTHORIZED ADMIN ORDER ACTION:",
      {
        userId: user.id,
        role: profile?.role,
        profileError,
      }
    );

    return {
      supabase,
      user,
      error:
        "You are not authorized to perform this action.",
    };
  }

  return {
    supabase,
    user,
    error: null,
  };
}

// =========================================
// UPDATE ORDER STATUS
// =========================================

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<ActionResult> {
  console.log(
    "========== ADMIN UPDATE ORDER STATUS =========="
  );

  // =========================================
  // 1. VERIFY ADMIN
  // =========================================

  const {
    supabase,
    error: adminError,
  } = await verifyAdmin();

  if (adminError) {
    return {
      success: false,
      error: adminError,
    };
  }

  // =========================================
  // 2. VALIDATE ORDER ID
  // =========================================

  if (!orderId) {
    return {
      success: false,
      error: "Order ID is required.",
    };
  }

  // =========================================
  // 3. VALIDATE STATUS
  // =========================================

  if (
    !allowedStatuses.includes(
      newStatus
    )
  ) {
    return {
      success: false,
      error: "Invalid order status.",
    };
  }

  // =========================================
  // 4. CHECK ORDER EXISTS
  // =========================================

  const {
    data: existingOrder,
    error: fetchError,
  } = await supabase
    .from("orders")
    .select(
      "id, order_number, order_status, status"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) {
    console.error(
      "ADMIN ORDER FETCH ERROR:",
      fetchError
    );

    return {
      success: false,
      error:
        "Unable to find this order.",
    };
  }

  if (!existingOrder) {
    return {
      success: false,
      error: "Order not found.",
    };
  }

  // =========================================
  // 5. PREVENT UNNECESSARY UPDATE
  // =========================================

  const currentStatus =
    existingOrder.order_status ||
    existingOrder.status ||
    "pending";

  if (
    currentStatus === newStatus
  ) {
    return {
      success: false,
      error:
        "The order is already in this status.",
    };
  }

  // =========================================
  // 6. UPDATE ORDER STATUS
  // =========================================

  const {
    error: updateError,
  } = await supabase
    .from("orders")
    .update({
      order_status: newStatus,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  // =========================================
  // 7. HANDLE UPDATE ERROR
  // =========================================

  if (updateError) {
    console.error(
      "ADMIN ORDER STATUS UPDATE ERROR:",
      updateError
    );

    return {
      success: false,
      error:
        "Unable to update the order status. Please try again.",
    };
  }

  // =========================================
  // 8. LOG SUCCESS
  // =========================================

  console.log(
    "ORDER STATUS UPDATED:",
    {
      orderId,
      orderNumber:
        existingOrder.order_number,
      previousStatus:
        currentStatus,
      newStatus,
    }
  );

  // =========================================
  // 9. REFRESH ADMIN PAGES
  // =========================================

  revalidatePath(
    "/admin/dashboard"
  );

  revalidatePath(
    "/admin/orders"
  );

  revalidatePath(
    `/admin/orders/${orderId}`
  );

  // =========================================
  // 10. RETURN SUCCESS
  // =========================================

  return {
    success: true,
  };
}