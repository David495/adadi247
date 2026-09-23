const DB_NAME = "adadi-e2ee";
const STORE_NAME = "conversation-keys";

type StoredConversationKey = {
  conversationId: string;
  key: CryptoKey;
  createdAt: number;
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
        db.createObjectStore(STORE_NAME, {
          keyPath: "conversationId",
        });
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
          "The encryption key database is being used by another tab. Please close other ADADI tabs and try again."
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

function isStoredConversationKey(
  value: unknown,
  conversationId: string
): value is StoredConversationKey {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<StoredConversationKey>;

  return (
    record.conversationId === conversationId &&
    record.key instanceof CryptoKey &&
    typeof record.createdAt === "number"
  );
}

export async function saveConversationKey(
  conversationId: string,
  key: CryptoKey
): Promise<void> {
  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.put({
      conversationId,
      key,
      createdAt: Date.now(),
    } satisfies StoredConversationKey);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(
        transaction.error ??
          new Error("Unable to save the conversation key.")
      );
    };

    transaction.onabort = () => {
      db.close();
      reject(
        transaction.error ??
          new Error("Unable to save the conversation key.")
      );
    };
  });
}

export async function getConversationKey(
  conversationId: string
): Promise<CryptoKey | null> {
  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(conversationId);

    request.onsuccess = () => {
      const result = request.result as unknown;

      db.close();

      if (!isStoredConversationKey(result, conversationId)) {
        resolve(null);
        return;
      }

      resolve(result.key);
    };

    request.onerror = () => {
      db.close();
      reject(
        request.error ??
          new Error("Unable to retrieve the conversation key.")
      );
    };

    transaction.onabort = () => {
      db.close();
      reject(
        transaction.error ??
          new Error("Unable to retrieve the conversation key.")
      );
    };
  });
}

export async function hasConversationKey(
  conversationId: string
): Promise<boolean> {
  const key = await getConversationKey(conversationId);
  return key !== null;
}

export async function deleteConversationKey(
  conversationId: string
): Promise<void> {
  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.delete(conversationId);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(
        transaction.error ??
          new Error("Unable to delete the conversation key.")
      );
    };

    transaction.onabort = () => {
      db.close();
      reject(
        transaction.error ??
          new Error("Unable to delete the conversation key.")
      );
    };
  });
}

export async function clearConversationKeys(): Promise<void> {
  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(
        transaction.error ??
          new Error("Unable to clear conversation keys.")
      );
    };

    transaction.onabort = () => {
      db.close();
      reject(
        transaction.error ??
          new Error("Unable to clear conversation keys.")
      );
    };
  });
}