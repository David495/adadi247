"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteProduct } from "./action";

type DeleteButtonProps = {
  productId: string;
  productName: string;
};

export default function DeleteButton({
  productId,
  productName,
}: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteProduct(productId);
    });
  }

  if (showConfirm) {
    return (
      <div className="flex flex-1 items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="flex flex-1 items-center justify-center rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Deleting..." : "Confirm"}
        </button>

        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="flex items-center justify-center rounded-xl border border-red-200 px-4 py-2.5 text-red-600 transition hover:bg-red-50"
      aria-label={`Delete ${productName}`}
    >
      <Trash2 size={16} />
    </button>
  );
}