// Web Crypto API utility for encrypting/decrypting sensitive face descriptors

const ALGORITHM = 'AES-GCM';
const SALT_SIZE = 16;
const IV_SIZE = 12;

// Generate a key from a password
export async function deriveKey(password: string, salt?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const actualSalt = salt || crypto.getRandomValues(new Uint8Array(SALT_SIZE));

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: actualSalt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, salt: actualSalt };
}

let cachedKey: CryptoKey | null = null;
export async function getAppCryptoKey(): Promise<{ key: CryptoKey }> {
  if (cachedKey) return { key: cachedKey };
  // Hardcoded salt for MVP, in production this should be stored securely
  const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const result = await deriveKey('FaceFinderSecureMVP', salt);
  cachedKey = result.key;
  return { key: cachedKey };
}

export async function encryptData(key: CryptoKey, data: any): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
  const encoded = enc.encode(JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptData(key: CryptoKey, ciphertext: string, ivStr: string): Promise<any> {
  const dec = new TextDecoder();
  const encryptedBytes = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
  const iv = new Uint8Array(atob(ivStr).split('').map(c => c.charCodeAt(0)));

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encryptedBytes
  );

  return JSON.parse(dec.decode(decrypted));
}
