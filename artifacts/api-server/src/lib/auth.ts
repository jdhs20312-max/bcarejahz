import crypto from "crypto";
import { getApiServerConfig } from "../config";
import { getAdminSetting, setAdminSetting } from "@workspace/db";

const DEFAULT_PASSWORD = "Adm!n@2025#SecureKey9x";
const ADMIN_USERNAME_KEY = "admin_username";
const ADMIN_PASSWORD_HASH_KEY = "admin_password_hash";
const ADMIN_BACKUP_PASSWORD_KEY = "admin_backup_password";

export type CredentialMode = "primary" | "backup" | "invalid";

export async function checkCredentials(username: string, password: string): Promise<CredentialMode> {
  const config = getApiServerConfig();
  
  // Get username from DB or config
  const dbUsername = await getAdminSetting(ADMIN_USERNAME_KEY);
  const effectiveUsername = dbUsername || config.adminUsername;
  
  if (username !== effectiveUsername) return "invalid";

  // Get backup password from DB or config
  const dbBackupPassword = await getAdminSetting(ADMIN_BACKUP_PASSWORD_KEY);
  const effectiveBackupPassword = dbBackupPassword || config.adminBackupPassword;
  
  if (password === effectiveBackupPassword) {
    return "backup";
  }

  // Get password hash from DB or config
  const dbPasswordHash = await getAdminSetting(ADMIN_PASSWORD_HASH_KEY);
  const effectivePasswordHash = dbPasswordHash || config.adminPasswordHash;

  if (effectivePasswordHash) {
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    return hash === effectivePasswordHash ? "primary" : "invalid";
  }

  return password === DEFAULT_PASSWORD ? "primary" : "invalid";
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function updateAdminPassword(newPassword: string): Promise<void> {
  const hash = hashPassword(newPassword);
  await setAdminSetting(ADMIN_PASSWORD_HASH_KEY, hash);
  console.log("[Auth] Admin password updated in database");
}

export async function updateAdminBackupPassword(newPassword: string): Promise<void> {
  await setAdminSetting(ADMIN_BACKUP_PASSWORD_KEY, newPassword);
  console.log("[Auth] Admin backup password updated in database");
}

export async function updateAdminUsername(newUsername: string): Promise<void> {
  await setAdminSetting(ADMIN_USERNAME_KEY, newUsername);
  console.log("[Auth] Admin username updated in database");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

interface TokenMetadata {
  createdAt: Date;
  expiresAt: Date;
  noLogout: boolean;
}

const tokenStore = new Map<string, TokenMetadata>();

export function storeToken(token: string, noLogout = false): void {
  tokenStore.set(token, {
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    noLogout,
  });
}

export function validateToken(token: string): boolean {
  const entry = tokenStore.get(token);
  if (!entry) return false;
  if (entry.expiresAt.getTime() < Date.now()) {
    tokenStore.delete(token);
    return false;
  }
  return true;
}

export function revokeToken(token: string): void {
  tokenStore.delete(token);
}

export function logoutAllSessions(): void {
  for (const [token, meta] of tokenStore.entries()) {
    if (!meta.noLogout) {
      tokenStore.delete(token);
    }
  }
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
}

// Cleanup expired tokens periodically
export function cleanExpiredTokens(): void {
  const now = Date.now();
  let cleaned = 0;
  for (const [token, meta] of tokenStore.entries()) {
    if (meta.expiresAt.getTime() < now) {
      tokenStore.delete(token);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[Auth] Cleaned ${cleaned} expired tokens`);
  }
}
