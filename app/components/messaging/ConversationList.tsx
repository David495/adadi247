"use client";

import ConversationListItem from "./ConversationListItem";

import type {
  ConversationListProps,
} from "./types";

type ExtendedConversationListProps =
  ConversationListProps & {
    businessView?: boolean;
  };

export default function ConversationList({
  conversations,
  selectedConversationId = null,
  onSelectConversation,
  loading = false,
  businessView = false,
}: ExtendedConversationListProps) {
  if (loading) {
    return (
      <div
        className="flex h-full flex-col"
        aria-label="Loading conversations"
      >
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
        </div>

        <div className="flex-1">
          {Array.from({ length: 5 }).map(
            (_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b border-gray-100 px-4 py-3"
              >
                <div className="h-11 w-11 animate-pulse rounded-full bg-gray-200" />

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200" />

                  <div className="h-3 w-48 max-w-full animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-200 px-4 py-4">
        <h2 className="text-base font-semibold text-gray-900">
          {businessView
            ? "Customers"
            : "Messages"}
        </h2>

        <p className="mt-0.5 text-xs text-gray-500">
          {businessView
            ? "Your customer conversations"
            : "Your conversations"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#8B1E3F]/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6 text-[#8B1E3F]"
                aria-hidden="true"
              >
                <path
                  d="M7 18.5 3.5 21V6.5A2.5 2.5 0 0 1 6 4h12a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 18H7Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M8 9h8M8 13h5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h3 className="text-sm font-semibold text-gray-900">
              {businessView
                ? "No customers yet"
                : "No conversations yet"}
            </h3>

            <p className="mt-1 max-w-[240px] text-xs leading-5 text-gray-500">
              {businessView
                ? "When customers contact your business, they will appear here."
                : "When you start a conversation, it will appear here."}
            </p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              selected={
                selectedConversationId ===
                conversation.id
              }
              onClick={() =>
                onSelectConversation(
                  conversation
                )
              }
              businessView={businessView}
            />
          ))
        )}
      </div>
    </div>
  );
}