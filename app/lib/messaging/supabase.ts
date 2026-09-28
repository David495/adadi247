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


export async function getMyConversations(): Promise<
  import("@/app/components/messaging/types").MessagingConversation[]
> {
  const userId = await getCurrentUserId();

  const { data: conversationRows, error: conversationsError } =
    await supabase
      .from("conversations")
      .select(
        "id, customer_id, business_id, created_at, updated_at"
      )
      .order("updated_at", { ascending: false });

  if (conversationsError) {
    throw conversationsError;
  }

  const rows = (conversationRows ?? []) as Conversation[];

  if (rows.length === 0) {
    return [];
  }

  const businessIds = Array.from(
    new Set(rows.map((conversation) => conversation.business_id))
  );

  const customerIds = Array.from(
    new Set(rows.map((conversation) => conversation.customer_id))
  );

  const [businessResult, profileResult] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, logo_url, owner_id")
      .in("id", businessIds),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", customerIds),
  ]);

  if (businessResult.error) {
    throw businessResult.error;
  }

  if (profileResult.error) {
    throw profileResult.error;
  }

  const businessMap = new Map(
    (businessResult.data ?? []).map((business) => [
      business.id,
      business,
    ])
  );

  const profileMap = new Map(
    (profileResult.data ?? []).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const conversationsForUser = rows.filter((conversation) => {
    const business = businessMap.get(conversation.business_id);

    return (
      conversation.customer_id === userId ||
      business?.owner_id === userId
    );
  });

  const result = await Promise.all(
    conversationsForUser.map(async (conversation) => {
      const business = businessMap.get(conversation.business_id);

      if (!business) {
        return null;
      }

      const customer = profileMap.get(conversation.customer_id);

      const { data: latestMessage, error: latestMessageError } =
        await supabase
          .from("messages")
          .select(
            "plaintext, ciphertext, created_at"
          )
          .eq("conversation_id", conversation.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (latestMessageError) {
        throw latestMessageError;
      }

      return {
        id: conversation.id,
        customerId: conversation.customer_id,
        businessId: conversation.business_id,
        businessOwnerId: business.owner_id,
        businessName: business.name,
        businessLogoUrl: business.logo_url,
        customerName:
          customer?.full_name?.trim() || "Customer",
        customerAvatarUrl: null,
        lastMessage:
          latestMessage?.plaintext ??
          (latestMessage?.ciphertext
            ? "Older encrypted message"
            : undefined),
        lastMessageAt: latestMessage?.created_at,
        unreadCount: 0,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      } satisfies import("@/app/components/messaging/types").MessagingConversation;
    })
  );

  return result
    .filter(
      (
        conversation
      ): conversation is import("@/app/components/messaging/types").MessagingConversation =>
        conversation !== null
    )
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt || b.updatedAt).getTime() -
        new Date(a.lastMessageAt || a.updatedAt).getTime()
    );
}
