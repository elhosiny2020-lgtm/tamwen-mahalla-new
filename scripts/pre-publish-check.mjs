#!/usr/bin/env node
/**
 * Pre-Publish Validation Gate for Google AI Studio & Cloud Run
 * Validates core files, server PORT/0.0.0.0 binding, secret hygiene, Docker configuration,
 * and production build output size WITHOUT ever printing secret values.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const checks = [];

function pass(label, detail = '') {
  checks.push({ status: 'PASS', label, detail });
}
function warn(label, detail = '') {
  warnings.push({ label, detail });
  checks.push({ status: 'WARN', label, detail });
}
function fail(label, detail = '') {
  errors.push({ label, detail });
  checks.push({ status: 'FAIL', label, detail });
}

function dirSizeBytes(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += dirSizeBytes(full);
    } else if (entry.isFile()) {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

function fmtMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// 1. Essential project files
const requiredFiles = [
  'package.json',
  'next.config.ts',
  'server.js',
  'middleware.ts',
  'tsconfig.json',
  'Dockerfile',
  '.dockerignore',
  'app/layout.tsx',
  'app/page.tsx',
  'app/api/health/route.ts',
];
for (const rel of requiredFiles) {
  if (fs.existsSync(path.join(root, rel))) {
    pass(`Core file exists: ${rel}`);
  } else {
    fail(`Missing core file: ${rel}`);
  }
}

// 2. package.json start/build scripts & lockfile consistency
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.scripts?.build && pkg.scripts?.start) {
  pass('Build & Start scripts present', `start="${pkg.scripts.start}"`);
} else {
  fail('Missing build or start script in package.json');
}
if (!String(pkg.scripts?.start || '').includes('NODE_ENV=production')) {
  warn('package.json start script does not explicitly set NODE_ENV=production');
} else {
  pass('Start script enforces NODE_ENV=production');
}

const lockFiles = ['bun.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].filter((f) =>
  fs.existsSync(path.join(root, f))
);
if (lockFiles.length === 1) {
  pass('Single consistent lockfile', lockFiles[0]);
} else if (lockFiles.length > 1) {
  warn('Multiple lockfiles detected', lockFiles.join(', '));
} else {
  warn('No lockfile detected');
}

// 3. server.js Cloud Run readiness (PORT + 0.0.0.0 + production default + healthz)
const serverCode = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
if (serverCode.includes('process.env.PORT') && serverCode.includes('0.0.0.0')) {
  pass('server.js listens on 0.0.0.0 and respects process.env.PORT');
} else {
  fail('server.js must bind 0.0.0.0 and respect process.env.PORT for Cloud Run');
}
if (serverCode.includes("process.env.NODE_ENV === 'development'")) {
  pass('server.js defaults safely to production mode');
} else {
  warn('server.js may boot in dev mode if NODE_ENV is unset');
}
if (serverCode.includes('/healthz')) {
  pass('Instant /healthz liveness probe enabled in server.js');
}

// 4. Secret hygiene check (never expose service keys in NEXT_PUBLIC_* or client bundles)
const envExample = fs.existsSync(path.join(root, '.env.example'))
  ? fs.readFileSync(path.join(root, '.env.example'), 'utf8')
  : '';
if (envExample.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')) {
  fail('SUPABASE_SERVICE_ROLE_KEY must NEVER be prefixed with NEXT_PUBLIC_');
} else {
  pass('No service role key exposed as NEXT_PUBLIC_ in .env.example');
}

// Check environment variable presence WITHOUT revealing values
const envStatus = ['AUTH_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PORT'].map(
  (k) => `${k}=${process.env[k] ? 'SET' : 'UNSET'}`
);
pass('Runtime env presence check (redacted)', envStatus.join(', '));
if (!process.env.SUPABASE_URL) {
  warn('SUPABASE_URL is unset in local shell (app safely falls back to local storage/SQLite during build)');
}

// 5. Production build artifacts check
const buildIdFile = path.join(root, '.next', 'BUILD_ID');
if (fs.existsSync(buildIdFile)) {
  const buildId = fs.readFileSync(buildIdFile, 'utf8').trim();
  const staticBytes = dirSizeBytes(path.join(root, '.next', 'static'));
  const serverBytes = dirSizeBytes(path.join(root, '.next', 'server'));
  const cacheBytes = dirSizeBytes(path.join(root, '.next', 'cache'));
  pass(
    'Production .next build verified',
    `BUILD_ID=${buildId} | static=${fmtMB(staticBytes)} | server=${fmtMB(serverBytes)} | cache=${fmtMB(cacheBytes)} (stripped in Docker)`
  );
  if (staticBytes + serverBytes > 80 * 1024 * 1024) {
    warn('Production runtime .next output exceeds 80 MB', fmtMB(staticBytes + serverBytes));
  }
} else {
  warn('No .next/BUILD_ID found yet — run `npm run build` before publishing');
}

// Output clean summary
console.log('\n=== PRE-PUBLISH VALIDATION REPORT ===');
for (const c of checks) {
  const detail = c.detail ? ` — ${c.detail}` : '';
  console.log(`[${c.status}] ${c.label}${detail}`);
}
console.log(
  `\nSummary: ${checks.filter((c) => c.status === 'PASS').length} passed, ${warnings.length} warnings, ${errors.length} critical errors.`
);

if (errors.length > 0) {
  process.exit(1);
}
