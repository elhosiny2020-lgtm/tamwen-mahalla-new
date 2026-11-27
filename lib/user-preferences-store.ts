'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppLanguage, TranslationDictionary, translate } from './i18n';
import {
  enableFullEnglishDomTranslation,
  restoreOriginalArabicDom,
} from './full-ui-translator';
import {
  DEFAULT_NOTIFICATION_AUDIO_PREFS,
  NotificationAudioPreferences,
  NotificationCategoryAudioSetting,
  NotificationCategoryId,
  normalizeNotificationAudioPrefs,
} from './notification-sound-engine';

export type ThemePresetId =
  | 'frosted_teal'
  | 'gov_navy'
  | 'soft_white'
  | 'calm_gray'
  | 'calm_blue'
  | 'calm_green'
  | 'warm_beige'
  | 'royal_emerald'
  | 'indigo_horizon'
  | 'burgundy_gold'
  | 'desert_sand'
  | 'dark_mode'
  | 'midnight_aurora'
  | 'eye_comfort'
  | 'crystal_glass'
  | 'obsidian_glass'
  | 'aurora_glass'
  | 'emerald_glass'
  | 'sapphire_executive'
  | 'copper_editorial'
  | 'coral_shareflow'
  | 'periwinkle_learn'
  | 'pastel_violet_cloud'
  | 'cyber_ocean_dark'
  | 'plum_sunflower'
  | 'royal_indigo_honey'
  | 'clay_slate_3d'
  | 'twilight_peach'
  | 'deep_ocean_flame'
  | 'monochrome_studio'
  | 'navy_tangerine_pro'
  | 'aqua_glass_prism'
  | 'humandeck_violet'
  | 'crextio_sky_glass'
  | 'custom';

export type UiLayoutId =
  | 'frosted_slate'
  | 'executive_command'
  | 'bento_mosaic'
  | 'royal_heritage'
  | 'ultra_minimal'
  | 'operations_cockpit'
  | 'liquid_glass'
  | 'glass_split'
  | 'floating_top_glass'
  | 'tactile_clay_3d'
  | 'clean_light_sidebar'
  | 'cyber_hud_cockpit';

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
  uiLayout: UiLayoutId;
  customColors: CustomThemeColors;
  displayMode: DisplayScalingMode;
  density: UiDensity;
  notificationAudio: NotificationAudioPreferences;
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
  isGlass?: boolean;
  isClay?: boolean;
}

export interface UiLayoutPresetMeta {
  id: UiLayoutId;
  labelKey: keyof TranslationDictionary;
  descAr: string;
  descEn: string;
  navPositionAr: string;
  navPositionEn: string;
  recommendedTheme: ThemePresetId;
  wireframeType:
    | 'sidebar_glass'
    | 'top_ribbon'
    | 'icon_rail_bento'
    | 'sovereign_grid'
    | 'minimal_flat'
    | 'cockpit_dense'
    | 'liquid_glass'
    | 'glass_split'
    | 'floating_top_glass'
    | 'tactile_clay_3d'
    | 'clean_light_sidebar'
    | 'cyber_hud_cockpit';
  isGlass?: boolean;
  isClay?: boolean;
}

export interface UxSkinBundleMeta {
  id: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  layoutId: UiLayoutId;
  themeId: ThemePresetId;
  previewImage?: string;
  category?: 'featured' | 'light' | 'dark' | 'glass_3d';
}

export const UI_LAYOUT_PRESETS: UiLayoutPresetMeta[] = [
  {
    id: 'frosted_slate',
    labelKey: 'layout_frosted_slate',
    descAr: 'شريط جانبي عائم مع بطاقات زجاجية ناعمة ورسوم بيانية متناسقة',
    descEn: 'Floating frosted sidebar with tactile KPI cards & modern analytics',
    navPositionAr: 'قائمة جانبية عائمة',
    navPositionEn: 'Floating Sidebar',
    recommendedTheme: 'frosted_teal',
    wireframeType: 'sidebar_glass',
  },
  {
    id: 'executive_command',
    labelKey: 'layout_executive_command',
    descAr: 'شريط أقسام أفقي علوي لفتح مساحة العرض بالكامل للقيادات',
    descEn: 'Full-width executive canvas with horizontal top department ribbon',
    navPositionAr: 'شريط علوي أفقي',
    navPositionEn: 'Top Ribbon Nav',
    recommendedTheme: 'gov_navy',
    wireframeType: 'top_ribbon',
  },
  {
    id: 'bento_mosaic',
    labelKey: 'layout_bento_mosaic',
    descAr: 'شريط أيقونات مضغوط مع شبكة بطاقات بينتو وصور القطاعات التفاعلية',
    descEn: 'Compact icon rail paired with asymmetric visual Bento mosaic grid',
    navPositionAr: 'شريط أيقونات مضغوط',
    navPositionEn: 'Compact Icon Rail',
    recommendedTheme: 'indigo_horizon',
    wireframeType: 'icon_rail_bento',
  },
  {
    id: 'royal_heritage',
    labelKey: 'layout_royal_heritage',
    descAr: 'هيكلة رسمية مؤطرة بخطوط ذهبية وإحصائيات قيادية منظمة في ٣ أعمدة',
    descEn: 'Formal ministerial grid with sovereign borders and structured pillars',
    navPositionAr: 'إطار سيادي منظم',
    navPositionEn: 'Sovereign Frame',
    recommendedTheme: 'royal_emerald',
    wireframeType: 'sovereign_grid',
  },
  {
    id: 'ultra_minimal',
    labelKey: 'layout_ultra_minimal',
    descAr: 'تصميم مسطح خفيف بدون تشتيت بصري وتركيز كامل على البيانات',
    descEn: 'Crisp hairline flat interface with maximum data clarity and calm spacing',
    navPositionAr: 'تخطيط مسطح هادئ',
    navPositionEn: 'Minimal Flat Grid',
    recommendedTheme: 'soft_white',
    wireframeType: 'minimal_flat',
  },
  {
    id: 'operations_cockpit',
    labelKey: 'layout_operations_cockpit',
    descAr: 'غرفة عمليات كثيفة للرصد اللحظي والمهام العاجلة والتحليلات المباشرة',
    descEn: 'High-efficiency telemetry cockpit with dense monitoring & quick actions',
    navPositionAr: 'غرفة عمليات فورية',
    navPositionEn: 'Live Cockpit Deck',
    recommendedTheme: 'midnight_aurora',
    wireframeType: 'cockpit_dense',
  },
  {
    id: 'liquid_glass',
    labelKey: 'layout_liquid_glass',
    descAr: 'طبقات زجاجية شفافة ثلاثية الأبعاد مع ضبابية كريستالية وحدود مضيئة',
    descEn: 'Multi-layer translucent frosted glass canvas with luminous specular borders',
    navPositionAr: 'زجاج سائل عائم',
    navPositionEn: 'Floating Liquid Glass',
    recommendedTheme: 'crystal_glass',
    wireframeType: 'liquid_glass',
    isGlass: true,
  },
  {
    id: 'glass_split',
    labelKey: 'layout_glass_split',
    descAr: 'شريط قيادة علوي زجاجي مع بطاقات عائمة شفافة وتباين فائق الوضوح',
    descEn: 'Translucent glass top command bar paired with floating elevated cards',
    navPositionAr: 'شريط علوي زجاجي',
    navPositionEn: 'Glass Command Bar',
    recommendedTheme: 'obsidian_glass',
    wireframeType: 'glass_split',
    isGlass: true,
  },
  {
    id: 'floating_top_glass',
    labelKey: 'layout_floating_top_glass',
    descAr: 'شريط تنقل علوي سماوي عائم مع بطاقات زجاجية مستديرة ومساحات رحبة (Crextio)',
    descEn: 'Airy sky-frost top navigation ribbon with generous rounded glass cards',
    navPositionAr: 'شريط علوي عائم',
    navPositionEn: 'Floating Sky Top Bar',
    recommendedTheme: 'crextio_sky_glass',
    wireframeType: 'floating_top_glass',
    isGlass: true,
  },
  {
    id: 'tactile_clay_3d',
    labelKey: 'layout_tactile_clay_3d',
    descAr: 'بطاقات وأزرار مجسمة ثلاثية الأبعاد بظلال ناعمة وإضاءة حواف علوية (Clay 3D)',
    descEn: 'Sculpted 3D claymorphic cards and soft-embossed tactile slate panels',
    navPositionAr: 'قائمة مجسمة 3D',
    navPositionEn: '3D Tactile Sidebar',
    recommendedTheme: 'clay_slate_3d',
    wireframeType: 'tactile_clay_3d',
    isClay: true,
  },
  {
    id: 'clean_light_sidebar',
    labelKey: 'layout_clean_light_sidebar',
    descAr: 'قائمة جانبية بيضاء نقية بخطوط واضحة وتباين عالٍ وتبويبات ملونة ناعمة',
    descEn: 'Crisp pure-white minimalist sidebar with dark ink & vibrant active accents',
    navPositionAr: 'قائمة جانبية بيضاء',
    navPositionEn: 'Clean White Sidebar',
    recommendedTheme: 'coral_shareflow',
    wireframeType: 'clean_light_sidebar',
  },
  {
    id: 'cyber_hud_cockpit',
    labelKey: 'layout_cyber_hud_cockpit',
    descAr: 'منصة عمليات ليلية بإطارات سيبرانية مضيئة وشريط أيقونات مضغوط للرصد السريع',
    descEn: 'Luminous cyan-rimmed dark glass telemetry deck with slim icon rail',
    navPositionAr: 'شريط أيقونات سيبراني',
    navPositionEn: 'Cyber HUD Icon Rail',
    recommendedTheme: 'cyber_ocean_dark',
    wireframeType: 'cyber_hud_cockpit',
    isGlass: true,
  },
];

export const THEME_PRESETS: ThemePresetMeta[] = [
  {
    id: 'frosted_teal',
    labelKey: 'theme_frosted_teal',
    previewBg: '#BDC9D4',
    previewPrimary: '#253B4F',
    previewAccent: '#94C9CE',
    previewText: '#1E3346',
  },
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
    id: 'royal_emerald',
    labelKey: 'theme_royal_emerald',
    previewBg: '#EFF5F2',
    previewPrimary: '#0F3D2E',
    previewAccent: '#D4AF37',
    previewText: '#0B2B21',
  },
  {
    id: 'indigo_horizon',
    labelKey: 'theme_indigo_horizon',
    previewBg: '#EEF1FA',
    previewPrimary: '#242B5E',
    previewAccent: '#5B6BE6',
    previewText: '#1A1F47',
  },
  {
    id: 'burgundy_gold',
    labelKey: 'theme_burgundy_gold',
    previewBg: '#F7F1F2',
    previewPrimary: '#5B1829',
    previewAccent: '#C99B49',
    previewText: '#3A0E19',
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
    id: 'desert_sand',
    labelKey: 'theme_desert_sand',
    previewBg: '#F4EFE4',
    previewPrimary: '#3E4735',
    previewAccent: '#C28E42',
    previewText: '#2A3024',
  },
  {
    id: 'eye_comfort',
    labelKey: 'theme_eye_comfort',
    previewBg: '#F4ECD8',
    previewPrimary: '#3D3522',
    previewAccent: '#8A6D3B',
    previewText: '#2B2619',
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
    id: 'midnight_aurora',
    labelKey: 'theme_midnight_aurora',
    previewBg: '#09111E',
    previewPrimary: '#12263A',
    previewAccent: '#38BDF8',
    previewText: '#E2E8F0',
    isDark: true,
  },
  {
    id: 'crystal_glass',
    labelKey: 'theme_crystal_glass',
    previewBg: '#DCEBFF',
    previewPrimary: '#133C68',
    previewAccent: '#38BDF8',
    previewText: '#0F2942',
    isGlass: true,
  },
  {
    id: 'obsidian_glass',
    labelKey: 'theme_obsidian_glass',
    previewBg: '#090F1E',
    previewPrimary: '#172542',
    previewAccent: '#60A5FA',
    previewText: '#F1F5F9',
    isDark: true,
    isGlass: true,
  },
  {
    id: 'aurora_glass',
    labelKey: 'theme_aurora_glass',
    previewBg: '#0D132B',
    previewPrimary: '#241B52',
    previewAccent: '#2DD4BF',
    previewText: '#F1F5F9',
    isDark: true,
    isGlass: true,
  },
  {
    id: 'emerald_glass',
    labelKey: 'theme_emerald_glass',
    previewBg: '#D8EFE5',
    previewPrimary: '#0E4332',
    previewAccent: '#D4AF37',
    previewText: '#0B2B21',
    isGlass: true,
  },
  {
    id: 'sapphire_executive',
    labelKey: 'theme_sapphire_executive',
    previewBg: '#EEF3FA',
    previewPrimary: '#0B2545',
    previewAccent: '#D4AF37',
    previewText: '#0B2545',
  },
  {
    id: 'copper_editorial',
    labelKey: 'theme_copper_editorial',
    previewBg: '#F8F2EC',
    previewPrimary: '#4A251B',
    previewAccent: '#C87D4B',
    previewText: '#2F1811',
  },
  {
    id: 'coral_shareflow',
    labelKey: 'theme_coral_shareflow',
    previewBg: '#B8C1D4',
    previewPrimary: '#1E2433',
    previewAccent: '#E8532A',
    previewText: '#1E2433',
  },
  {
    id: 'periwinkle_learn',
    labelKey: 'theme_periwinkle_learn',
    previewBg: '#DFE5EE',
    previewPrimary: '#4F67B0',
    previewAccent: '#EE8A95',
    previewText: '#1F2A44',
  },
  {
    id: 'pastel_violet_cloud',
    labelKey: 'theme_pastel_violet_cloud',
    previewBg: '#ECE7FA',
    previewPrimary: '#5D5FEF',
    previewAccent: '#F39CB2',
    previewText: '#232248',
  },
  {
    id: 'cyber_ocean_dark',
    labelKey: 'theme_cyber_ocean_dark',
    previewBg: '#041422',
    previewPrimary: '#0A2C46',
    previewAccent: '#00D4FF',
    previewText: '#E8F6FF',
    isDark: true,
    isGlass: true,
  },
  {
    id: 'plum_sunflower',
    labelKey: 'theme_plum_sunflower',
    previewBg: '#F2E7EA',
    previewPrimary: '#4B425B',
    previewAccent: '#F5C74C',
    previewText: '#2D2638',
  },
  {
    id: 'royal_indigo_honey',
    labelKey: 'theme_royal_indigo_honey',
    previewBg: '#F4F5FB',
    previewPrimary: '#2D2572',
    previewAccent: '#F8B85A',
    previewText: '#1E1A4D',
  },
  {
    id: 'clay_slate_3d',
    labelKey: 'theme_clay_slate_3d',
    previewBg: '#9EB0BC',
    previewPrimary: '#2B4257',
    previewAccent: '#4893A0',
    previewText: '#1A2D3D',
    isClay: true,
  },
  {
    id: 'twilight_peach',
    labelKey: 'theme_twilight_peach',
    previewBg: '#F8EEE8',
    previewPrimary: '#3B3E79',
    previewAccent: '#F89668',
    previewText: '#242754',
  },
  {
    id: 'deep_ocean_flame',
    labelKey: 'theme_deep_ocean_flame',
    previewBg: '#062038',
    previewPrimary: '#0B3357',
    previewAccent: '#FF5D1F',
    previewText: '#F0F7FF',
    isDark: true,
  },
  {
    id: 'monochrome_studio',
    labelKey: 'theme_monochrome_studio',
    previewBg: '#DDE0EA',
    previewPrimary: '#14161B',
    previewAccent: '#F472B6',
    previewText: '#14161B',
  },
  {
    id: 'navy_tangerine_pro',
    labelKey: 'theme_navy_tangerine_pro',
    previewBg: '#E6F0F8',
    previewPrimary: '#182436',
    previewAccent: '#F26430',
    previewText: '#121E2E',
  },
  {
    id: 'aqua_glass_prism',
    labelKey: 'theme_aqua_glass_prism',
    previewBg: '#D8EEF3',
    previewPrimary: '#0C4C60',
    previewAccent: '#10B981',
    previewText: '#0A2F3D',
    isGlass: true,
  },
  {
    id: 'humandeck_violet',
    labelKey: 'theme_humandeck_violet',
    previewBg: '#F1F3F9',
    previewPrimary: '#13144A',
    previewAccent: '#6B52D6',
    previewText: '#14163C',
  },
  {
    id: 'crextio_sky_glass',
    labelKey: 'theme_crextio_sky_glass',
    previewBg: '#DCE9F8',
    previewPrimary: '#143A6B',
    previewAccent: '#1976F3',
    previewText: '#102A4C',
    isGlass: true,
  },
];

export const UX_BUNDLE_PRESETS: UxSkinBundleMeta[] = [
  // === 18 Curated Gallery Interfaces Inspired Directly by User-Selected Dashboards ===
  {
    id: 'gallery_crextio_sky',
    titleAr: 'واجهة السماوي العائم (Crextio)',
    titleEn: 'Crextio Sky Floating Glass',
    subtitleAr: 'شريط علوي عائم وبطاقات سماوية زجاجية رحبة',
    subtitleEn: 'Floating top nav & airy sky glass cards',
    layoutId: 'floating_top_glass',
    themeId: 'crextio_sky_glass',
    previewImage: '/assets/aistudio/fd4a64bb1e577223adf6adcfc2e8c4b7_91111878.jpg',
    category: 'glass_3d',
  },
  {
    id: 'gallery_cyber_hospital',
    titleAr: 'العمليات السيبراني 3D (Cyber HUD)',
    titleEn: 'Cyber 3D Operations HUD',
    subtitleAr: 'زجاج ليلي مضيء بحدود سماوية وتفاصيل فورية',
    subtitleEn: 'Dark luminous cyan glass telemetry deck',
    layoutId: 'cyber_hud_cockpit',
    themeId: 'cyber_ocean_dark',
    previewImage: '/assets/aistudio/12a906f8400555f75b75755f91e7cb7b_7fa6fdac.jpg',
    category: 'dark',
  },
  {
    id: 'gallery_clay_3d',
    titleAr: 'الواجهة المجسمة 3D (Tactile Clay)',
    titleEn: '3D Tactile Clay Slate',
    subtitleAr: 'بطاقات بارزة ثلاثية الأبعاد بظلال ناعمة وأزرق رمادي',
    subtitleEn: 'Soft-embossed 3D clay cards & slate rail',
    layoutId: 'tactile_clay_3d',
    themeId: 'clay_slate_3d',
    previewImage: '/assets/aistudio/d3432e6545503a17380d2e77f419066f_386d0038.jpg',
    category: 'glass_3d',
  },
  {
    id: 'gallery_aqua_glass',
    titleAr: 'أكوا الزجاجي الشفاف (Aqua Glass)',
    titleEn: 'Aqua Frosted Glass Academy',
    subtitleAr: 'شريط بترولي غامق وبطاقات زجاجية ناصعة الشفافية',
    subtitleEn: 'Deep petrol sidebar & iridescent frosted glass',
    layoutId: 'liquid_glass',
    themeId: 'aqua_glass_prism',
    previewImage: '/assets/aistudio/5631bfb5fb22d764d23d1fe0ae9e1bd6_df20faa3.jpg',
    category: 'glass_3d',
  },
  {
    id: 'gallery_daily_ads',
    titleAr: 'المحيط العميق والبرتقالي (Ocean Pro)',
    titleEn: 'Deep Ocean & Flame Pro',
    subtitleAr: 'لوحة داكنة فاخرة بألوان المحيط ولمسات برتقالية بارزة',
    subtitleEn: 'Rich marine navy with vibrant flame CTA',
    layoutId: 'operations_cockpit',
    themeId: 'deep_ocean_flame',
    previewImage: '/assets/aistudio/e171b3bc697d9682d34f86df6e0e467b_de6aca1a.jpg',
    category: 'dark',
  },
  {
    id: 'gallery_shareflow',
    titleAr: 'شير فلو الكورال الأبيض (ShareFlow)',
    titleEn: 'ShareFlow Coral & Slate',
    subtitleAr: 'قائمة بيضاء أنيقة مع أزرار مرجانية ناصعة',
    subtitleEn: 'Clean white sidebar & vivid coral actions',
    layoutId: 'clean_light_sidebar',
    themeId: 'coral_shareflow',
    previewImage: '/assets/aistudio/6b6012307f2c30b41d392abd3e46280d_e5be31e3.jpg',
    category: 'light',
  },
  {
    id: 'gallery_learnthru',
    titleAr: 'السماوي والوردي الهادئ (Learnthru)',
    titleEn: 'Learnthru Periwinkle & Rose',
    subtitleAr: 'واجهة مضيئة منظمة بأزرق سماوي ولمسات وردية',
    subtitleEn: 'Light clean workspace with periwinkle cards',
    layoutId: 'clean_light_sidebar',
    themeId: 'periwinkle_learn',
    previewImage: '/assets/aistudio/8b99a54b7ba1bbb4ef701da83636ae73_15bb5a09.jpg',
    category: 'light',
  },
  {
    id: 'gallery_pastel_social',
    titleAr: 'البنفسجي الباستيل المضيء (Pastel)',
    titleEn: 'Pastel Violet Cloud Rail',
    subtitleAr: 'شريط أيقونات أنيق وبطاقات سحابية باستيل ناعمة',
    subtitleEn: 'Compact pastel rail & airy snow-white cards',
    layoutId: 'bento_mosaic',
    themeId: 'pastel_violet_cloud',
    previewImage: '/assets/aistudio/3f4e45946e4ecbe0be1cd32c8f314876_9da0be22.jpg',
    category: 'light',
  },
  {
    id: 'gallery_plum_sunflower',
    titleAr: 'البرقوقي والذهبي المشرق (Plum Gold)',
    titleEn: 'Plum & Sunflower Studio',
    subtitleAr: 'قائمة برقوقية مخملية مع لمسات ذهبية دافئة',
    subtitleEn: 'Velvet plum sidebar & warm golden highlights',
    layoutId: 'frosted_slate',
    themeId: 'plum_sunflower',
    previewImage: '/assets/aistudio/522165cfcd8b895f6b80577fd9b82c7c_9c021a25.jpg',
    category: 'featured',
  },
  {
    id: 'gallery_helper_indigo',
    titleAr: 'النيلي الملكي والعسلي (Helper Pro)',
    titleEn: 'Helper Indigo & Honey',
    subtitleAr: 'شريط أيقونات نيلي عميق وبطاقات بيضاء وعسلية',
    subtitleEn: 'Deep indigo icon rail & honey accents',
    layoutId: 'bento_mosaic',
    themeId: 'royal_indigo_honey',
    previewImage: '/assets/aistudio/d042dcac27d81e48ff7e0853b1d08060_436f7bd8.jpg',
    category: 'light',
  },
  {
    id: 'gallery_twilight_peach',
    titleAr: 'نيلي الغسق والخوخي (Fleet UI)',
    titleEn: 'Twilight Indigo & Peach',
    subtitleAr: 'قائمة نيلية أنيقة مع تمييز خوخي دافئ وتباين مريح',
    subtitleEn: 'Twilight sidebar with apricot active tabs',
    layoutId: 'frosted_slate',
    themeId: 'twilight_peach',
    previewImage: '/assets/aistudio/ec22d5bcbb92c398ecb3c959fdbbd672_18f9215d.jpg',
    category: 'featured',
  },
  {
    id: 'gallery_lavender_cloud',
    titleAr: 'سحابة اللافندر الهادئة (Cloud Tasks)',
    titleEn: 'Lavender Cloud Workspace',
    subtitleAr: 'تصميم خفيف وهادئ للتركيز والمهام اليومية',
    subtitleEn: 'Serene mist-lavender minimal workspace',
    layoutId: 'clean_light_sidebar',
    themeId: 'pastel_violet_cloud',
    previewImage: '/assets/aistudio/f3be18bb13eccfca4c6346f497983b72_0b87084a.jpg',
    category: 'light',
  },
  {
    id: 'gallery_midnight_lavender',
    titleAr: 'الأوبسيديان واللافندر (Midnight Rail)',
    titleEn: 'Midnight Rail & Lavender',
    subtitleAr: 'شريط أيقونات داكن أنيق على خلفية بيضاء مشرقة',
    subtitleEn: 'Obsidian icon rail with crisp white stage',
    layoutId: 'bento_mosaic',
    themeId: 'humandeck_violet',
    previewImage: '/assets/aistudio/53c64040da206b0b2b42f15fb35488d9_1831b041.jpg',
    category: 'featured',
  },
  {
    id: 'gallery_monochrome_feeds',
    titleAr: 'استوديو الأبيض والأسود (Monochrome)',
    titleEn: 'Monochrome Editorial Ink',
    subtitleAr: 'بساطة تحريرية فائقة بالأبيض والأسود الفحمي',
    subtitleEn: 'Crisp white panels with bold jet-black buttons',
    layoutId: 'clean_light_sidebar',
    themeId: 'monochrome_studio',
    previewImage: '/assets/aistudio/f9db22a291b680ed119a29b96d3c5875_77b520d4.jpg',
    category: 'light',
  },
  {
    id: 'gallery_studio_builder',
    titleAr: 'استوديو الكحلي واليوسفي (Builder)',
    titleEn: 'Studio Navy & Tangerine',
    subtitleAr: 'شريط أدوات كحلي داكن مع مساحة عمل بيضاء ويوسفي',
    subtitleEn: 'Dark studio sidebar with crisp bright canvas',
    layoutId: 'frosted_slate',
    themeId: 'navy_tangerine_pro',
    previewImage: '/assets/aistudio/fd7ebfd86525198cfa68d44925d828b6_e3b0365e.jpg',
    category: 'featured',
  },
  {
    id: 'gallery_dual_analytics',
    titleAr: 'التحليلات التنفيذية المزدوجة (Analytics)',
    titleEn: 'Executive Split Analytics',
    subtitleAr: 'كحلي ليلي متباين مع بطاقات بيضاء ولمسات كهرمانية',
    subtitleEn: 'Charcoal-navy nav & high-contrast KPI stage',
    layoutId: 'royal_heritage',
    themeId: 'navy_tangerine_pro',
    previewImage: '/assets/aistudio/74d274d58b8418841c1c6a7d4c3bfc1b_030c63a4.jpg',
    category: 'featured',
  },
  {
    id: 'gallery_humandeck',
    titleAr: 'هيومان ديك الملكي (Humandeck HR)',
    titleEn: 'Humandeck Royal Navy & Violet',
    subtitleAr: 'لوحة موارد بشرية وقيادة مؤسسية بالكحلي والبنفسجي',
    subtitleEn: 'Enterprise indigo sidebar & regal violet KPIs',
    layoutId: 'frosted_slate',
    themeId: 'humandeck_violet',
    previewImage: '/assets/aistudio/91063e2a98e0d23dd7846ff08830f8c4_50b2cb54.jpg',
    category: 'featured',
  },
  {
    id: 'gallery_learning_light',
    titleAr: 'السماوي النقي والكوبالت (LearningLight)',
    titleEn: 'LearningLight Sky & Cobalt',
    subtitleAr: 'قائمة بيضاء مسطحة مع أزرق كوبالت مشرق ومريح للعين',
    subtitleEn: 'Minimal white sidebar & electric cobalt accents',
    layoutId: 'clean_light_sidebar',
    themeId: 'periwinkle_learn',
    previewImage: '/assets/aistudio/ed3b2359b803c6d05ae0430530dd279a_593140d2.jpg',
    category: 'light',
  },
  // === Classic & Glass Core System Skins ===
  {
    id: 'skin_crystal_liquid',
    titleAr: 'الكريستال الزجاجي الفاخر',
    titleEn: 'Crystal Liquid Glass',
    subtitleAr: 'واجهات زجاجية شفافة بضبابية كريستالية',
    subtitleEn: 'Translucent glass layers & crisp frost',
    layoutId: 'liquid_glass',
    themeId: 'crystal_glass',
    category: 'glass_3d',
  },
  {
    id: 'skin_obsidian_glass',
    titleAr: 'الأوبسيديان الزجاجي الداكن',
    titleEn: 'Obsidian Dark Glass',
    subtitleAr: 'قيادة علوية زجاجية داكنة فائقة الفخامة',
    subtitleEn: 'Dark smoked glass & luminous blue glow',
    layoutId: 'glass_split',
    themeId: 'obsidian_glass',
    category: 'dark',
  },
  {
    id: 'skin_aurora_prism',
    titleAr: 'الشفق الزجاجي المتلألئ',
    titleEn: 'Aurora Prism Glass',
    subtitleAr: 'زجاج ليلي بتدرجات الشفق والتركواز',
    subtitleEn: 'Aurora mesh backdrop & frosted panels',
    layoutId: 'liquid_glass',
    themeId: 'aurora_glass',
    category: 'dark',
  },
  {
    id: 'skin_emerald_glass',
    titleAr: 'الزمرد الزجاجي السيادي',
    titleEn: 'Royal Emerald Glass',
    subtitleAr: 'زجاج زمردي شفاف مع لمسات ذهبية ملكية',
    subtitleEn: 'Frosted emerald glass & sovereign gold',
    layoutId: 'liquid_glass',
    themeId: 'emerald_glass',
    category: 'glass_3d',
  },
  {
    id: 'skin_glass_modern',
    titleAr: 'الداش بورد الزجاجي العصري',
    titleEn: 'Modern Frosted Glass',
    subtitleAr: 'تصميم زجاجي ثلجي مع شريط جانبي عائم',
    subtitleEn: 'Frosted teal & floating sidebar',
    layoutId: 'frosted_slate',
    themeId: 'frosted_teal',
    category: 'featured',
  },
  {
    id: 'skin_exec_ribbon',
    titleAr: 'القيادة التنفيذية الواسعة',
    titleEn: 'Executive Wide Ribbon',
    subtitleAr: 'شريط أقسام علوي وياقوت حكومي ذهبي',
    subtitleEn: 'Top ribbon nav & sapphire executive',
    layoutId: 'executive_command',
    themeId: 'sapphire_executive',
    category: 'featured',
  },
];

export const DEFAULT_USER_PREFERENCES: UserDisplayPreferences = {
  fontScale: 100,
  language: 'ar',
  themeId: 'frosted_teal',
  uiLayout: 'frosted_slate',
  customColors: {
    background: '#BDC9D4',
    primary: '#253B4F',
    accent: '#94C9CE',
  },
  displayMode: 'auto',
  density: 'comfortable',
  notificationAudio: DEFAULT_NOTIFICATION_AUDIO_PREFS,
  updatedAt: '2026-11-27T00:00:00Z',
};

const PREFS_KEY_PREFIX = 'gharbia_supply_user_prefs_v2_';

function getStorageKey(userId: string): string {
  return `${PREFS_KEY_PREFIX}${userId || 'guest'}`;
}

const VALID_LAYOUTS = new Set<UiLayoutId>([
  'frosted_slate',
  'executive_command',
  'bento_mosaic',
  'royal_heritage',
  'ultra_minimal',
  'operations_cockpit',
  'liquid_glass',
  'glass_split',
  'floating_top_glass',
  'tactile_clay_3d',
  'clean_light_sidebar',
  'cyber_hud_cockpit',
]);

function normalizeLayout(v: unknown): UiLayoutId {
  return typeof v === 'string' && VALID_LAYOUTS.has(v as UiLayoutId)
    ? (v as UiLayoutId)
    : DEFAULT_USER_PREFERENCES.uiLayout;
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
      uiLayout: normalizeLayout(parsed.uiLayout),
      fontScale: Math.min(150, Math.max(80, Number(parsed.fontScale) || 100)),
      language: parsed.language === 'en' ? 'en' : 'ar',
      customColors: {
        ...DEFAULT_USER_PREFERENCES.customColors,
        ...(parsed.customColors || {}),
      },
      notificationAudio: normalizeNotificationAudioPrefs(parsed.notificationAudio),
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
      uiLayout: normalizeLayout(data.preferences.uiLayout),
      fontScale: Math.min(150, Math.max(80, Number(data.preferences.fontScale) || 100)),
      language: data.preferences.language === 'en' ? 'en' : 'ar',
      customColors: {
        ...DEFAULT_USER_PREFERENCES.customColors,
        ...(data.preferences.customColors || {}),
      },
      notificationAudio: normalizeNotificationAudioPrefs(data.preferences.notificationAudio),
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
        uiLayout: prefs.uiLayout,
        customColors: prefs.customColors,
        displayMode: prefs.displayMode,
        density: prefs.density,
        notificationAudio: prefs.notificationAudio,
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
  setUiLayout: (uiLayout: UiLayoutId, alsoApplyPairedTheme?: boolean) => void;
  applyUiSkinBundle: (uiLayout: UiLayoutId, themeId: ThemePresetId) => void;
  setCustomColors: (colors: CustomThemeColors) => void;
  setDisplayMode: (mode: DisplayScalingMode) => void;
  setDensity: (density: UiDensity) => void;
  setNotificationAudioPrefs: (audio: NotificationAudioPreferences) => void;
  setNotificationMasterEnabled: (enabled: boolean) => void;
  setNotificationVolume: (volume: number) => void;
  updateNotificationCategoryAudio: (
    category: NotificationCategoryId,
    patch: Partial<NotificationCategoryAudioSetting>
  ) => void;
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
    root.setAttribute('data-ui-layout', prefs.uiLayout);
    root.setAttribute('data-density', effectiveDensity);

    // تفعيل كلاس dark للثيمات الداكنة والزجاجية الداكنة أو اللون المخصص الداكن
    const isCustomDark =
      prefs.themeId === 'custom' && getLuminance(prefs.customColors.background) < 0.35;
    const isDarkTheme =
      prefs.themeId === 'dark_mode' ||
      prefs.themeId === 'midnight_aurora' ||
      prefs.themeId === 'obsidian_glass' ||
      prefs.themeId === 'aurora_glass' ||
      prefs.themeId === 'cyber_ocean_dark' ||
      prefs.themeId === 'deep_ocean_flame' ||
      isCustomDark;
    if (isDarkTheme) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const isGlassActive =
      prefs.themeId === 'crystal_glass' ||
      prefs.themeId === 'obsidian_glass' ||
      prefs.themeId === 'aurora_glass' ||
      prefs.themeId === 'emerald_glass' ||
      prefs.themeId === 'cyber_ocean_dark' ||
      prefs.themeId === 'aqua_glass_prism' ||
      prefs.themeId === 'crextio_sky_glass' ||
      prefs.uiLayout === 'liquid_glass' ||
      prefs.uiLayout === 'glass_split' ||
      prefs.uiLayout === 'floating_top_glass' ||
      prefs.uiLayout === 'cyber_hud_cockpit';
    root.setAttribute('data-glass-ui', isGlassActive ? 'true' : 'false');

    const isClayActive =
      prefs.themeId === 'clay_slate_3d' || prefs.uiLayout === 'tactile_clay_3d';
    root.setAttribute('data-clay-ui', isClayActive ? 'true' : 'false');

    root.setAttribute(
      'data-light-sidebar',
      prefs.uiLayout === 'clean_light_sidebar' && !isDarkTheme ? 'true' : 'false'
    );

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

  // ترجمة كاملة وفورية لجميع مكونات وشاشات المنظومة عند تبديل اللغة مع استعادة عربية دقيقة ١٠٠٪
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (prefs.language === 'en') {
      const frameId = requestAnimationFrame(() => {
        enableFullEnglishDomTranslation();
      });
      return () => {
        cancelAnimationFrame(frameId);
      };
    } else {
      restoreOriginalArabicDom();
      return undefined;
    }
  }, [prefs.language]);

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

  const setUiLayout = useCallback(
    (uiLayout: UiLayoutId, alsoApplyPairedTheme = false) => {
      const matched = UI_LAYOUT_PRESETS.find((l) => l.id === uiLayout);
      updatePrefs((p) => ({
        ...p,
        uiLayout,
        themeId: alsoApplyPairedTheme && matched ? matched.recommendedTheme : p.themeId,
      }));
    },
    [updatePrefs]
  );

  const applyUiSkinBundle = useCallback(
    (uiLayout: UiLayoutId, themeId: ThemePresetId) => {
      updatePrefs((p) => ({ ...p, uiLayout, themeId }));
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

  const setNotificationAudioPrefs = useCallback(
    (audio: NotificationAudioPreferences) => {
      updatePrefs((p) => ({
        ...p,
        notificationAudio: normalizeNotificationAudioPrefs(audio),
      }));
    },
    [updatePrefs]
  );

  const setNotificationMasterEnabled = useCallback(
    (enabled: boolean) => {
      updatePrefs((p) => ({
        ...p,
        notificationAudio: {
          ...normalizeNotificationAudioPrefs(p.notificationAudio),
          masterEnabled: enabled,
        },
      }));
    },
    [updatePrefs]
  );

  const setNotificationVolume = useCallback(
    (volume: number) => {
      const clamped = Math.min(1, Math.max(0.1, Number(volume.toFixed(2))));
      updatePrefs((p) => ({
        ...p,
        notificationAudio: {
          ...normalizeNotificationAudioPrefs(p.notificationAudio),
          volume: clamped,
        },
      }));
    },
    [updatePrefs]
  );

  const updateNotificationCategoryAudio = useCallback(
    (
      category: NotificationCategoryId,
      patch: Partial<NotificationCategoryAudioSetting>
    ) => {
      updatePrefs((p) => {
        const current = normalizeNotificationAudioPrefs(p.notificationAudio);
        return {
          ...p,
          notificationAudio: {
            ...current,
            categories: {
              ...current.categories,
              [category]: {
                ...current.categories[category],
                ...patch,
              },
            },
          },
        };
      });
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
      setUiLayout,
      applyUiSkinBundle,
      setCustomColors,
      setDisplayMode,
      setDensity,
      setNotificationAudioPrefs,
      setNotificationMasterEnabled,
      setNotificationVolume,
      updateNotificationCategoryAudio,
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
      setUiLayout,
      applyUiSkinBundle,
      setCustomColors,
      setDisplayMode,
      setDensity,
      setNotificationAudioPrefs,
      setNotificationMasterEnabled,
      setNotificationVolume,
      updateNotificationCategoryAudio,
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
      setUiLayout: () => {},
      applyUiSkinBundle: () => {},
      setCustomColors: () => {},
      setDisplayMode: () => {},
      setDensity: () => {},
      setNotificationAudioPrefs: () => {},
      setNotificationMasterEnabled: () => {},
      setNotificationVolume: () => {},
      updateNotificationCategoryAudio: () => {},
      resetAllPreferences: () => {},
    };
  }
  return ctx;
}
