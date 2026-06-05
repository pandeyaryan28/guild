/**
 * Validate a global username.
 * Rules: 3–20 chars, alphanumeric + underscores, must not start with a number.
 */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]{2,19}$/.test(username);
}

/**
 * Validate an organization slug.
 * Rules: 3–30 chars, lowercase alphanumeric + hyphens, must start with a letter.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z][a-z0-9-]{2,29}$/.test(slug);
}

/**
 * Slugify an organization name into a valid slug.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
}

/**
 * Validate employee ID — non-empty string.
 */
export function isValidEmployeeId(id: string): boolean {
  return id.trim().length > 0 && id.trim().length <= 50;
}

/**
 * Validate age — integer between 16 and 100.
 */
export function isValidAge(age: number): boolean {
  return Number.isInteger(age) && age >= 16 && age <= 100;
}

/**
 * Validate email.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone number — optional/empty is allowed, but if provided, it should contain 7–15 digits, optionally starting with a +.
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone.trim()) return true;
  return /^\+?[0-9\s\-()]{7,20}$/.test(phone.trim()) && phone.replace(/\D/g, '').length >= 7;
}

/**
 * Validate password — min 8 chars, at least 1 letter and 1 number.
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

/**
 * Generate a UUID v4 invite link token.
 */
export function generateInviteToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
