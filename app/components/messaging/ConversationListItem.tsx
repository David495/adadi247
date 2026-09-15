"use client";

import type {
  ConversationListItemProps,
} from "./types";

type ExtendedConversationListItemProps =
  ConversationListItemProps & {
    businessView?: boolean;
  };

function formatConversationTime(
  timestamp?: string
): string {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return new Intl.DateTimeFormat("en-NG", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export default function ConversationListItem({
  conversation,
  selected = false,
  onClick,
  businessView = false,
}: ExtendedConversationListItemProps) {
  const displayName = businessView
    ? conversation.customerName ||
      "Customer"
    : conversation.businessName ||
      conversation.customerName ||
      "Conversation";

  const avatarUrl = businessView
    ? conversation.customerAvatarUrl
    : conversation.businessLogoUrl ||
      conversation.customerAvatarUrl ||
      null;

  const unreadCount =
    conversation.unreadCount ?? 0;

  const hasUnread = unreadCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors ${
        selected
          ? "bg-[#8B1E3F]/5"
          : "hover:bg-gray-50"
      }`}
    >
      <div className="relative shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8B1E3F]/10 text-sm font-semibold text-[#8B1E3F]">
            {displayName
              .charAt(0)
              .toUpperCase()}
          </div>
        )}

        {hasUnread && (
          <span
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#8B1E3F]"
            aria-label="Unread messages"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3
            className={`truncate text-sm ${
              hasUnread
                ? "font-semibold text-gray-900"
                : "font-medium text-gray-800"
            }`}
          >
            {displayName}
          </h3>

          {conversation.lastMessageAt && (
            <span
              className={`shrink-0 text-[10px] ${
                hasUnread
                  ? "font-medium text-[#8B1E3F]"
                  : "text-gray-400"
              }`}
            >
              {formatConversationTime(
                conversation.lastMessageAt
              )}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <p
            className={`min-w-0 flex-1 truncate text-xs ${
              hasUnread
                ? "font-medium text-gray-700"
                : "text-gray-500"
            }`}
          >
            {conversation.lastMessage ||
              "No messages yet"}
          </p>

          {hasUnread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#8B1E3F] px-1.5 text-[10px] font-semibold text-white">
              {unreadCount > 99
                ? "99+"
                : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}