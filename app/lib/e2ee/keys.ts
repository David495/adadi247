const DB_NAME = "adadi-e2ee";
const DB_VERSION = 2;
const STORE_NAME = "keys";
const KEY_ID = "identity";

type StoredIdentityKeys = {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
};

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(
        new Error("IndexedDB is not available in this browser.")
      );
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

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

async function getStoredKeys(): Promise<StoredIdentityKeys | null> {
  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(KEY_ID);

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

async function saveKeys(
  keys: StoredIdentityKeys
): Promise<void> {
  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );
    const store = transaction.objectStore(STORE_NAME);

    store.put(keys, KEY_ID);

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

export async function getOrCreateIdentityKeys(): Promise<StoredIdentityKeys> {
  if (typeof window === "undefined") {
    throw new Error(
      "Encryption keys can only be accessed in the browser."
    );
  }

  const existingKeys = await getStoredKeys();

  if (existingKeys) {
    return existingKeys;
  }

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );

  const keys: StoredIdentityKeys = {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };

  await saveKeys(keys);

  return keys;
}

export async function exportPublicKey(): Promise<string> {
  const { publicKey } =
    await getOrCreateIdentityKeys();

  const exported = await crypto.subtle.exportKey(
    "jwk",
    publicKey
  );

  return JSON.stringify(exported);
}

export async function getPublicKeyFingerprint(): Promise<string> {
  const publicKey = await exportPublicKey();
  const data = new TextEncoder().encode(publicKey);
  const hash = await crypto.subtle.digest(
    "SHA-256",
    data
  );
  const bytes = new Uint8Array(hash);

  return Array.from(bytes)
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

export async function getPrivateKey(): Promise<CryptoKey> {
  const { privateKey } =
    await getOrCreateIdentityKeys();

  return privateKey;
}

export async function getStoredPublicKey(): Promise<CryptoKey> {
  const { publicKey } =
    await getOrCreateIdentityKeys();

  return publicKey;
}