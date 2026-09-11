"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openBusinessConversation } from "@/app/lib/e2ee/conversations";

type MessageBusinessButtonProps = {
  businessId: string;
  className?: string;
};

export default function MessageBusinessButton({
  businessId,
  className = "",
}: MessageBusinessButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMessageBusiness() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const conversation =
        await openBusinessConversation(businessId);

      router.push(
        `/customer/dashboard/messages?conversation=${conversation.id}`
      );
    } catch (messageError) {
      setError(
        messageError instanceof Error
          ? messageError.message
          : "Unable to start conversation."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleMessageBusiness}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {loading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-4.2-1.1L4 19l1.1-3.2A7.2 7.2 0 0 1 4.5 12 7.5 7.5 0 0 1 12 4.5c4.1 0 8 2.8 8 7Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {loading ? "Opening..." : "Message Business"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}