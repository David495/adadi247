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

function createConversationKeyStore(
  db: IDBDatabase
): void {
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, {
      keyPath: "conversationId",
    });
  }
}

function openDatabase(
  version?: number
): Promise<IDBDatabase> {
  ensureBrowser();

  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;

    try {
      request =
        version === undefined
          ? indexedDB.open(DB_NAME)
          : indexedDB.open(DB_NAME, version);
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error(
              "Unable to open the encryption key database."
            )
      );
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;

      createConversationKeyStore(db);
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
          "The encryption key database is being used by another tab. Close other ADADI tabs and try again."
        )
      );
    };
  });
}

async function openKeyDatabase(): Promise<IDBDatabase> {
  const db = await openDatabase();

  if (db.objectStoreNames.contains(STORE_NAME)) {
    return db;
  }

  const currentVersion = db.version;

  db.close();

  return openDatabase(currentVersion + 1);
}

export async function saveConversationKey(
  conversationId: string,
  key: CryptoKey
): Promise<void> {
  ensureBrowser();

  if (!conversationId) {
    throw new Error("Conversation ID is required.");
  }

  if (key.algorithm.name !== "AES-GCM") {
    throw new Error(
      "Only AES-GCM conversation keys can be stored."
    );
  }

  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;

    try {
      transaction = db.transaction(
        STORE_NAME,
        "readwrite"
      );
    } catch (error) {
      db.close();

      reject(
        error instanceof Error
          ? error
          : new Error(
              "Unable to access the conversation key store."
            )
      );

      return;
    }

    const store = transaction.objectStore(STORE_NAME);

    const value: StoredConversationKey = {
      conversationId,
      key,
      createdAt: Date.now(),
    };

    store.put(value);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      const error =
        transaction.error ??
        new Error("Unable to save conversation key.");

      db.close();
      reject(error);
    };

    transaction.onabort = () => {
      const error =
        transaction.error ??
        new Error("Unable to save conversation key.");

      db.close();
      reject(error);
    };
  });
}

export async function getConversationKey(
  conversationId: string
): Promise<CryptoKey | null> {
  ensureBrowser();

  if (!conversationId) {
    throw new Error("Conversation ID is required.");
  }

  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;

    try {
      transaction = db.transaction(
        STORE_NAME,
        "readonly"
      );
    } catch (error) {
      db.close();

      reject(
        error instanceof Error
          ? error
          : new Error(
              "Unable to access the conversation key store."
            )
      );

      return;
    }

    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(conversationId);

    request.onsuccess = () => {
      const stored =
        request.result as
          | StoredConversationKey
          | undefined;

      db.close();
      resolve(stored?.key ?? null);
    };

    request.onerror = () => {
      const error =
        request.error ??
        new Error("Unable to read conversation key.");

      db.close();
      reject(error);
    };

    transaction.onabort = () => {
      const error =
        transaction.error ??
        new Error("Unable to read conversation key.");

      db.close();
      reject(error);
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
  ensureBrowser();

  if (!conversationId) {
    throw new Error("Conversation ID is required.");
  }

  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;

    try {
      transaction = db.transaction(
        STORE_NAME,
        "readwrite"
      );
    } catch (error) {
      db.close();

      reject(
        error instanceof Error
          ? error
          : new Error(
              "Unable to access the conversation key store."
            )
      );

      return;
    }

    const store = transaction.objectStore(STORE_NAME);

    store.delete(conversationId);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      const error =
        transaction.error ??
        new Error(
          "Unable to delete conversation key."
        );

      db.close();
      reject(error);
    };

    transaction.onabort = () => {
      const error =
        transaction.error ??
        new Error(
          "Unable to delete conversation key."
        );

      db.close();
      reject(error);
    };
  });
}

export async function clearConversationKeys(): Promise<void> {
  ensureBrowser();

  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;

    try {
      transaction = db.transaction(
        STORE_NAME,
        "readwrite"
      );
    } catch (error) {
      db.close();

      reject(
        error instanceof Error
          ? error
          : new Error(
              "Unable to access the conversation key store."
            )
      );

      return;
    }

    const store = transaction.objectStore(STORE_NAME);

    store.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      const error =
        transaction.error ??
        new Error(
          "Unable to clear conversation keys."
        );

      db.close();
      reject(error);
    };

    transaction.onabort = () => {
      const error =
        transaction.error ??
        new Error(
          "Unable to clear conversation keys."
        );

      db.close();
      reject(error);
    };
  });
}