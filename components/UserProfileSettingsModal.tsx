'use client';

import React from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  ClipboardList,
  Music,
  Play,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  User as UserIcon,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { User, Branch } from '@/types';
import { useSystemPreferences } from '@/lib/user-preferences-store';
import {
  DEFAULT_NOTIFICATION_AUDIO_PREFS,
  NOTIFICATION_CATEGORIES_META,
  NOTIFICATION_TONE_OPTIONS,
  NotificationCategoryId,
  NotificationToneId,
  playNotificationTone,
} from '@/lib/notification-sound-engine';
import { pushRealtimeToast } from '@/components/RealtimeToastNotifications';
import { getRoleArabicLabel, toArabicNumerals } from '@/lib/utils';

interface UserProfileSettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: User;
  currentBranch?: Branch;
}

export default function UserProfileSettingsModal({
  open,
  onClose,
  currentUser,
  currentBranch,
}: UserProfileSettingsModalProps) {
  const {
    isRtl,
    prefs,
    setNotificationMasterEnabled,
    setNotificationVolume,
    updateNotificationCategoryAudio,
    setNotificationAudioPrefs,
  } = useSystemPreferences();

  if (!open) return null;

  const audio = prefs.notificationAudio || DEFAULT_NOTIFICATION_AUDIO_PREFS;
  const volumePercent = Math.round(audio.volume * 100);

  const getCategoryIcon = (id: NotificationCategoryId) => {
    switch (id) {
      case 'task':
        return { Icon: ClipboardList, accentBg: 'bg-[#164E83]/12 text-[#164E83] border-[#164E83]/25' };
      case 'approval':
        return { Icon: UserCheck, accentBg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'security':
        return { Icon: ShieldAlert, accentBg: 'bg-red-100 text-red-700 border-red-300' };
      case 'system':
      default:
        return { Icon: CheckCircle2, accentBg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
  };

  const handlePreviewTone = (tone: NotificationToneId) => {
    playNotificationTone(tone, audio.volume);
  };

  const handleTestLiveToast = (catId: NotificationCategoryId) => {
    const meta = NOTIFICATION_CATEGORIES_META.find((m) => m.id === catId);
    if (!meta) return;
    pushRealtimeToast({
      title: isRtl ? meta.sampleTitleAr : meta.sampleTitleEn,
      message: isRtl ? meta.sampleMessageAr : meta.sampleMessageEn,
      category: catId,
    });
  };

  const handleResetAudioDefaults = () => {
    setNotificationAudioPrefs({
      masterEnabled: DEFAULT_NOTIFICATION_AUDIO_PREFS.masterEnabled,
      volume: DEFAULT_NOTIFICATION_AUDIO_PREFS.volume,
      categories: {
        task: { ...DEFAULT_NOTIFICATION_AUDIO_PREFS.categories.task },
        approval: { ...DEFAULT_NOTIFICATION_AUDIO_PREFS.categories.approval },
        system: { ...DEFAULT_NOTIFICATION_AUDIO_PREFS.categories.system },
        security: { ...DEFAULT_NOTIFICATION_AUDIO_PREFS.categories.security },
      },
    });
  };

  const enabledCategoriesCount = (
    Object.keys(audio.categories) as NotificationCategoryId[]
  ).filter((k) => audio.categories[k]?.enabled).length;

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="bg-white text-[#102A43] rounded-3xl border border-slate-200 max-w-3xl w-full shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#102A43] text-white px-6 py-4 rounded-t-3xl flex items-center justify-between gap-3 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5 text-[#94C9CE]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black truncate">
                {isRtl ? 'إعدادات الملف الشخصي والتنبيهات الصوتية' : 'Profile & Notification Sound Settings'}
              </h3>
              <p className="text-[11px] font-bold text-slate-300 truncate">
                {isRtl
                  ? 'تخصيص نغمات التنبيه وتفعيل أو إيقاف الصوت لكل نوع من الإشعارات لحظياً'
                  : 'Customize alert tones and enable or mute audio per notification category'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer shrink-0 transition-colors"
            title={isRtl ? 'إغلاق' : 'Close'}
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* 1. بطاقة بيانات الملف الشخصي */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-[#102A43] text-[#C6A15B] flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="text-sm font-black text-[#102A43] truncate">
                  {currentUser.fullName}
                </div>
                <div className="text-xs font-bold text-slate-600 truncate">
                  {currentUser.jobTitle || getRoleArabicLabel(currentUser.role)} ·{' '}
                  <span className="font-mono text-[#164E83]">@{currentUser.username}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-500 truncate">
                  {currentBranch?.arabicName || currentUser.workplace || 'الديوان العام لمديرية التموين بالغربية'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
              <span className="px-3 py-1.5 rounded-xl bg-[#102A43]/8 text-[#102A43] border border-[#102A43]/15">
                {getRoleArabicLabel(currentUser.role)}
              </span>
              <span
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                  audio.masterEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-200 text-slate-600 border-slate-300'
                }`}
              >
                {audio.masterEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                <span>
                  {audio.masterEnabled
                    ? isRtl
                      ? `الصوت مفعل (${toArabicNumerals(enabledCategoriesCount)}/٤ أنواع)`
                      : `Audio ON (${enabledCategoriesCount}/4 types)`
                    : isRtl
                    ? 'كتم شامل للأصوات'
                    : 'All Sounds Muted'}
                </span>
              </span>
            </div>
          </div>

          {/* 2. التحكم الرئيسي بالصوت ومستوى شدة النغمة */}
          <div className="rounded-2xl border-2 border-[#164E83]/20 bg-gradient-to-l from-[#EEF5FB] to-white p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    audio.masterEnabled
                      ? 'bg-[#164E83] text-white'
                      : 'bg-slate-300 text-slate-600'
                  }`}
                >
                  {audio.masterEnabled ? (
                    <BellRing className="w-5 h-5" />
                  ) : (
                    <BellOff className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#102A43]">
                    {isRtl ? 'التحكم الرئيسي في التنبيهات الصوتية' : 'Master Notification Audio'}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-600">
                    {isRtl
                      ? 'تفعيل أو كتم أصوات الإشعارات الفورية بالكامل مع ضبط مستوى الصوت'
                      : 'Enable or mute all real-time notification sounds and adjust master volume'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNotificationMasterEnabled(!audio.masterEnabled)}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-xs ${
                  audio.masterEnabled
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-slate-700 hover:bg-slate-800 text-white'
                }`}
              >
                {audio.masterEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>{isRtl ? 'مفعّل — اضغط للكتم' : 'Enabled — Mute'}</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>{isRtl ? 'مكتوم — اضغط للتفعيل' : 'Muted — Enable'}</span>
                  </>
                )}
              </button>
            </div>

            {/* مستوى الصوت */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/80">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#102A43] min-w-[125px]">
                <SlidersHorizontal className="w-4 h-4 text-[#164E83]" />
                <span>{isRtl ? 'مستوى الصوت:' : 'Master Volume:'}</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={volumePercent}
                disabled={!audio.masterEnabled}
                onChange={(e) => setNotificationVolume(Number(e.target.value) / 100)}
                className="flex-1 min-w-[160px] accent-[#164E83] cursor-pointer disabled:opacity-40"
              />
              <span className="num-cell px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-[#102A43] min-w-[54px] text-center">
                {isRtl ? `${toArabicNumerals(volumePercent)}٪` : `${volumePercent}%`}
              </span>
            </div>
          </div>

          {/* 3. إعدادات النغمات والتفعيل/الإيقاف لكل نوع من الإشعارات */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-black text-[#102A43] flex items-center gap-2">
                <Music className="w-4.5 h-4.5 text-[#164E83]" />
                <span>
                  {isRtl
                    ? 'تخصيص النغمات والتنبيهات الصوتية حسب نوع الإشعار'
                    : 'Per-Category Sound & Alert Tone Preferences'}
                </span>
              </h4>
              <button
                type="button"
                onClick={handleResetAudioDefaults}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRtl ? 'استعادة النغمات الافتراضية' : 'Reset Default Tones'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {NOTIFICATION_CATEGORIES_META.map((cat) => {
                const catCfg =
                  audio.categories[cat.id] || DEFAULT_NOTIFICATION_AUDIO_PREFS.categories[cat.id];
                const { Icon, accentBg } = getCategoryIcon(cat.id);
                const isSoundActive = audio.masterEnabled && catCfg.enabled;

                return (
                  <div
                    key={cat.id}
                    className={`rounded-2xl border p-4 transition-all space-y-3 ${
                      isSoundActive
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200/80 opacity-85'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${accentBg}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-[13px] font-black text-[#102A43]">
                            {isRtl ? cat.labelAr : cat.labelEn}
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 mt-0.5 leading-snug">
                            {isRtl ? cat.descAr : cat.descEn}
                          </p>
                        </div>
                      </div>

                      {/* مفتاح تفعيل / إيقاف التنبيه الصوتي لهذا النوع */}
                      <button
                        type="button"
                        onClick={() =>
                          updateNotificationCategoryAudio(cat.id, {
                            enabled: !catCfg.enabled,
                          })
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors border ${
                          catCfg.enabled
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                        }`}
                      >
                        {catCfg.enabled ? (
                          <>
                            <Volume2 className="w-4 h-4" />
                            <span>{isRtl ? 'الصوت مفعّل' : 'Sound ON'}</span>
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-4 h-4" />
                            <span>{isRtl ? 'الصوت متوقف' : 'Sound OFF'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* اختيار النغمة + أزرار المعاينة والاختبار */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                      <label className="text-[11px] font-black text-slate-600 shrink-0">
                        {isRtl ? 'نغمة التنبيه:' : 'Alert Tone:'}
                      </label>
                      <select
                        value={catCfg.tone}
                        disabled={!catCfg.enabled || !audio.masterEnabled}
                        onChange={(e) => {
                          const chosen = e.target.value as NotificationToneId;
                          updateNotificationCategoryAudio(cat.id, { tone: chosen });
                          if (audio.masterEnabled && catCfg.enabled) {
                            handlePreviewTone(chosen);
                          }
                        }}
                        className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#164E83] disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                      >
                        {NOTIFICATION_TONE_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {isRtl ? `${opt.labelAr} — ${opt.descAr}` : `${opt.labelEn} — ${opt.descEn}`}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handlePreviewTone(catCfg.tone)}
                        disabled={!audio.masterEnabled}
                        title={isRtl ? 'تشغيل ومعاينة النغمة المختارة' : 'Preview selected tone'}
                        className="px-3 py-2 rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] disabled:bg-slate-300 text-[#C6A15B] disabled:text-slate-500 text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'معاينة النغمة' : 'Preview'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTestLiveToast(cat.id)}
                        title={isRtl ? 'إرسال إشعار فوري تجريبي على الشاشة' : 'Trigger live toast test'}
                        className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#164E83] border border-blue-200 text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'اختبار إشعار حي' : 'Test Toast'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {isRtl
                  ? 'يتم حفظ كافة تفضيلات الإشعارات والنغمات تلقائياً في ملفك الشخصي.'
                  : 'All notification tone & mute preferences are saved automatically to your profile.'}
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] text-white text-xs font-black cursor-pointer shadow-sm transition-colors"
            >
              {isRtl ? 'تم والحفظ' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
