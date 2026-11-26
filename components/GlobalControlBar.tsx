'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Globe,
  Minus,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Type,
  X,
} from 'lucide-react';
import {
  THEME_PRESETS,
  UiDensity,
  useSystemPreferences,
} from '@/lib/user-preferences-store';
import { toArabicNumerals } from '@/lib/utils';

type OpenPopover = 'font' | 'language' | 'theme' | 'display' | null;

/**
 * شريط التحكم العام الثابت بجوار الساعة والتاريخ مباشرة:
 * ١. حجم الخط (80% - 150%)
 * ٢. اللغة (العربية RTL / English LTR)
 * ٣. الألوان والمظهر (٨ أنماط احترافية + لون مخصص)
 * ٤. إعدادات العرض الذكي (تلقائي حسب الشاشة / يدوي)
 */
export default function GlobalControlBar() {
  const {
    prefs,
    diagnostics,
    effectiveFontScale,
    effectiveDensity,
    isRtl,
    t,
    setFontScale,
    stepFontScale,
    resetFontScale,
    setLanguage,
    setThemeId,
    setCustomColors,
    setDisplayMode,
    setDensity,
    resetAllPreferences,
  } = useSystemPreferences();

  const [openMenu, setOpenMenu] = useState<OpenPopover>(null);
  const [draftCustomBg, setDraftCustomBg] = useState(prefs.customColors.background);
  const [draftCustomPrimary, setDraftCustomPrimary] = useState(prefs.customColors.primary);
  const [draftCustomAccent, setDraftCustomAccent] = useState(prefs.customColors.accent);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const fmtPct = (v: number) => (isRtl ? `${toArabicNumerals(v)}٪` : `${v}%`);
  const fmtNum = (v: number | string) => (isRtl ? toArabicNumerals(String(v)) : String(v));

  const popoverAlign = isRtl
    ? 'left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-0'
    : 'left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0';

  return (
    <div ref={barRef} className="flex flex-wrap items-center gap-1.5 relative">
      {/* ١. زر حجم الخط */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((m) => (m === 'font' ? null : 'font'))}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            openMenu === 'font'
              ? 'bg-[#C6A15B] text-[#102A43] border-[#C6A15B]'
              : 'bg-[#164E83]/60 hover:bg-[#164E83] text-white border-white/15'
          }`}
          title={`${t('fontSizeTitle')} (${fmtPct(effectiveFontScale)})`}
        >
          <Type className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xl:inline">{t('fontSizeBtn')}</span>
          <span className="num-cell text-[10px] opacity-90">{fmtPct(effectiveFontScale)}</span>
        </button>

        {openMenu === 'font' && (
          <div
            className={`app-popover absolute ${popoverAlign} mt-2 w-72 sm:w-80 bg-white text-[#102A43] rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 space-y-3`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 font-black text-xs text-[#102A43]">
                <Type className="w-4 h-4 text-[#164E83]" />
                <span>{t('fontSizeTitle')}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenMenu(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => stepFontScale(-5)}
                disabled={prefs.fontScale <= 80}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[#102A43] text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>{t('fontDecrease')}</span>
              </button>
              <span className="num-cell px-3 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black">
                {fmtPct(prefs.fontScale)}
              </span>
              <button
                type="button"
                onClick={() => stepFontScale(5)}
                disabled={prefs.fontScale >= 150}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[#102A43] text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('fontIncrease')}</span>
              </button>
            </div>

            <div className="space-y-1">
              <input
                type="range"
                min={80}
                max={150}
                step={5}
                value={prefs.fontScale}
                onChange={(e) => setFontScale(Number(e.target.value))}
                className="w-full accent-[#102A43] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-500 num-cell">
                <span>{fmtPct(80)}</span>
                <span>{fmtPct(100)}</span>
                <span>{fmtPct(125)}</span>
                <span>{fmtPct(150)}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-[#102A43]">
              {t('fontPreview')}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-500">{t('savedForUser')}</span>
              <button
                type="button"
                onClick={resetFontScale}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[10.5px] font-black flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('fontReset')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ٢. زر اللغة / Language */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((m) => (m === 'language' ? null : 'language'))}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            openMenu === 'language'
              ? 'bg-[#C6A15B] text-[#102A43] border-[#C6A15B]'
              : 'bg-[#164E83]/60 hover:bg-[#164E83] text-white border-white/15'
          }`}
          title={t('languageTitle')}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xl:inline">{prefs.language === 'ar' ? 'العربية 🇪🇬' : 'English 🇬🇧'}</span>
          <span className="xl:hidden">{prefs.language === 'ar' ? 'AR' : 'EN'}</span>
        </button>

        {openMenu === 'language' && (
          <div
            className={`app-popover absolute ${popoverAlign} mt-2 w-72 bg-white text-[#102A43] rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 space-y-3`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 font-black text-xs text-[#102A43]">
                <Globe className="w-4 h-4 text-[#164E83]" />
                <span>{t('languageTitle')}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenMenu(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setLanguage('ar');
                  setOpenMenu(null);
                }}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-black flex items-center justify-between cursor-pointer transition-colors ${
                  prefs.language === 'ar'
                    ? 'bg-[#102A43] text-[#C6A15B] border-[#102A43]'
                    : 'bg-slate-50 hover:bg-slate-100 text-[#102A43] border-slate-200'
                }`}
              >
                <span>العربية 🇪🇬 (RTL)</span>
                {prefs.language === 'ar' && <Check className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLanguage('en');
                  setOpenMenu(null);
                }}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-black flex items-center justify-between cursor-pointer transition-colors ${
                  prefs.language === 'en'
                    ? 'bg-[#102A43] text-[#C6A15B] border-[#102A43]'
                    : 'bg-slate-50 hover:bg-slate-100 text-[#102A43] border-slate-200'
                }`}
              >
                <span>English 🇬🇧 (LTR)</span>
                {prefs.language === 'en' && <Check className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[10.5px] font-bold text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-200">
              {t('languageNote')}
            </p>
          </div>
        )}
      </div>

      {/* ٣. زر الألوان والمظهر */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setDraftCustomBg(prefs.customColors.background);
            setDraftCustomPrimary(prefs.customColors.primary);
            setDraftCustomAccent(prefs.customColors.accent);
            setOpenMenu((m) => (m === 'theme' ? null : 'theme'));
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            openMenu === 'theme'
              ? 'bg-[#C6A15B] text-[#102A43] border-[#C6A15B]'
              : 'bg-[#164E83]/60 hover:bg-[#164E83] text-white border-white/15'
          }`}
          title={t('themeTitle')}
        >
          <Palette className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xl:inline">{t('themeBtn')}</span>
        </button>

        {openMenu === 'theme' && (
          <div
            className={`app-popover absolute ${popoverAlign} mt-2 w-80 sm:w-96 bg-white text-[#102A43] rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 space-y-3 max-h-[82vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 font-black text-xs text-[#102A43]">
                <Palette className="w-4 h-4 text-[#164E83]" />
                <span>{t('themeTitle')}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenMenu(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {THEME_PRESETS.map((preset) => {
                const active = prefs.themeId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setThemeId(preset.id)}
                    className={`p-2 rounded-xl border text-right flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      active
                        ? 'border-[#102A43] ring-2 ring-[#C6A15B] bg-slate-50'
                        : 'border-slate-200 hover:border-slate-400 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-6 h-6 rounded-lg border border-slate-300 shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: preset.previewBg }}
                      >
                        <span
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: preset.previewPrimary }}
                        />
                      </span>
                      <span className="text-[11px] font-black text-[#102A43] truncate">
                        {t(preset.labelKey)}
                      </span>
                    </div>
                    {active && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* اختيار لون مخصص من لوحة الألوان */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#102A43] flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#164E83]" />
                  <span>{t('customColorsTitle')}</span>
                </span>
                {prefs.themeId === 'custom' && (
                  <span className="text-[10px] font-black text-emerald-700">✓ {t('active')}</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10.5px] font-bold text-slate-700">
                <label className="flex flex-col items-center gap-1 bg-white p-1.5 rounded-lg border border-slate-200 cursor-pointer">
                  <span>{t('customBgLabel')}</span>
                  <input
                    type="color"
                    value={draftCustomBg}
                    onChange={(e) => setDraftCustomBg(e.target.value)}
                    className="w-10 h-6 rounded cursor-pointer border-0"
                  />
                </label>
                <label className="flex flex-col items-center gap-1 bg-white p-1.5 rounded-lg border border-slate-200 cursor-pointer">
                  <span>{t('customPrimaryLabel')}</span>
                  <input
                    type="color"
                    value={draftCustomPrimary}
                    onChange={(e) => setDraftCustomPrimary(e.target.value)}
                    className="w-10 h-6 rounded cursor-pointer border-0"
                  />
                </label>
                <label className="flex flex-col items-center gap-1 bg-white p-1.5 rounded-lg border border-slate-200 cursor-pointer">
                  <span>{t('customAccentLabel')}</span>
                  <input
                    type="color"
                    value={draftCustomAccent}
                    onChange={(e) => setDraftCustomAccent(e.target.value)}
                    className="w-10 h-6 rounded cursor-pointer border-0"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCustomColors({
                      background: draftCustomBg,
                      primary: draftCustomPrimary,
                      accent: draftCustomAccent,
                    })
                  }
                  className="flex-1 py-1.5 px-3 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-[11px] font-black cursor-pointer"
                >
                  {t('applyCustomTheme')}
                </button>
                <button
                  type="button"
                  onClick={() => setThemeId('gov_navy')}
                  className="py-1.5 px-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10.5px] font-black cursor-pointer"
                >
                  {t('resetThemeBtn')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ٤. زر إعدادات العرض والضبط التلقائي للشاشة */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((m) => (m === 'display' ? null : 'display'))}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            openMenu === 'display'
              ? 'bg-[#C6A15B] text-[#102A43] border-[#C6A15B]'
              : 'bg-[#164E83]/60 hover:bg-[#164E83] text-white border-white/15'
          }`}
          title={t('displayTitle')}
        >
          <Monitor className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xl:inline">{t('displayBtn')}</span>
        </button>

        {openMenu === 'display' && (
          <div
            className={`app-popover absolute ${popoverAlign} mt-2 w-80 bg-white text-[#102A43] rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 space-y-3`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 font-black text-xs text-[#102A43]">
                <Monitor className="w-4 h-4 text-[#164E83]" />
                <span>{t('displayTitle')}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenMenu(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* اختيار ضبط تلقائي أم يدوي */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDisplayMode('auto')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${
                  prefs.displayMode === 'auto'
                    ? 'bg-[#102A43] text-[#C6A15B] shadow-xs'
                    : 'text-slate-700 hover:text-[#102A43]'
                }`}
              >
                {t('autoDisplayMode')}
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('manual')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${
                  prefs.displayMode === 'manual'
                    ? 'bg-[#102A43] text-[#C6A15B] shadow-xs'
                    : 'text-slate-700 hover:text-[#102A43]'
                }`}
              >
                {t('manualDisplayMode')}
              </button>
            </div>

            {/* كثافة العناصر والمسافات */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-[#102A43] block">
                {t('densityLabel')}
              </label>
              <div className="space-y-1">
                {(
                  [
                    { id: 'compact' as UiDensity, label: t('densityCompact') },
                    { id: 'comfortable' as UiDensity, label: t('densityComfortable') },
                    { id: 'spacious' as UiDensity, label: t('densitySpacious') },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDensity(opt.id)}
                    className={`w-full px-3 py-1.5 rounded-xl border text-[11px] font-black flex items-center justify-between cursor-pointer ${
                      effectiveDensity === opt.id
                        ? 'bg-blue-50 border-[#164E83] text-[#102A43]'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {effectiveDensity === opt.id && <Check className="w-3.5 h-3.5 text-[#164E83]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* قياسات الشاشة الفعلية */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[10.5px] font-bold">
              <div className="font-black text-[#164E83] mb-1">{t('screenDiagnostics')}</div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t('viewportSize')}:</span>
                <span className="num-cell font-black text-[#102A43]">
                  {fmtNum(diagnostics.viewportWidth)} × {fmtNum(diagnostics.viewportHeight)} px
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t('pixelRatio')}:</span>
                <span className="num-cell font-black text-[#102A43]">
                  {fmtNum(diagnostics.devicePixelRatio)}x · {fmtPct(Math.round(diagnostics.devicePixelRatio * 100))}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">{t('detectedProfile')}:</span>
                <span className="font-black text-emerald-700 text-left">
                  {isRtl ? diagnostics.profileLabelAr : diagnostics.profileLabelEn}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-500">{t('savedForUser')}</span>
              <button
                type="button"
                onClick={resetAllPreferences}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[10.5px] font-black flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isRtl ? 'استعادة كل الإعدادات' : 'Reset All'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
