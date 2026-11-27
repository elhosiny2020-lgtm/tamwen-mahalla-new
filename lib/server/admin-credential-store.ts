import crypto from 'node:crypto';

/**
 * Server-side administrative passcode verification & first-run bootstrap store.
 *
 * Precedence:
 * 1. process.env.ADMIN_BOOTSTRAP_PASSWORD (when configured) ALWAYS overrides any fallback.
 * 2. In preview environments before ADMIN_BOOTSTRAP_PASSWORD is set, the first admin
 *    passcode claimed via scrypt hashing is stored in server memory (never plaintext,
 *    never hardcoded, never written to local files) and verified with timingSafeEqual.
 */

interface ScryptHashRecord {
  saltHex: string;
  keyHex: string;
  claimedAt: string;
  claimedBy: string;
}

const globalForAdminCred = globalThis as unknown as {
  __gharbiaAdminPasscodeHash?: ScryptHashRecord;
  __gharbiaUserPasswordOverrides?: Record<string, { deleted?: boolean; hash?: ScryptHashRecord }>;
};

const SCRYPT_KEYLEN = 64;

function getUserOverrideStore(): Record<string, { deleted?: boolean; hash?: ScryptHashRecord }> {
  if (!globalForAdminCred.__gharbiaUserPasswordOverrides) {
    globalForAdminCred.__gharbiaUserPasswordOverrides = {};
  }
  return globalForAdminCred.__gharbiaUserPasswordOverrides;
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB) && a.length === b.length;
}

function hashPasscodeScrypt(password: string): { saltHex: string; keyHex: string } {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return {
    saltHex: salt.toString('hex'),
    keyHex: derived.toString('hex'),
  };
}

function verifyPasscodeScrypt(password: string, record: ScryptHashRecord): boolean {
  const salt = Buffer.from(record.saltHex, 'hex');
  const expectedKey = Buffer.from(record.keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, expectedKey.length);
  return crypto.timingSafeEqual(derived, expectedKey);
}

export type AdminPasscodeSource = 'env' | 'claimed' | 'unconfigured';

export function getAdminPasscodeStatus(): {
  configured: boolean;
  source: AdminPasscodeSource;
} {
  const envPass = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() ?? '';
  if (envPass.length > 0) {
    return { configured: true, source: 'env' };
  }
  if (globalForAdminCred.__gharbiaAdminPasscodeHash) {
    return { configured: true, source: 'claimed' };
  }
  return { configured: false, source: 'unconfigured' };
}

/**
 * Atomically claims the initial admin passcode hash ONLY when:
 * - process.env.ADMIN_BOOTSTRAP_PASSWORD is unset, AND
 * - no admin passcode hash has been claimed yet.
 */
export function claimInitialAdminPasscode(
  password: string,
  claimedBy: string
): { ok: true } | { ok: false; reason: 'already_configured' | 'invalid_password' } {
  const trimmed = password.trim();
  if (trimmed.length < 4 || trimmed.length > 256) {
    return { ok: false, reason: 'invalid_password' };
  }

  const status = getAdminPasscodeStatus();
  if (status.configured) {
    return { ok: false, reason: 'already_configured' };
  }

  const { saltHex, keyHex } = hashPasscodeScrypt(trimmed);
  globalForAdminCred.__gharbiaAdminPasscodeHash = {
    saltHex,
    keyHex,
    claimedAt: new Date().toISOString(),
    claimedBy,
  };
  return { ok: true };
}

/**
 * Verifies a submitted passcode strictly on the server.
 */
export function verifyAdminPasscode(password: string): {
  valid: boolean;
  source: AdminPasscodeSource;
} {
  const envPass = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() ?? '';
  if (envPass.length > 0) {
    return {
      valid: timingSafeCompareStrings(password.trim(), envPass),
      source: 'env',
    };
  }

  const record = globalForAdminCred.__gharbiaAdminPasscodeHash;
  if (!record) {
    return { valid: false, source: 'unconfigured' };
  }

  return {
    valid: verifyPasscodeScrypt(password.trim(), record),
    source: 'claimed',
  };
}

export function setServerUserPassword(
  username: string,
  newPassword: string,
  actorUsername: string = 'system'
): { ok: boolean } {
  const trimmedUser = username.trim().toLowerCase();
  const trimmedPass = newPassword.trim();
  if (!trimmedUser || trimmedPass.length < 4 || trimmedPass.length > 256) {
    return { ok: false };
  }
  const { saltHex, keyHex } = hashPasscodeScrypt(trimmedPass);
  const record: ScryptHashRecord = {
    saltHex,
    keyHex,
    claimedAt: new Date().toISOString(),
    claimedBy: actorUsername,
  };
  getUserOverrideStore()[trimmedUser] = { deleted: false, hash: record };
  if (trimmedUser === 'admin') {
    globalForAdminCred.__gharbiaAdminPasscodeHash = record;
  }
  return { ok: true };
}

export function deleteServerUserPassword(username: string): void {
  const trimmedUser = username.trim().toLowerCase();
  if (!trimmedUser) return;
  getUserOverrideStore()[trimmedUser] = { deleted: true };
}

export function verifyServerUserPasswordOverride(
  username: string,
  password: string
): { hasOverride: boolean; deleted: boolean; valid: boolean } {
  const entry = getUserOverrideStore()[username.trim().toLowerCase()];
  if (!entry) {
    return { hasOverride: false, deleted: false, valid: false };
  }
  if (entry.deleted || !entry.hash) {
    return { hasOverride: true, deleted: true, valid: false };
  }
  return {
    hasOverride: true,
    deleted: false,
    valid: verifyPasscodeScrypt(password.trim(), entry.hash),
  };
}

export function clearAllServerUserPasswordOverrides(): void {
  globalForAdminCred.__gharbiaUserPasswordOverrides = {};
}

/**
 * Unified server-side Factory Reset passcode verification (applied across all branches & departments).
 * Precedence:
 * 1. process.env.FACTORY_RESET_PASSWORD (if explicitly configured on the server)
 * 2. Fixed salted scrypt digest configured for the organization's Factory Reset authorization
 */
const FACTORY_RESET_SCRYPT_RECORD: ScryptHashRecord = {
  saltHex: '4685003e0c408cb9ef1a7f9a1c809f00',
  keyHex:
    'd323c0ab2d76f84291e918ca0e2b8da73115ceda39379e2616f7c8129c8ab518fdee5563a58ac26238dd297cc0540d222345de2b2abf066a3f06cf7ed3c61b8a',
  claimedAt: '2026-11-27T00:00:00.000Z',
  claimedBy: 'system-policy',
};

export function verifyFactoryResetPasscode(password: string): {
  valid: boolean;
  source: 'env' | 'fixed';
} {
  const clean = password.trim();
  if (!clean) {
    return { valid: false, source: 'fixed' };
  }
  const envPass = process.env.FACTORY_RESET_PASSWORD?.trim() ?? '';
  if (envPass.length > 0) {
    return {
      valid: timingSafeCompareStrings(clean, envPass),
      source: 'env',
    };
  }
  return {
    valid: verifyPasscodeScrypt(clean, FACTORY_RESET_SCRYPT_RECORD),
    source: 'fixed',
  };
}
