"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import ConversationList from "@/app/components/messaging/ConversationList";
import ChatWindow from "@/app/components/messaging/ChatWindow";
import { useConversations } from "@/app/components/messaging/useConversations";
import { useMessaging } from "@/app/components/messaging/useMessaging";
import type { MessagingConversation } from "@/app/components/messaging/types";

export default function CustomerMessagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    refresh: refreshConversations,
  } = useConversations();

  const requestedConversationId =
    searchParams.get("conversation");

  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(requestedConversationId);

  const [mobileChatOpen, setMobileChatOpen] = useState(
    Boolean(requestedConversationId)
  );

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) =>
          conversation.id === selectedConversationId
      ) ?? null,
    [conversations, selectedConversationId]
  );

  const {
    conversation,
    messages,
    loading: messagesLoading,
    sending,
    error: messagingError,
    sendMessage,
    retryMessage,
    refresh: refreshMessages,
  } = useMessaging(selectedConversationId);

  useEffect(() => {
    if (!requestedConversationId) {
      return;
    }

    const requestedConversationExists = conversations.some(
      (conversationItem) =>
        conversationItem.id === requestedConversationId
    );

    if (requestedConversationExists) {
      setSelectedConversationId(requestedConversationId);
      setMobileChatOpen(true);
    }
  }, [requestedConversationId, conversations]);

  useEffect(() => {
    if (conversations.length === 0) {
      if (!requestedConversationId) {
        setSelectedConversationId(null);
        setMobileChatOpen(false);
      }
      return;
    }

    if (requestedConversationId) {
      const requestedConversationExists = conversations.some(
        (conversationItem) =>
          conversationItem.id === requestedConversationId
      );

      if (requestedConversationExists) {
        return;
      }
    }

    const selectedStillExists = conversations.some(
      (conversationItem) =>
        conversationItem.id === selectedConversationId
    );

    if (!selectedStillExists) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [
    conversations,
    requestedConversationId,
    selectedConversationId,
  ]);

  function handleSelectConversation(
    nextConversation: MessagingConversation
  ) {
    setSelectedConversationId(nextConversation.id);
    setMobileChatOpen(true);

    const params = new URLSearchParams(searchParams.toString());
    params.set("conversation", nextConversation.id);

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  function handleBackToConversations() {
    setMobileChatOpen(false);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("conversation");

    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    router.replace(nextUrl, {
      scroll: false,
    });
  }

  async function handleSendMessage(plaintext: string) {
    try {
      await sendMessage(plaintext);
      await refreshConversations();
    } catch {
      return;
    }
  }

  async function handleRetryMessage(
    message: Parameters<typeof retryMessage>[0]
  ) {
    try {
      await retryMessage(message);
      await refreshConversations();
    } catch {
      return;
    }
  }

  async function handleRefresh() {
    await Promise.all([
      refreshConversations(),
      refreshMessages(),
    ]);
  }

  const pageError =
    conversationsError || messagingError;

  return (
    <main className="min-h-screen bg-[#FAF8F6]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#64152E] sm:text-2xl">
              Messages
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Chat securely with businesses on ADADI.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={
              conversationsLoading ||
              messagesLoading
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-[#8B1E3F]/30 hover:text-[#8B1E3F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {(conversationsLoading ||
              messagesLoading) && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#8B1E3F]"
                aria-hidden="true"
              />
            )}

            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M20 11a8.1 8.1 0 0 0-14.9-4M4 5v4h4M4 13a8.1 8.1 0 0 0 14.9 4M20 19v-4h-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <span className="hidden sm:inline">
              Refresh
            </span>
          </button>
        </div>

        {pageError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        <section className="flex min-h-[calc(100vh-150px)] flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div
            className={`w-full shrink-0 border-r border-gray-200 bg-white md:w-[320px] lg:w-[360px] ${
              mobileChatOpen
                ? "hidden md:block"
                : "block"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-200 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Conversations
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {conversations.length === 1
                        ? "1 conversation"
                        : `${conversations.length} conversations`}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B1E3F]/10 text-[#8B1E3F]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5"
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
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {conversationsLoading &&
                conversations.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-6">
                    <div className="flex flex-col items-center text-center">
                      <span
                        className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[#8B1E3F]"
                        aria-hidden="true"
                      />

                      <p className="mt-3 text-sm text-gray-500">
                        Loading conversations...
                      </p>
                    </div>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-6">
                    <div className="max-w-[240px] text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#8B1E3F]/10 text-[#8B1E3F]">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-7 w-7"
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
                      </div>

                      <h3 className="mt-4 text-sm font-semibold text-gray-900">
                        No conversations yet
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Visit a business on ADADI and
                        start a conversation to see your
                        messages here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <ConversationList
                    conversations={conversations}
                    selectedConversationId={
                      selectedConversationId
                    }
                    onSelectConversation={
                      handleSelectConversation
                    }
                    loading={conversationsLoading}
                  />
                )}
              </div>
            </div>
          </div>

          <div
            className={`min-w-0 flex-1 ${
              mobileChatOpen
                ? "block"
                : "hidden md:block"
            }`}
          >
            {mobileChatOpen && (
              <div className="border-b border-gray-200 bg-white px-3 py-2 md:hidden">
                <button
                  type="button"
                  onClick={handleBackToConversations}
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-[#8B1E3F]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="m15 18-6-6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  Conversations
                </button>
              </div>
            )}

            <div className="h-[calc(100vh-150px)] min-h-[500px]">
              <ChatWindow
                conversation={
                  conversation ||
                  selectedConversation
                }
                messages={messages}
                currentUserId={
                  conversation?.customerId || ""
                }
                onSendMessage={
                  handleSendMessage
                }
                onRetryMessage={
                  handleRetryMessage
                }
                loading={messagesLoading}
                sending={sending}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}