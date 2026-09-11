const KEY_VERSION = 1;
const KEY_ALGORITHM = "ECDH-P256+A256GCM";
const IV_LENGTH = 12;
const HKDF_SALT_LENGTH = 32;

type EncryptedConversationKey = {
  v: number;
  algorithm: string;
  iv: string;
  salt: string;
  encryptedKey: string;
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
  const binary = atob(value);
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

export async function encryptConversationKey(
  conversationKey: CryptoKey,
  senderPrivateKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> {
  ensureBrowser();

  if (conversationKey.algorithm.name !== "AES-GCM") {
    throw new Error("Invalid conversation key.");
  }

  if (senderPrivateKey.algorithm.name !== "ECDH") {
    throw new Error("Invalid sender private key.");
  }

  if (recipientPublicKey.algorithm.name !== "ECDH") {
    throw new Error("Invalid recipient public key.");
  }

  const salt = crypto.getRandomValues(
    new Uint8Array(HKDF_SALT_LENGTH)
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

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
    encryptedKey: bytesToBase64(new Uint8Array(encryptedKey)),
  };

  return JSON.stringify(payload);
}

export async function decryptConversationKey(
  encryptedEnvelope: string,
  recipientPrivateKey: CryptoKey,
  senderPublicKey: CryptoKey
): Promise<CryptoKey> {
  ensureBrowser();

  if (recipientPrivateKey.algorithm.name !== "ECDH") {
    throw new Error("Invalid recipient private key.");
  }

  if (senderPublicKey.algorithm.name !== "ECDH") {
    throw new Error("Invalid sender public key.");
  }

  let payload: EncryptedConversationKey;

  try {
    payload = JSON.parse(encryptedEnvelope);
  } catch {
    throw new Error("Invalid encrypted conversation key.");
  }

  if (
    payload.v !== KEY_VERSION ||
    payload.algorithm !== KEY_ALGORITHM ||
    typeof payload.iv !== "string" ||
    typeof payload.salt !== "string" ||
    typeof payload.encryptedKey !== "string"
  ) {
    throw new Error("Unsupported conversation key format.");
  }

  const iv = base64ToBytes(payload.iv);
  const salt = base64ToBytes(payload.salt);
  const encryptedKey = base64ToBytes(payload.encryptedKey);

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid conversation key nonce.");
  }

  if (salt.length !== HKDF_SALT_LENGTH) {
    throw new Error("Invalid conversation key salt.");
  }

  const wrappingKey = await deriveWrappingKey(
    recipientPrivateKey,
    senderPublicKey,
    salt
  );

  try {
    const rawConversationKey = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: bytesToArrayBuffer(iv),
      },
      wrappingKey,
      bytesToArrayBuffer(encryptedKey)
    );

    return crypto.subtle.importKey(
      "raw",
      rawConversationKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  } catch {
    throw new Error("Unable to decrypt conversation key.");
  }
}