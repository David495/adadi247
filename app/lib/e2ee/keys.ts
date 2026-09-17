const DB_NAME = "adadi-e2ee";
const STORE_NAME = "keys";
const KEY_ID = "identity";

type StoredIdentityKeys = {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
};

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

async function getStoredKeys(): Promise<StoredIdentityKeys | null> {
  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readonly"
    );

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

export async function getStoredIdentityKeys(): Promise<
  StoredIdentityKeys | null
> {
  if (typeof window === "undefined") {
    throw new Error(
      "Encryption keys can only be accessed in the browser."
    );
  }

  return getStoredKeys();
}

export async function createIdentityKeys(): Promise<StoredIdentityKeys> {
  const existing = await getStoredKeys();

  if (existing) {
    return existing;
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

export async function getOrCreateIdentityKeys(): Promise<StoredIdentityKeys> {
  const existing = await getStoredIdentityKeys();

  if (existing) {
    return existing;
  }

  return createIdentityKeys();
}

export async function exportPublicKey(): Promise<string> {
  const keys = await getOrCreateIdentityKeys();

  const exported = await crypto.subtle.exportKey(
    "jwk",
    keys.publicKey
  );

  return JSON.stringify(exported);
}

export async function exportStoredPublicKey(): Promise<string> {
  const keys = await getStoredIdentityKeys();

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

export async function getPrivateKey(): Promise<CryptoKey> {
  const keys = await getStoredIdentityKeys();

  if (!keys) {
    throw new Error(
      "No local encryption identity exists in this browser."
    );
  }

  return keys.privateKey;
}

export async function getStoredPublicKey(): Promise<CryptoKey> {
  const keys = await getStoredIdentityKeys();

  if (!keys) {
    throw new Error(
      "No local encryption identity exists in this browser."
    );
  }

  return keys.publicKey;
}

export async function getPublicKeyFingerprint(): Promise<string> {
  const publicKey = await exportStoredPublicKey();

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