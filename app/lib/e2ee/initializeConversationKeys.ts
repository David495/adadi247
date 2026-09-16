import {
  getConversationKey,
  getConversationParticipantIds,
  supabase,
} from "./supabase";

type InitializeConversationKeysResult = {
  conversationId: string;
  key: CryptoKey;
  created: boolean;
};

async function getCurrentUserId(): Promise<string> {
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

export async function initializeConversationKeys(
  conversationId: string
): Promise<InitializeConversationKeysResult> {
  if (!conversationId) {
    throw new Error("Conversation ID is required.");
  }

  const {
    customerId,
    businessOwnerId,
  } = await getConversationParticipantIds(
    conversationId
  );

  const userId = await getCurrentUserId();

  if (
    userId !== customerId &&
    userId !== businessOwnerId
  ) {
    throw new Error(
      "You are not a participant in this conversation."
    );
  }

  const key = await getConversationKey(
    conversationId
  );

  return {
    conversationId,
    key,
    created: false,
  };
}