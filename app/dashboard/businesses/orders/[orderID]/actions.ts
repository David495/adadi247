"use server";

import { createClient } from "@/app/lib/supabase/server";

type UpdateOrderStatusResult = {
  success: boolean;
  error?: string;
};

const allowedTransitions: Record<string, string[]> = {
  pending: ["preparing"],
  preparing: ["ready"],
  ready: ["completed"],
};

export async function updateOrderStatus(
  orderId: string,
  newStatus: string
): Promise<UpdateOrderStatusResult> {
  if (!orderId) {
    return {
      success: false,
      error: "Order ID is missing.",
    };
  }

  const normalizedNewStatus =
    newStatus.trim().toLowerCase();

  const allowedStatuses = [
    "pending",
    "preparing",
    "ready",
    "completed",
    "cancelled",
  ];

  if (!allowedStatuses.includes(normalizedNewStatus)) {
    return {
      success: false,
      error: "Invalid order status.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in to update this order.",
    };
  }

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(
      `
        id,
        business_id,
        payment_status,
        order_status,
        status
      `
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error(
      "UPDATE ORDER STATUS - ORDER FETCH ERROR:",
      orderError
    );

    return {
      success: false,
      error: "Unable to find this order.",
    };
  }

  if (!order) {
    return {
      success: false,
      error: "Order not found.",
    };
  }

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", order.business_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (businessError) {
    console.error(
      "UPDATE ORDER STATUS - BUSINESS FETCH ERROR:",
      businessError
    );

    return {
      success: false,
      error: "Unable to verify business ownership.",
    };
  }

  if (!business) {
    return {
      success: false,
      error: "You are not authorized to update this order.",
    };
  }

  const currentStatus =
    order.order_status ||
    order.status ||
    "pending";

  const normalizedCurrentStatus =
    currentStatus.trim().toLowerCase();

  if (
    normalizedNewStatus !== "cancelled" &&
    normalizedCurrentStatus !== normalizedNewStatus
  ) {
    const nextStatuses =
      allowedTransitions[
        normalizedCurrentStatus
      ] || [];

    if (!nextStatuses.includes(normalizedNewStatus)) {
      return {
        success: false,
        error: `This order cannot move from ${normalizedCurrentStatus} to ${normalizedNewStatus}.`,
      };
    }
  }

  if (
    normalizedNewStatus === "preparing" &&
    order.payment_status?.trim().toLowerCase() !== "paid"
  ) {
    return {
      success: false,
      error:
        "This order cannot be accepted until payment has been confirmed.",
    };
  }

  const updateData: {
    order_status: string;
    status?: string;
  } = {
    order_status: normalizedNewStatus,
  };

  const {
    error: updateError,
  } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId)
    .eq("business_id", order.business_id);

  if (updateError) {
    console.error(
      "UPDATE ORDER STATUS - UPDATE ERROR:",
      updateError
    );

    return {
      success: false,
      error:
        updateError.message ||
        "Failed to update the order status.",
    };
  }

  return {
    success: true,
  };
}