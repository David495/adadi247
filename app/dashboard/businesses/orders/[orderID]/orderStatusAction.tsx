"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";

import { updateOrderStatus } from "./actions";

type OrderStatusActionProps = {
  orderId: string;
  currentStatus: string | null;
  paymentStatus: string | null;
};

type UpdateResult = {
  success: boolean;
  error?: string;
};

export default function OrderStatusActions({
  orderId,
  currentStatus,
  paymentStatus,
}: OrderStatusActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedStatus =
    currentStatus?.trim().toLowerCase() || "pending";

  const normalizedPayment =
    paymentStatus?.trim().toLowerCase() || "pending";

  async function handleStatusUpdate(newStatus: string) {
    if (isLoading) {
      return;
    }

    if (!orderId) {
      setError(
        "Unable to update this order because the order ID is missing."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = (await updateOrderStatus(
        orderId,
        newStatus
      )) as UpdateResult;

      if (!result || !result.success) {
        setError(
          result?.error ||
            "The order could not be updated. Please try again."
        );
        return;
      }

      window.location.reload();
    } catch (error: unknown) {
      console.error(
        "ORDER STATUS ACTION - UNEXPECTED ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while updating the order."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (normalizedStatus === "cancelled") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-center gap-3">
          <XCircle className="h-6 w-6 shrink-0 text-red-600" />

          <div>
            <h3 className="font-bold text-red-800">
              Order Cancelled
            </h3>

            <p className="mt-1 text-sm text-red-700">
              This order has been cancelled and can no longer
              be processed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (normalizedStatus === "completed") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />

          <div>
            <h3 className="font-bold text-green-800">
              Order Completed
            </h3>

            <p className="mt-1 text-sm text-green-700">
              This order has been successfully completed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (normalizedStatus === "pending") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-amber-900">
              New Order
            </h3>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              {normalizedPayment === "paid"
                ? "Payment has been confirmed. Accept this order to start preparing it."
                : "Payment has not yet been confirmed. You cannot accept this order yet."}
            </p>
          </div>

          <button
            type="button"
            disabled={
              isLoading ||
              normalizedPayment !== "paid"
            }
            onClick={() =>
              handleStatusUpdate("preparing")
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6b1224] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#53101c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <PackageCheck className="h-4 w-4" />
                Accept & Start Preparing
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (normalizedStatus === "preparing") {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <PackageCheck className="h-6 w-6 shrink-0 text-blue-600" />

              <h3 className="font-bold text-blue-900">
                Preparing Order
              </h3>
            </div>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              The business has accepted this order and is
              currently preparing it.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() =>
              handleStatusUpdate("ready")
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4" />
                Mark as Ready
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (normalizedStatus === "ready") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />

              <h3 className="font-bold text-green-900">
                Order Ready
              </h3>
            </div>

            <p className="mt-2 text-sm leading-6 text-green-800">
              This order is ready for the customer or
              delivery.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() =>
              handleStatusUpdate("completed")
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Mark as Completed
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Current order status:{" "}
          <span className="font-bold capitalize">
            {normalizedStatus.replaceAll("_", " ")}
          </span>
        </p>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}