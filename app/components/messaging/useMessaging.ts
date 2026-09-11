"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getConversation,
  getMessages,
  sendEncryptedMessage,
  subscribeToMessages,
  unsubscribeFromMessages,
  supabase,
} from "@/app/lib/e2ee/supabase";
import {
  initializeConversationKeys,
} from "@/app/lib/e2ee/initializeConversationKeys";
import type {
  MessagingConversation,
  MessagingMessage,
} from "./types";

type UseMessagingResult = {
  conversation: MessagingConversation | null;
  messages: MessagingMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendMessage: (plaintext: string) => Promise<void>;
  retryMessage: (
    message: MessagingMessage
  ) => Promise<void>;
  refresh: () => Promise<void>;
};

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (
      error as { message?: unknown }
    ).message;

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
    plaintext: string;
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
    plaintext: message.plaintext,
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

  const [messages, setMessages] = useState<
    MessagingMessage[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const conversationKeyRef =
    useRef<CryptoKey | null>(null);

  const currentUserIdRef =
    useRef<string | null>(null);

  const mountedRef =
    useRef(true);

  const loadConversation =
    useCallback(async () => {
      const activeConversationId =
        conversationId;

      if (activeConversationId === null) {
        setConversation(null);
        setMessages([]);
        conversationKeyRef.current = null;
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const {
          data: {
            user,
          },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            "You must be logged in."
          );
        }

        currentUserIdRef.current =
          user.id;

        const dbConversation =
          await getConversation(
            activeConversationId
          );

        const {
          key,
        } =
          await initializeConversationKeys(
            activeConversationId
          );

        conversationKeyRef.current = key;

        const decryptedMessages =
          await getMessages(
            activeConversationId,
            key
          );

        if (!mountedRef.current) {
          return;
        }

        const isCustomer =
          dbConversation.customer_id ===
          user.id;

        const {
          data: business,
          error: businessError,
        } = await supabase
          .from("businesses")
          .select(
            "id, name, logo_url, owner_id"
          )
          .eq(
            "id",
            dbConversation.business_id
          )
          .single();

        if (businessError) {
          throw businessError;
        }

        let customerName:
          | string
          | undefined;

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
            .select(
              "id, full_name"
            )
            .eq(
              "id",
              dbConversation.customer_id
            )
            .single();

          if (customerError) {
            throw customerError;
          }

          customerName =
            customer?.full_name ||
            "Customer";

          customerAvatarUrl = null;
        }

        const lastMessage =
          decryptedMessages[
            decryptedMessages.length - 1
          ];

        const nextConversation: MessagingConversation =
          {
            id: dbConversation.id,
            customerId:
              dbConversation.customer_id,
            businessId:
              dbConversation.business_id,
            businessOwnerId:
              business?.owner_id ||
              "",
            businessName:
              business?.name ||
              undefined,
            businessLogoUrl:
              business?.logo_url ||
              null,
            customerName,
            customerAvatarUrl,
            lastMessage:
              lastMessage?.plaintext,
            lastMessageAt:
              lastMessage?.created_at,
            unreadCount: 0,
            createdAt:
              dbConversation.created_at,
            updatedAt:
              dbConversation.updated_at,
          };

        const nextMessages: MessagingMessage[] =
          decryptedMessages.map(
            (message) =>
              convertMessage(
                message,
                "sent"
              )
          );

        setConversation(
          nextConversation
        );

        setMessages(nextMessages);
      } catch (loadError) {
        if (!mountedRef.current) {
          return;
        }

        setError(
          getErrorMessage(loadError)
        );
        setConversation(null);
        setMessages([]);
        conversationKeyRef.current =
          null;
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
      conversationKeyRef.current =
        null;
    };
  }, [loadConversation]);

  useEffect(() => {
    const activeConversationId =
      conversationId;

    if (activeConversationId === null) {
      return;
    }

    const conversationIdForSubscription: string =
      activeConversationId;

    let channel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    let cancelled = false;

    async function subscribe() {
      try {
        channel =
          await subscribeToMessages(
            conversationIdForSubscription,
            async (incomingMessage) => {
              if (cancelled) {
                return;
              }

              if (
                incomingMessage.sender_id ===
                currentUserIdRef.current
              ) {
                return;
              }

              const key =
                conversationKeyRef.current;

              if (!key) {
                return;
              }

              try {
                const {
                  decryptMessage,
                } = await import(
                  "@/app/lib/e2ee/messages"
                );

                const plaintext =
                  await decryptMessage(
                    incomingMessage.ciphertext,
                    key
                  );

                if (cancelled) {
                  return;
                }

                setMessages(
                  (currentMessages) => {
                    const exists =
                      currentMessages.some(
                        (message) =>
                          message.id ===
                          incomingMessage.id
                      );

                    if (exists) {
                      return currentMessages;
                    }

                    const nextMessage: MessagingMessage =
                      {
                        id:
                          incomingMessage.id,
                        conversationId:
                          incomingMessage.conversation_id,
                        senderId:
                          incomingMessage.sender_id,
                        plaintext,
                        createdAt:
                          incomingMessage.created_at,
                        editedAt:
                          incomingMessage.edited_at,
                        deletedAt:
                          incomingMessage.deleted_at,
                        status: "sent",
                      };

                    return [
                      ...currentMessages,
                      nextMessage,
                    ].sort(
                      (a, b) =>
                        new Date(
                          a.createdAt
                        ).getTime() -
                        new Date(
                          b.createdAt
                        ).getTime()
                    );
                  }
                );

                setConversation(
                  (currentConversation) =>
                    currentConversation
                      ? {
                          ...currentConversation,
                          lastMessage:
                            plaintext,
                          lastMessageAt:
                            incomingMessage.created_at,
                          updatedAt:
                            incomingMessage.created_at,
                        }
                      : currentConversation
                );
              } catch {
                setError(
                  "A new message could not be decrypted."
                );
              }
            }
          );
      } catch (subscriptionError) {
        if (!cancelled) {
          setError(
            getErrorMessage(
              subscriptionError
            )
          );
        }
      }
    }

    void subscribe();

    return () => {
      cancelled = true;

      if (channel) {
        void unsubscribeFromMessages(
          channel
        );
      }
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (plaintext: string) => {
      const cleanMessage =
        plaintext.trim();

      if (!cleanMessage) {
        return;
      }

      const activeConversationId =
        conversationId;

      if (activeConversationId === null) {
        throw new Error(
          "Conversation ID is required."
        );
      }

      const conversationKey =
        conversationKeyRef.current;

      const senderId =
        currentUserIdRef.current;

      if (!conversationKey) {
        throw new Error(
          "The conversation encryption key is not ready."
        );
      }

      if (!senderId) {
        throw new Error(
          "You must be logged in."
        );
      }

      const temporaryMessage =
        createTemporaryMessage(
          activeConversationId,
          senderId,
          cleanMessage
        );

      setMessages(
        (currentMessages) => [
          ...currentMessages,
          temporaryMessage,
        ]
      );

      setSending(true);
      setError(null);

      try {
        const savedMessage =
          await sendEncryptedMessage(
            activeConversationId,
            cleanMessage,
            conversationKey
          );

        if (!mountedRef.current) {
          return;
        }

        setMessages(
          (currentMessages) =>
            currentMessages.map(
              (message) =>
                message.id ===
                temporaryMessage.id
                  ? {
                      id: savedMessage.id,
                      conversationId:
                        savedMessage.conversation_id,
                      senderId:
                        savedMessage.sender_id,
                      plaintext:
                        cleanMessage,
                      createdAt:
                        savedMessage.created_at,
                      editedAt:
                        savedMessage.edited_at,
                      deletedAt:
                        savedMessage.deleted_at,
                      status: "sent",
                    }
                  : message
            )
        );

        setConversation(
          (currentConversation) =>
            currentConversation
              ? {
                  ...currentConversation,
                  lastMessage:
                    cleanMessage,
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

        setMessages(
          (currentMessages) =>
            currentMessages.map(
              (message) =>
                message.id ===
                temporaryMessage.id
                  ? {
                      ...message,
                      status: "failed",
                    }
                  : message
            )
        );

        setError(
          getErrorMessage(sendError)
        );

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
    async (
      message: MessagingMessage
    ) => {
      if (
        message.status !== "failed"
      ) {
        return;
      }

      const conversationKey =
        conversationKeyRef.current;

      if (!conversationKey) {
        throw new Error(
          "The conversation encryption key is not ready."
        );
      }

      setError(null);

      setMessages(
        (currentMessages) =>
          currentMessages.map(
            (currentMessage) =>
              currentMessage.id ===
              message.id
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
          await sendEncryptedMessage(
            message.conversationId,
            message.plaintext,
            conversationKey
          );

        if (!mountedRef.current) {
          return;
        }

        setMessages(
          (currentMessages) =>
            currentMessages.map(
              (currentMessage) =>
                currentMessage.id ===
                message.id
                  ? {
                      id: savedMessage.id,
                      conversationId:
                        savedMessage.conversation_id,
                      senderId:
                        savedMessage.sender_id,
                      plaintext:
                        message.plaintext,
                      createdAt:
                        savedMessage.created_at,
                      editedAt:
                        savedMessage.edited_at,
                      deletedAt:
                        savedMessage.deleted_at,
                      status: "sent",
                    }
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

        setMessages(
          (currentMessages) =>
            currentMessages.map(
              (currentMessage) =>
                currentMessage.id ===
                message.id
                  ? {
                      ...currentMessage,
                      status: "failed",
                    }
                  : currentMessage
            )
        );

        setError(
          getErrorMessage(retryError)
        );

        throw retryError;
      } finally {
        if (mountedRef.current) {
          setSending(false);
        }
      }
    },
    []
  );

  const refresh = useCallback(
    async () => {
      await loadConversation();
    },
    [loadConversation]
  );

  return {
    conversation,
    messages,
    loading,
    sending,
    error,
    sendMessage,
    retryMessage,
    refresh,
  };
}