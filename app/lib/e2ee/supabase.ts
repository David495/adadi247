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
  createEncryptedIdentityBackup,
  createIdentityKeys,
  getOrCreateIdentityKeys,
  getStoredIdentityKeys,
  restoreIdentityFromBackup,
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

const IDENTITY_PASSWORD_REQUIRED_ERROR =
  "Your ADADI password is required to unlock secure messaging on this device.";

const IDENTITY_BACKUP_MISSING_ERROR =
  "Your secure messaging identity is not available on this device. Please unlock secure messaging with your ADADI password.";

const IDENTITY_BACKUP_INVALID_PASSWORD_ERROR =
  "Unable to decrypt your secure messaging identity backup. Please check your ADADI password and try again.";

const IDENTITY_BACKUP_MISMATCH_ERROR =
  "The restored encryption identity does not match the identity registered for this account.";

const BUSINESS_KEY_NOT_INITIALIZED_ERROR =
  "This conversation has not been securely initialized yet. Please ask the customer to open the chat first.";

const KEY_DECRYPTION_ERROR =
  "This conversation could not be unlocked on this device. The existing encrypted messages have not been changed.";

const CUSTOMER_KEY_INITIALIZATION_ERROR =
  "This conversation already contains encrypted messages, but its encryption key is not available on this device. A new key was not created so the existing messages remain protected.";

const CONVERSATION_MIGRATION_ERROR =
  "This conversation could not be migrated to your current secure messaging identity. The existing encrypted messages have not been changed.";

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

type VersionedPublicKey = RegisteredEncryptionKey & {
  publicKey: CryptoKey;
};

type IdentityBackupRow = {
  user_id: string;
  key_version: number;
  backup_version: number;
  backup_algorithm: string;
  encrypted_backup: string;
  created_at: string;
  updated_at: string;
};

export type MessageChangeEvent = "INSERT" | "UPDATE";

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

async function getRegisteredUserEncryptionKey(
  userId: string
): Promise<RegisteredEncryptionKey | null> {
  const { data, error } = await supabase
    .from("user_encryption_keys")
    .select("public_key, key_algorithm, revoked_at, key_version")
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

async function getRegisteredUserEncryptionKeys(
  userId: string
): Promise<RegisteredEncryptionKey[]> {
  const { data, error } = await supabase
    .from("user_encryption_keys")
    .select("public_key, key_algorithm, revoked_at, key_version")
    .eq("user_id", userId)
    .order("key_version", {
      ascending: false,
    })
    .order("updated_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as RegisteredEncryptionKey[];
}

async function importUserPublicKey(
  registeredKey: RegisteredEncryptionKey
): Promise<CryptoKey> {
  if (registeredKey.key_algorithm !== ENCRYPTION_ALGORITHM) {
    throw new Error("Unsupported encryption key algorithm.");
  }

  let jwk: JsonWebKey;

  try {
    jwk = JSON.parse(registeredKey.public_key) as JsonWebKey;
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

async function getLocalPublicKey(userId: string): Promise<string> {
  const localKeys = await getStoredIdentityKeys(userId);

  if (!localKeys) {
    throw new Error(
      "No local encryption identity was found in this browser."
    );
  }

  return JSON.stringify(
    await crypto.subtle.exportKey("jwk", localKeys.publicKey)
  );
}

async function getIdentityBackup(
  userId: string
): Promise<IdentityBackupRow | null> {
  const { data, error } = await supabase
    .from("user_encryption_identity_backups")
    .select(
      "user_id, key_version, backup_version, backup_algorithm, encrypted_backup, created_at, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as IdentityBackupRow | null;
}

async function saveIdentityBackup(
  userId: string,
  keyVersion: number,
  password: string
): Promise<void> {
  if (!password) {
    throw new Error(IDENTITY_PASSWORD_REQUIRED_ERROR);
  }

  const backup = await createEncryptedIdentityBackup(userId, password);
  const encryptedBackup = JSON.stringify(backup);

  const { error } = await supabase
    .from("user_encryption_identity_backups")
    .upsert(
      {
        user_id: userId,
        key_version: keyVersion,
        backup_version: backup.v,
        backup_algorithm: backup.algorithm,
        encrypted_backup: encryptedBackup,
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

async function restoreRegisteredIdentity(
  userId: string,
  registered: RegisteredEncryptionKey,
  password: string
): Promise<void> {
  if (!password) {
    throw new Error(IDENTITY_PASSWORD_REQUIRED_ERROR);
  }

  const backup = await getIdentityBackup(userId);

  if (!backup) {
    throw new Error(IDENTITY_BACKUP_MISSING_ERROR);
  }

  let parsedBackup: Parameters<
    typeof restoreIdentityFromBackup
  >[1];

  try {
    parsedBackup = JSON.parse(backup.encrypted_backup);
  } catch {
    throw new Error(IDENTITY_RECOVERY_ERROR);
  }

  try {
    await restoreIdentityFromBackup(
      userId,
      parsedBackup,
      password
    );
  } catch {
    throw new Error(IDENTITY_BACKUP_INVALID_PASSWORD_ERROR);
  }

  const restoredPublicKey = await getLocalPublicKey(userId);

  if (restoredPublicKey !== registered.public_key) {
    throw new Error(IDENTITY_BACKUP_MISMATCH_ERROR);
  }
}

async function registerNewLocalIdentity(
  userId: string,
  password?: string
): Promise<{
  keyVersion: number;
  status: string;
}> {
  const existingRegistered =
    await getRegisteredUserEncryptionKey(userId);

  if (existingRegistered) {
    await ensureUserEncryptionKey(password);

    return {
      keyVersion: existingRegistered.key_version,
      status: "current",
    };
  }

  const identityKeys = await createIdentityKeys(userId);

  const publicKey = JSON.stringify(
    await crypto.subtle.exportKey(
      "jwk",
      identityKeys.publicKey
    )
  );

  const { error } = await supabase
    .from("user_encryption_keys")
    .insert({
      user_id: userId,
      public_key: publicKey,
      key_algorithm: ENCRYPTION_ALGORITHM,
      key_version: 1,
      revoked_at: null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    const registeredAfterConflict =
      await getRegisteredUserEncryptionKey(userId);

    if (!registeredAfterConflict) {
      throw error;
    }

    const localPublicKey =
      await getLocalPublicKey(userId);

    if (
      localPublicKey !==
      registeredAfterConflict.public_key
    ) {
      if (!password) {
        throw new Error(IDENTITY_MISMATCH_ERROR);
      }

      await restoreRegisteredIdentity(
        userId,
        registeredAfterConflict,
        password
      );
    }

    if (password) {
      await saveIdentityBackup(
        userId,
        registeredAfterConflict.key_version,
        password
      );
    }

    return {
      keyVersion: registeredAfterConflict.key_version,
      status: "current",
    };
  }

  const registered =
    await getRegisteredUserEncryptionKey(userId);

  if (!registered) {
    throw new Error(IDENTITY_RECOVERY_ERROR);
  }

  if (registered.public_key !== publicKey) {
    throw new Error(IDENTITY_RECOVERY_ERROR);
  }

  if (password) {
    await saveIdentityBackup(
      userId,
      registered.key_version,
      password
    );
  }

  return {
    keyVersion: registered.key_version,
    status: "current",
  };
}

export async function ensureUserEncryptionKey(
  password?: string
): Promise<void> {
  const userId = await getCurrentUserId();

  const registered =
    await getRegisteredUserEncryptionKey(userId);

  if (!registered) {
    const identityKeys =
      await getOrCreateIdentityKeys(userId);

    const publicKey = JSON.stringify(
      await crypto.subtle.exportKey(
        "jwk",
        identityKeys.publicKey
      )
    );

    const { error } = await supabase
      .from("user_encryption_keys")
      .insert({
        user_id: userId,
        public_key: publicKey,
        key_algorithm: ENCRYPTION_ALGORITHM,
        key_version: 1,
        revoked_at: null,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      const registeredAfterConflict =
        await getRegisteredUserEncryptionKey(userId);

      if (!registeredAfterConflict) {
        throw error;
      }

      const localPublicKey =
        await getLocalPublicKey(userId);

      if (
        localPublicKey !==
        registeredAfterConflict.public_key
      ) {
        if (!password) {
          throw new Error(IDENTITY_MISMATCH_ERROR);
        }

        await restoreRegisteredIdentity(
          userId,
          registeredAfterConflict,
          password
        );
      }

      if (password) {
        await saveIdentityBackup(
          userId,
          registeredAfterConflict.key_version,
          password
        );
      }

      return;
    }

    if (password) {
      await saveIdentityBackup(
        userId,
        1,
        password
      );
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
    if (!password) {
      throw new Error(
        IDENTITY_PASSWORD_REQUIRED_ERROR
      );
    }

    await restoreRegisteredIdentity(
      userId,
      registered,
      password
    );

    return;
  }

  const localPublicKey =
    await getLocalPublicKey(userId);

  if (
    localPublicKey ===
    registered.public_key
  ) {
    if (password) {
      const backup =
        await getIdentityBackup(userId);

      if (
        !backup ||
        backup.key_version !==
          registered.key_version
      ) {
        await saveIdentityBackup(
          userId,
          registered.key_version,
          password
        );
      }
    }

    return;
  }

  if (password) {
    await restoreRegisteredIdentity(
      userId,
      registered,
      password
    );

    return;
  }

  throw new Error(
    IDENTITY_MISMATCH_ERROR
  );
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
  throw new Error(
    "Encryption identity rotation is disabled. Your ADADI account uses one permanent secure messaging identity."
  );
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
      (conversation) => conversation.id
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
    .in("business_id", businessIds);

  if (conversationError) {
    throw conversationError;
  }

  const ownerConversationIds =
    (businessConversations ?? []).map(
      (conversation) => conversation.id
    );

  return Array.from(
    new Set([
      ...customerIds,
      ...ownerConversationIds,
    ])
  );
}

export async function recoverEncryptionIdentity(
  password?: string
): Promise<{
  keyVersion: number;
  recoveredConversations: number;
}> {
  const userId = await getCurrentUserId();

  const registered =
    await getRegisteredUserEncryptionKey(
      userId
    );

  if (!registered) {
    throw new Error(
      IDENTITY_RECOVERY_ERROR
    );
  }

  await ensureUserEncryptionKey(
    password
  );

  return {
    keyVersion:
      registered.key_version,
    recoveredConversations: 0,
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

    throw new Error(
      "No local encryption identity exists in this browser."
    );
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

  return importUserPublicKey(
    data as RegisteredEncryptionKey
  );
}

async function getHistoricalUserPublicKeys(
  userId: string
): Promise<VersionedPublicKey[]> {
  const registeredKeys =
    await getRegisteredUserEncryptionKeys(
      userId
    );

  const importedKeys: VersionedPublicKey[] =
    [];

  for (const registeredKey of registeredKeys) {
    try {
      const publicKey =
        await importUserPublicKey(
          registeredKey
        );

      importedKeys.push({
        ...registeredKey,
        publicKey,
      });
    } catch (error) {
      console.warn(
        "Unable to import historical encryption key:",
        {
          userId,
          keyVersion:
            registeredKey.key_version,
          error,
        }
      );
    }
  }

  return importedKeys;
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

  await ensureUserEncryptionKey();

  const identityKeys =
    await getStoredIdentityKeys(
      currentUserId
    );

  if (!identityKeys) {
    throw new Error(
      IDENTITY_PASSWORD_REQUIRED_ERROR
    );
  }

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

  const { error } =
    await supabase.rpc(
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

async function getConversationEnvelopes(
  conversationId: string,
  userId: string
): Promise<ConversationKeyEnvelope[]> {
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
    });

  if (error) {
    throw error;
  }

  return (data ??
    []) as ConversationKeyEnvelope[];
}

/**
 * Migrates an existing conversation to the
 * current account-level encryption identity.
 *
 * IMPORTANT:
 * - Must be run on a browser where the existing
 *   conversation key is still cached.
 * - The cached conversation key is captured BEFORE
 *   the local identity is restored.
 * - The ADADI password is used only to restore the
 *   registered account-level identity.
 * - Existing encrypted messages are never changed.
 * - No new conversation key is generated.
 */
export async function migrateConversationToCurrentIdentity(
  conversationId: string,
  password: string
): Promise<{
  conversationId: string;
  keyVersion: number;
}> {
  if (!password) {
    throw new Error(
      IDENTITY_PASSWORD_REQUIRED_ERROR
    );
  }

  const currentUserId =
    await getCurrentUserId();

  const {
    customerId,
    businessOwnerId,
  } =
    await getConversationParticipantIds(
      conversationId
    );

  if (currentUserId !== customerId) {
    throw new Error(
      "Only the customer can migrate this conversation to the current encryption identity."
    );
  }

  /*
   * CRITICAL:
   *
   * Capture the existing conversation key
   * before restoring/replacing the local identity.
   */
  const conversationKey =
    await getStoredConversationKey(
      conversationId
    );

  if (!conversationKey) {
    throw new Error(
      "The existing conversation key is not available on this browser. Do not clear this browser's site data before migration."
    );
  }

  /*
   * Verify the currently registered account identity
   * and restore it using the user's ADADI password
   * if this browser is still using an older identity.
   */
  await ensureUserEncryptionKey(
    password
  );

  const registered =
    await getRegisteredUserEncryptionKey(
      currentUserId
    );

  if (!registered) {
    throw new Error(
      "The current encryption identity could not be verified."
    );
  }

  if (registered.revoked_at) {
    throw new Error(
      "Your encryption identity has been revoked."
    );
  }

  const identityKeys =
    await getStoredIdentityKeys(
      currentUserId
    );

  if (!identityKeys) {
    throw new Error(
      "The current encryption identity is not available on this browser."
    );
  }

  const registeredPublicKey =
    await getLocalPublicKey(
      currentUserId
    );

  if (
    registeredPublicKey !==
    registered.public_key
  ) {
    throw new Error(
      IDENTITY_MISMATCH_ERROR
    );
  }

  /*
   * These are the CURRENT public identities.
   * The conversation key itself is not changed.
   */
  const customerPublicKey =
    await getUserPublicKey(
      customerId
    );

  const businessPublicKey =
    await getUserPublicKey(
      businessOwnerId
    );

  /*
   * Re-encrypt the SAME conversation key for:
   *
   * 1. the current customer identity
   * 2. the current business identity
   */
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

  const { error } =
    await supabase.rpc(
      "rewrap_conversation_key_envelopes",
      {
        p_conversation_id:
          conversationId,
        p_customer_encrypted_key:
          customerEncryptedKey,
        p_business_encrypted_key:
          businessEncryptedKey,
        p_key_version:
          registered.key_version,
      }
    );

  if (error) {
    console.error(
      "[ADADI Messaging] Conversation migration RPC failed:",
      error
    );

    throw new Error(
      CONVERSATION_MIGRATION_ERROR
    );
  }

  /*
   * Keep the original conversation key cached.
   * This is the SAME key that decrypts the existing
   * messages.
   */
  await saveConversationKey(
    conversationId,
    conversationKey
  );

  return {
    conversationId,
    keyVersion:
      registered.key_version,
  };
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

  const envelopes =
    await getConversationEnvelopes(
      conversationId,
      userId
    );

  if (envelopes.length === 0) {
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
    await getStoredIdentityKeys(
      userId
    );

  if (!identityKeys) {
    throw new Error(
      IDENTITY_PASSWORD_REQUIRED_ERROR
    );
  }

  if (userId === customerId) {
    const historicalCustomerKeys =
      await getHistoricalUserPublicKeys(
        customerId
      );

    if (
      historicalCustomerKeys.length === 0
    ) {
      throw new Error(
        KEY_DECRYPTION_ERROR
      );
    }

    let lastError: unknown = null;

    for (const envelope of envelopes) {
      if (
        envelope.algorithm !==
        ENVELOPE_ALGORITHM
      ) {
        continue;
      }

      const candidateKeys =
        historicalCustomerKeys.filter(
          (key) =>
            key.key_version ===
            envelope.key_version
        );

      const keysToTry =
        candidateKeys.length > 0
          ? candidateKeys
          : historicalCustomerKeys;

      for (const candidate of keysToTry) {
        try {
          const conversationKey =
            await decryptConversationKey(
              envelope.encrypted_key,
              identityKeys.privateKey,
              candidate.publicKey
            );

          await saveConversationKey(
            conversationId,
            conversationKey
          );

          return conversationKey;
        } catch (error) {
          lastError = error;
        }
      }
    }

    console.error(
      "CONVERSATION KEY DECRYPTION ERROR:",
      {
        conversationId,
        userId,
        customerId,
        businessOwnerId,
        envelopeUserId:
          envelopes[0]?.user_id,
        envelopeKeyVersions:
          envelopes.map(
            (envelope) =>
              envelope.key_version
          ),
        registeredCustomerKeyVersions:
          historicalCustomerKeys.map(
            (key) =>
              key.key_version
          ),
        error: lastError,
      }
    );

    throw new Error(
      KEY_DECRYPTION_ERROR
    );
  }

  if (userId === businessOwnerId) {
    const businessPublicKey =
      await getUserPublicKey(
        businessOwnerId
      );

    let lastError: unknown = null;

    for (const envelope of envelopes) {
      if (
        envelope.algorithm !==
        ENVELOPE_ALGORITHM
      ) {
        continue;
      }

      try {
        const conversationKey =
          await decryptConversationKey(
            envelope.encrypted_key,
            identityKeys.privateKey,
            businessPublicKey
          );

        await saveConversationKey(
          conversationId,
          conversationKey
        );

        return conversationKey;
      } catch (error) {
        lastError = error;
      }
    }

    console.error(
      "BUSINESS CONVERSATION KEY DECRYPTION ERROR:",
      {
        conversationId,
        userId,
        customerId,
        businessOwnerId,
        envelopeUserId:
          envelopes[0]?.user_id,
        envelopeKeyVersions:
          envelopes.map(
            (envelope) =>
              envelope.key_version
          ),
        error: lastError,
      }
    );

    throw new Error(
      KEY_DECRYPTION_ERROR
    );
  }

  throw new Error(
    KEY_DECRYPTION_ERROR
  );
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
        p_message_id: messageId,
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