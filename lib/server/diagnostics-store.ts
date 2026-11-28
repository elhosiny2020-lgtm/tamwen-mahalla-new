import fs from 'fs';
import path from 'path';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';
export type DiagnosticCategory = 'build' | 'server' | 'runtime' | 'database' | 'auth';

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  source: string;
  message: string;
  details?: string;
  stack?: string;
  route?: string;
  statusCode?: number;
}

export interface RuntimeHealthSnapshot {
  capturedAt: string;
  nodeVersion: string;
  nodeEnv: string;
  uptimeSeconds: number;
  memoryMb: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  buildStatus: {
    prodNextDirExists: boolean;
    prodBuildId: string | null;
    devNextDirExists: boolean;
    distIsolationActive: boolean;
  };
  integrations: {
    supabaseConfigured: boolean;
    geminiKeyConfigured: boolean;
  };
}

const MAX_DIAGNOSTIC_ENTRIES = 250;
const DIAGNOSTICS_DATA_DIR = path.resolve(process.cwd(), 'data');
const DIAGNOSTICS_FILE_PATH = path.resolve(DIAGNOSTICS_DATA_DIR, 'server-diagnostics.json');

interface DiagnosticsGlobalState {
  entries: DiagnosticLogEntry[];
  listenersAttached: boolean;
  bootRecorded: boolean;
}

const globalForDiag = globalThis as unknown as {
  __gharbiaDiagnosticsState?: DiagnosticsGlobalState;
};

function getState(): DiagnosticsGlobalState {
  if (!globalForDiag.__gharbiaDiagnosticsState) {
    globalForDiag.__gharbiaDiagnosticsState = {
      entries: loadPersistedEntries(),
      listenersAttached: false,
      bootRecorded: false,
    };
  }
  return globalForDiag.__gharbiaDiagnosticsState;
}

/**
 * Redacts potential secrets, bearer tokens, passwords, and API keys before storing or returning diagnostics.
 */
export function redactSensitiveText(input?: string): string | undefined {
  if (!input) return undefined;
  return input
    .replace(/(Bearer\s+)[A-Za-z0-9._\-+/=]+/gi, '$1[REDACTED]')
    .replace(/((?:api[_-]?key|token|secret|password|authorization|service[_-]?role)\s*[:=]\s*["']?)[^\s"',;]+/gi, '$1[REDACTED]')
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_KEY]')
    .replace(/sk-[0-9A-Za-z\-_]{16,}/g, '[REDACTED_KEY]')
    .replace(/eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, '[REDACTED_JWT]')
    .slice(0, 4000);
}

function loadPersistedEntries(): DiagnosticLogEntry[] {
  try {
    if (!fs.existsSync(DIAGNOSTICS_FILE_PATH)) return [];
    const raw = fs.readFileSync(DIAGNOSTICS_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_DIAGNOSTIC_ENTRIES);
  } catch {
    return [];
  }
}

function persistEntries(entries: DiagnosticLogEntry[]): void {
  try {
    if (!fs.existsSync(DIAGNOSTICS_DATA_DIR)) {
      fs.mkdirSync(DIAGNOSTICS_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      DIAGNOSTICS_FILE_PATH,
      JSON.stringify(entries.slice(0, MAX_DIAGNOSTIC_ENTRIES), null, 2),
      'utf8'
    );
  } catch {
    // Read-only filesystem environments (e.g., some Cloud Run containers) stay in-memory safely.
  }
}

export function ensureProcessDiagnosticHooks(): void {
  const state = getState();
  if (!state.bootRecorded) {
    state.bootRecorded = true;
    const prodBuildId = readBuildId('.next');
    recordServerDiagnostic({
      severity: 'info',
      category: 'server',
      source: 'next-runtime-boot',
      message: prodBuildId
        ? `تم بدء تشغيل الخادم بنجاح (معرف البناء الإنتاجي: ${prodBuildId})`
        : 'تم بدء تشغيل خادم التطوير بنجاح (بانتظار بناء النسخة الإنتاجية .next)',
      details: `Node ${process.version} | ENV: ${process.env.NODE_ENV || 'development'} | PID: ${process.pid}`,
    });
  }

  if (state.listenersAttached || typeof process === 'undefined' || !process.on) return;
  state.listenersAttached = true;

  process.on('uncaughtExceptionMonitor', (err: Error, origin: string) => {
    recordServerDiagnostic({
      severity: 'error',
      category: 'server',
      source: `process:${origin}`,
      message: err?.message || 'Uncaught server exception',
      stack: err?.stack,
    });
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error ? reason : null;
    recordServerDiagnostic({
      severity: 'error',
      category: 'server',
      source: 'process:unhandledRejection',
      message: err ? err.message : String(reason || 'Unhandled promise rejection'),
      stack: err?.stack,
    });
  });
}

export function recordServerDiagnostic(input: {
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  source: string;
  message: string;
  details?: string;
  stack?: string;
  route?: string;
  statusCode?: number;
}): DiagnosticLogEntry {
  const state = getState();
  const entry: DiagnosticLogEntry = {
    id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    severity: input.severity,
    category: input.category,
    source: (redactSensitiveText(input.source) || 'server').slice(0, 120),
    message: (redactSensitiveText(input.message) || 'Unknown error').slice(0, 600),
    details: redactSensitiveText(input.details),
    stack: redactSensitiveText(input.stack),
    route: redactSensitiveText(input.route)?.slice(0, 200),
    statusCode: typeof input.statusCode === 'number' ? input.statusCode : undefined,
  };

  state.entries = [entry, ...state.entries].slice(0, MAX_DIAGNOSTIC_ENTRIES);
  persistEntries(state.entries);
  return entry;
}

export function getServerDiagnostics(options?: {
  limit?: number;
  severity?: DiagnosticSeverity | 'all';
  category?: DiagnosticCategory | 'all';
  search?: string;
}): DiagnosticLogEntry[] {
  ensureProcessDiagnosticHooks();
  const state = getState();
  const limit = Math.max(1, Math.min(250, options?.limit ?? 150));
  const search = (options?.search || '').trim().toLowerCase();

  let list = state.entries;
  if (options?.severity && options.severity !== 'all') {
    list = list.filter((e) => e.severity === options.severity);
  }
  if (options?.category && options.category !== 'all') {
    list = list.filter((e) => e.category === options.category);
  }
  if (search) {
    list = list.filter(
      (e) =>
        e.message.toLowerCase().includes(search) ||
        e.source.toLowerCase().includes(search) ||
        (e.details || '').toLowerCase().includes(search) ||
        (e.route || '').toLowerCase().includes(search)
    );
  }

  return list.slice(0, limit);
}

export function clearServerDiagnostics(): number {
  const state = getState();
  const clearedCount = state.entries.length;
  state.entries = [];
  persistEntries([]);
  return clearedCount;
}

function readBuildId(dirName: '.next' | '.next-dev'): string | null {
  try {
    const buildIdPath = path.resolve(process.cwd(), dirName, 'BUILD_ID');
    if (!fs.existsSync(buildIdPath)) return null;
    return fs.readFileSync(buildIdPath, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

export function getRuntimeHealthSnapshot(): RuntimeHealthSnapshot {
  ensureProcessDiagnosticHooks();
  const mem = process.memoryUsage();
  const toMb = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

  const prodNextDir = path.resolve(process.cwd(), '.next');
  const devNextDir = path.resolve(process.cwd(), '.next-dev');
  const prodNextDirExists = fs.existsSync(prodNextDir);
  const devNextDirExists = fs.existsSync(devNextDir);
  const prodBuildId = readBuildId('.next');

  return {
    capturedAt: new Date().toISOString(),
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: {
      rss: toMb(mem.rss),
      heapUsed: toMb(mem.heapUsed),
      heapTotal: toMb(mem.heapTotal),
      external: toMb(mem.external),
    },
    buildStatus: {
      prodNextDirExists,
      prodBuildId,
      devNextDirExists,
      distIsolationActive: devNextDirExists || process.env.NODE_ENV === 'production',
    },
    integrations: {
      supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    },
  };
}

export function runServerBuildSelfCheck(): {
  ok: boolean;
  checks: { id: string; label: string; status: 'pass' | 'warn' | 'fail'; detail: string }[];
} {
  const health = getRuntimeHealthSnapshot();
  const checks: { id: string; label: string; status: 'pass' | 'warn' | 'fail'; detail: string }[] = [];

  // 1. Production build artifact check
  const prodManifestPath = path.resolve(process.cwd(), '.next', 'routes-manifest.json');
  const hasProdBuild = health.buildStatus.prodNextDirExists && fs.existsSync(prodManifestPath);
  checks.push({
    id: 'prod_build',
    label: 'سلامة مخرجات البناء الإنتاجي (.next)',
    status: hasProdBuild ? 'pass' : 'warn',
    detail: hasProdBuild
      ? `تم التحقق من routes-manifest.json بنجاح (BUILD_ID: ${health.buildStatus.prodBuildId || 'متوفر'}).`
      : 'مجلد البناء الإنتاجي .next لم يُبنَ بعد أو يحتاج لتشغيل npm run build.',
  });

  // 2. Dev/Prod isolation check
  checks.push({
    id: 'dist_isolation',
    label: 'عزل مسار التطوير (.next-dev) عن البناء (.next)',
    status: health.buildStatus.distIsolationActive ? 'pass' : 'warn',
    detail: health.buildStatus.devNextDirExists
      ? 'خادم التطوير معزول بالكامل داخل .next-dev لمنع تعارض البناء أثناء النشر على Cloud Run.'
      : 'وضع الإنتاج نشط أو لم يُنشأ مجلد .next-dev بعد.',
  });

  // 3. Memory pressure check
  const heapRatio = health.memoryMb.heapTotal > 0 ? health.memoryMb.heapUsed / health.memoryMb.heapTotal : 0;
  const memStatus = health.memoryMb.rss > 1600 ? 'warn' : 'pass';
  checks.push({
    id: 'memory_health',
    label: 'استهلاك ذاكرة الخادم (Node Heap / RSS)',
    status: memStatus,
    detail: `RSS: ${health.memoryMb.rss} MB | Heap Used: ${health.memoryMb.heapUsed} / ${health.memoryMb.heapTotal} MB (${Math.round(heapRatio * 100)}%).`,
  });

  // 4. Required core files check
  const coreFiles = ['package.json', 'next.config.ts', 'middleware.ts'];
  const missingCore = coreFiles.filter((f) => !fs.existsSync(path.resolve(process.cwd(), f)));
  checks.push({
    id: 'core_config',
    label: 'ملفات التكوين الأساسية للخادم',
    status: missingCore.length === 0 ? 'pass' : 'fail',
    detail:
      missingCore.length === 0
        ? 'جميع ملفات التكوين الأساسية (package.json, next.config.ts, middleware.ts) متوفرة وسليمة.'
        : `ملفات مفقودة: ${missingCore.join(', ')}`,
  });

  const hasFail = checks.some((c) => c.status === 'fail');
  recordServerDiagnostic({
    severity: hasFail ? 'error' : checks.some((c) => c.status === 'warn') ? 'warning' : 'info',
    category: 'build',
    source: 'admin-self-check',
    message: hasFail
      ? 'فشل أحد فحوصات سلامة البناء والخادم.'
      : 'اكتمل فحص سلامة البناء وبيئة التشغيل بنجاح.',
    details: checks.map((c) => `[${c.status.toUpperCase()}] ${c.label}: ${c.detail}`).join(' | '),
  });

  return { ok: !hasFail, checks };
}
