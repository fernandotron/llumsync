import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "temporary_development_key_32_bytes_long_minimum!"; // 32 bytes

// Derive a 32-byte key from the environment key if it is not exactly 32 bytes
const getKey = (): Buffer => {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
};

/**
 * Encrypts a plain text string using AES-256-GCM.
 * Returns a formatted string: "iv:ciphertext:tag" (in hex).
 */
export function encrypt(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  
  // Handle stringified JSON or plain string
  const stringVal = typeof text === "object" ? JSON.stringify(text) : String(text);
  
  try {
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    
    let encrypted = cipher.update(stringVal, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const tag = cipher.getAuthTag().toString("hex");
    
    return `${iv.toString("hex")}:${encrypted}:${tag}`;
  } catch (error) {
    console.error("Encryption error:", error);
    return stringVal;
  }
}

/**
 * Decrypts a ciphertext string in "iv:ciphertext:tag" format.
 * Returns the decrypted plain text, or the original text if it's not encrypted.
 */
export function decrypt(cipherText: string | null | undefined): string | null {
  if (!cipherText) return null;
  
  const parts = cipherText.split(":");
  // If it doesn't match the format "iv:encrypted:tag", it is likely unencrypted/legacy data
  if (parts.length !== 3) {
    return cipherText;
  }
  
  try {
    const [ivHex, encryptedHex, tagHex] = parts;
    
    // Validate hex string lengths to avoid parsing errors
    if (ivHex.length !== 24 || tagHex.length !== 32) {
      return cipherText; // Return as-is if it doesn't match AES-GCM IV and Tag length specs
    }
    
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    // If decryption fails, log it and return the original text as a fallback
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
