const MESSAGE_VERSION = 1;
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;

type EncryptedMessagePayload = {
  v: number;
  iv: string;
  ciphertext: string;
};

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

function ensureBrowser(): void {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto is not available in this browser.");
  }
}

export async function generateConversationKey(): Promise<CryptoKey> {
  ensureBrowser();

  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(
  plaintext: string,
  conversationKey: CryptoKey
): Promise<string> {
  ensureBrowser();

  if (!plaintext.trim()) {
    throw new Error("Message cannot be empty.");
  }

  if (conversationKey.algorithm.name !== "AES-GCM") {
    throw new Error("Invalid conversation encryption key.");
  }

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedMessage = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: bytesToArrayBuffer(iv),
    },
    conversationKey,
    bytesToArrayBuffer(encodedMessage)
  );

  const payload: EncryptedMessagePayload = {
    v: MESSAGE_VERSION,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };

  return JSON.stringify(payload);
}

export async function decryptMessage(
  encryptedMessage: string,
  conversationKey: CryptoKey
): Promise<string> {
  ensureBrowser();

  if (conversationKey.algorithm.name !== "AES-GCM") {
    throw new Error("Invalid conversation encryption key.");
  }

  let payload: EncryptedMessagePayload;

  try {
    payload = JSON.parse(encryptedMessage);
  } catch {
    throw new Error("Invalid encrypted message.");
  }

  if (
    payload.v !== MESSAGE_VERSION ||
    typeof payload.iv !== "string" ||
    typeof payload.ciphertext !== "string"
  ) {
    throw new Error("Unsupported encrypted message format.");
  }

  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid encryption nonce.");
  }

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: bytesToArrayBuffer(iv),
      },
      conversationKey,
      bytesToArrayBuffer(ciphertext)
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("Unable to decrypt message.");
  }
}

export async function exportConversationKey(
  conversationKey: CryptoKey
): Promise<string> {
  ensureBrowser();

  if (conversationKey.algorithm.name !== "AES-GCM") {
    throw new Error("Invalid conversation encryption key.");
  }

  const rawKey = await crypto.subtle.exportKey("raw", conversationKey);

  return bytesToBase64(new Uint8Array(rawKey));
}

export async function importConversationKey(
  encodedKey: string
): Promise<CryptoKey> {
  ensureBrowser();

  const rawKey = base64ToBytes(encodedKey);

  if (rawKey.length !== AES_KEY_LENGTH / 8) {
    throw new Error("Invalid conversation key.");
  }

  return crypto.subtle.importKey(
    "raw",
    bytesToArrayBuffer(rawKey),
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH,
    },
    true,
    ["encrypt", "decrypt"]
  );
}