"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getMyConversations,
} from "../../lib/e2ee/conversations";
import type {
  MessagingConversation,
} from "./types";

type UseConversationsResult = {
  conversations: MessagingConversation[];
  loading: boolean;
  error: string | null;
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
      error as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "Something went wrong.";
}

export function useConversations(): UseConversationsResult {
  const [
    conversations,
    setConversations,
  ] = useState<MessagingConversation[]>(
    []
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const mountedRef =
    useRef(true);

  const loadConversations =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const data =
          await getMyConversations();

        if (!mountedRef.current) {
          return;
        }

        setConversations(data);
      } catch (loadError) {
        if (!mountedRef.current) {
          return;
        }

        setConversations([]);
        setError(
          getErrorMessage(loadError)
        );
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, []);

  useEffect(() => {
    mountedRef.current = true;

    void loadConversations();

    return () => {
      mountedRef.current = false;
    };
  }, [loadConversations]);

  const refresh = useCallback(
    async () => {
      await loadConversations();
    },
    [loadConversations]
  );

  return {
    conversations,
    loading,
    error,
    refresh,
  };
}