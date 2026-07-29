"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";

import { updateOrderStatus } from "./action";

type OrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "cancelled";

type OrderStatusControlProps = {
  orderId: string;
  currentStatus: string;
};

const statuses: {
  value: OrderStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "pending",
    label: "Pending",
    description:
      "Order has been received and is waiting to be processed.",
  },
  {
    value: "processing",
    label: "Processing",
    description:
      "The business is currently preparing the order.",
  },
  {
    value: "completed",
    label: "Completed",
    description:
      "The order has been successfully completed.",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    description:
      "The order has been cancelled.",
  },
];

export default function OrderStatusControl({
  orderId,
  currentStatus,
}: OrderStatusControlProps) {
  const [status, setStatus] =
    useState<OrderStatus>(
      statuses.some(
        (item) =>
          item.value === currentStatus
      )
        ? (currentStatus as OrderStatus)
        : "pending"
    );

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const handleStatusChange = (
    newStatus: OrderStatus
  ) => {
    if (newStatus === status) {
      return;
    }

    setMessage(null);
    setError(null);

    const previousStatus = status;

    setStatus(newStatus);

    startTransition(async () => {
      const result =
        await updateOrderStatus(
          orderId,
          newStatus
        );

      if (!result.success) {
        setStatus(previousStatus);

        setError(
          result.error ||
            "Unable to update order status."
        );

        return;
      }

      setMessage(
        `Order status updated to ${newStatus}.`
      );
    });
  };

  return (
    <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">

      {/* =========================================
          HEADER
      ========================================= */}

      <div className="flex items-start gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
          <CheckCircle size={21} />
        </div>

        <div>

          <h2 className="font-bold text-[#242424]">
            Manage Order Status
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Update the current status of this order.
          </p>

        </div>

      </div>

      {/* =========================================
          STATUS OPTIONS
      ========================================= */}

      <div className="mt-6 space-y-3">

        {statuses.map(
          (item) => {

            const isSelected =
              status === item.value;

            return (
              <button
                key={item.value}
                type="button"
                disabled={isPending}
                onClick={() =>
                  handleStatusChange(
                    item.value
                  )
                }
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? "border-[#8B1E3F] bg-[#F7E9EE]"
                    : "border-gray-200 hover:border-[#C99AAA] hover:bg-gray-50"
                } ${
                  isPending
                    ? "cursor-not-allowed opacity-60"
                    : ""
                }`}
              >

                {/* ICON */}

                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isSelected
                      ? "bg-[#8B1E3F] text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >

                  {item.value ===
                  "pending" ? (
                    <Clock size={17} />
                  ) : item.value ===
                    "processing" ? (
                    <Loader2 size={17} />
                  ) : item.value ===
                    "completed" ? (
                    <CheckCircle size={17} />
                  ) : (
                    <XCircle size={17} />
                  )}

                </div>

                {/* TEXT */}

                <div className="min-w-0 flex-1">

                  <div className="flex items-center justify-between gap-3">

                    <p
                      className={`font-semibold ${
                        isSelected
                          ? "text-[#8B1E3F]"
                          : "text-[#242424]"
                      }`}
                    >
                      {item.label}
                    </p>

                    {isSelected && (
                      <span className="text-xs font-bold text-[#8B1E3F]">
                        Current
                      </span>
                    )}

                  </div>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    {item.description}
                  </p>

                </div>

              </button>
            );
          }
        )}

      </div>

      {/* =========================================
          LOADING MESSAGE
      ========================================= */}

      {isPending && (

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">

          <Loader2
            size={16}
            className="animate-spin"
          />

          Updating order status...

        </div>

      )}

      {/* =========================================
          SUCCESS MESSAGE
      ========================================= */}

      {message && !isPending && (

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">

          <CheckCircle size={17} />

          {message}

        </div>

      )}

      {/* =========================================
          ERROR MESSAGE
      ========================================= */}

      {error && !isPending && (

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">

          <XCircle size={17} />

          {error}

        </div>

      )}

    </section>
  );
}