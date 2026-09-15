"use client";

import { useEffect, useRef, useState } from "react";

import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";

import type {
  ChatWindowProps,
} from "./types";

type ExtendedChatWindowProps =
  ChatWindowProps & {
    businessView?: boolean;
  };

export default function ChatWindow({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onRetryMessage,
  loading = false,
  sending = false,
  businessView = false,
}: ExtendedChatWindowProps) {
  const [messageText, setMessageText] =
    useState("");

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length]);

  useEffect(() => {
    setMessageText("");
  }, [conversation?.id]);

  async function handleSendMessage() {
    const cleanMessage =
      messageText.trim();

    if (!cleanMessage || sending) {
      return;
    }

    await onSendMessage(cleanMessage);
    setMessageText("");
  }

  if (!conversation) {
    return (
      <div className="flex h-full min-h-[500px] flex-col items-center justify-center bg-[#FAF8F6] px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#8B1E3F]/10">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-7 w-7 text-[#8B1E3F]"
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

        <h2 className="text-base font-semibold text-gray-900">
          Select a conversation
        </h2>

        <p className="mt-1 max-w-sm text-sm leading-6 text-gray-500">
          Choose a conversation from your
          messages to start chatting.
        </p>
      </div>
    );
  }

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

  const fallbackInitial =
    displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#FAF8F6]">
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8B1E3F]/10 text-sm font-semibold text-[#8B1E3F]">
            {fallbackInitial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-gray-900">
            {displayName}
          </h2>

          <p className="text-xs text-gray-500">
            Messages are end-to-end encrypted
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        {loading ? (
          <div
            className="flex h-full min-h-[300px] items-center justify-center"
            aria-label="Loading messages"
          >
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#8B1E3F]"
                aria-hidden="true"
              />

              Loading messages...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center px-4 text-center">
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
              Start the conversation
            </h3>

            <p className="mt-1 max-w-xs text-xs leading-5 text-gray-500">
              Send a message to get the
              conversation started.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={
                  message.senderId ===
                  currentUserId
                }
                onRetry={onRetryMessage}
              />
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <MessageComposer
        value={messageText}
        onChange={setMessageText}
        onSend={handleSendMessage}
        disabled={loading}
        sending={sending}
        placeholder={`Message ${displayName}...`}
      />
    </div>
  );
}