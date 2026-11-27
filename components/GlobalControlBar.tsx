'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Globe,
  Layers,
  LayoutGrid,
  Minus,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Type,
  X,
} from 'lucide-react';
import {
  THEME_PRESETS,
  UI_LAYOUT_PRESETS,
  UiDensity,
  UiLayoutPresetMeta,
  UX_BUNDLE_PRESETS,
  useSystemPreferences,
} from '@/lib/user-preferences-store';
import { toArabicNumerals } from '@/lib/utils';

type OpenPopover = 'font' | 'language' | 'theme' | 'display' | null;
type StudioTab = 'layouts' | 'colors' | 'custom';

function LayoutWireframePreview({
  type,
  active,
}: {
  type: UiLayoutPresetMeta['wireframeType'];
  active: boolean;
}) {
  const accentBar = active ? 'bg-[#C6A15B]' : 'bg-[#3B717E]';
  const railBar = active ? 'bg-[#102A43]' : 'bg-[#253B4F]';

  if (type === 'top_ribbon') {
    return (
      <div className="w-full h-12 rounded-lg bg-slate-100 border border-slate-200 p-1 flex flex-col gap-1 overflow-hidden">
        <div className={`h-2.5 w-full rounded-sm ${railBar} flex items-center gap-0.5 px-1`}>
          <span className={`w-3 h-1 rounded-full ${accentBar}`} />
          <span className="w-2.5 h-1 rounded-full bg-white/60" />
          <span className="w-2.5 h-1 rounded-full bg-white/40" />
        </div>
        <div className="grid grid-cols-4 gap-1 flex-1">
          <div className="bg-white rounded-xs border border-slate-200" />
          <div className="bg-white rounded-xs border border-slate-200" />
          <div className="bg-white rounded-xs border border-slate-200" />
          <div className="bg-white rounded-xs border border-slate-200" />
        </div>
      </div>
    );
  }

  if (type === 'icon_rail_bento') {
    return (
      <div className="w-full h-12 rounded-lg bg-slate-100 border border-slate-200 p-1 flex gap-1 overflow-hidden">
        <div className={`w-3 h-full rounded-sm ${railBar} flex flex-col items-center py-1 gap-0.5 shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${accentBar}`} />
          <span className="w-1.5 h-1 rounded-full bg-white/60" />
          <span className="w-1.5 h-1 rounded-full bg-white/40" />
        </div>
        <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-1">
          <div className={`col-span-2 row-span-1 rounded-xs ${railBar}/80`} />
          <div className="col-span-1 row-span-2 rounded-xs bg-white border border-slate-200" />
          <div className="col-span-1 row-span-1 rounded-xs bg-white border border-slate-200" />
          <div className="col-span-1 row-span-1 rounded-xs bg-white border border-slate-200" />
        </div>
      </div>
    );
  }

  if (type === 'sovereign_grid') {
    return (
      <div className="w-full h-12 rounded-lg bg-[#F4F7FB] border border-[#C6A15B]/60 p-1 flex gap-1 overflow-hidden">
        <div className={`w-5 h-full rounded-xs ${railBar} border-l-2 border-[#C6A15B] shrink-0`} />
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-2.5 rounded-xs bg-white border-b-2 border-[#C6A15B]" />
          <div className="flex-1 grid grid-cols-3 gap-1">
            <div className="bg-white rounded-xs border border-slate-300" />
            <div className="bg-white rounded-xs border border-slate-300" />
            <div className="bg-white rounded-xs border border-slate-300" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'minimal_flat') {
    return (
      <div className="w-full h-12 rounded-lg bg-white border border-slate-200 p-1.5 flex gap-1.5 overflow-hidden">
        <div className="w-4 h-full border-l border-slate-200 flex flex-col gap-1 pl-1 shrink-0">
          <span className="w-full h-1 bg-slate-800 rounded-full" />
          <span className="w-2/3 h-1 bg-slate-300 rounded-full" />
          <span className="w-2/3 h-1 bg-slate-300 rounded-full" />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-2 w-1/2 bg-slate-200 rounded-full" />
          <div className="flex-1 border border-slate-200 rounded-xs" />
        </div>
      </div>
    );
  }

  if (type === 'cockpit_dense') {
    return (
      <div className="w-full h-12 rounded-lg bg-[#0F172A] border border-sky-400/40 p-1 flex gap-1 overflow-hidden">
        <div className="w-3.5 h-full rounded-xs bg-[#1E293B] shrink-0" />
        <div className="flex-1 grid grid-cols-4 grid-rows-2 gap-0.5">
          <div className="col-span-1 bg-sky-500/30 rounded-xs border border-sky-400/40" />
          <div className="col-span-1 bg-emerald-500/30 rounded-xs border border-emerald-400/40" />
          <div className="col-span-1 bg-amber-500/30 rounded-xs border border-amber-400/40" />
          <div className="col-span-1 bg-indigo-500/30 rounded-xs border border-indigo-400/40" />
          <div className="col-span-2 bg-slate-800 rounded-xs border border-slate-700" />
          <div className="col-span-2 bg-slate-800 rounded-xs border border-slate-700" />
        </div>
      </div>
    );
  }

  if (type === 'liquid_glass') {
    return (
      <div className="w-full h-12 rounded-lg bg-gradient-to-br from-sky-200 via-indigo-100 to-teal-100 border border-white p-1 flex gap-1 overflow-hidden shadow-inner">
        <div className="w-5 h-full rounded-md bg-[#133C68]/75 backdrop-blur-sm border border-white/50 shrink-0 p-0.5 flex flex-col gap-0.5">
          <span className="w-full h-1.5 rounded-sm bg-sky-300" />
          <span className="w-full h-1 rounded-sm bg-white/50" />
          <span className="w-full h-1 rounded-sm bg-white/30" />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-3.5 rounded-md bg-white/65 border border-white/80 shadow-xs" />
          <div className="flex-1 grid grid-cols-3 gap-0.5">
            <div className="rounded-md bg-white/60 border border-white/80" />
            <div className="rounded-md bg-white/60 border border-white/80" />
            <div className="rounded-md bg-white/60 border border-white/80" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'glass_split') {
    return (
      <div className="w-full h-12 rounded-lg bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-sky-400/40 p-1 flex flex-col gap-1 overflow-hidden">
        <div className="h-2.5 w-full rounded-md bg-white/15 border border-white/25 flex items-center gap-0.5 px-1">
          <span className="w-3 h-1 rounded-full bg-sky-400" />
          <span className="w-2.5 h-1 rounded-full bg-white/50" />
          <span className="w-2.5 h-1 rounded-full bg-white/30" />
        </div>
        <div className="flex-1 grid grid-cols-4 gap-1">
          <div className="col-span-2 rounded-md bg-white/12 border border-white/20" />
          <div className="col-span-1 rounded-md bg-sky-400/20 border border-sky-300/30" />
          <div className="col-span-1 rounded-md bg-white/12 border border-white/20" />
        </div>
      </div>
    );
  }

  // Default: sidebar_glass
  return (
    <div className="w-full h-12 rounded-lg bg-[#CEDAE3] border border-white p-1 flex gap-1 overflow-hidden">
      <div className={`w-5 h-full rounded-md ${railBar} shrink-0 p-0.5 flex flex-col gap-0.5`}>
        <span className={`w-full h-1.5 rounded-sm ${accentBar}`} />
        <span className="w-full h-1 rounded-sm bg-white/30" />
        <span className="w-full h-1 rounded-sm bg-white/20" />
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className={`h-3.5 rounded-md ${railBar}`} />
        <div className="flex-1 grid grid-cols-4 gap-0.5">
          <div className="rounded-sm bg-white/80" />
          <div className="rounded-sm bg-white/80" />
          <div className="rounded-sm bg-white/80" />
          <div className="rounded-sm bg-white/80" />
        </div>
      </div>
    </div>
  );
}

/**
 * شريط التحكم العام الثابت بجوار الساعة والتاريخ:
 * ١. حجم الخط (80% - 150%)
 * ٢. اللغة (العربية RTL / English LTR)
 * ٣. استوديو الواجهات والألوان UX/UI (٦ تصاميم واجهات مختلفة + ١٤ لوحة ألوان + تخصيص حر)
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
    setUiLayout,
    applyUiSkinBundle,
    setCustomColors,
    setDisplayMode,
    setDensity,
    resetAllPreferences,
  } = useSystemPreferences();

  const [openMenu, setOpenMenu] = useState<OpenPopover>(null);
  const [studioTab, setStudioTab] = useState<StudioTab>('layouts');
  const [pairLayoutWithColors, setPairLayoutWithColors] = useState<boolean>(true);
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

  const activeLayoutMeta = UI_LAYOUT_PRESETS.find((l) => l.id === prefs.uiLayout);

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
              : 'bg-white/12 hover:bg-white/20 text-white border-white/15'
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
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[#102A43] text-xs font-black flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
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
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[#102A43] text-xs font-black flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
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
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[10.5px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
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
              : 'bg-white/12 hover:bg-white/20 text-white border-white/15'
          }`}
          title={t('languageTitle')}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xl:inline">{prefs.language === 'ar' ? 'العربية' : 'English'}</span>
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
                <span>العربية (RTL)</span>
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
                <span>English (LTR)</span>
                {prefs.language === 'en' && <Check className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[10.5px] font-bold text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-200">
              {t('languageNote')}
            </p>
          </div>
        )}
      </div>

      {/* ٣. استوديو الواجهات والألوان UX/UI Studio */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setDraftCustomBg(prefs.customColors.background);
            setDraftCustomPrimary(prefs.customColors.primary);
            setDraftCustomAccent(prefs.customColors.accent);
            setOpenMenu((m) => (m === 'theme' ? null : 'theme'));
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            openMenu === 'theme'
              ? 'bg-[#C6A15B] text-[#102A43] border-[#C6A15B]'
              : 'bg-white/15 hover:bg-white/25 text-white border-white/25'
          }`}
          title={`${t('uxStudioTitle')} · ${activeLayoutMeta ? t(activeLayoutMeta.labelKey) : ''}`}
        >
          <Palette className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">{t('uxStudioBtn')}</span>
          <span className="lg:hidden">UX/UI</span>
        </button>

        {openMenu === 'theme' && (
          <div
            className={`app-popover absolute ${popoverAlign} mt-2 w-[340px] sm:w-[460px] bg-white text-[#102A43] rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 space-y-3 max-h-[84vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-black text-xs text-[#102A43]">
                <Layers className="w-4 h-4 text-[#164E83]" />
                <span>{t('uxStudioTitle')}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenMenu(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 Tabs: UX/UI Layouts | Color Palettes | Custom Colors */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStudioTab('layouts')}
                className={`py-1.5 px-2 rounded-lg text-[10.5px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                  studioTab === 'layouts'
                    ? 'bg-[#102A43] text-[#C6A15B] shadow-xs'
                    : 'text-slate-700 hover:text-[#102A43]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span>{t('uxTabLayouts')}</span>
              </button>
              <button
                type="button"
                onClick={() => setStudioTab('colors')}
                className={`py-1.5 px-2 rounded-lg text-[10.5px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                  studioTab === 'colors'
                    ? 'bg-[#102A43] text-[#C6A15B] shadow-xs'
                    : 'text-slate-700 hover:text-[#102A43]'
                }`}
              >
                <Palette className="w-3.5 h-3.5 shrink-0" />
                <span>{t('uxTabColors')}</span>
              </button>
              <button
                type="button"
                onClick={() => setStudioTab('custom')}
                className={`py-1.5 px-2 rounded-lg text-[10.5px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                  studioTab === 'custom'
                    ? 'bg-[#102A43] text-[#C6A15B] shadow-xs'
                    : 'text-slate-700 hover:text-[#102A43]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span>{t('uxTabCustom')}</span>
              </button>
            </div>

            {/* Tab 1: UX/UI Interface Layouts + Instant Complete Bundles */}
            {studioTab === 'layouts' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="flex items-center gap-2 text-[10.5px] font-black text-[#102A43] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pairLayoutWithColors}
                      onChange={(e) => setPairLayoutWithColors(e.target.checked)}
                      className="w-3.5 h-3.5 accent-[#102A43] rounded"
                    />
                    <span>
                      {isRtl
                        ? 'تطبيق الألوان المتناسقة مع شكل الواجهة تلقائياً'
                        : 'Also apply paired color palette with layout'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {UI_LAYOUT_PRESETS.map((layout) => {
                    const isActive = prefs.uiLayout === layout.id;
                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => setUiLayout(layout.id, pairLayoutWithColors)}
                        className={`p-2.5 rounded-xl border text-${isRtl ? 'right' : 'left'} flex flex-col gap-2 cursor-pointer transition-all ${
                          isActive
                            ? 'border-[#102A43] ring-2 ring-[#C6A15B] bg-slate-50'
                            : 'border-slate-200 hover:border-slate-400 bg-white'
                        }`}
                      >
                        <LayoutWireframePreview type={layout.wireframeType} active={isActive} />
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <span className="text-[11px] font-black text-[#102A43] flex items-center gap-1 flex-wrap leading-snug">
                              <span>{t(layout.labelKey)}</span>
                              {layout.isGlass && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-300 text-[8.5px] font-black">
                                  {isRtl ? 'زجاجي' : 'Glass'}
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 block mt-0.5 leading-snug">
                              {isRtl ? layout.descAr : layout.descEn}
                            </span>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* One-Click UX + Color Complete Skins */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-black text-[#164E83]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('uxQuickBundlesTitle')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {UX_BUNDLE_PRESETS.map((bundle) => {
                      const isBundleActive =
                        prefs.uiLayout === bundle.layoutId && prefs.themeId === bundle.themeId;
                      const themeMeta = THEME_PRESETS.find((th) => th.id === bundle.themeId);
                      return (
                        <button
                          key={bundle.id}
                          type="button"
                          onClick={() => applyUiSkinBundle(bundle.layoutId, bundle.themeId)}
                          className={`p-2 rounded-xl border text-${isRtl ? 'right' : 'left'} flex items-center gap-2 cursor-pointer transition-all ${
                            isBundleActive
                              ? 'border-[#102A43] bg-blue-50/70'
                              : 'border-slate-200 hover:bg-slate-50 bg-white'
                          }`}
                        >
                          <span
                            className="w-6 h-6 rounded-lg border border-slate-300 shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: themeMeta?.previewBg || '#F4F7FB' }}
                          >
                            <span
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: themeMeta?.previewPrimary || '#102A43' }}
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10.5px] font-black text-[#102A43] block truncate">
                              {isRtl ? bundle.titleAr : bundle.titleEn}
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-500 block truncate">
                              {isRtl ? bundle.subtitleAr : bundle.subtitleEn}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: 14 Curated Color Palettes */}
            {studioTab === 'colors' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {THEME_PRESETS.map((preset) => {
                    const active = prefs.themeId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setThemeId(preset.id)}
                        className={`p-2 rounded-xl border text-${isRtl ? 'right' : 'left'} flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          active
                            ? 'border-[#102A43] ring-2 ring-[#C6A15B] bg-slate-50'
                            : 'border-slate-200 hover:border-slate-400 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-7 h-7 rounded-lg border border-slate-300 shrink-0 flex items-center justify-center gap-0.5 overflow-hidden p-0.5"
                            style={{ backgroundColor: preset.previewBg }}
                          >
                            <span
                              className="w-2.5 h-4 rounded-xs"
                              style={{ backgroundColor: preset.previewPrimary }}
                            />
                            <span
                              className="w-1.5 h-4 rounded-xs"
                              style={{ backgroundColor: preset.previewAccent }}
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10.5px] font-black text-[#102A43] block truncate">
                              {t(preset.labelKey)}
                            </span>
                            {preset.isGlass && (
                              <span className="text-[8.5px] font-black text-sky-700 block">
                                {isRtl ? 'تأثير زجاجي شفاف' : 'Frosted Glass'}
                              </span>
                            )}
                          </div>
                        </div>
                        {active && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: Custom Color Picker */}
            {studioTab === 'custom' && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
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
                  <label className="flex flex-col items-center gap-1 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                    <span>{t('customBgLabel')}</span>
                    <input
                      type="color"
                      value={draftCustomBg}
                      onChange={(e) => setDraftCustomBg(e.target.value)}
                      className="w-12 h-7 rounded cursor-pointer border-0"
                    />
                  </label>
                  <label className="flex flex-col items-center gap-1 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                    <span>{t('customPrimaryLabel')}</span>
                    <input
                      type="color"
                      value={draftCustomPrimary}
                      onChange={(e) => setDraftCustomPrimary(e.target.value)}
                      className="w-12 h-7 rounded cursor-pointer border-0"
                    />
                  </label>
                  <label className="flex flex-col items-center gap-1 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                    <span>{t('customAccentLabel')}</span>
                    <input
                      type="color"
                      value={draftCustomAccent}
                      onChange={(e) => setDraftCustomAccent(e.target.value)}
                      className="w-12 h-7 rounded cursor-pointer border-0"
                    />
                  </label>
                </div>

                <div
                  className="p-3 rounded-xl border flex items-center justify-between"
                  style={{ backgroundColor: draftCustomBg, borderColor: draftCustomPrimary }}
                >
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10.5px] font-black text-white"
                    style={{ backgroundColor: draftCustomPrimary }}
                  >
                    {isRtl ? 'معاينة الهيدر والقوائم' : 'Header & Nav Preview'}
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10.5px] font-black text-[#102A43]"
                    style={{ backgroundColor: draftCustomAccent }}
                  >
                    {isRtl ? 'اللون المميز' : 'Accent'}
                  </span>
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
                    className="flex-1 py-2 px-3 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-[11px] font-black cursor-pointer whitespace-nowrap"
                  >
                    {t('applyCustomTheme')}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyUiSkinBundle('frosted_slate', 'frosted_teal')}
                    className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10.5px] font-black cursor-pointer whitespace-nowrap"
                  >
                    {t('resetThemeBtn')}
                  </button>
                </div>
              </div>
            )}
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
              : 'bg-white/12 hover:bg-white/20 text-white border-white/15'
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
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[10.5px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
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
