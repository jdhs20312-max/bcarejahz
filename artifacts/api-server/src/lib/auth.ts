import crypto from "crypto";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? "";
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD ?? "Adm!n@2025#SecureKey9x";

export function checkCredentials(username: string, password: string): boolean {
  const usernameMatch = username === ADMIN_USERNAME;
  if (!usernameMatch) return false;

  if (ADMIN_PASSWORD_HASH) {
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    return hash === ADMIN_PASSWORD_HASH;
  }

  return password === ADMIN_PASSWORD_PLAIN;
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const tokenSet = new Set<string>();

export function storeToken(token: string): void {
  tokenSet.add(token);
  setTimeout(() => tokenSet.delete(token), 24 * 60 * 60 * 1000);
}

export function validateToken(token: string): boolean {
  return tokenSet.has(token);
}

export function revokeToken(token: string): void {
  tokenSet.delete(token);
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
}
