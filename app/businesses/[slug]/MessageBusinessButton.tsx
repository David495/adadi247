"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";

import { createClient } from "@/app/lib/supabase/client";
import { getOrCreateConversation } from "@/app/lib/e2ee/supabase";
import { initializeConversationKeys } from "@/app/lib/e2ee/initializeConversationKeys";

type MessageBusinessButtonProps = {
  businessId: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;

    if (
      typeof value.message === "string" &&
      value.message
    ) {
      return value.message;
    }

    if (typeof value.error_description === "string") {
      return value.error_description;
    }

    if (typeof value.details === "string") {
      return value.details;
    }

    if (typeof value.hint === "string") {
      return value.hint;
    }

    if (typeof value.code === "string") {
      return `Database error (${value.code})`;
    }

    try {
      const serialized = JSON.stringify(error);

      if (serialized && serialized !== "{}") {
        return serialized;
      }
    } catch {
      // Ignore serialization errors.
    }
  }

  return "Unable to start the conversation. Please try again.";
}

export default function MessageBusinessButton({
  businessId,
}: MessageBusinessButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMessageBusiness() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(
        "[ADADI Messaging] Starting conversation..."
      );
      console.log(
        "[ADADI Messaging] Business ID:",
        businessId
      );

      const supabase = createClient();

      console.log(
        "[ADADI Messaging] Checking authenticated user..."
      );

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "[ADADI Messaging] Auth error:",
          userError
        );

        throw userError;
      }

      if (!user) {
        setError(
          "You must be logged in to message a business."
        );
        return;
      }

      console.log(
        "[ADADI Messaging] Authenticated user:",
        user.id
      );

      console.log(
        "[ADADI Messaging] Getting or creating conversation..."
      );

      let conversation;

      try {
        conversation = await getOrCreateConversation(
          businessId
        );
      } catch (conversationError) {
        console.error(
          "[ADADI Messaging] Conversation error:",
          conversationError
        );

        console.error(
          "[ADADI Messaging] Conversation error JSON:",
          JSON.stringify(
            conversationError,
            null,
            2
          )
        );

        throw conversationError;
      }

      console.log(
        "[ADADI Messaging] Conversation:",
        conversation
      );

      console.log(
        "[ADADI Messaging] Initializing encryption keys..."
      );

      try {
        await initializeConversationKeys(
          conversation.id
        );
      } catch (keyError) {
        console.error(
          "[ADADI Messaging] Encryption key error:",
          keyError
        );

        console.error(
          "[ADADI Messaging] Encryption key error JSON:",
          JSON.stringify(keyError, null, 2)
        );

        throw keyError;
      }

      console.log(
        "[ADADI Messaging] Conversation ready."
      );

      router.push(
        `/customer/dashboard/messages?conversation=${encodeURIComponent(
          conversation.id
        )}`
      );
    } catch (err) {
      const message = getErrorMessage(err);

      console.error(
        "[ADADI Messaging] Unable to open business conversation:",
        err
      );

      console.error(
        "[ADADI Messaging] Extracted error:",
        message
      );

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-7">
      <button
        type="button"
        onClick={handleMessageBusiness}
        disabled={loading}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#6b1224] shadow-lg ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#fffafa] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Opening chat...
          </>
        ) : (
          <>
            <MessageCircle className="h-5 w-5" />
            Message Business
          </>
        )}
      </button>

      {error && (
        <div className="mt-3 max-w-xl rounded-xl border border-red-300/30 bg-red-950/40 px-4 py-3 text-sm leading-6 text-white">
          <p className="font-semibold">
            Unable to open chat
          </p>

          <p className="mt-1 break-words text-white/90">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}