'use client';

export type NotificationCategoryId = 'task' | 'approval' | 'system' | 'security';

export type NotificationToneId =
  | 'crystal_chime'
  | 'executive_bell'
  | 'digital_pulse'
  | 'soft_marimba'
  | 'urgent_radar'
  | 'classic_ping';

export interface NotificationCategoryAudioSetting {
  enabled: boolean;
  tone: NotificationToneId;
}

export interface NotificationAudioPreferences {
  masterEnabled: boolean;
  volume: number; // 0.1 - 1.0
  categories: Record<NotificationCategoryId, NotificationCategoryAudioSetting>;
}

export interface NotificationToneOption {
  id: NotificationToneId;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
}

export interface NotificationCategoryMeta {
  id: NotificationCategoryId;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  sampleTitleAr: string;
  sampleMessageAr: string;
  sampleTitleEn: string;
  sampleMessageEn: string;
}

export const NOTIFICATION_TONE_OPTIONS: NotificationToneOption[] = [
  {
    id: 'crystal_chime',
    labelAr: 'رنين كريستالي ناعم',
    labelEn: 'Crystal Chime',
    descAr: 'نغمة ثنائية متناغمة هادئة مناسبة لتحديثات النظام',
    descEn: 'Soft two-note harmonic chime',
  },
  {
    id: 'executive_bell',
    labelAr: 'جرس إداري رسمي',
    labelEn: 'Executive Bell',
    descAr: 'وتر ثلاثي دافئ وواضح للاعتمادات والقرارات الإدارية',
    descEn: 'Warm three-note chord for approvals',
  },
  {
    id: 'digital_pulse',
    labelAr: 'نبضة رقمية ذكية',
    labelEn: 'Digital Pulse',
    descAr: 'نغمة إيقاعية سريعة للمهام اليومية والمحادثات الداخلية',
    descEn: 'Crisp dual-tone pulse for tasks & chat',
  },
  {
    id: 'soft_marimba',
    labelAr: 'نغمة ماريمبا هادئة',
    labelEn: 'Soft Marimba',
    descAr: 'إيقاع خشبي لطيف ومريح للاستخدام المكتبي الطويل',
    descEn: 'Mellow tri-tone marimba cadence',
  },
  {
    id: 'urgent_radar',
    labelAr: 'تنبيه أمني عاجل',
    labelEn: 'Urgent Security Alert',
    descAr: 'نبضتان واضحتان للتحذيرات الأمنية والرقابية الحرجة',
    descEn: 'High-clarity double alert for security events',
  },
  {
    id: 'classic_ping',
    labelAr: 'إشعار كلاسيكي سريع',
    labelEn: 'Classic Ping',
    descAr: 'نغمة مفردة قصيرة ومباشرة للإشعارات الخفيفة',
    descEn: 'Single crisp resonant ping',
  },
];

export const NOTIFICATION_CATEGORIES_META: NotificationCategoryMeta[] = [
  {
    id: 'task',
    labelAr: 'المهام اليومية والمحادثات الداخلية',
    labelEn: 'Daily Tasks & Internal Chat',
    descAr: 'التنبيهات عند إسناد مهام جديدة أو ورود رسائل في المحادثات الداخلية',
    descEn: 'Alerts for newly assigned tasks and incoming internal chat messages',
    sampleTitleAr: 'إشعار تجريبي — مهمة يومية جديدة',
    sampleMessageAr: 'تم إسناد مهمة متابعة ميدانية جديدة واختبار نغمة تنبيه المهام بنجاح.',
    sampleTitleEn: 'Test Alert — New Assigned Task',
    sampleMessageEn: 'A sample task alert has been triggered to preview your selected tone.',
  },
  {
    id: 'approval',
    labelAr: 'الاعتمادات الإدارية وطلبات الحسابات',
    labelEn: 'Pending Administrative Approvals',
    descAr: 'تنبيهات طلبات التسجيل الجديدة، اعتمادات الموارد البشرية، وطلبات التجديد',
    descEn: 'Alerts for pending account requests, HR approvals, and renewals',
    sampleTitleAr: 'إشعار تجريبي — اعتماد إداري معلق',
    sampleMessageAr: 'يوجد طلب اعتماد جديد ينتظر المراجعة؛ تم اختبار نغمة الاعتمادات بنجاح.',
    sampleTitleEn: 'Test Alert — Pending Approval',
    sampleMessageEn: 'A sample approval alert has been triggered to preview your selected tone.',
  },
  {
    id: 'system',
    labelAr: 'تحديثات النظام وسجل التدقيق',
    labelEn: 'System Updates & Audit Logs',
    descAr: 'إشعارات حفظ البيانات، تحديث الإعدادات، وعمليات التوثيق في سجل التدقيق',
    descEn: 'Notifications for system updates, saved records, and audit trail entries',
    sampleTitleAr: 'إشعار تجريبي — تحديث النظام',
    sampleMessageAr: 'تم تحديث إعدادات المنظومة وتجربة نغمة تحديثات النظام بنجاح.',
    sampleTitleEn: 'Test Alert — System Update',
    sampleMessageEn: 'A sample system update notification has been triggered.',
  },
  {
    id: 'security',
    labelAr: 'التنبيهات الأمنية والرقابية العاجلة',
    labelEn: 'Urgent Security & Compliance Alerts',
    descAr: 'تنبيهات المحاولات غير المصرح بها، التغييرات الحساسة، والمخالفات الحرجة',
    descEn: 'Alerts for security warnings, failed actions, and critical compliance events',
    sampleTitleAr: 'إشعار تجريبي — تنبيه أمني عاجل',
    sampleMessageAr: 'تنبيه أمني تجريبي للتأكد من وضوح نغمة التحذيرات الحرجة.',
    sampleTitleEn: 'Test Alert — Urgent Security Notice',
    sampleMessageEn: 'A sample security alert has been triggered to preview your selected tone.',
  },
];

export const DEFAULT_NOTIFICATION_AUDIO_PREFS: NotificationAudioPreferences = {
  masterEnabled: true,
  volume: 0.7,
  categories: {
    task: { enabled: true, tone: 'digital_pulse' },
    approval: { enabled: true, tone: 'executive_bell' },
    system: { enabled: true, tone: 'crystal_chime' },
    security: { enabled: true, tone: 'urgent_radar' },
  },
};

const VALID_TONES = new Set<NotificationToneId>([
  'crystal_chime',
  'executive_bell',
  'digital_pulse',
  'soft_marimba',
  'urgent_radar',
  'classic_ping',
]);

export function normalizeNotificationAudioPrefs(
  raw?: Partial<NotificationAudioPreferences> | null
): NotificationAudioPreferences {
  if (!raw || typeof raw !== 'object') {
    return {
      masterEnabled: DEFAULT_NOTIFICATION_AUDIO_PREFS.masterEnabled,
      volume: DEFAULT_NOTIFICATION_AUDIO_PREFS.volume,
      categories: {
        task: { ...DEFAULT_NOTIFICATION_AUDIO_PREFS.categories.task },
        approval: { ...DEFAULT_NOTIFICATION_AUDIO_PREFS.categories.approval },
        system: { ...DEFAULT_NOTIFICATION_AUDIO_PREFS.categories.system },
        security: { ...DEFAULT_NOTIFICATION_AUDIO_PREFS.categories.security },
      },
    };
  }

  const clampVol = (v: unknown) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return DEFAULT_NOTIFICATION_AUDIO_PREFS.volume;
    return Math.min(1, Math.max(0.1, Number(n.toFixed(2))));
  };

  const normalizeCat = (
    cat: NotificationCategoryId
  ): NotificationCategoryAudioSetting => {
    const def = DEFAULT_NOTIFICATION_AUDIO_PREFS.categories[cat];
    const incoming = raw.categories?.[cat];
    return {
      enabled: typeof incoming?.enabled === 'boolean' ? incoming.enabled : def.enabled,
      tone:
        typeof incoming?.tone === 'string' && VALID_TONES.has(incoming.tone as NotificationToneId)
          ? (incoming.tone as NotificationToneId)
          : def.tone,
    };
  };

  return {
    masterEnabled:
      typeof raw.masterEnabled === 'boolean'
        ? raw.masterEnabled
        : DEFAULT_NOTIFICATION_AUDIO_PREFS.masterEnabled,
    volume: clampVol(raw.volume),
    categories: {
      task: normalizeCat('task'),
      approval: normalizeCat('approval'),
      system: normalizeCat('system'),
      security: normalizeCat('security'),
    },
  };
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new Ctor();
  }
  return sharedAudioCtx;
}

interface ToneNote {
  freq: number;
  startOffset: number;
  duration: number;
  type: OscillatorType;
  gainRatio?: number;
}

const TONE_RECIPES: Record<NotificationToneId, ToneNote[]> = {
  crystal_chime: [
    { freq: 659.25, startOffset: 0, duration: 0.18, type: 'sine', gainRatio: 0.85 },
    { freq: 987.77, startOffset: 0.11, duration: 0.32, type: 'sine', gainRatio: 1.0 },
  ],
  executive_bell: [
    { freq: 523.25, startOffset: 0, duration: 0.24, type: 'triangle', gainRatio: 0.85 },
    { freq: 659.25, startOffset: 0.08, duration: 0.26, type: 'triangle', gainRatio: 0.9 },
    { freq: 783.99, startOffset: 0.16, duration: 0.36, type: 'sine', gainRatio: 1.0 },
  ],
  digital_pulse: [
    { freq: 587.33, startOffset: 0, duration: 0.09, type: 'sine', gainRatio: 0.85 },
    { freq: 880.0, startOffset: 0.1, duration: 0.14, type: 'sine', gainRatio: 1.0 },
  ],
  soft_marimba: [
    { freq: 440.0, startOffset: 0, duration: 0.12, type: 'triangle', gainRatio: 0.9 },
    { freq: 554.37, startOffset: 0.1, duration: 0.12, type: 'triangle', gainRatio: 0.95 },
    { freq: 659.25, startOffset: 0.2, duration: 0.22, type: 'triangle', gainRatio: 0.85 },
  ],
  urgent_radar: [
    { freq: 920.0, startOffset: 0, duration: 0.11, type: 'sawtooth', gainRatio: 0.42 },
    { freq: 740.0, startOffset: 0.13, duration: 0.11, type: 'sawtooth', gainRatio: 0.42 },
    { freq: 980.0, startOffset: 0.26, duration: 0.18, type: 'triangle', gainRatio: 0.78 },
  ],
  classic_ping: [
    { freq: 1046.5, startOffset: 0, duration: 0.24, type: 'sine', gainRatio: 0.95 },
  ],
};

/**
 * Plays a synthesized notification tone cleanly using the Web Audio API (offline-safe).
 */
export function playNotificationTone(tone: NotificationToneId, volume = 0.7): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const executePlay = () => {
      const safeVol = Math.min(1, Math.max(0.05, volume)) * 0.28;
      const now = ctx.currentTime;
      const notes = TONE_RECIPES[tone] || TONE_RECIPES.crystal_chime;

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = n.type;
        osc.frequency.setValueAtTime(n.freq, now + n.startOffset);

        const peak = safeVol * (n.gainRatio ?? 1);
        gain.gain.setValueAtTime(0.0001, now + n.startOffset);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), now + n.startOffset + 0.015);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + n.startOffset + Math.max(0.06, n.duration)
        );

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.startOffset);
        osc.stop(now + n.startOffset + n.duration + 0.03);
      });
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(executePlay).catch(() => {});
    } else {
      executePlay();
    }
  } catch {
    // Gracefully ignore browser audio restrictions
  }
}

export function playNotificationForCategory(
  category: NotificationCategoryId,
  audioPrefs: NotificationAudioPreferences
): void {
  if (!audioPrefs.masterEnabled) return;
  const catCfg = audioPrefs.categories?.[category];
  if (!catCfg || !catCfg.enabled) return;
  playNotificationTone(catCfg.tone, audioPrefs.volume);
}
