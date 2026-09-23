const KEY_VERSION = 1;
const KEY_ALGORITHM = "ECDH-P256+A256GCM";

const IV_LENGTH = 12;
const HKDF_SALT_LENGTH = 32;
const CONVERSATION_KEY_LENGTH = 256;

type EncryptedConversationKey = {
  v: number;
  algorithm: string;
  iv: string;
  salt: string;
  encryptedKey: string;
};

type ECDHAlgorithm = {
  name: string;
  namedCurve?: string;
};

function ensureBrowser(): void {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto is not available in this browser.");
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  let binary: string;

  try {
    binary = atob(value);
  } catch {
    throw new Error("Invalid encrypted conversation key encoding.");
  }

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function validateEcdhKey(
  key: CryptoKey,
  keyName: string
): void {
  if (key.algorithm.name !== "ECDH") {
    throw new Error(`Invalid ${keyName}.`);
  }

  const algorithm = key.algorithm as ECDHAlgorithm;

  if (algorithm.namedCurve !== "P-256") {
    throw new Error(`Invalid ${keyName} curve.`);
  }
}

function validateConversationKey(key: CryptoKey): void {
  if (key.algorithm.name !== "AES-GCM") {
    throw new Error("Invalid conversation key.");
  }

  const algorithm = key.algorithm as AesKeyAlgorithm;

  if (algorithm.length !== 256) {
    throw new Error("Invalid conversation key length.");
  }
}

async function deriveWrappingKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  salt: Uint8Array
): Promise<CryptoKey> {
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    256
  );

  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: bytesToArrayBuffer(salt),
      info: bytesToArrayBuffer(
        new TextEncoder().encode("ADADI conversation key")
      ),
    },
    hkdfKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

function parseEncryptedConversationKey(
  encryptedEnvelope: string
): EncryptedConversationKey {
  let payload: unknown;

  try {
    payload = JSON.parse(encryptedEnvelope);
  } catch {
    throw new Error("Invalid encrypted conversation key.");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid encrypted conversation key.");
  }

  const value = payload as Partial<EncryptedConversationKey>;

  if (
    value.v !== KEY_VERSION ||
    value.algorithm !== KEY_ALGORITHM ||
    typeof value.iv !== "string" ||
    typeof value.salt !== "string" ||
    typeof value.encryptedKey !== "string"
  ) {
    throw new Error("Unsupported conversation key format.");
  }

  return {
    v: value.v,
    algorithm: value.algorithm,
    iv: value.iv,
    salt: value.salt,
    encryptedKey: value.encryptedKey,
  };
}

export async function encryptConversationKey(
  conversationKey: CryptoKey,
  senderPrivateKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> {
  ensureBrowser();

  validateConversationKey(conversationKey);
  validateEcdhKey(senderPrivateKey, "sender private key");
  validateEcdhKey(recipientPublicKey, "recipient public key");

  const salt = crypto.getRandomValues(
    new Uint8Array(HKDF_SALT_LENGTH)
  );

  const iv = crypto.getRandomValues(
    new Uint8Array(IV_LENGTH)
  );

  const wrappingKey = await deriveWrappingKey(
    senderPrivateKey,
    recipientPublicKey,
    salt
  );

  const rawConversationKey = await crypto.subtle.exportKey(
    "raw",
    conversationKey
  );

  const encryptedKey = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: bytesToArrayBuffer(iv),
    },
    wrappingKey,
    rawConversationKey
  );

  const payload: EncryptedConversationKey = {
    v: KEY_VERSION,
    algorithm: KEY_ALGORITHM,
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    encryptedKey: bytesToBase64(
      new Uint8Array(encryptedKey)
    ),
  };

  return JSON.stringify(payload);
}

export async function decryptConversationKey(
  encryptedEnvelope: string,
  recipientPrivateKey: CryptoKey,
  senderPublicKey: CryptoKey
): Promise<CryptoKey> {
  ensureBrowser();

  validateEcdhKey(
    recipientPrivateKey,
    "recipient private key"
  );

  validateEcdhKey(
    senderPublicKey,
    "sender public key"
  );

  const payload =
    parseEncryptedConversationKey(encryptedEnvelope);

  const iv = base64ToBytes(payload.iv);
  const salt = base64ToBytes(payload.salt);
  const encryptedKey = base64ToBytes(
    payload.encryptedKey
  );

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid conversation key nonce.");
  }

  if (salt.length !== HKDF_SALT_LENGTH) {
    throw new Error("Invalid conversation key salt.");
  }

  if (encryptedKey.length === 0) {
    throw new Error("Invalid encrypted conversation key.");
  }

  const wrappingKey = await deriveWrappingKey(
    recipientPrivateKey,
    senderPublicKey,
    salt
  );

  try {
    const rawConversationKey =
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: bytesToArrayBuffer(iv),
        },
        wrappingKey,
        bytesToArrayBuffer(encryptedKey)
      );

    if (
      rawConversationKey.byteLength !==
      CONVERSATION_KEY_LENGTH / 8
    ) {
      throw new Error("Invalid conversation key length.");
    }

    return await crypto.subtle.importKey(
      "raw",
      rawConversationKey,
      {
        name: "AES-GCM",
        length: CONVERSATION_KEY_LENGTH,
      },
      true,
      ["encrypt", "decrypt"]
    );
  } catch {
    throw new Error("Unable to decrypt conversation key.");
  }
}