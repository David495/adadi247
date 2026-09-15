import {
  encryptConversationKey,
} from "./conversationKeys";

import {
  createLocalConversationKey,
  getConversationKey,
  getConversationParticipantIds,
  getUserPublicKey,
  ensureUserEncryptionKey,
  supabase,
} from "./supabase";

import {
  getOrCreateIdentityKeys,
} from "./keys";

import {
  getConversationKey as getStoredConversationKey,
} from "./conversationKeyStore";

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
    throw new Error(
      "You must be logged in."
    );
  }

  return user.id;
}

async function getOwnConversationEnvelope(
  conversationId: string
): Promise<{
  id: string;
} | null> {
  const userId =
    await getCurrentUserId();

  const {
    data,
    error,
  } = await supabase
    .from("conversation_key_envelopes")
    .select("id")
    .eq(
      "conversation_id",
      conversationId
    )
    .eq("user_id", userId)
    .eq("key_version", 1)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function createConversationKeyEnvelopes(
  conversationId: string,
  conversationKey: CryptoKey,
  customerId: string,
  businessOwnerId: string
): Promise<void> {
  const identityKeys =
    await getOrCreateIdentityKeys();

  const customerPublicKey =
    await getUserPublicKey(
      customerId
    );

  const businessPublicKey =
    await getUserPublicKey(
      businessOwnerId
    );

  const customerEncryptedKey =
    await encryptConversationKey(
      conversationKey,
      identityKeys.privateKey,
      customerPublicKey
    );

  const businessEncryptedKey =
    await encryptConversationKey(
      conversationKey,
      identityKeys.privateKey,
      businessPublicKey
    );

  const {
    error: rpcError,
  } = await supabase.rpc(
    "initialize_conversation_key_envelopes",
    {
      p_conversation_id:
        conversationId,
      p_customer_encrypted_key:
        customerEncryptedKey,
      p_business_encrypted_key:
        businessEncryptedKey,
    }
  );

  if (rpcError) {
    throw rpcError;
  }
}

export async function initializeConversationKeys(
  conversationId: string
): Promise<InitializeConversationKeysResult> {
  if (!conversationId) {
    throw new Error(
      "Conversation ID is required."
    );
  }

  const {
    customerId,
    businessOwnerId,
  } =
    await getConversationParticipantIds(
      conversationId
    );

  const userId =
    await getCurrentUserId();

  if (
    userId !== customerId &&
    userId !== businessOwnerId
  ) {
    throw new Error(
      "You are not a participant in this conversation."
    );
  }

  await ensureUserEncryptionKey();

  const existingLocalKey =
    await getStoredConversationKey(
      conversationId
    );

  const ownEnvelope =
    await getOwnConversationEnvelope(
      conversationId
    );

  if (
    existingLocalKey &&
    ownEnvelope
  ) {
    return {
      conversationId,
      key: existingLocalKey,
      created: false,
    };
  }

  if (existingLocalKey) {
    await createConversationKeyEnvelopes(
      conversationId,
      existingLocalKey,
      customerId,
      businessOwnerId
    );

    const canonicalConversationKey =
      await getConversationKey(
        conversationId
      );

    return {
      conversationId,
      key: canonicalConversationKey,
      created: true,
    };
  }

  const {
    key: temporaryConversationKey,
  } =
    await createLocalConversationKey();

  try {
    await createConversationKeyEnvelopes(
      conversationId,
      temporaryConversationKey,
      customerId,
      businessOwnerId
    );
  } catch (error) {
    throw error;
  }

  const canonicalConversationKey =
    await getConversationKey(
      conversationId
    );

  return {
    conversationId,
    key: canonicalConversationKey,
    created: true,
  };
}