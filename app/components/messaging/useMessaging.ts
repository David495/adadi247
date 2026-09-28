"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  clearConversationMessages,
  deleteMessage as deleteMessageFromDatabase,
  getConversation,
  getMessages,
  sendMessage as sendMessageToDatabase,
  subscribeToMessages,
  unsubscribeFromMessages,
  supabase,
} from "@/app/lib/messaging/supabase";

import type {
  MessagingConversation,
  MessagingMessage,
} from "./types";

type UseMessagingResult = {
  conversation: MessagingConversation | null;
  messages: MessagingMessage[];
  loading: boolean;
  sending: boolean;
  deletingMessageId: string | null;
  clearingChat: boolean;
  recovering: boolean;
  syncing: boolean;
  error: string | null;
  sendMessage: (plaintext: string) => Promise<void>;
  retryMessage: (message: MessagingMessage) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  clearChat: () => Promise<void>;
  recoverConversation: (password: string) => Promise<void>;
  syncConversationEncryption: (password: string) => Promise<void>;
  refresh: () => Promise<void>;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "Something went wrong.";
}

function createTemporaryMessage(
  conversationId: string,
  senderId: string,
  plaintext: string
): MessagingMessage {
  return {
    id: `temporary-${crypto.randomUUID()}`,
    conversationId,
    senderId,
    plaintext,
    createdAt: new Date().toISOString(),
    editedAt: null,
    deletedAt: null,
    status: "sending",
  };
}

function convertMessage(
  message: {
    id: string;
    conversation_id: string;
    sender_id: string;
    plaintext: string | null;
    created_at: string;
    edited_at: string | null;
    deleted_at: string | null;
  },
  status: MessagingMessage["status"]
): MessagingMessage {
  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    plaintext:
      message.plaintext ??
      "Older encrypted message",
    createdAt: message.created_at,
    editedAt: message.edited_at,
    deletedAt: message.deleted_at,
    status,
  };
}

export function useMessaging(
  conversationId: string | null
): UseMessagingResult {
  const [conversation, setConversation] =
    useState<MessagingConversation | null>(null);
  const [messages, setMessages] =
    useState<MessagingMessage[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [sending, setSending] =
    useState(false);
  const [deletingMessageId, setDeletingMessageId] =
    useState<string | null>(null);
  const [clearingChat, setClearingChat] =
    useState(false);
  const [recovering] = useState(false);
  const [syncing] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const currentUserIdRef =
    useRef<string | null>(null);
  const mountedRef =
    useRef(true);

  const loadConversation = useCallback(async () => {
    const activeConversationId = conversationId;

    if (!activeConversationId) {
      setConversation(null);
      setMessages([]);
      currentUserIdRef.current = null;
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "You must be logged in to message a business."
        );
      }

      currentUserIdRef.current = user.id;

      const dbConversation =
        await getConversation(activeConversationId);

      const messagesFromDatabase =
        await getMessages(activeConversationId);

      if (!mountedRef.current) {
        return;
      }

      const isCustomer =
        dbConversation.customer_id === user.id;

      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("id, name, logo_url, owner_id")
        .eq("id", dbConversation.business_id)
        .limit(1)
        .maybeSingle();

      if (businessError) {
        throw businessError;
      }

      if (!business) {
        throw new Error(
          "Business could not be found or is not available."
        );
      }

      let customerName: string | undefined;
      let customerAvatarUrl:
        | string
        | null
        | undefined;

      if (!isCustomer) {
        const {
          data: customer,
          error: customerError,
        } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", dbConversation.customer_id)
          .limit(1)
          .maybeSingle();

        if (customerError) {
          throw customerError;
        }

        customerName =
          customer?.full_name || "Customer";
        customerAvatarUrl = null;
      }

      const visibleMessages =
        messagesFromDatabase.filter(
          (message) =>
            message.plaintext !== null ||
            message.ciphertext !== null
        );

      const lastMessage =
        visibleMessages[visibleMessages.length - 1];

      const nextConversation: MessagingConversation = {
        id: dbConversation.id,
        customerId: dbConversation.customer_id,
        businessId: dbConversation.business_id,
        businessOwnerId: business.owner_id || "",
        businessName: business.name || undefined,
        businessLogoUrl: business.logo_url || null,
        customerName,
        customerAvatarUrl,
        lastMessage:
          lastMessage?.plaintext ??
          (lastMessage?.ciphertext
            ? "Older encrypted message"
            : undefined),
        lastMessageAt:
          lastMessage?.created_at,
        unreadCount: 0,
        createdAt: dbConversation.created_at,
        updatedAt: dbConversation.updated_at,
      };

      setConversation(nextConversation);
      setMessages(
        visibleMessages.map((message) =>
          convertMessage(message, "sent")
        )
      );
    } catch (loadError) {
      if (!mountedRef.current) {
        return;
      }

      setConversation(null);
      setMessages([]);
      setError(getErrorMessage(loadError));
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    mountedRef.current = true;
    void loadConversation();

    return () => {
      mountedRef.current = false;
    };
  }, [loadConversation]);

  useEffect(() => {
    const activeConversationId = conversationId;

    if (!activeConversationId) {
      return;
    }

    let channel:
      | ReturnType<typeof supabase.channel>
      | null = null;
    let cancelled = false;

    async function subscribe() {
      try {
        channel = await subscribeToMessages(
          activeConversationId,
          (incomingMessage, event) => {
            if (cancelled) {
              return;
            }

            if (event === "UPDATE") {
              if (incomingMessage.deleted_at) {
                setMessages((currentMessages) =>
                  currentMessages.filter(
                    (message) =>
                      message.id !== incomingMessage.id
                  )
                );
              }

              return;
            }

            if (
              incomingMessage.sender_id ===
              currentUserIdRef.current
            ) {
              return;
            }

            if (!incomingMessage.plaintext) {
              return;
            }

            const nextMessage =
              convertMessage(
                incomingMessage,
                "sent"
              );

            setMessages((currentMessages) => {
              if (
                currentMessages.some(
                  (message) =>
                    message.id === nextMessage.id
                )
              ) {
                return currentMessages;
              }

              return [
                ...currentMessages,
                nextMessage,
              ].sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()
              );
            });

            setConversation(
              (currentConversation) =>
                currentConversation
                  ? {
                      ...currentConversation,
                      lastMessage:
                        nextMessage.plaintext,
                      lastMessageAt:
                        nextMessage.createdAt,
                      updatedAt:
                        nextMessage.createdAt,
                    }
                  : currentConversation
            );
          }
        );
      } catch (subscriptionError) {
        if (!cancelled) {
          setError(
            getErrorMessage(subscriptionError)
          );
        }
      }
    }

    void subscribe();

    return () => {
      cancelled = true;

      if (channel) {
        void unsubscribeFromMessages(channel);
      }
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (plaintext: string) => {
      const cleanMessage = plaintext.trim();

      if (!cleanMessage) {
        return;
      }

      const activeConversationId = conversationId;

      if (!activeConversationId) {
        throw new Error(
          "Conversation ID is required."
        );
      }

      const senderId =
        currentUserIdRef.current;

      if (!senderId) {
        throw new Error(
          "You must be logged in to message a business."
        );
      }

      const temporaryMessage =
        createTemporaryMessage(
          activeConversationId,
          senderId,
          cleanMessage
        );

      setMessages((currentMessages) => [
        ...currentMessages,
        temporaryMessage,
      ]);

      setSending(true);
      setError(null);

      try {
        const savedMessage =
          await sendMessageToDatabase(
            activeConversationId,
            cleanMessage
          );

        if (!mountedRef.current) {
          return;
        }

        const nextMessage =
          convertMessage(
            savedMessage,
            "sent"
          );

        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === temporaryMessage.id
              ? nextMessage
              : message
          )
        );

        setConversation(
          (currentConversation) =>
            currentConversation
              ? {
                  ...currentConversation,
                  lastMessage: cleanMessage,
                  lastMessageAt:
                    savedMessage.created_at,
                  updatedAt:
                    savedMessage.created_at,
                }
              : currentConversation
        );
      } catch (sendError) {
        if (!mountedRef.current) {
          return;
        }

        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === temporaryMessage.id
              ? {
                  ...message,
                  status: "failed",
                }
              : message
          )
        );

        setError(getErrorMessage(sendError));
        throw sendError;
      } finally {
        if (mountedRef.current) {
          setSending(false);
        }
      }
    },
    [conversationId]
  );

  const retryMessage = useCallback(
    async (message: MessagingMessage) => {
      if (message.status !== "failed") {
        return;
      }

      setError(null);

      setMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === message.id
            ? {
                ...currentMessage,
                status: "sending",
              }
            : currentMessage
        )
      );

      setSending(true);

      try {
        const savedMessage =
          await sendMessageToDatabase(
            message.conversationId,
            message.plaintext
          );

        if (!mountedRef.current) {
          return;
        }

        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === message.id
              ? convertMessage(
                  savedMessage,
                  "sent"
                )
              : currentMessage
          )
        );

        setConversation(
          (currentConversation) =>
            currentConversation
              ? {
                  ...currentConversation,
                  lastMessage:
                    message.plaintext,
                  lastMessageAt:
                    savedMessage.created_at,
                  updatedAt:
                    savedMessage.created_at,
                }
              : currentConversation
        );
      } catch (retryError) {
        if (!mountedRef.current) {
          return;
        }

        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === message.id
              ? {
                  ...currentMessage,
                  status: "failed",
                }
              : currentMessage
          )
        );

        setError(getErrorMessage(retryError));
        throw retryError;
      } finally {
        if (mountedRef.current) {
          setSending(false);
        }
      }
    },
    []
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) {
        throw new Error(
          "Conversation ID is required."
        );
      }

      const currentUserId =
        currentUserIdRef.current;

      if (!currentUserId) {
        throw new Error(
          "You must be logged in."
        );
      }

      const targetMessage =
        messages.find(
          (message) => message.id === messageId
        );

      if (!targetMessage) {
        throw new Error("Message not found.");
      }

      if (
        targetMessage.senderId !== currentUserId
      ) {
        throw new Error(
          "You can only delete your own messages."
        );
      }

      if (messageId.startsWith("temporary-")) {
        return;
      }

      setDeletingMessageId(messageId);
      setError(null);

      try {
        await deleteMessageFromDatabase(messageId);

        if (!mountedRef.current) {
          return;
        }

        setMessages((currentMessages) =>
          currentMessages.filter(
            (message) => message.id !== messageId
          )
        );

        await loadConversation();
      } catch (deleteError) {
        if (!mountedRef.current) {
          return;
        }

        setError(getErrorMessage(deleteError));
        throw deleteError;
      } finally {
        if (mountedRef.current) {
          setDeletingMessageId(null);
        }
      }
    },
    [conversationId, messages, loadConversation]
  );

  const clearChat = useCallback(async () => {
    if (!conversationId) {
      throw new Error(
        "Conversation ID is required."
      );
    }

    setClearingChat(true);
    setError(null);

    try {
      await clearConversationMessages(
        conversationId
      );

      if (!mountedRef.current) {
        return;
      }

      setMessages([]);
      setConversation((currentConversation) =>
        currentConversation
          ? {
              ...currentConversation,
              lastMessage: undefined,
              lastMessageAt: undefined,
            }
          : currentConversation
      );
    } catch (clearError) {
      if (!mountedRef.current) {
        return;
      }

      setError(getErrorMessage(clearError));
      throw clearError;
    } finally {
      if (mountedRef.current) {
        setClearingChat(false);
      }
    }
  }, [conversationId]);

  const recoverConversation = useCallback(
    async (_password: string) => {
      throw new Error(
        "Secure messaging recovery is no longer required. Please refresh the chat."
      );
    },
    []
  );

  const syncConversationEncryption = useCallback(
    async (_password: string) => {
      throw new Error(
        "Secure messaging synchronization is no longer required."
      );
    },
    []
  );

  const refresh = useCallback(async () => {
    await loadConversation();
  }, [loadConversation]);

  return {
    conversation,
    messages,
    loading,
    sending,
    deletingMessageId,
    clearingChat,
    recovering,
    syncing,
    error,
    sendMessage,
    retryMessage,
    deleteMessage,
    clearChat,
    recoverConversation,
    syncConversationEncryption,
    refresh,
  };
}
