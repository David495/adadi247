import { encryptConversationKey } from "./conversationKeys";

import {
  createLocalConversationKey,
  getConversationKey,
  getConversationParticipantIds,
  getUserPublicKey,
  ensureUserEncryptionKey,
  supabase,
} from "./supabase";

import { getOrCreateIdentityKeys } from "./keys";

import {
  getConversationKey as getStoredConversationKey,
} from "./conversationKeyStore";

type InitializeConversationKeysResult = {
  conversationId: string;
  key: CryptoKey;
  created: boolean;
};

export async function initializeConversationKeys(
  conversationId: string
): Promise<InitializeConversationKeysResult> {
  if (!conversationId) {
    throw new Error(
      "Conversation ID is required."
    );
  }

  const existingLocalKey =
    await getStoredConversationKey(
      conversationId
    );

  if (existingLocalKey) {
    return {
      conversationId,
      key: existingLocalKey,
      created: false,
    };
  }

  const {
    customerId,
    businessOwnerId,
  } =
    await getConversationParticipantIds(
      conversationId
    );

  const {
    data: { user },
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

  if (
    user.id !== customerId &&
    user.id !== businessOwnerId
  ) {
    throw new Error(
      "You are not a participant in this conversation."
    );
  }

  await ensureUserEncryptionKey();

  const identityKeys =
    await getOrCreateIdentityKeys();

  let customerPublicKey: CryptoKey;
  let businessPublicKey: CryptoKey;

  try {
    customerPublicKey =
      await getUserPublicKey(customerId);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "This user does not have an encryption key."
    ) {
      if (customerId === user.id) {
        throw new Error(
          "Your encryption key could not be loaded. Please refresh the page and try again."
        );
      }

      throw new Error(
        "The customer has not activated secure messaging yet. Please ask the customer to open Messages and try again."
      );
    }

    throw error;
  }

  try {
    businessPublicKey =
      await getUserPublicKey(
        businessOwnerId
      );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "This user does not have an encryption key."
    ) {
      if (
        businessOwnerId === user.id
      ) {
        throw new Error(
          "Your encryption key could not be loaded. Please refresh the page and try again."
        );
      }

      throw new Error(
        "The business owner has not activated secure messaging yet. Please ask the business owner to open Messages and try again."
      );
    }

    throw error;
  }

  const {
    key: temporaryConversationKey,
  } = await createLocalConversationKey();

  const customerEncryptedKey =
    await encryptConversationKey(
      temporaryConversationKey,
      identityKeys.privateKey,
      customerPublicKey
    );

  const businessEncryptedKey =
    await encryptConversationKey(
      temporaryConversationKey,
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