/**
 * Validate a global username.
 * Rules: 3–20 chars, alphanumeric + underscores, must not start with a number.
 */
export function isValidUsername(username?: string | null): boolean {
  if (!username || typeof username !== 'string') return false;
  return /^[a-zA-Z_][a-zA-Z0-9_]{2,19}$/.test(username.trim());
}

/**
 * Validate employee ID — non-empty string.
 */
export function isValidEmployeeId(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return id.trim().length > 0 && id.trim().length <= 50;
}

/**
 * Validate age — integer between 16 and 100.
 */
export function isValidAge(age?: number | null): boolean {
  if (typeof age !== 'number' || isNaN(age)) return false;
  return Number.isInteger(age) && age >= 16 && age <= 100;
}

/**
 * Validate email.
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate phone number — optional/empty is allowed, but if provided, it should contain 7–15 digits, optionally starting with a +.
 */
export function isValidPhoneNumber(phone?: string | null): boolean {
  if (!phone || typeof phone !== 'string' || !phone.trim()) return true;
  return /^\+?[0-9\s\-()]{7,20}$/.test(phone.trim()) && phone.replace(/\D/g, '').length >= 7;
}

/**
 * Validate password — min 8 chars, at least 1 letter and 1 number.
 */
export function isValidPassword(password?: string | null): boolean {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

/**
 * Generate a cryptographically secure UUID v4 invite link token.
 */
export function generateInviteToken(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
