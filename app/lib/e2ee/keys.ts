const DB_NAME = "adadi-e2ee";

const STORE_NAME = "keys";

const LEGACY_KEY_ID = "identity";

const IDENTITY_BACKUP_VERSION = 1;
const IDENTITY_BACKUP_ALGORITHM =
  "PBKDF2-SHA256+A256GCM";
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_SALT_LENGTH = 16;
const AES_IV_LENGTH = 12;

type StoredIdentityKeys = {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
};

export type EncryptedIdentityBackup = {
  v: number;
  algorithm: typeof IDENTITY_BACKUP_ALGORITHM;
  salt: string;
  iv: string;
  ciphertext: string;
};

function getIdentityKeyId(userId: string): string {
  return `identity:${userId}`;
}

function ensureBrowser(): void {
  if (
    typeof window === "undefined" ||
    !window.indexedDB ||
    !window.crypto?.subtle
  ) {
    throw new Error(
      "IndexedDB and Web Crypto are required in this browser."
    );
  }
}

function openDatabase(
  version?: number
): Promise<IDBDatabase> {
  ensureBrowser();

  return new Promise((resolve, reject) => {
    const request =
      version === undefined
        ? indexedDB.open(DB_NAME)
        : indexedDB.open(DB_NAME, version);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (
        !db.objectStoreNames.contains(
          STORE_NAME
        )
      ) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
      };

      resolve(db);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error(
            "Unable to open the encryption key database."
          )
      );
    };

    request.onblocked = () => {
      reject(
        new Error(
          "The encryption key database is being used by another browser tab. Please close other ADADI tabs and try again."
        )
      );
    };
  });
}

async function openKeyDatabase(): Promise<IDBDatabase> {
  ensureBrowser();

  for (
    let attempt = 0;
    attempt < 3;
    attempt++
  ) {
    const db = await openDatabase();

    if (
      db.objectStoreNames.contains(
        STORE_NAME
      )
    ) {
      return db;
    }

    const currentVersion = db.version;

    db.close();

    try {
      return await openDatabase(
        currentVersion + 1
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "VersionError"
      ) {
        continue;
      }

      if (
        error instanceof Error &&
        error.name === "VersionError"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Unable to initialize the encryption key database. Please close other ADADI tabs and try again."
  );
}

async function getStoredKeysById(
  keyId: string
): Promise<StoredIdentityKeys | null> {
  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readonly"
    );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    const request = store.get(keyId);

    request.onsuccess = () => {
      resolve(request.result ?? null);
      db.close();
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error(
            "Unable to read encryption keys."
          )
      );

      db.close();
    };

    transaction.onabort = () => {
      reject(
        transaction.error ??
          new Error(
            "Unable to read encryption keys."
          )
      );

      db.close();
    };
  });
}

async function saveKeysById(
  keyId: string,
  keys: StoredIdentityKeys
): Promise<void> {
  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    store.put(keys, keyId);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      reject(
        transaction.error ??
          new Error(
            "Unable to save encryption keys."
          )
      );

      db.close();
    };

    transaction.onabort = () => {
      reject(
        transaction.error ??
          new Error(
            "Unable to save encryption keys."
          )
      );

      db.close();
    };
  });
}

async function generateIdentityKeys(): Promise<StoredIdentityKeys> {
  ensureBrowser();

  const keyPair =
    await crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"]
    );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

function bytesToBase64(
  bytes: Uint8Array
): string {
  let binary = "";

  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        Math.min(
          i + chunkSize,
          bytes.length
        )
      )
    );
  }

  return btoa(binary);
}

function base64ToBytes(
  value: string
): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(
    binary.length
  );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function toArrayBuffer(
  bytes: Uint8Array
): ArrayBuffer {
  const buffer = new ArrayBuffer(
    bytes.byteLength
  );

  new Uint8Array(buffer).set(bytes);

  return buffer;
}

async function deriveBackupKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  if (!password) {
    throw new Error(
      "An ADADI password is required to protect the encryption identity."
    );
  }

  const passwordBytes =
    new TextEncoder().encode(password);

  const passwordKey =
    await crypto.subtle.importKey(
      "raw",
      toArrayBuffer(passwordBytes),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function exportIdentityKeys(
  userId: string
): Promise<{
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}> {
  const keys =
    await getStoredIdentityKeys(userId);

  if (!keys) {
    throw new Error(
      "No local encryption identity exists in this browser."
    );
  }

  const publicKey =
    await crypto.subtle.exportKey(
      "jwk",
      keys.publicKey
    );

  const privateKey =
    await crypto.subtle.exportKey(
      "jwk",
      keys.privateKey
    );

  return {
    publicKey,
    privateKey,
  };
}

async function importIdentityKeys(
  userId: string,
  exported: {
    publicKey: JsonWebKey;
    privateKey: JsonWebKey;
  }
): Promise<StoredIdentityKeys> {
  ensureBrowser();

  const publicKey =
    await crypto.subtle.importKey(
      "jwk",
      exported.publicKey,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      []
    );

  const privateKey =
    await crypto.subtle.importKey(
      "jwk",
      exported.privateKey,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"]
    );

  const keys = {
    publicKey,
    privateKey,
  };

  await saveKeysById(
    getIdentityKeyId(userId),
    keys
  );

  return keys;
}

export async function createEncryptedIdentityBackup(
  userId: string,
  password: string
): Promise<EncryptedIdentityBackup> {
  ensureBrowser();

  if (!userId) {
    throw new Error(
      "User ID is required to create an encryption identity backup."
    );
  }

  if (!password) {
    throw new Error(
      "Your ADADI password is required to create the secure messaging backup."
    );
  }

  const identity =
    await exportIdentityKeys(userId);

  const identityJson =
    JSON.stringify(identity);

  const salt = crypto.getRandomValues(
    new Uint8Array(
      PBKDF2_SALT_LENGTH
    )
  );

  const iv = crypto.getRandomValues(
    new Uint8Array(AES_IV_LENGTH)
  );

  const backupKey =
    await deriveBackupKey(
      password,
      salt
    );

  const plaintext =
    new TextEncoder().encode(
      identityJson
    );

  const ciphertext =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(iv),
      },
      backupKey,
      toArrayBuffer(plaintext)
    );

  return {
    v: IDENTITY_BACKUP_VERSION,
    algorithm:
      IDENTITY_BACKUP_ALGORITHM,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(
      new Uint8Array(ciphertext)
    ),
  };
}

export async function restoreIdentityFromBackup(
  userId: string,
  backup: EncryptedIdentityBackup,
  password: string
): Promise<StoredIdentityKeys> {
  ensureBrowser();

  if (!userId) {
    throw new Error(
      "User ID is required to restore the encryption identity."
    );
  }

  if (!password) {
    throw new Error(
      "Your ADADI password is required to restore the secure messaging identity."
    );
  }

  if (
    backup.v !==
    IDENTITY_BACKUP_VERSION
  ) {
    throw new Error(
      "Unsupported encryption identity backup version."
    );
  }

  if (
    backup.algorithm !==
    IDENTITY_BACKUP_ALGORITHM
  ) {
    throw new Error(
      "Unsupported encryption identity backup algorithm."
    );
  }

  const salt =
    base64ToBytes(backup.salt);

  const iv =
    base64ToBytes(backup.iv);

  const ciphertext =
    base64ToBytes(
      backup.ciphertext
    );

  if (
    salt.length !==
    PBKDF2_SALT_LENGTH
  ) {
    throw new Error(
      "Invalid encryption identity backup salt."
    );
  }

  if (
    iv.length !== AES_IV_LENGTH
  ) {
    throw new Error(
      "Invalid encryption identity backup IV."
    );
  }

  const backupKey =
    await deriveBackupKey(
      password,
      salt
    );

  let plaintext: ArrayBuffer;

  try {
    plaintext =
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: toArrayBuffer(iv),
        },
        backupKey,
        toArrayBuffer(ciphertext)
      );
  } catch {
    throw new Error(
      "Unable to decrypt your secure messaging identity backup. Please check your ADADI password and try again."
    );
  }

  let exported: {
    publicKey: JsonWebKey;
    privateKey: JsonWebKey;
  };

  try {
    exported = JSON.parse(
      new TextDecoder().decode(
        new Uint8Array(plaintext)
      )
    );
  } catch {
    throw new Error(
      "The secure messaging identity backup is invalid."
    );
  }

  if (
    !exported?.publicKey ||
    !exported?.privateKey
  ) {
    throw new Error(
      "The secure messaging identity backup is incomplete."
    );
  }

  return importIdentityKeys(
    userId,
    exported
  );
}

export async function getStoredIdentityKeys(
  userId?: string
): Promise<StoredIdentityKeys | null> {
  if (typeof window === "undefined") {
    throw new Error(
      "Encryption keys can only be accessed in the browser."
    );
  }

  if (!userId) {
    return getStoredKeysById(
      LEGACY_KEY_ID
    );
  }

  return getStoredKeysById(
    getIdentityKeyId(userId)
  );
}

export async function createIdentityKeys(
  userId?: string
): Promise<StoredIdentityKeys> {
  if (typeof window === "undefined") {
    throw new Error(
      "Encryption keys can only be accessed in the browser."
    );
  }

  const keyId = userId
    ? getIdentityKeyId(userId)
    : LEGACY_KEY_ID;

  const existing =
    await getStoredKeysById(keyId);

  if (existing) {
    return existing;
  }

  const keys =
    await generateIdentityKeys();

  await saveKeysById(
    keyId,
    keys
  );

  return keys;
}

export async function getOrCreateIdentityKeys(
  userId?: string
): Promise<StoredIdentityKeys> {
  const existing =
    await getStoredIdentityKeys(
      userId
    );

  if (existing) {
    return existing;
  }

  return createIdentityKeys(userId);
}

export async function exportPublicKey(
  userId?: string
): Promise<string> {
  const keys =
    await getOrCreateIdentityKeys(
      userId
    );

  const exported =
    await crypto.subtle.exportKey(
      "jwk",
      keys.publicKey
    );

  return JSON.stringify(exported);
}

export async function exportStoredPublicKey(
  userId?: string
): Promise<string> {
  const keys =
    await getStoredIdentityKeys(
      userId
    );

  if (!keys) {
    throw new Error(
      "No local encryption identity exists in this browser."
    );
  }

  const exported =
    await crypto.subtle.exportKey(
      "jwk",
      keys.publicKey
    );

  return JSON.stringify(exported);
}

export async function getPrivateKey(
  userId?: string
): Promise<CryptoKey> {
  const keys =
    await getStoredIdentityKeys(
      userId
    );

  if (!keys) {
    throw new Error(
      "No local encryption identity exists in this browser."
    );
  }

  return keys.privateKey;
}

export async function getStoredPublicKey(
  userId?: string
): Promise<CryptoKey> {
  const keys =
    await getStoredIdentityKeys(
      userId
    );

  if (!keys) {
    throw new Error(
      "No local encryption identity exists in this browser."
    );
  }

  return keys.publicKey;
}

export async function getPublicKeyFingerprint(
  userId?: string
): Promise<string> {
  const publicKey =
    await exportStoredPublicKey(
      userId
    );

  const data =
    new TextEncoder().encode(
      publicKey
    );

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return Array.from(
    new Uint8Array(hash)
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}