type RateLimitRecord = {
  count: number;
  resetTime: number;
};

const store = new Map<string, RateLimitRecord>();

// Set up periodic memory cleanup to prevent memory leaks
if (typeof globalThis !== "undefined") {
  const globalStore = globalThis as any;
  if (!globalStore.__rateLimitCleanupInterval) {
    globalStore.__rateLimitCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of store.entries()) {
        if (now > record.resetTime) {
          store.delete(key);
        }
      }
    }, 60000); // Run cleanup every 60 seconds
  }
}

/**
 * Validates if a client request exceeds the allowed rate limit.
 * 
 * @param ip Client IP address
 * @param action Action name (e.g. "login", "register", "upload")
 * @param limit Maximum requests allowed in the time window
 * @param windowMs Time window in milliseconds
 * @returns Rate limit status details
 */
export function checkRateLimit(
  ip: string,
  action: string,
  limit: number,
  windowMs: number
): { limited: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const key = `${ip}:${action}`;
  const record = store.get(key);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    store.set(key, { count: 1, resetTime });
    return { limited: false, limit, remaining: limit - 1, reset: resetTime };
  }

  record.count++;
  
  if (record.count > limit) {
    return { limited: true, limit, remaining: 0, reset: record.resetTime };
  }

  return {
    limited: false,
    limit,
    remaining: limit - record.count,
    reset: record.resetTime,
  };
}
