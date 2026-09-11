import {
  encryptConversationKey,
} from "./conversationKeys";
import {
  createLocalConversationKey,
  getConversationKey,
  getConversationParticipantIds,
  getUserPublicKey,
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

export async function initializeConversationKeys(
  conversationId: string
): Promise<InitializeConversationKeysResult> {
  if (!conversationId) {
    throw new Error("Conversation ID is required.");
  }

  const existingLocalKey =
    await getStoredConversationKey(conversationId);

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
  } = await getConversationParticipantIds(
    conversationId
  );

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
    throw new Error("You must be logged in.");
  }

  if (
    user.id !== customerId &&
    user.id !== businessOwnerId
  ) {
    throw new Error(
      "You are not a participant in this conversation."
    );
  }

  await supabase
    .from("user_encryption_keys")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const identityKeys = await getOrCreateIdentityKeys();

  const customerPublicKey = await getUserPublicKey(
    customerId
  );

  const businessPublicKey = await getUserPublicKey(
    businessOwnerId
  );

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

  const { error: rpcError } = await supabase.rpc(
    "initialize_conversation_key_envelopes",
    {
      p_conversation_id: conversationId,
      p_customer_encrypted_key: customerEncryptedKey,
      p_business_encrypted_key: businessEncryptedKey,
    }
  );

  if (rpcError) {
    throw rpcError;
  }

  const canonicalConversationKey =
    await getConversationKey(conversationId);

  return {
    conversationId,
    key: canonicalConversationKey,
    created: true,
  };
}