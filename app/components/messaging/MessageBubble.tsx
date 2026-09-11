"use client";

import MessageStatus from "./MessageStatus";
import type {
  MessageBubbleProps,
} from "./types";

function formatMessageTime(
  timestamp: string
): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function MessageBubble({
  message,
  isOwnMessage,
  onRetry,
}: MessageBubbleProps) {
  const isFailed = message.status === "failed";

  return (
    <div
      className={`flex w-full ${
        isOwnMessage
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <div
        className={`flex max-w-[85%] flex-col sm:max-w-[70%] ${
          isOwnMessage
            ? "items-end"
            : "items-start"
        }`}
      >
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isOwnMessage
              ? "rounded-br-md bg-[#8B1E3F] text-white"
              : "rounded-bl-md border border-gray-200 bg-white text-gray-900"
          } ${
            isFailed
              ? "opacity-80"
              : ""
          }`}
        >
          <p className="whitespace-pre-wrap break-words">
            {message.plaintext}
          </p>
        </div>

        <div
          className={`mt-1 flex items-center gap-2 px-1 ${
            isOwnMessage
              ? "justify-end"
              : "justify-start"
          }`}
        >
          <span className="text-[10px] text-gray-400">
            {formatMessageTime(
              message.createdAt
            )}
          </span>

          {isOwnMessage && (
            <MessageStatus
              status={message.status}
              onRetry={
                isFailed
                  ? () => onRetry?.(message)
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}