import { createClient } from "@/app/lib/supabase/client";
import { decryptConversationKey } from "./conversationKeys";
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
  getConversationKey as getStoredConversationKey,
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

  const { data: existingKey, error: existingKeyError } =
    await supabase
      .from("user_encryption_keys")
      .select("user_id, public_key, revoked_at")
      .eq("user_id", userId)
      .maybeSingle();

  if (existingKeyError) {
    throw existingKeyError;
  }

  if (
    existingKey &&
    existingKey.public_key === publicKey &&
    !existingKey.revoked_at
  ) {
    return;
  }

  const { error } = await supabase
    .from("user_encryption_keys")
    .upsert(
      {
        user_id: userId,
        public_key: publicKey,
        key_algorithm: "ECDH-P256",
        key_version: 1,
        revoked_at: null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

  if (error) {
    throw error;
  }
}

export async function getUserPublicKey(
  userId: string
): Promise<CryptoKey> {
  const { data, error } = await supabase
    .from("user_encryption_keys")
    .select("public_key, key_algorithm, revoked_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
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
    throw new Error("Unsupported encryption key algorithm.");
  }

  let jwk: JsonWebKey;

  try {
    jwk = JSON.parse(data.public_key) as JsonWebKey;
  } catch {
    throw new Error("Invalid public encryption key.");
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
  const customerId = await getCurrentUserId();

  await ensureUserEncryptionKey();

  const { data: existingConversation, error: existingError } =
    await supabase
      .from("conversations")
      .select("*")
      .eq("customer_id", customerId)
      .eq("business_id", businessId)
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingConversation) {
    return existingConversation as Conversation;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      customer_id: customerId,
      business_id: businessId,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Conversation;
}

export async function getConversation(
  conversationId: string
): Promise<Conversation> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (error) {
    throw error;
  }

  return data as Conversation;
}

export async function getConversationKeyEnvelope(
  conversationId: string
): Promise<ConversationKeyEnvelope> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("conversation_key_envelopes")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("key_version", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "No encryption key is available for this conversation."
    );
  }

  return data as ConversationKeyEnvelope;
}

export async function getConversationParticipantIds(
  conversationId: string
): Promise<{
  customerId: string;
  businessOwnerId: string;
}> {
  const conversation = await getConversation(
    conversationId
  );

  const { data: business, error } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", conversation.business_id)
    .single();

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

export async function getConversationKey(
  conversationId: string
): Promise<CryptoKey> {
  const storedKey = await getStoredConversationKey(
    conversationId
  );

  if (storedKey) {
    return storedKey;
  }

  const userId = await getCurrentUserId();

  const envelope = await getConversationKeyEnvelope(
    conversationId
  );

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

  const identityKeys = await getOrCreateIdentityKeys();

  const otherUserId =
    userId === customerId
      ? businessOwnerId
      : customerId;

  const ownPublicKey = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(
      await exportPublicKey()
    ) as JsonWebKey,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );

  const otherPublicKey = await getUserPublicKey(
    otherUserId
  );

  let conversationKey: CryptoKey | null = null;

  try {
    conversationKey = await decryptConversationKey(
      envelope.encrypted_key,
      identityKeys.privateKey,
      ownPublicKey
    );
  } catch {
    try {
      conversationKey = await decryptConversationKey(
        envelope.encrypted_key,
        identityKeys.privateKey,
        otherPublicKey
      );
    } catch {
      throw new Error(
        "Unable to decrypt the conversation encryption key."
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
  const key = await generateConversationKey();
  const exportedKey = await exportConversationKey(key);

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
  const senderId = await getCurrentUserId();

  const ciphertext = await encryptMessage(
    plaintext,
    conversationKey
  );

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      ciphertext,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Message;
}

export async function getEncryptedMessages(
  conversationId: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, ciphertext, created_at, edited_at, deleted_at"
    )
    .eq("conversation_id", conversationId)
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
): Promise<Array<Message & { plaintext: string }>> {
  const messages = await getEncryptedMessages(
    conversationId
  );

  return Promise.all(
    messages.map(async (message) => ({
      ...message,
      plaintext: await decryptMessage(
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
        callback(payload.new as Message);
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

export { supabase };