import { createClient } from "@/app/lib/supabase/client";

export const supabase = createClient();

export type Conversation = {
  id: string;
  customer_id: string;
  business_id: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  plaintext: string | null;
  ciphertext: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type MessageChangeEvent = "INSERT" | "UPDATE";

export async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user.id;
}

export async function getOrCreateConversation(
  businessId: string
): Promise<Conversation> {
  if (!businessId) {
    throw new Error("Business ID is required.");
  }

  await getCurrentUserId();

  const { data, error } = await supabase.rpc(
    "create_business_conversation",
    {
      p_business_id: businessId,
    }
  );

  if (error) {
    throw error;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error("Unable to create the conversation.");
    }

    return data[0] as Conversation;
  }

  if (!data) {
    throw new Error("Unable to create the conversation.");
  }

  return data as Conversation;
}

export async function getConversation(
  conversationId: string
): Promise<Conversation> {
  if (!conversationId) {
    throw new Error("Conversation ID is required.");
  }

  await getCurrentUserId();

  const { data, error } = await supabase
    .from("conversations")
    .select("id, customer_id, business_id, created_at, updated_at")
    .eq("id", conversationId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Conversation not found.");
  }

  return data as Conversation;
}

export async function sendMessage(
  conversationId: string,
  plaintext: string
): Promise<Message> {
  const cleanMessage = plaintext.trim();

  if (!conversationId) {
    throw new Error("Conversation ID is required.");
  }

  if (!cleanMessage) {
    throw new Error("Message cannot be empty.");
  }

  const senderId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      plaintext: cleanMessage,
      ciphertext: null,
    })
    .select(
      "id, conversation_id, sender_id, plaintext, ciphertext, created_at, edited_at, deleted_at"
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Unable to save the message.");
  }

  return data as Message;
}

export async function getMessages(
  conversationId: string
): Promise<Message[]> {
  if (!conversationId) {
    throw new Error("Conversation ID is required.");
  }

  await getCurrentUserId();

  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, plaintext, ciphertext, created_at, edited_at, deleted_at"
    )
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Message[];
}

export async function deleteMessage(
  messageId: string
): Promise<void> {
  if (!messageId) {
    throw new Error("Message ID is required.");
  }

  const { error } = await supabase.rpc("delete_message", {
    p_message_id: messageId,
  });

  if (error) {
    throw error;
  }
}

export async function clearConversationMessages(
  conversationId: string
): Promise<void> {
  if (!conversationId) {
    throw new Error("Conversation ID is required.");
  }

  const { error } = await supabase.rpc(
    "clear_conversation_messages",
    {
      p_conversation_id: conversationId,
    }
  );

  if (error) {
    throw error;
  }
}

export async function subscribeToMessages(
  conversationId: string,
  callback: (
    message: Message,
    event: MessageChangeEvent
  ) => void
) {
  const channel = supabase
    .channel(`conversation-messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new as Message, "INSERT");
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new as Message, "UPDATE");
      }
    )
    .subscribe();

  return channel;
}

export async function unsubscribeFromMessages(
  channel: ReturnType<typeof supabase.channel>
): Promise<void> {
  await supabase.removeChannel(channel);
}
