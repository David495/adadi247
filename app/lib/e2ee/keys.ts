const DB_NAME = "adadi-e2ee";
const STORE_NAME = "keys";
const LEGACY_KEY_ID = "identity";

type StoredIdentityKeys = {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
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

function openDatabase(version?: number): Promise<IDBDatabase> {
  ensureBrowser();

  return new Promise((resolve, reject) => {
    const request =
      version === undefined
        ? indexedDB.open(DB_NAME)
        : indexedDB.open(DB_NAME, version);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
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
          new Error("Unable to open the encryption key database.")
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

  for (let attempt = 0; attempt < 3; attempt++) {
    const db = await openDatabase();

    if (db.objectStoreNames.contains(STORE_NAME)) {
      return db;
    }

    const currentVersion = db.version;
    db.close();

    try {
      return await openDatabase(currentVersion + 1);
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
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(keyId);

    request.onsuccess = () => {
      resolve(request.result ?? null);
      db.close();
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error("Unable to read encryption keys.")
      );
      db.close();
    };

    transaction.onabort = () => {
      reject(
        transaction.error ??
          new Error("Unable to read encryption keys.")
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
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.put(keys, keyId);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      reject(
        transaction.error ??
          new Error("Unable to save encryption keys.")
      );
      db.close();
    };

    transaction.onabort = () => {
      reject(
        transaction.error ??
          new Error("Unable to save encryption keys.")
      );
      db.close();
    };
  });
}

async function generateIdentityKeys(): Promise<StoredIdentityKeys> {
  ensureBrowser();

  const keyPair = await crypto.subtle.generateKey(
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

export async function getStoredIdentityKeys(
  userId?: string
): Promise<StoredIdentityKeys | null> {
  if (typeof window === "undefined") {
    throw new Error(
      "Encryption keys can only be accessed in the browser."
    );
  }

  if (!userId) {
    return getStoredKeysById(LEGACY_KEY_ID);
  }

  return getStoredKeysById(getIdentityKeyId(userId));
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

  const existing = await getStoredKeysById(keyId);

  if (existing) {
    return existing;
  }

  const keys = await generateIdentityKeys();

  await saveKeysById(keyId, keys);

  return keys;
}

export async function getOrCreateIdentityKeys(
  userId?: string
): Promise<StoredIdentityKeys> {
  const existing = await getStoredIdentityKeys(userId);

  if (existing) {
    return existing;
  }

  return createIdentityKeys(userId);
}

export async function exportPublicKey(
  userId?: string
): Promise<string> {
  const keys = await getOrCreateIdentityKeys(userId);

  const exported = await crypto.subtle.exportKey(
    "jwk",
    keys.publicKey
  );

  return JSON.stringify(exported);
}

export async function exportStoredPublicKey(
  userId?: string
): Promise<string> {
  const keys = await getStoredIdentityKeys(userId);

  if (!keys) {
    throw new Error(
      "No local encryption identity exists in this browser."
    );
  }

  const exported = await crypto.subtle.exportKey(
    "jwk",
    keys.publicKey
  );

  return JSON.stringify(exported);
}

export async function getPrivateKey(
  userId?: string
): Promise<CryptoKey> {
  const keys = await getStoredIdentityKeys(userId);

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
  const keys = await getStoredIdentityKeys(userId);

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
  const publicKey = await exportStoredPublicKey(userId);

  const data = new TextEncoder().encode(publicKey);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(new Uint8Array(hash))
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}