import {
  getConversationKey,
  getOrCreateConversation,
  supabase,
} from "./supabase";

import type {
  MessagingConversation,
} from "@/app/components/messaging/types";

import {
  decryptMessage,
} from "./messages";

type ConversationRow = {
  id: string;
  customer_id: string;
  business_id: string;
  created_at: string;
  updated_at: string;
};

type BusinessRow = {
  id: string;
  name: string;
  logo_url: string | null;
  owner_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  ciphertext: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("You must be logged in.");

  return user.id;
}

async function getLatestMessage(
  conversationId: string
): Promise<MessageRow | null> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, ciphertext, created_at, edited_at, deleted_at"
    )
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  return data?.[0] ? (data[0] as MessageRow) : null;
}

export async function getMyConversations(): Promise<MessagingConversation[]> {
  const userId = await getCurrentUserId();

  const { data: ownedBusinesses, error: ownedBusinessesError } =
    await supabase
      .from("businesses")
      .select("id, name, logo_url, owner_id")
      .eq("owner_id", userId);

  if (ownedBusinessesError) throw ownedBusinessesError;

  const businessesOwnedByUser = (ownedBusinesses ?? []) as BusinessRow[];
  const ownedBusinessIds = businessesOwnedByUser.map(
    (business) => business.id
  );

  const isBusinessOwner = ownedBusinessIds.length > 0;

  let conversations: ConversationRow[] = [];

  if (isBusinessOwner) {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        "id, customer_id, business_id, created_at, updated_at"
      )
      .in("business_id", ownedBusinessIds)
      .neq("customer_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    conversations = (data ?? []) as ConversationRow[];
  } else {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        "id, customer_id, business_id, created_at, updated_at"
      )
      .eq("customer_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    conversations = (data ?? []) as ConversationRow[];
  }

  if (conversations.length === 0) {
    return [];
  }

  const conversationEntries = await Promise.all(
    conversations.map(async (conversation) => ({
      conversation,
      latestMessage: await getLatestMessage(conversation.id),
    }))
  );

  const visibleConversationEntries = isBusinessOwner
    ? conversationEntries.filter(({ latestMessage }) => latestMessage !== null)
    : conversationEntries;

  if (visibleConversationEntries.length === 0) {
    return [];
  }

  const visibleConversations = visibleConversationEntries.map(
    ({ conversation }) => conversation
  );

  const businessIds = Array.from(
    new Set(
      visibleConversations.map(
        (conversation) => conversation.business_id
      )
    )
  );

  const customerIds = Array.from(
    new Set(
      visibleConversations.map(
        (conversation) => conversation.customer_id
      )
    )
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

  if (businessResult.error) throw businessResult.error;
  if (profileResult.error) throw profileResult.error;

  const businesses = (businessResult.data ?? []) as BusinessRow[];
  const profiles = (profileResult.data ?? []) as ProfileRow[];

  const businessMap = new Map(
    businesses.map((business) => [business.id, business])
  );

  const profileMap = new Map(
    profiles.map((profile) => [profile.id, profile])
  );

  const latestMessageMap = new Map(
    visibleConversationEntries.map(
      ({ conversation, latestMessage }) => [
        conversation.id,
        latestMessage,
      ]
    )
  );

  const result = await Promise.all(
    visibleConversations.map(
      async (
        conversation
      ): Promise<MessagingConversation | null> => {
        const business = businessMap.get(conversation.business_id);

        if (!business) {
          return null;
        }

        const customer = profileMap.get(conversation.customer_id);

        const customerName =
          customer?.full_name?.trim() || "Customer";

        const latestMessage =
          latestMessageMap.get(conversation.id) ?? null;

        let lastMessage: string | undefined;
        let lastMessageAt: string | undefined;

        if (latestMessage) {
          lastMessageAt = latestMessage.created_at;

          try {
            const key = await getConversationKey(
              conversation.id
            );

            lastMessage = await decryptMessage(
              latestMessage.ciphertext,
              key
            );
          } catch {
            lastMessage = "Encrypted message";
          }
        }

        return {
          id: conversation.id,
          customerId: conversation.customer_id,
          businessId: conversation.business_id,
          businessOwnerId: business.owner_id,
          businessName: business.name,
          businessLogoUrl: business.logo_url,
          customerName,
          customerAvatarUrl: null,
          lastMessage,
          lastMessageAt,
          unreadCount: 0,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
        };
      }
    )
  );

  return result
    .filter(
      (
        conversation
      ): conversation is MessagingConversation =>
        conversation !== null
    )
    .sort(
      (a, b) =>
        new Date(
          b.lastMessageAt || b.updatedAt
        ).getTime() -
        new Date(
          a.lastMessageAt || a.updatedAt
        ).getTime()
    );
}

export async function prepareMessagingIdentity(): Promise<void> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("You must be logged in.");

  const { ensureUserEncryptionKey } =
    await import("./supabase");

  await ensureUserEncryptionKey();
}

export async function openBusinessConversation(
  businessId: string
): Promise<MessagingConversation> {
  await prepareMessagingIdentity();

  const conversation =
    await getOrCreateConversation(businessId);

  const { data: businessRows, error } = await supabase
    .from("businesses")
    .select("id, name, logo_url, owner_id")
    .eq("id", businessId)
    .limit(1);

  if (error) throw error;

  const business = businessRows?.[0] as BusinessRow | undefined;

  if (!business) {
    throw new Error(
      "Business could not be found or is not available."
    );
  }

  if (!business.owner_id) {
    throw new Error(
      "Unable to determine the business owner."
    );
  }

  return {
    id: conversation.id,
    customerId: conversation.customer_id,
    businessId: conversation.business_id,
    businessOwnerId: business.owner_id,
    businessName: business.name,
    businessLogoUrl: business.logo_url,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  };
}

export async function loadConversationKey(
  conversationId: string
): Promise<CryptoKey> {
  await prepareMessagingIdentity();

  return getConversationKey(conversationId);
}