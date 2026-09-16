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
  exportPublicKey,
  getOrCreateIdentityKeys,
} from "./keys";

import {
  saveConversationKey,
} from "./conversationKeyStore";

const supabase = createClient();

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

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("You must be logged in.");
  }

  return data.user.id;
}

export async function ensureUserEncryptionKey(): Promise<void> {
  const userId = await getCurrentUserId();
  const publicKey = await exportPublicKey();

  const {
    data: existingKey,
    error: existingKeyError,
  } = await supabase
    .from("user_encryption_keys")
    .select("user_id, public_key, revoked_at, key_version")
    .eq("user_id", userId)
    .order("key_version", {
      ascending: false,
    })
    .order("updated_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (existingKeyError) {
    throw existingKeyError;
  }

  if (!existingKey) {
    const { error } = await supabase
      .from("user_encryption_keys")
      .insert({
        user_id: userId,
        public_key: publicKey,
        key_algorithm: "ECDH-P256",
        key_version: 1,
        revoked_at: null,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }

    return;
  }

  if (existingKey.revoked_at) {
    throw new Error(
      "Your encryption identity has been revoked."
    );
  }

  if (existingKey.public_key !== publicKey) {
    throw new Error(
      "Your encryption identity does not match the identity registered for this account."
    );
  }
}

export async function getUserPublicKey(
  userId: string
): Promise<CryptoKey> {
  if (!userId) {
    throw new Error("User ID is required.");
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

  if (data.key_algorithm !== "ECDH-P256") {
    throw new Error(
      "Unsupported encryption key algorithm."
    );
  }

  let jwk: JsonWebKey;

  try {
    jwk = JSON.parse(data.public_key) as JsonWebKey;
  } catch {
    throw new Error(
      "Invalid public encryption key."
    );
  }

  try {
    return await crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      []
    );
  } catch {
    throw new Error(
      "Unable to import the user's public encryption key."
    );
  }
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
      p_business_id: businessId,
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
  const userId = await getCurrentUserId();

  const {
    data,
    error,
  } = await supabase
    .from("conversation_key_envelopes")
    .select("*")
    .eq("conversation_id", conversationId)
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

  return data as ConversationKeyEnvelope | null;
}

export async function getConversationParticipantIds(
  conversationId: string
): Promise<{
  customerId: string;
  businessOwnerId: string;
}> {
  const conversation =
    await getConversation(conversationId);

  const {
    data: business,
    error,
  } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", conversation.business_id)
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
    customerId: conversation.customer_id,
    businessOwnerId: business.owner_id,
  };
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
    await getUserPublicKey(customerId);

  const businessPublicKey =
    await getUserPublicKey(businessOwnerId);

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

  const { error } = await supabase.rpc(
    "initialize_conversation_key_envelopes",
    {
      p_conversation_id: conversationId,
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
  await ensureUserEncryptionKey();

  const existingCustomerKey =
    await supabase
      .from("user_encryption_keys")
      .select("user_id")
      .eq("user_id", customerId)
      .is("revoked_at", null)
      .maybeSingle();

  if (existingCustomerKey.error) {
    throw existingCustomerKey.error;
  }

  if (!existingCustomerKey.data) {
    throw new Error(
      "The customer does not have an encryption identity yet."
    );
  }

  const existingBusinessKey =
    await supabase
      .from("user_encryption_keys")
      .select("user_id")
      .eq("user_id", businessOwnerId)
      .is("revoked_at", null)
      .maybeSingle();

  if (existingBusinessKey.error) {
    throw existingBusinessKey.error;
  }

  if (!existingBusinessKey.data) {
    throw new Error(
      "The business owner does not have an encryption identity yet."
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

export async function getConversationKey(
  conversationId: string
): Promise<CryptoKey> {
  const userId = await getCurrentUserId();

  const {
    customerId,
    businessOwnerId,
  } = await getConversationParticipantIds(
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

  await ensureUserEncryptionKey();

  const {
    data: envelopeData,
    error: envelopeError,
  } = await supabase
    .from("conversation_key_envelopes")
    .select("*")
    .eq("conversation_id", conversationId)
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
    envelopeData as ConversationKeyEnvelope | null;

  if (!envelope) {
    return initializeConversationKey(
      conversationId,
      customerId,
      businessOwnerId
    );
  }

  const identityKeys =
    await getOrCreateIdentityKeys();

  const otherUserId =
    userId === customerId
      ? businessOwnerId
      : customerId;

  const otherPublicKey =
    await getUserPublicKey(otherUserId);

  let conversationKey: CryptoKey | null = null;

  try {
    conversationKey =
      await decryptConversationKey(
        envelope.encrypted_key,
        identityKeys.privateKey,
        otherPublicKey
      );
  } catch {
    try {
      const ownPublicKey =
        await getUserPublicKey(userId);

      conversationKey =
        await decryptConversationKey(
          envelope.encrypted_key,
          identityKeys.privateKey,
          ownPublicKey
        );
    } catch {
      throw new Error(
        "Unable to decrypt the conversation encryption key. The existing conversation key is no longer compatible with this device."
      );
    }
  }

  await saveConversationKey(
    conversationId,
    conversationKey
  );

  return conversationKey;
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
  return importConversationKey(encodedKey);
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
      conversation_id: conversationId,
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
  Array<Message & { plaintext: string }>
> {
  const messages =
    await getEncryptedMessages(
      conversationId
    );

  return Promise.all(
    messages.map(async (message) => ({
      ...message,
      plaintext:
        await decryptMessage(
          message.ciphertext,
          conversationKey
        ),
    }))
  );
}

export async function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void
) {
  const channel = supabase
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
          payload.new as Message
        );
      }
    )
    .subscribe();

  return channel;
}

export async function unsubscribeFromMessages(
  channel: ReturnType<typeof supabase.channel>
): Promise<void> {
  await supabase.removeChannel(
    channel
  );
}

export { supabase };