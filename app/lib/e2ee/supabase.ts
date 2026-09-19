import { createClient } from "@/app/lib/supabase/client";

import {
  decryptConversationKey,
  encryptConversationKey,
} from "./conversationKeys";

import {
  decryptMessage,
  encryptMessage,
  exportConversationKey,
  generateConversationKey,
  importConversationKey,
} from "./messages";

import {
  getOrCreateIdentityKeys,
  getStoredIdentityKeys,
} from "./keys";

import {
  getConversationKey as getStoredConversationKey,
  saveConversationKey,
} from "./conversationKeyStore";

const supabase = createClient();

const ENCRYPTION_ALGORITHM = "ECDH-P256";
const ENVELOPE_ALGORITHM = "ECDH-P256+A256GCM";

const IDENTITY_MISMATCH_ERROR =
  "Your encryption identity does not match the identity registered for this account. Encryption recovery is required before starting a new conversation.";

const IDENTITY_RECOVERY_ERROR =
  "Encryption recovery could not be completed on this browser. Your existing encrypted conversations were not changed.";

const BUSINESS_KEY_NOT_INITIALIZED_ERROR =
  "This conversation has not been securely initialized yet. Please ask the customer to open the chat first.";

const KEY_DECRYPTION_ERROR =
  "This conversation could not be unlocked on this device. The existing encrypted messages have not been changed.";

const CUSTOMER_KEY_INITIALIZATION_ERROR =
  "This conversation already contains encrypted messages, but its encryption key is not available on this device. A new key was not created so the existing messages remain protected.";

type Conversation = {
  id: string;
  customer_id: string;
  business_id: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  ciphertext: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type ConversationKeyEnvelope = {
  conversation_id: string;
  user_id: string;
  encrypted_key: string;
  key_version: number;
  algorithm: string;
  created_at: string;
};

type RegisteredEncryptionKey = {
  public_key: string;
  key_algorithm: string;
  revoked_at: string | null;
  key_version: number;
};

export type MessageChangeEvent = "INSERT" | "UPDATE";

async function getCurrentUserId(): Promise<string> {
  const {
    data,
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("You must be logged in.");
  }

  return data.user.id;
}

async function getRegisteredUserEncryptionKey(
  userId: string
): Promise<RegisteredEncryptionKey | null> {
  const {
    data,
    error,
  } = await supabase
    .from("user_encryption_keys")
    .select(
      "public_key, key_algorithm, revoked_at, key_version"
    )
    .eq("user_id", userId)
    .order("key_version", {
      ascending: false,
    })
    .order("updated_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as RegisteredEncryptionKey | null;
}

async function getLocalPublicKey(
  userId: string
): Promise<string> {
  const localKeys =
    await getStoredIdentityKeys(userId);

  if (!localKeys) {
    throw new Error(
      "No local encryption identity was found in this browser."
    );
  }

  return JSON.stringify(
    await crypto.subtle.exportKey(
      "jwk",
      localKeys.publicKey
    )
  );
}

export async function ensureUserEncryptionKey(): Promise<void> {
  const userId =
    await getCurrentUserId();

  let registered =
    await getRegisteredUserEncryptionKey(
      userId
    );

  if (!registered) {
    const identityKeys =
      await getOrCreateIdentityKeys(userId);

    const publicKey = JSON.stringify(
      await crypto.subtle.exportKey(
        "jwk",
        identityKeys.publicKey
      )
    );

    const {
      error,
    } = await supabase
      .from("user_encryption_keys")
      .insert({
        user_id: userId,
        public_key: publicKey,
        key_algorithm: ENCRYPTION_ALGORITHM,
        key_version: 1,
        revoked_at: null,
        updated_at:
          new Date().toISOString(),
      });

    if (error) {
      throw error;
    }

    return;
  }

  if (registered.revoked_at) {
    throw new Error(
      "Your encryption identity has been revoked."
    );
  }

  const localKeys =
    await getStoredIdentityKeys(userId);

  if (!localKeys) {
    try {
      await recoverEncryptionIdentity();

      registered =
        await getRegisteredUserEncryptionKey(
          userId
        );

      if (!registered) {
        throw new Error(
          IDENTITY_RECOVERY_ERROR
        );
      }

      const recoveredPublicKey =
        await getLocalPublicKey(userId);

      if (
        recoveredPublicKey !==
        registered.public_key
      ) {
        throw new Error(
          IDENTITY_RECOVERY_ERROR
        );
      }

      return;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          IDENTITY_RECOVERY_ERROR
      ) {
        throw error;
      }

      console.error(
        "ENCRYPTION IDENTITY RECOVERY ERROR:",
        error
      );

      throw new Error(
        IDENTITY_RECOVERY_ERROR
      );
    }
  }

  const localPublicKey =
    await getLocalPublicKey(userId);

  if (
    localPublicKey ===
    registered.public_key
  ) {
    return;
  }

  try {
    await recoverEncryptionIdentity();

    registered =
      await getRegisteredUserEncryptionKey(
        userId
      );

    if (!registered) {
      throw new Error(
        IDENTITY_RECOVERY_ERROR
      );
    }

    if (registered.revoked_at) {
      throw new Error(
        "Your encryption identity has been revoked."
      );
    }

    const recoveredPublicKey =
      await getLocalPublicKey(userId);

    if (
      recoveredPublicKey !==
      registered.public_key
    ) {
      throw new Error(
        IDENTITY_RECOVERY_ERROR
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        IDENTITY_RECOVERY_ERROR
    ) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.message ===
        IDENTITY_MISMATCH_ERROR
    ) {
      throw error;
    }

    console.error(
      "ENCRYPTION IDENTITY RECOVERY ERROR:",
      error
    );

    throw new Error(
      IDENTITY_RECOVERY_ERROR
    );
  }
}

export function isEncryptionIdentityMismatch(
  error: unknown
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message ===
    IDENTITY_MISMATCH_ERROR
  );
}

export async function rotateEncryptionIdentity(): Promise<{
  keyVersion: number;
  status: string;
}> {
  const userId =
    await getCurrentUserId();

  const localKeys =
    await getStoredIdentityKeys(userId);

  if (!localKeys) {
    throw new Error(
      "No local encryption identity was found in this browser."
    );
  }

  const publicKey = JSON.stringify(
    await crypto.subtle.exportKey(
      "jwk",
      localKeys.publicKey
    )
  );

  const {
    data,
    error,
  } = await supabase.rpc(
    "rotate_user_encryption_identity",
    {
      p_public_key: publicKey,
      p_key_algorithm:
        ENCRYPTION_ALGORITHM,
    }
  );

  if (error) {
    throw error;
  }

  const result =
    data as
      | {
          key_version?: number | string;
          status?: string;
        }
      | null;

  let keyVersion = Number(
    result?.key_version
  );

  if (
    !Number.isInteger(keyVersion) ||
    keyVersion < 1
  ) {
    const registered =
      await getRegisteredUserEncryptionKey(
        userId
      );

    if (!registered) {
      throw new Error(
        "Encryption identity registration could not be verified."
      );
    }

    keyVersion =
      registered.key_version;
  }

  return {
    keyVersion,
    status:
      result?.status ??
      "current",
  };
}

async function getMyConversationIds(
  userId: string
): Promise<string[]> {
  const {
    data: customerConversations,
    error: customerError,
  } = await supabase
    .from("conversations")
    .select("id")
    .eq("customer_id", userId);

  if (customerError) {
    throw customerError;
  }

  const customerIds =
    (customerConversations ?? []).map(
      (conversation) =>
        conversation.id
    );

  const {
    data: ownedBusinesses,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId);

  if (businessError) {
    throw businessError;
  }

  const businessIds =
    (ownedBusinesses ?? []).map(
      (business) => business.id
    );

  if (businessIds.length === 0) {
    return Array.from(
      new Set(customerIds)
    );
  }

  const {
    data: businessConversations,
    error: conversationError,
  } = await supabase
    .from("conversations")
    .select("id")
    .in(
      "business_id",
      businessIds
    );

  if (conversationError) {
    throw conversationError;
  }

  const ownerConversationIds =
    (businessConversations ?? []).map(
      (conversation) =>
        conversation.id
    );

  return Array.from(
    new Set([
      ...customerIds,
      ...ownerConversationIds,
    ])
  );
}

export async function recoverEncryptionIdentity(): Promise<{
  keyVersion: number;
  recoveredConversations: number;
}> {
  const userId =
    await getCurrentUserId();

  const localKeys =
    await getStoredIdentityKeys(userId);

  if (!localKeys) {
    await getOrCreateIdentityKeys(userId);
  }

  const identityKeys =
    await getStoredIdentityKeys(userId);

  if (!identityKeys) {
    throw new Error(
      IDENTITY_RECOVERY_ERROR
    );
  }

  const conversationIds =
    await getMyConversationIds(userId);

  const recoverableConversationIds: string[] =
    [];

  for (
    const conversationId of conversationIds
  ) {
    const cachedKey =
      await getStoredConversationKey(
        conversationId
      );

    if (cachedKey) {
      recoverableConversationIds.push(
        conversationId
      );
    }
  }

  if (
    recoverableConversationIds.length ===
    0
  ) {
    throw new Error(
      IDENTITY_RECOVERY_ERROR
    );
  }

  const {
    keyVersion,
  } = await rotateEncryptionIdentity();

  let recoveredConversations = 0;

  for (
    const conversationId of recoverableConversationIds
  ) {
    const cachedKey =
      await getStoredConversationKey(
        conversationId
      );

    if (!cachedKey) {
      continue;
    }

    const {
      customerId,
      businessOwnerId,
    } =
      await getConversationParticipantIds(
        conversationId
      );

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
        cachedKey,
        identityKeys.privateKey,
        customerPublicKey
      );

    const businessEncryptedKey =
      await encryptConversationKey(
        cachedKey,
        identityKeys.privateKey,
        businessPublicKey
      );

    const {
      error,
    } = await supabase.rpc(
      "rewrap_conversation_key_envelopes",
      {
        p_conversation_id:
          conversationId,
        p_customer_encrypted_key:
          customerEncryptedKey,
        p_business_encrypted_key:
          businessEncryptedKey,
        p_key_version:
          keyVersion,
      }
    );

    if (error) {
      throw error;
    }

    await saveConversationKey(
      conversationId,
      cachedKey
    );

    recoveredConversations++;
  }

  const registered =
    await getRegisteredUserEncryptionKey(
      userId
    );

  if (!registered) {
    throw new Error(
      IDENTITY_RECOVERY_ERROR
    );
  }

  const localPublicKey =
    JSON.stringify(
      await crypto.subtle.exportKey(
        "jwk",
        identityKeys.publicKey
      )
    );

  if (
    registered.public_key !==
    localPublicKey
  ) {
    throw new Error(
      IDENTITY_RECOVERY_ERROR
    );
  }

  return {
    keyVersion,
    recoveredConversations,
  };
}

export async function getUserPublicKey(
  userId: string
): Promise<CryptoKey> {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const currentUserId =
    await getCurrentUserId();

  if (userId === currentUserId) {
    const localKeys =
      await getStoredIdentityKeys(
        currentUserId
      );

    if (localKeys) {
      return localKeys.publicKey;
    }
  }

  const {
    data,
    error,
  } = await supabase
    .from("user_encryption_keys")
    .select(
      "public_key, key_algorithm, revoked_at, key_version"
    )
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("key_version", {
      ascending: false,
    })
    .order("updated_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "This user does not have an encryption key."
    );
  }

  if (
    data.key_algorithm !==
    ENCRYPTION_ALGORITHM
  ) {
    throw new Error(
      "Unsupported encryption key algorithm."
    );
  }

  let jwk: JsonWebKey;

  try {
    jwk = JSON.parse(
      data.public_key
    ) as JsonWebKey;
  } catch {
    throw new Error(
      "Invalid public encryption key."
    );
  }

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}

export async function getOrCreateConversation(
  businessId: string
): Promise<Conversation> {
  await ensureUserEncryptionKey();

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_business_conversation",
    {
      p_business_id:
        businessId,
    }
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Unable to create the conversation."
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error(
        "Unable to create the conversation."
      );
    }

    return data[0] as Conversation;
  }

  return data as Conversation;
}

export async function getConversation(
  conversationId: string
): Promise<Conversation> {
  const {
    data,
    error,
  } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Conversation not found."
    );
  }

  return data as Conversation;
}

export async function getConversationKeyEnvelope(
  conversationId: string
): Promise<ConversationKeyEnvelope | null> {
  const userId =
    await getCurrentUserId();

  const {
    data,
    error,
  } = await supabase
    .from("conversation_key_envelopes")
    .select("*")
    .eq(
      "conversation_id",
      conversationId
    )
    .eq("user_id", userId)
    .order("key_version", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as
    | ConversationKeyEnvelope
    | null;
}

export async function getConversationParticipantIds(
  conversationId: string
): Promise<{
  customerId: string;
  businessOwnerId: string;
}> {
  const conversation =
    await getConversation(
      conversationId
    );

  const {
    data: business,
    error,
  } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq(
      "id",
      conversation.business_id
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!business?.owner_id) {
    throw new Error(
      "Unable to determine the business owner."
    );
  }

  return {
    customerId:
      conversation.customer_id,
    businessOwnerId:
      business.owner_id,
  };
}

async function createConversationKeyEnvelopes(
  conversationId: string,
  conversationKey: CryptoKey,
  customerId: string,
  businessOwnerId: string
): Promise<void> {
  const currentUserId =
    await getCurrentUserId();

  if (currentUserId !== customerId) {
    throw new Error(
      "Only the customer can initialize the conversation encryption key."
    );
  }

  const identityKeys =
    await getOrCreateIdentityKeys(
      currentUserId
    );

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
    error,
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

  if (error) {
    throw error;
  }

  await saveConversationKey(
    conversationId,
    conversationKey
  );
}

async function initializeConversationKey(
  conversationId: string,
  customerId: string,
  businessOwnerId: string
): Promise<CryptoKey> {
  const currentUserId =
    await getCurrentUserId();

  if (currentUserId !== customerId) {
    throw new Error(
      BUSINESS_KEY_NOT_INITIALIZED_ERROR
    );
  }

  await ensureUserEncryptionKey();

  const customerKey =
    await getUserPublicKey(
      customerId
    );

  const businessKey =
    await getUserPublicKey(
      businessOwnerId
    );

  if (!customerKey) {
    throw new Error(
      "The customer does not have an encryption identity."
    );
  }

  if (!businessKey) {
    throw new Error(
      "The business owner does not have an encryption identity."
    );
  }

  const conversationKey =
    await generateConversationKey();

  await createConversationKeyEnvelopes(
    conversationId,
    conversationKey,
    customerId,
    businessOwnerId
  );

  return conversationKey;
}

async function conversationHasMessages(
  conversationId: string
): Promise<boolean> {
  const {
    data,
    error,
  } = await supabase
    .from("messages")
    .select("id")
    .eq(
      "conversation_id",
      conversationId
    )
    .limit(1);

  if (error) {
    throw error;
  }

  return (data ?? []).length > 0;
}

export async function getConversationKey(
  conversationId: string
): Promise<CryptoKey> {
  const userId =
    await getCurrentUserId();

  const {
    customerId,
    businessOwnerId,
  } =
    await getConversationParticipantIds(
      conversationId
    );

  if (
    userId !== customerId &&
    userId !== businessOwnerId
  ) {
    throw new Error(
      "You are not a participant in this conversation."
    );
  }

  const cachedKey =
    await getStoredConversationKey(
      conversationId
    );

  if (cachedKey) {
    return cachedKey;
  }

  await ensureUserEncryptionKey();

  const {
    data: envelopeData,
    error: envelopeError,
  } = await supabase
    .from("conversation_key_envelopes")
    .select("*")
    .eq(
      "conversation_id",
      conversationId
    )
    .eq("user_id", userId)
    .order("key_version", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (envelopeError) {
    throw envelopeError;
  }

  const envelope =
    envelopeData as
      | ConversationKeyEnvelope
      | null;

  if (!envelope) {
    const hasMessages =
      await conversationHasMessages(
        conversationId
      );

    if (hasMessages) {
      if (userId !== customerId) {
        throw new Error(
          BUSINESS_KEY_NOT_INITIALIZED_ERROR
        );
      }

      throw new Error(
        CUSTOMER_KEY_INITIALIZATION_ERROR
      );
    }

    if (userId !== customerId) {
      throw new Error(
        BUSINESS_KEY_NOT_INITIALIZED_ERROR
      );
    }

    return initializeConversationKey(
      conversationId,
      customerId,
      businessOwnerId
    );
  }

  const identityKeys =
    await getOrCreateIdentityKeys(
      userId
    );

  /*
   * Conversation envelopes are created by the customer.
   *
   * Customer envelope:
   *   customer private + customer public
   *
   * Business envelope:
   *   customer private + business public
   *
   * Therefore the sender public key for BOTH envelopes
   * is always the customer's public key.
   */
  const senderPublicKey =
    await getUserPublicKey(
      customerId
    );

  try {
    const conversationKey =
      await decryptConversationKey(
        envelope.encrypted_key,
        identityKeys.privateKey,
        senderPublicKey
      );

    await saveConversationKey(
      conversationId,
      conversationKey
    );

    return conversationKey;
  } catch (error) {
    console.error(
      "CONVERSATION KEY DECRYPTION ERROR:",
      {
        conversationId,
        userId,
        customerId,
        businessOwnerId,
        envelopeUserId:
          envelope.user_id,
        keyVersion:
          envelope.key_version,
        error,
      }
    );

    throw new Error(
      KEY_DECRYPTION_ERROR
    );
  }
}

export async function createLocalConversationKey(): Promise<{
  key: CryptoKey;
  exportedKey: string;
}> {
  const key =
    await generateConversationKey();

  const exportedKey =
    await exportConversationKey(key);

  return {
    key,
    exportedKey,
  };
}

export async function importLocalConversationKey(
  encodedKey: string
): Promise<CryptoKey> {
  return importConversationKey(
    encodedKey
  );
}

export async function sendEncryptedMessage(
  conversationId: string,
  plaintext: string,
  conversationKey: CryptoKey
): Promise<Message> {
  const senderId =
    await getCurrentUserId();

  const ciphertext =
    await encryptMessage(
      plaintext,
      conversationKey
    );

  const {
    data,
    error,
  } = await supabase
    .from("messages")
    .insert({
      conversation_id:
        conversationId,
      sender_id: senderId,
      ciphertext,
    })
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Unable to save the message."
    );
  }

  return data as Message;
}

export async function deleteMessage(
  messageId: string
): Promise<void> {
  if (!messageId) {
    throw new Error(
      "Message ID is required."
    );
  }

  const { error } =
    await supabase.rpc(
      "delete_message",
      {
        p_message_id:
          messageId,
      }
    );

  if (error) {
    throw error;
  }
}

export async function clearConversationMessages(
  conversationId: string
): Promise<void> {
  if (!conversationId) {
    throw new Error(
      "Conversation ID is required."
    );
  }

  const { error } =
    await supabase.rpc(
      "clear_conversation_messages",
      {
        p_conversation_id:
          conversationId,
      }
    );

  if (error) {
    throw error;
  }
}

export async function getEncryptedMessages(
  conversationId: string
): Promise<Message[]> {
  const {
    data,
    error,
  } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, ciphertext, created_at, edited_at, deleted_at"
    )
    .eq(
      "conversation_id",
      conversationId
    )
    .is("deleted_at", null)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as Message[];
}

export async function getMessages(
  conversationId: string,
  conversationKey: CryptoKey
): Promise<
  Array<
    Message & {
      plaintext: string;
    }
  >
> {
  const messages =
    await getEncryptedMessages(
      conversationId
    );

  return Promise.all(
    messages.map(
      async (message) => ({
        ...message,
        plaintext:
          await decryptMessage(
            message.ciphertext,
            conversationKey
          ),
      })
    )
  );
}

export async function subscribeToMessages(
  conversationId: string,
  callback: (
    message: Message,
    event: MessageChangeEvent
  ) => void
) {
  const channel =
    supabase
      .channel(
        `conversation-messages:${conversationId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callback(
            payload.new as Message,
            "INSERT"
          );
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
          callback(
            payload.new as Message,
            "UPDATE"
          );
        }
      )
      .subscribe();

  return channel;
}

export async function unsubscribeFromMessages(
  channel: ReturnType<
    typeof supabase.channel
  >
): Promise<void> {
  await supabase.removeChannel(
    channel
  );
}

export { supabase };