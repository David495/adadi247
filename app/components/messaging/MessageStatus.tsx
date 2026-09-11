"use client";

import type { MessageDeliveryState } from "./types";

type MessageStatusProps = {
  status: MessageDeliveryState;
  onRetry?: () => void | Promise<void>;
};

export default function MessageStatus({
  status,
  onRetry,
}: MessageStatusProps) {
  if (status === "sending") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
        <span
          className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-gray-300 border-t-[#8B1E3F]"
          aria-hidden="true"
        />
        Sending...
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-red-600">
        <span>Failed</span>
        {onRetry && (
          <>
            <span aria-hidden="true">•</span>
            <button
              type="button"
              onClick={onRetry}
              className="font-medium underline underline-offset-2 transition-colors hover:text-[#64152E] focus:outline-none focus:ring-2 focus:ring-[#8B1E3F]/30 focus:ring-offset-1"
            >
              Retry
            </button>
          </>
        )}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] text-gray-500"
      aria-label="Message sent"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path
          d="M2.5 8.5 6 12l7.5-8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Sent
    </span>
  );
}