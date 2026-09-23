"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import ConversationList from "@/app/components/messaging/ConversationList";
import ChatWindow from "@/app/components/messaging/ChatWindow";
import { useConversations } from "@/app/components/messaging/useConversations";
import { useMessaging } from "@/app/components/messaging/useMessaging";
import type { MessagingConversation } from "@/app/components/messaging/types";

function CustomerMessagesContent() {
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

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] =
    useState<string | null>(
      requestedConversationId
    );

  const [mobileChatOpen, setMobileChatOpen] =
    useState(
      Boolean(requestedConversationId)
    );

  const [recoveryPassword, setRecoveryPassword] =
    useState("");

  const [
    showRecoveryPassword,
    setShowRecoveryPassword,
  ] = useState(false);

  const [syncPassword, setSyncPassword] =
    useState("");

  const [
    showSyncPassword,
    setShowSyncPassword,
  ] = useState(false);

  const [
    showSyncPanel,
    setShowSyncPanel,
  ] = useState(false);

  const selectedConversation =
    useMemo(
      () =>
        conversations.find(
          (conversation) =>
            conversation.id ===
            selectedConversationId
        ) ?? null,
      [
        conversations,
        selectedConversationId,
      ]
    );

  const {
    conversation,
    messages,
    loading: messagesLoading,
    sending,
    recovering,
    syncing,
    error: messagingError,
    sendMessage,
    retryMessage,
    recoverConversation,
    syncConversationEncryption,
    refresh: refreshMessages,
  } = useMessaging(
    selectedConversationId
  );

  useEffect(() => {
    if (!requestedConversationId) {
      return;
    }

    const requestedConversationExists =
      conversations.some(
        (conversationItem) =>
          conversationItem.id ===
          requestedConversationId
      );

    if (requestedConversationExists) {
      setSelectedConversationId(
        requestedConversationId
      );

      setMobileChatOpen(true);
    }
  }, [
    requestedConversationId,
    conversations,
  ]);

  useEffect(() => {
    if (conversations.length === 0) {
      if (!requestedConversationId) {
        setSelectedConversationId(null);
        setMobileChatOpen(false);
      }

      return;
    }

    if (requestedConversationId) {
      const requestedConversationExists =
        conversations.some(
          (conversationItem) =>
            conversationItem.id ===
            requestedConversationId
        );

      if (requestedConversationExists) {
        return;
      }
    }

    const selectedStillExists =
      conversations.some(
        (conversationItem) =>
          conversationItem.id ===
          selectedConversationId
      );

    if (!selectedStillExists) {
      setSelectedConversationId(
        conversations[0].id
      );
    }
  }, [
    conversations,
    requestedConversationId,
    selectedConversationId,
  ]);

  useEffect(() => {
    setShowSyncPanel(false);
    setSyncPassword("");
    setShowSyncPassword(false);
  }, [selectedConversationId]);

  async function handleSelectConversation(
    nextConversation: MessagingConversation
  ) {
    setSelectedConversationId(
      nextConversation.id
    );

    setMobileChatOpen(true);

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    params.set(
      "conversation",
      nextConversation.id
    );

    router.replace(
      `${pathname}?${params.toString()}`,
      {
        scroll: false,
      }
    );
  }

  function handleBackToConversations() {
    setMobileChatOpen(false);

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    params.delete("conversation");

    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    router.replace(nextUrl, {
      scroll: false,
    });
  }

  async function handleSendMessage(
    plaintext: string
  ) {
    try {
      await sendMessage(plaintext);
      await refreshConversations();
    } catch {
      return;
    }
  }

  async function handleRetryMessage(
    message: Parameters<
      typeof retryMessage
    >[0]
  ) {
    try {
      await retryMessage(message);
      await refreshConversations();
    } catch {
      return;
    }
  }

  async function handleRecoverConversation() {
    const cleanPassword =
      recoveryPassword.trim();

    if (!cleanPassword) {
      return;
    }

    try {
      await recoverConversation(
        cleanPassword
      );

      setRecoveryPassword("");
      setShowRecoveryPassword(false);
    } catch {
      return;
    }
  }

  async function handleSyncEncryption() {
    const cleanPassword =
      syncPassword.trim();

    if (!cleanPassword) {
      return;
    }

    try {
      await syncConversationEncryption(
        cleanPassword
      );

      setSyncPassword("");
      setShowSyncPassword(false);
      setShowSyncPanel(false);
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
    conversationsError ||
    messagingError;

  const isConversationUnlockError =
    messagingError ===
    "This chat could not be unlocked on this device. Your existing encrypted messages were not changed.";

  const activeConversation =
    conversation ||
    selectedConversation;

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

          <div className="flex items-center gap-2">
            {conversation &&
              !isConversationUnlockError && (
                <button
                  type="button"
                  onClick={() =>
                    setShowSyncPanel(
                      (current) =>
                        !current
                    )
                  }
                  disabled={
                    syncing ||
                    recovering ||
                    messagesLoading
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#8B1E3F]/20 bg-white px-3 text-sm font-medium text-[#8B1E3F] shadow-sm transition hover:border-[#8B1E3F]/40 hover:bg-[#faf7f8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {syncing && (
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-[#8B1E3F]/30 border-t-[#8B1E3F]"
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
                      d="M20 7v5h-5M4 17v-5h5M5.3 9A7 7 0 0 1 18.7 7M18.7 15A7 7 0 0 1 5.3 17"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <span className="hidden sm:inline">
                    Sync Encryption
                  </span>

                  <span className="sm:hidden">
                    Sync
                  </span>
                </button>
              )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={
                conversationsLoading ||
                messagesLoading ||
                recovering ||
                syncing
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
        </div>

        {conversation &&
          !isConversationUnlockError &&
          showSyncPanel && (
            <div className="mb-4 rounded-xl border border-[#ead6dd] bg-white px-4 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8B1E3F]/10 text-[#8B1E3F]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M20 7v5h-5M4 17v-5h5M5.3 9A7 7 0 0 1 18.7 7M18.7 15A7 7 0 0 1 5.3 17"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Sync this conversation
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-gray-600">
                    This device already has the
                    conversation key. Sync it to
                    your current ADADI encryption
                    identity so the conversation can
                    be opened on another device.
                  </p>

                  <div className="mt-4 rounded-lg bg-[#faf7f8] p-3">
                    <label
                      htmlFor="conversation-sync-password"
                      className="block text-sm font-medium text-gray-800"
                    >
                      ADADI account password
                    </label>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Your password is only used to
                      unlock your encrypted identity.
                      It is not stored by the
                      messaging system.
                    </p>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <div className="relative flex-1">
                        <input
                          id="conversation-sync-password"
                          type={
                            showSyncPassword
                              ? "text"
                              : "password"
                          }
                          value={syncPassword}
                          onChange={(event) =>
                            setSyncPassword(
                              event.target.value
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key ===
                                "Enter" &&
                              syncPassword.trim() &&
                              !syncing
                            ) {
                              void handleSyncEncryption();
                            }
                          }}
                          placeholder="Enter your ADADI password"
                          autoComplete="current-password"
                          disabled={syncing}
                          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 pr-20 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowSyncPassword(
                              (current) =>
                                !current
                            )
                          }
                          disabled={syncing}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:text-[#8B1E3F] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {showSyncPassword
                            ? "Hide"
                            : "Show"}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={
                          handleSyncEncryption
                        }
                        disabled={
                          syncing ||
                          !syncPassword.trim()
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#8B1E3F] px-5 text-sm font-semibold text-white transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {syncing && (
                          <span
                            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                            aria-hidden="true"
                          />
                        )}

                        {syncing
                          ? "Syncing..."
                          : "Sync Encryption"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {isConversationUnlockError ? (
          <div className="mb-4 rounded-xl border border-[#ead6dd] bg-white px-4 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8B1E3F]/10 text-[#8B1E3F]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M12 15v2m-6-5V9a6 6 0 0 1 12 0v3m-9 0h6a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-gray-900">
                  This conversation needs to be recovered
                </h2>

                <p className="mt-1 text-sm leading-5 text-gray-600">
                  This device does not have the
                  encryption key needed to open this
                  conversation. If you have another
                  device where this conversation is
                  already working, use that device to
                  recover it.
                </p>

                <div className="mt-4 rounded-lg bg-[#faf7f8] p-3">
                  <label
                    htmlFor="conversation-recovery-password"
                    className="block text-sm font-medium text-gray-800"
                  >
                    ADADI account password
                  </label>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Your password is used only to
                    unlock your encrypted identity. It
                    is not stored by the messaging
                    system.
                  </p>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <input
                        id="conversation-recovery-password"
                        type={
                          showRecoveryPassword
                            ? "text"
                            : "password"
                        }
                        value={recoveryPassword}
                        onChange={(event) =>
                          setRecoveryPassword(
                            event.target.value
                          )
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key ===
                              "Enter" &&
                            recoveryPassword.trim() &&
                            !recovering
                          ) {
                            void handleRecoverConversation();
                          }
                        }}
                        placeholder="Enter your ADADI password"
                        autoComplete="current-password"
                        disabled={recovering}
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 pr-20 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowRecoveryPassword(
                            (current) =>
                              !current
                          )
                        }
                        disabled={recovering}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:text-[#8B1E3F] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {showRecoveryPassword
                          ? "Hide"
                          : "Show"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleRecoverConversation
                      }
                      disabled={
                        recovering ||
                        !recoveryPassword.trim()
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#8B1E3F] px-5 text-sm font-semibold text-white transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {recovering && (
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                          aria-hidden="true"
                        />
                      )}

                      {recovering
                        ? "Recovering..."
                        : "Recover Conversation"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          pageError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError}
            </div>
          )
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
                      {conversations.length ===
                      1
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
                conversations.length ===
                  0 ? (
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
                ) : conversations.length ===
                  0 ? (
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
                        Visit a business on ADADI and start a
                        conversation to see your messages here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <ConversationList
                    conversations={
                      conversations
                    }
                    selectedConversationId={
                      selectedConversationId
                    }
                    onSelectConversation={
                      handleSelectConversation
                    }
                    loading={
                      conversationsLoading
                    }
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
                  onClick={
                    handleBackToConversations
                  }
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
                  activeConversation
                }
                messages={messages}
                currentUserId={
                  conversation?.customerId ||
                  ""
                }
                onSendMessage={
                  handleSendMessage
                }
                onRetryMessage={
                  handleRetryMessage
                }
                loading={
                  messagesLoading
                }
                sending={sending}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function CustomerMessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAF8F6]">
          <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
            <span
              className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[#8B1E3F]"
              aria-hidden="true"
            />
          </div>
        </main>
      }
    >
      <CustomerMessagesContent />
    </Suspense>
  );
}