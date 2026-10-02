import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "temporary_development_key_32_bytes_long_minimum!"; // 32 bytes

// Derive a 32-byte key from the environment key if it is not exactly 32 bytes
const getKey = (): Buffer => {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
};

/**
 * Helper to determine if a string is already encrypted in AES-256-GCM hex format (iv:ciphertext:tag).
 */
export function isEncrypted(text: string | null | undefined): boolean {
  if (!text || typeof text !== "string") return false;
  const parts = text.split(":");
  if (parts.length !== 3) return false;
  const [ivHex, cipherHex, tagHex] = parts;
  return (
    ivHex.length === 24 &&
    tagHex.length === 32 &&
    cipherHex.length > 0 &&
    /^[0-9a-f]{24}$/i.test(ivHex) &&
    /^[0-9a-f]{32}$/i.test(tagHex) &&
    /^[0-9a-f]+$/i.test(cipherHex)
  );
}

/**
 * Encrypts a plain text string using AES-256-GCM.
 * Returns a formatted string: "iv:ciphertext:tag" (in hex).
 * Idempotent: If text is already encrypted, returns it without double encrypting.
 * Fail-closed: Throws an error if encryption fails instead of leaking plaintext.
 */
export function encrypt(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  
  // Handle stringified JSON or plain string
  const stringVal = typeof text === "object" ? JSON.stringify(text) : String(text);
  if (!stringVal) return stringVal;

  // Prevent double-encryption bug: return as-is if already encrypted
  if (isEncrypted(stringVal)) {
    return stringVal;
  }
  
  try {
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    
    let encrypted = cipher.update(stringVal, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const tag = cipher.getAuthTag().toString("hex");
    
    return `${iv.toString("hex")}:${encrypted}:${tag}`;
  } catch (error) {
    console.error("Encryption critical error:", error);
    // Fail-closed security rule: Never fall back to plaintext storage
    throw new Error("Error crítico de seguridad: Fallo al cifrar datos médicos/sensibles.");
  }
}

/**
 * Decrypts a ciphertext string in "iv:ciphertext:tag" format.
 * Returns the decrypted plain text, or the original text if it's not encrypted.
 */
export function decrypt(cipherText: string | null | undefined): string | null {
  if (!cipherText) return null;
  if (typeof cipherText !== "string") return cipherText;
  
  if (!isEncrypted(cipherText)) {
    return cipherText;
  }
  
  try {
    const [ivHex, encryptedHex, tagHex] = cipherText.split(":");
    
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed, fallback to original value:", error);
    return cipherText;
  }
}

/**
 * Hashes a password using crypto.scrypt.
 * Returns "salt:hash" in hex.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a password against a salt:hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  try {
    const [salt, key] = storedHash.split(":");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(derivedKey.toString("hex")), Buffer.from(key));
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}
