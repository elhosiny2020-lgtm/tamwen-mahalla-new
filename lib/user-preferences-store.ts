'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppLanguage, TranslationDictionary, translate } from './i18n';

export type ThemePresetId =
  | 'gov_navy'
  | 'soft_white'
  | 'calm_gray'
  | 'calm_blue'
  | 'calm_green'
  | 'warm_beige'
  | 'dark_mode'
  | 'eye_comfort'
  | 'custom';

export type DisplayScalingMode = 'auto' | 'manual';
export type UiDensity = 'compact' | 'comfortable' | 'spacious';

export interface CustomThemeColors {
  background: string;
  primary: string;
  accent: string;
}

export interface UserDisplayPreferences {
  fontScale: number; // 80 - 150
  language: AppLanguage; // 'ar' | 'en'
  themeId: ThemePresetId;
  customColors: CustomThemeColors;
  displayMode: DisplayScalingMode;
  density: UiDensity;
  updatedAt: string;
}

export interface ScreenDiagnostics {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  visualScale: number;
  profileLabelAr: string;
  profileLabelEn: string;
  recommendedFontScale: number;
  recommendedDensity: UiDensity;
}

export interface ThemePresetMeta {
  id: ThemePresetId;
  labelKey: keyof TranslationDictionary;
  previewBg: string;
  previewPrimary: string;
  previewAccent: string;
  previewText: string;
  isDark?: boolean;
}

export const THEME_PRESETS: ThemePresetMeta[] = [
  {
    id: 'gov_navy',
    labelKey: 'theme_gov_navy',
    previewBg: '#F4F7FB',
    previewPrimary: '#102A43',
    previewAccent: '#C6A15B',
    previewText: '#102A43',
  },
  {
    id: 'soft_white',
    labelKey: 'theme_soft_white',
    previewBg: '#FFFFFF',
    previewPrimary: '#1E3A5F',
    previewAccent: '#2563EB',
    previewText: '#1E293B',
  },
  {
    id: 'calm_gray',
    labelKey: 'theme_calm_gray',
    previewBg: '#ECEFF3',
    previewPrimary: '#334155',
    previewAccent: '#64748B',
    previewText: '#1E293B',
  },
  {
    id: 'calm_blue',
    labelKey: 'theme_calm_blue',
    previewBg: '#EAF2FA',
    previewPrimary: '#164E83',
    previewAccent: '#0284C7',
    previewText: '#0F2942',
  },
  {
    id: 'calm_green',
    labelKey: 'theme_calm_green',
    previewBg: '#ECF5F0',
    previewPrimary: '#14532D',
    previewAccent: '#15803D',
    previewText: '#0F2F1E',
  },
  {
    id: 'warm_beige',
    labelKey: 'theme_warm_beige',
    previewBg: '#F6F0E6',
    previewPrimary: '#4A3728',
    previewAccent: '#B47B38',
    previewText: '#2E2219',
  },
  {
    id: 'dark_mode',
    labelKey: 'theme_dark_mode',
    previewBg: '#0F172A',
    previewPrimary: '#1E293B',
    previewAccent: '#D4AF37',
    previewText: '#F1F5F9',
    isDark: true,
  },
  {
    id: 'eye_comfort',
    labelKey: 'theme_eye_comfort',
    previewBg: '#F4ECD8',
    previewPrimary: '#3D3522',
    previewAccent: '#8A6D3B',
    previewText: '#2B2619',
  },
];

export const DEFAULT_USER_PREFERENCES: UserDisplayPreferences = {
  fontScale: 100,
  language: 'ar',
  themeId: 'gov_navy',
  customColors: {
    background: '#F4F7FB',
    primary: '#102A43',
    accent: '#C6A15B',
  },
  displayMode: 'auto',
  density: 'comfortable',
  updatedAt: '2026-11-26T00:00:00Z',
};

const PREFS_KEY_PREFIX = 'gharbia_supply_user_prefs_v2_';

function getStorageKey(userId: string): string {
  return `${PREFS_KEY_PREFIX}${userId || 'guest'}`;
}

export function loadUserPreferences(userId: string): UserDisplayPreferences {
  if (typeof window === 'undefined') return DEFAULT_USER_PREFERENCES;
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return DEFAULT_USER_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserDisplayPreferences>;
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...parsed,
      fontScale: Math.min(150, Math.max(80, Number(parsed.fontScale) || 100)),
      language: parsed.language === 'en' ? 'en' : 'ar',
      customColors: {
        ...DEFAULT_USER_PREFERENCES.customColors,
        ...(parsed.customColors || {}),
      },
    };
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

export function saveUserPreferences(userId: string, prefs: UserDisplayPreferences): void {
  if (typeof window === 'undefined') return;
  const payload: UserDisplayPreferences = {
    ...prefs,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(payload));
  } catch {
    // ignore storage quota issues
  }
}

async function fetchRemoteUserPreferences(userId: string): Promise<UserDisplayPreferences | null> {
  if (typeof window === 'undefined' || !userId || userId === 'guest') return null;
  try {
    const res = await fetch(`/api/user-preferences?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: { 'x-actor-user-id': userId },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      synced?: boolean;
      preferences?: Partial<UserDisplayPreferences> | null;
    };
    if (!data.synced || !data.preferences) return null;
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...data.preferences,
      fontScale: Math.min(150, Math.max(80, Number(data.preferences.fontScale) || 100)),
      language: data.preferences.language === 'en' ? 'en' : 'ar',
      customColors: {
        ...DEFAULT_USER_PREFERENCES.customColors,
        ...(data.preferences.customColors || {}),
      },
    };
  } catch {
    return null;
  }
}

async function syncRemoteUserPreferences(
  userId: string,
  prefs: UserDisplayPreferences
): Promise<void> {
  if (typeof window === 'undefined' || !userId || userId === 'guest') return;
  try {
    await fetch('/api/user-preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-user-id': userId,
      },
      body: JSON.stringify({
        userId,
        fontScale: prefs.fontScale,
        language: prefs.language,
        themeId: prefs.themeId,
        customColors: prefs.customColors,
        displayMode: prefs.displayMode,
        density: prefs.density,
        updatedAt: prefs.updatedAt,
      }),
    });
  } catch {
    // Offline or Supabase not configured — local persistence remains authoritative
  }
}

/** حساب سطوع اللون لاختيار نص متباين (WCAG AA) تلقائياً للون المخصص */
function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0.5;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function adjustHexBrightness(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(parseInt(clean.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(clean.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(clean.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function computeScreenDiagnostics(): ScreenDiagnostics {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: 1440,
      viewportHeight: 900,
      devicePixelRatio: 1,
      visualScale: 1,
      profileLabelAr: 'شاشة قياسية مكتبية',
      profileLabelEn: 'Standard Desktop Display',
      recommendedFontScale: 100,
      recommendedDensity: 'comfortable',
    };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dpr = Number((window.devicePixelRatio || 1).toFixed(2));
  const vScale = Number((window.visualViewport?.scale || 1).toFixed(2));

  if (vw >= 1920 && dpr <= 1.25) {
    return {
      viewportWidth: vw,
      viewportHeight: vh,
      devicePixelRatio: dpr,
      visualScale: vScale,
      profileLabelAr: 'شاشة كمبيوتر كبيرة / عالية الدقة',
      profileLabelEn: 'Large / High-Res Desktop',
      recommendedFontScale: 105,
      recommendedDensity: 'spacious',
    };
  }
  if (vw >= 1366) {
    return {
      viewportWidth: vw,
      viewportHeight: vh,
      devicePixelRatio: dpr,
      visualScale: vScale,
      profileLabelAr: dpr > 1.25 ? 'لابتوب عالي الدقة (Windows Scaling)' : 'لابتوب / شاشة مكتبية قياسية',
      profileLabelEn: dpr > 1.25 ? 'HiDPI Laptop (Scaled Display)' : 'Standard Laptop / Desktop',
      recommendedFontScale: 100,
      recommendedDensity: 'comfortable',
    };
  }
  if (vw >= 1024) {
    return {
      viewportWidth: vw,
      viewportHeight: vh,
      devicePixelRatio: dpr,
      visualScale: vScale,
      profileLabelAr: 'شاشة متوسطة / تكبير Windows ١٢٥٪–١٥٠٪',
      profileLabelEn: 'Medium / 125%–150% Scaled Viewport',
      recommendedFontScale: 95,
      recommendedDensity: 'compact',
    };
  }
  return {
    viewportWidth: vw,
    viewportHeight: vh,
    devicePixelRatio: dpr,
    visualScale: vScale,
    profileLabelAr: 'شاشة صغيرة / جهاز لوحي',
    profileLabelEn: 'Compact / Tablet Viewport',
    recommendedFontScale: 95,
    recommendedDensity: 'compact',
  };
}

interface SystemPreferencesContextValue {
  activeUserId: string;
  prefs: UserDisplayPreferences;
  diagnostics: ScreenDiagnostics;
  effectiveFontScale: number;
  effectiveDensity: UiDensity;
  isRtl: boolean;
  t: (key: keyof TranslationDictionary) => string;
  setActiveUserId: (userId: string) => void;
  setFontScale: (scale: number) => void;
  stepFontScale: (delta: number) => void;
  resetFontScale: () => void;
  setLanguage: (lang: AppLanguage) => void;
  setThemeId: (themeId: ThemePresetId) => void;
  setCustomColors: (colors: CustomThemeColors) => void;
  setDisplayMode: (mode: DisplayScalingMode) => void;
  setDensity: (density: UiDensity) => void;
  resetAllPreferences: () => void;
}

const SystemPreferencesContext = createContext<SystemPreferencesContextValue | null>(null);

export function SystemPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [activeUserId, setActiveUserIdState] = useState<string>('guest');
  const [prefs, setPrefs] = useState<UserDisplayPreferences>(DEFAULT_USER_PREFERENCES);
  const [diagnostics, setDiagnostics] = useState<ScreenDiagnostics>(() => computeScreenDiagnostics());

  const setActiveUserId = useCallback((userId: string) => {
    const cleanId = userId || 'guest';
    setActiveUserIdState(cleanId);
    const loaded = loadUserPreferences(cleanId);
    setPrefs(loaded);

    if (cleanId !== 'guest') {
      void fetchRemoteUserPreferences(cleanId).then((remote) => {
        if (!remote) return;
        const localTime = Date.parse(loaded.updatedAt || '0') || 0;
        const remoteTime = Date.parse(remote.updatedAt || '0') || 0;
        if (remoteTime > localTime) {
          saveUserPreferences(cleanId, remote);
          setPrefs(remote);
        }
      });
    }
  }, []);

  // مراقبة أبعاد مساحة العرض الفعلية ونسبة كثافة البكسلات وتكبير Windows
  useEffect(() => {
    const updateDiag = () => setDiagnostics(computeScreenDiagnostics());
    const frameId = requestAnimationFrame(updateDiag);
    window.addEventListener('resize', updateDiag);
    window.visualViewport?.addEventListener('resize', updateDiag);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateDiag);
      window.visualViewport?.removeEventListener('resize', updateDiag);
    };
  }, []);

  const effectiveFontScale = useMemo(() => {
    if (prefs.displayMode === 'auto' && prefs.fontScale === 100) {
      return diagnostics.recommendedFontScale;
    }
    return prefs.fontScale;
  }, [prefs.displayMode, prefs.fontScale, diagnostics.recommendedFontScale]);

  const effectiveDensity: UiDensity = useMemo(() => {
    if (prefs.displayMode === 'auto') {
      return diagnostics.recommendedDensity;
    }
    return prefs.density;
  }, [prefs.displayMode, prefs.density, diagnostics.recommendedDensity]);

  // تطبيق CSS Variables و dir و lang و data-theme و class="dark" مركزياً على <html>
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.lang = prefs.language;
    root.dir = prefs.language === 'ar' ? 'rtl' : 'ltr';
    root.setAttribute('data-theme', prefs.themeId);
    root.setAttribute('data-density', effectiveDensity);

    // تفعيل كلاس dark للوضع الداكن أو اللون المخصص الداكن
    const isCustomDark =
      prefs.themeId === 'custom' && getLuminance(prefs.customColors.background) < 0.35;
    if (prefs.themeId === 'dark_mode' || isCustomDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // متغير مقياس الخط المركزي (حقيقي بدون zoom)
    const scaleRatio = Number((effectiveFontScale / 100).toFixed(3));
    root.style.setProperty('--font-scale', String(scaleRatio));
    root.setAttribute('data-font-scaled', effectiveFontScale !== 100 ? 'true' : 'false');

    // متغيرات الكثافة والمسافات حسب المقاس التلقائي أو اليدوي
    if (effectiveDensity === 'compact') {
      root.style.setProperty('--ui-row-pad-y', '3px');
      root.style.setProperty('--ui-row-pad-x', '6px');
      root.style.setProperty('--ui-sidebar-width', '252px');
    } else if (effectiveDensity === 'spacious') {
      root.style.setProperty('--ui-row-pad-y', '7px');
      root.style.setProperty('--ui-row-pad-x', '10px');
      root.style.setProperty('--ui-sidebar-width', '292px');
    } else {
      root.style.setProperty('--ui-row-pad-y', '4.5px');
      root.style.setProperty('--ui-row-pad-x', '7px');
      root.style.setProperty('--ui-sidebar-width', '276px');
    }

    // متغيرات اللون المخصص عند تفعيل custom
    if (prefs.themeId === 'custom') {
      const bg = prefs.customColors.background;
      const primary = prefs.customColors.primary;
      const accent = prefs.customColors.accent;
      const darkBg = getLuminance(bg) < 0.35;
      const darkPrimary = getLuminance(primary) < 0.45;
      root.style.setProperty('--custom-bg', bg);
      root.style.setProperty('--custom-surface', darkBg ? adjustHexBrightness(bg, 18) : '#FFFFFF');
      root.style.setProperty('--custom-surface-alt', darkBg ? adjustHexBrightness(bg, 28) : adjustHexBrightness(bg, -6));
      root.style.setProperty('--custom-text', darkBg ? '#F1F5F9' : '#102A43');
      root.style.setProperty('--custom-text-muted', darkBg ? '#CBD5E1' : '#475569');
      root.style.setProperty('--custom-primary', primary);
      root.style.setProperty('--custom-primary-text', darkPrimary ? '#FFFFFF' : '#0F172A');
      root.style.setProperty('--custom-accent', accent);
      root.style.setProperty('--custom-border', darkBg ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.14)');
    } else {
      root.style.removeProperty('--custom-bg');
      root.style.removeProperty('--custom-surface');
      root.style.removeProperty('--custom-surface-alt');
      root.style.removeProperty('--custom-text');
      root.style.removeProperty('--custom-text-muted');
      root.style.removeProperty('--custom-primary');
      root.style.removeProperty('--custom-primary-text');
      root.style.removeProperty('--custom-accent');
      root.style.removeProperty('--custom-border');
    }
  }, [prefs, effectiveFontScale, effectiveDensity]);

  const updatePrefs = useCallback(
    (updater: (prev: UserDisplayPreferences) => UserDisplayPreferences) => {
      setPrefs((prev) => {
        const next: UserDisplayPreferences = {
          ...updater(prev),
          updatedAt: new Date().toISOString(),
        };
        saveUserPreferences(activeUserId, next);
        if (activeUserId !== 'guest') {
          void syncRemoteUserPreferences(activeUserId, next);
        }
        return next;
      });
    },
    [activeUserId]
  );

  const setFontScale = useCallback(
    (scale: number) => {
      const clamped = Math.min(150, Math.max(80, Math.round(scale)));
      updatePrefs((p) => ({ ...p, fontScale: clamped }));
    },
    [updatePrefs]
  );

  const stepFontScale = useCallback(
    (delta: number) => {
      updatePrefs((p) => ({
        ...p,
        fontScale: Math.min(150, Math.max(80, p.fontScale + delta)),
      }));
    },
    [updatePrefs]
  );

  const resetFontScale = useCallback(() => {
    updatePrefs((p) => ({ ...p, fontScale: 100 }));
  }, [updatePrefs]);

  const setLanguage = useCallback(
    (language: AppLanguage) => {
      updatePrefs((p) => ({ ...p, language }));
    },
    [updatePrefs]
  );

  const setThemeId = useCallback(
    (themeId: ThemePresetId) => {
      updatePrefs((p) => ({ ...p, themeId }));
    },
    [updatePrefs]
  );

  const setCustomColors = useCallback(
    (customColors: CustomThemeColors) => {
      updatePrefs((p) => ({ ...p, themeId: 'custom', customColors }));
    },
    [updatePrefs]
  );

  const setDisplayMode = useCallback(
    (displayMode: DisplayScalingMode) => {
      updatePrefs((p) => ({ ...p, displayMode }));
    },
    [updatePrefs]
  );

  const setDensity = useCallback(
    (density: UiDensity) => {
      updatePrefs((p) => ({ ...p, displayMode: 'manual', density }));
    },
    [updatePrefs]
  );

  const resetAllPreferences = useCallback(() => {
    const fresh = { ...DEFAULT_USER_PREFERENCES, updatedAt: new Date().toISOString() };
    setPrefs(fresh);
    saveUserPreferences(activeUserId, fresh);
  }, [activeUserId]);

  const t = useCallback(
    (key: keyof TranslationDictionary) => translate(prefs.language, key),
    [prefs.language]
  );

  const value: SystemPreferencesContextValue = useMemo(
    () => ({
      activeUserId,
      prefs,
      diagnostics,
      effectiveFontScale,
      effectiveDensity,
      isRtl: prefs.language === 'ar',
      t,
      setActiveUserId,
      setFontScale,
      stepFontScale,
      resetFontScale,
      setLanguage,
      setThemeId,
      setCustomColors,
      setDisplayMode,
      setDensity,
      resetAllPreferences,
    }),
    [
      activeUserId,
      prefs,
      diagnostics,
      effectiveFontScale,
      effectiveDensity,
      t,
      setActiveUserId,
      setFontScale,
      stepFontScale,
      resetFontScale,
      setLanguage,
      setThemeId,
      setCustomColors,
      setDisplayMode,
      setDensity,
      resetAllPreferences,
    ]
  );

  return React.createElement(SystemPreferencesContext.Provider, { value }, children);
}

export function useSystemPreferences(): SystemPreferencesContextValue {
  const ctx = useContext(SystemPreferencesContext);
  if (!ctx) {
    return {
      activeUserId: 'guest',
      prefs: DEFAULT_USER_PREFERENCES,
      diagnostics: computeScreenDiagnostics(),
      effectiveFontScale: 100,
      effectiveDensity: 'comfortable',
      isRtl: true,
      t: (k) => translate('ar', k),
      setActiveUserId: () => {},
      setFontScale: () => {},
      stepFontScale: () => {},
      resetFontScale: () => {},
      setLanguage: () => {},
      setThemeId: () => {},
      setCustomColors: () => {},
      setDisplayMode: () => {},
      setDensity: () => {},
      resetAllPreferences: () => {},
    };
  }
  return ctx;
}
