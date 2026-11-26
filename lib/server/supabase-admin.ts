/**
 * Server-only Supabase configuration helper.
 *
 * SECURITY NOTICE:
 * - Enable Row Level Security (RLS) on ALL Supabase tables (see /supabase/migrations/*.sql).
 * - SUPABASE_SERVICE_ROLE_KEY bypasses RLS and MUST ONLY be imported inside lib/server/ or app/api/.
 * - Every API route that calls getValidatedSupabaseAdminConfig() MUST authenticate the session
 *   and authorize the caller's role/ownership BEFORE touching the database.
 */

export interface SupabaseAdminConfig {
  baseUrl: string;
  serviceKey: string;
}

export function getValidatedSupabaseAdminConfig(): SupabaseAdminConfig | null {
  const rawUrl = process.env.SUPABASE_URL?.trim() || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  if (!rawUrl || !serviceKey) return null;

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return null;
    }
    return { baseUrl: parsed.origin, serviceKey };
  } catch {
    return null;
  }
}
