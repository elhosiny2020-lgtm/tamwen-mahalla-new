'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Eye,
  EyeOff,
  Lock,
  User,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building2,
  UserPlus,
  Sparkles,
  Mail,
  ExternalLink,
  Copy,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  INITIAL_BRANCHES,
  getStoredUsers,
  getStoredBranches,
  setCurrentSessionUser,
  setSelectedBranchSession,
  addAuditLog,
} from '@/lib/mock-db';
import { Branch, User as UserType } from '@/types';
import { getRoleArabicLabel } from '@/lib/utils';
import { loginFormSchema } from '@/lib/zod-schemas';
import { setClientSessionExpiryTimestamp } from '@/hooks/useSessionExpiryMonitor';

interface LoginFormProps {
  onLoginSuccess: (user: UserType) => void;
  onOpenRegister: () => void;
}

interface PasswordResetDeliveryInfo {
  recipientLabel?: string;
  username: string;
  fullName: string;
  resetToken: string;
  resetUrl: string;
  tempPassword: string;
  expiresAt: string;
  supabaseAuthSent?: boolean;
  emailProviderSent?: boolean;
}

const REMEMBER_LOGIN_KEY = 'gharbia_remembered_login_v1';

export default function LoginForm({ onLoginSuccess, onOpenRegister }: LoginFormProps) {
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('b-03');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Automated Password Reset & Email Recovery State (server-side protected email)
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetViewMode, setResetViewMode] = useState<'request' | 'email_dispatched' | 'update_view' | 'completed'>('request');
  const [fpIdentifier, setFpIdentifier] = useState('');
  const [fpToken, setFpToken] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmNewPassword, setFpConfirmNewPassword] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpNotice, setFpNotice] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState<PasswordResetDeliveryInfo | null>(null);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setBranches(getStoredBranches());
      try {
        const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { username?: string; branchId?: string };
          if (parsed.username) {
            setUsername(parsed.username);
            setRememberMe(true);
          }
          if (parsed.branchId) {
            setSelectedBranchId(parsed.branchId);
          }
        }
      } catch {
        // ignore storage read errors
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Automatically open dedicated Password Update View if URL contains ?reset_token=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('reset_token')?.trim();
    if (!urlToken || urlToken.length < 16) return;

    let cancelled = false;
    const frameId = requestAnimationFrame(() => {
      if (cancelled) return;
      setFpToken(urlToken);
      setShowForgotPassword(true);
      setResetViewMode('update_view');
      void (async () => {
        try {
          const res = await fetch('/api/auth/password-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify-token', token: urlToken }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            username?: string;
            fullName?: string;
            recipientLabel?: string;
            error?: string;
          };
          if (cancelled) return;
          if (res.ok && data.ok) {
            setFpIdentifier(data.username || 'admin');
            setFpNotice(`تم التحقق من رابط الاستعادة الآمن لحساب (${data.username}). أدخل كلمة المرور الجديدة أدناه.`);
          } else {
            setFpError(data.error || 'رابط استعادة كلمة المرور غير صالح أو منتهي الصلاحية.');
          }
        } catch {
          if (!cancelled) {
            setFpError('تعذر التحقق من رابط استعادة كلمة المرور.');
          }
        }
      })();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, []);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const validated = loginFormSchema.safeParse({
      username,
      password,
      branchId: selectedBranchId,
    });

    if (!validated.success) {
      setErrorMsg(
        validated.error.issues[0]?.message || 'يرجى التحقق من صحة اسم المستخدم وكلمة المرور.'
      );
      return;
    }

    setLoading(true);

    try {
      const storedUsers = getStoredUsers();
      const trimmedUser = validated.data.username.trim().toLowerCase();
      const localMatch = storedUsers.find(
        (u) =>
          u.username.toLowerCase() === trimmedUser ||
          (u.employeeNumber && u.employeeNumber.toLowerCase() === trimmedUser)
      );

      const activeBranchId = selectedBranchId || localMatch?.primaryBranchId || 'b-03';
      const authRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: validated.data.username.trim(),
          password: validated.data.password,
          branchId: activeBranchId,
        }),
      });

      const authPayload = (await authRes.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        user?: UserType;
      };

      if (!authRes.ok || !authPayload.ok || !authPayload.user) {
        setLoading(false);
        setErrorMsg(authPayload.error || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
        return;
      }

      const serverUser = authPayload.user;
      const updatedUser: UserType = {
        ...localMatch,
        ...serverUser,
        primaryBranchId: activeBranchId,
        failedLoginAttempts: 0,
        lastLogin: serverUser.lastLogin || new Date().toISOString(),
      };

      try {
        if (rememberMe) {
          localStorage.setItem(
            REMEMBER_LOGIN_KEY,
            JSON.stringify({ username: updatedUser.username, branchId: activeBranchId })
          );
        } else {
          localStorage.removeItem(REMEMBER_LOGIN_KEY);
        }
      } catch {
        // ignore storage errors
      }

      setLoading(false);
      setSuccessMsg('تم التحقق من الهوية والصلاحيات بنجاح، جاري فتح المنظومة الرقمية...');
      setCurrentSessionUser(updatedUser);
      setSelectedBranchSession(null);
      setClientSessionExpiryTimestamp();

      addAuditLog({
        userId: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        action: 'تسجيل دخول رسمي ناجح',
        module: 'بوابة المصادقة الموحدة',
        branchId: activeBranchId,
        details: `تم الدخول بنجاح بدور (${getRoleArabicLabel(updatedUser.role)})`,
        ipAddress: '10.20.30.50',
        deviceInfo: 'متصفح الويب المعتمد',
        status: 'success',
      });

      setTimeout(() => {
        onLoginSuccess(updatedUser);
      }, 300);
    } catch {
      setLoading(false);
      setErrorMsg('تعذر الاتصال بخدمة المصادقة. يرجى المحاولة مرة أخرى.');
    }
  };

  // ١. طلب استعادة كلمة المرور وإرسال كلمة سر + رابط تغيير عبر الخادم إلى البريد الرسمي المعتمد
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    setFpNotice('');
    setFpLoading(true);

    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          identifier: fpIdentifier.trim() || 'admin',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        delivery?: PasswordResetDeliveryInfo;
      };

      if (!res.ok || !data.ok || !data.delivery) {
        setFpError(data.error || 'تعذر تنفيذ طلب استعادة كلمة المرور.');
        setFpLoading(false);
        return;
      }

      setDeliveryInfo(data.delivery);
      setFpToken(data.delivery.resetToken);
      setFpIdentifier(data.delivery.username);
      setFpNotice(data.message || 'تم إرسال كلمة المرور الجديدة ورابط التغيير إلى البريد الرسمي المعتمد بنجاح.');
      setResetViewMode('email_dispatched');

      addAuditLog({
        userId: data.delivery.username,
        username: data.delivery.username,
        fullName: data.delivery.fullName,
        action: 'إرسال كلمة مرور ورابط استعادة للبريد الإلكتروني',
        module: 'استعادة كلمة المرور (Supabase Auth)',
        details: 'تم إرسال كلمة المرور المؤقتة ورابط التغيير الآمن إلى البريد الرسمي المعتمد لإدارة المنظومة',
        ipAddress: '10.20.30.50',
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser',
        status: 'success',
      });
    } catch {
      setFpError('تعذر الاتصال بخادم استعادة كلمات المرور.');
    } finally {
      setFpLoading(false);
    }
  };

  // ٢. حفظ وتغيير كلمة المرور الجديدة من واجهة رابط البريد الإلكتروني (Dedicated Password Update View)
  const handleConfirmNewPasswordFromEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    if (fpNewPassword.trim().length < 4) {
      setFpError('يجب أن تتكون كلمة المرور الجديدة من ٤ أحرف أو أرقام على الأقل.');
      return;
    }
    if (fpNewPassword.trim() !== fpConfirmNewPassword.trim()) {
      setFpError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    setFpLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          token: fpToken.trim(),
          newPassword: fpNewPassword.trim(),
          confirmPassword: fpConfirmNewPassword.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        username?: string;
        fullName?: string;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        setFpError(data.error || 'تعذر تحديث كلمة المرور. يرجى طلب رابط استعادة جديد.');
        setFpLoading(false);
        return;
      }

      const targetUsername = data.username || fpIdentifier || 'admin';
      setUsername(targetUsername);
      setPassword(fpNewPassword.trim());
      setResetViewMode('completed');

      // Clear URL query parameter if present
      if (typeof window !== 'undefined' && window.location.search.includes('reset_token')) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      addAuditLog({
        userId: targetUsername,
        username: targetUsername,
        fullName: data.fullName || targetUsername,
        action: 'تغيير كلمة المرور من رابط البريد الإلكتروني',
        module: 'استعادة كلمة المرور (Supabase Auth)',
        details: 'تم تغيير وحفظ كلمة المرور الجديدة بنجاح عبر رابط الاستعادة الرسمي',
        ipAddress: '10.20.30.50',
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser',
        status: 'success',
      });
    } catch {
      setFpError('تعذر الاتصال بالخادم لتحديث كلمة المرور.');
    } finally {
      setFpLoading(false);
    }
  };

  const openPasswordResetModal = () => {
    setFpError('');
    setFpNotice('');
    setFpIdentifier(username.trim() || 'admin');
    setFpNewPassword('');
    setFpConfirmNewPassword('');
    setResetViewMode('request');
    setShowForgotPassword(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto min-h-[90vh] flex items-center justify-center p-2 sm:p-4 lg:p-6 font-sans">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_25px_70px_rgba(16,42,67,0.18)] border border-white/80 overflow-hidden relative">
        {/* Right Side: Luxury Login Form (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative bg-gradient-to-b from-white via-[#FAFBFD] to-[#F4F7FB]">
          <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-[#102A43] via-[#C6A15B] to-[#102A43]"></div>

          <div>
            {/* Header / Official Emblem */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-xl border-2 border-[#C6A15B]/50 shrink-0 bg-white">
                <Image
                  src="/assets/aistudio/logo_4234585c.jpg"
                  alt="شعار وزارة التموين والتجارة الداخلية"
                  fill
                  sizes="80px"
                  className="object-cover"
                  referrerPolicy="no-referrer"
                  priority
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-[#C6A15B] tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-[#C6A15B]" />
                  <span>جمهورية مصر العربية</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-[#102A43] tracking-tight">
                  وزارة التموين والتجارة الداخلية
                </h1>
                <p className="text-[11px] sm:text-[13px] font-black text-[#164E83]">
                  مديرية التموين والتجارة الداخلية بالغربية
                </p>
              </div>
            </div>

            <div className="mb-6 space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-[#102A43] tracking-tight">
                منصة الإدارة الذكية للرقابة والمتابعة التموينية
              </h2>
              <p className="text-[11px] sm:text-[13px] text-slate-700 font-bold leading-relaxed">
                منظومة رقمية موحدة لإدارة البيانات والخدمات التموينية، وتعزيز كفاءة المتابعة والرقابة، ودعم اتخاذ القرار.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-5 p-4 bg-red-50/95 border border-red-200 rounded-2xl text-red-900 text-[11px] sm:text-[13px] flex items-center gap-3 shadow-sm animate-shake font-extrabold">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-4 bg-emerald-50/95 border border-emerald-200 rounded-2xl text-emerald-900 text-[11px] sm:text-[13px] flex items-center gap-3 shadow-sm font-extrabold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              {/* Branch Selector */}
              <div>
                <label className="block text-[11px] sm:text-[13px] font-black text-[#102A43] mb-2">
                  الإدارة التموينية المختصة
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-[#164E83]">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full pr-12 pl-4 py-3 sm:py-3.5 bg-white border border-slate-300 rounded-2xl text-[11px] sm:text-[13px] font-black text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#164E83] focus:border-transparent transition-all shadow-sm cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.arabicName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-[11px] sm:text-[13px] font-black text-[#102A43] mb-2">
                  اسم المستخدم أو الرقم الوظيفي
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم المعتمد (مثال: admin)"
                    className="w-full pr-12 pl-4 py-3 sm:py-3.5 bg-white border border-slate-300 rounded-2xl text-[11px] sm:text-[13px] text-[#243447] focus:outline-none focus:ring-2 focus:ring-[#164E83] focus:border-transparent transition-all shadow-sm font-extrabold"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[11px] sm:text-[13px] font-black text-[#102A43] mb-2">
                  كلمة المرور السرية
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-12 pl-12 py-3 sm:py-3.5 bg-white border border-slate-300 rounded-2xl text-[11px] sm:text-[13px] text-[#243447] focus:outline-none focus:ring-2 focus:ring-[#164E83] focus:border-transparent transition-all shadow-sm font-mono font-extrabold"
                  />
                  <button
                    type="button"
                    onClick={toggleShowPassword}
                    className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 hover:text-[#102A43] transition-colors cursor-pointer"
                    title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2 mt-3 text-[11px] sm:text-[13px]">
                  <label className="flex items-center gap-2 cursor-pointer text-[#243447] font-extrabold">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-[#102A43] focus:ring-[#164E83] w-4 h-4 cursor-pointer"
                    />
                    <span>تذكر تسجيل الدخول بأمان</span>
                  </label>
                  <button
                    type="button"
                    onClick={openPasswordResetModal}
                    className="text-[#164E83] font-black hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#C6A15B]" />
                    <span>هل نسيت كلمة المرور؟ استعادة عبر البريد المعتمد</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#102A43] via-[#164E83] to-[#102A43] hover:from-[#164E83] hover:to-[#102A43] text-white font-black rounded-2xl shadow-[0_10px_25px_rgba(16,42,67,0.3)] hover:shadow-[0_15px_30px_rgba(16,42,67,0.4)] transition-all flex items-center justify-center gap-3 text-[13px] sm:text-[15px] disabled:opacity-50 cursor-pointer border border-[#C6A15B]/30"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>دخول المنظومة الرقمية المتكاملة</span>
                    <ArrowRight className="w-5 h-5 rotate-180 text-[#C6A15B]" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200">
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full py-3.5 px-6 bg-white hover:bg-slate-50 text-[#102A43] font-black rounded-2xl border-2 border-[#102A43]/15 hover:border-[#102A43] transition-all text-[11px] sm:text-[13px] flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-5 h-5 text-[#C6A15B]" />
                <span>تسجيل مستخدم جديد (وفق الصلاحيات المعتمدة)</span>
              </button>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="mt-8 pt-4 border-t border-slate-200/60 flex items-center justify-center text-[11px] text-slate-600 font-bold">
            <span className="text-[#C6A15B] font-black" dir="ltr">
              Designed &amp; Developed by Eng. Ahmed El-Hosseiny — Tel: 01004414038
            </span>
          </div>
        </div>

        {/* Left Side: Cinematic High-Resolution Imagery (5 Cols) */}
        <div className="lg:col-span-5 relative min-h-[350px] lg:min-h-full overflow-hidden bg-[#102A43]">
          <Image
            src="/images/ministry_supply_hero.jpg"
            alt="وزارة التموين والتجارة الداخلية المصرية"
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover object-center transform hover:scale-105 transition-transform duration-1000"
            referrerPolicy="no-referrer"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#102A43]/90 via-[#102A43]/40 to-transparent"></div>

          <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end text-white z-10 space-y-3">
            <div className="w-12 h-1.5 bg-[#C6A15B] rounded-full"></div>
            <span className="text-[11px] font-black text-[#C6A15B] tracking-widest uppercase">
              سيادة الدولة والأمن الغذائي
            </span>
            <h3 className="text-2xl sm:text-[26px] font-black tracking-tight leading-snug">
              منظومة إستراتيجية رقمية لخدمة أهالي محافظة الغربية
            </h3>
            <p className="text-[11px] sm:text-[13px] text-slate-100 font-bold leading-relaxed max-w-md">
              إدارة وتأمين المخابز، الحصص التموينية، الصوامع الاستراتيجية، ومتابعة متوسطات السلع بمرتكزات رقمية متقدمة ومعايير أمان صارمة.
            </p>
          </div>
        </div>
      </div>

      {/* نافذة استعادة وتغيير كلمة المرور المؤمنة عبر البريد الرسمي المعتمد (مخفي عن العامة) */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border-2 border-[#102A43]/20 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#102A43] text-[#C6A15B] flex items-center justify-center font-bold shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10.5px] font-black text-[#164E83] block">
                    نظام الاستعادة المؤمن عبر البريد الرسمي المسجل
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#102A43]">
                    {resetViewMode === 'update_view'
                      ? 'تغيير كلمة المرور من رابط الاستعادة'
                      : 'استعادة وإرسال كلمة المرور على البريد المعتمد'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1.5 rounded-xl bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {fpError && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-extrabold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{fpError}</span>
              </div>
            )}

            {fpNotice && !fpError && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-extrabold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{fpNotice}</span>
              </div>
            )}

            {/* ١. شاشة طلب استعادة كلمة المرور (بدون إظهار البريد الإلكتروني للعامة) */}
            {resetViewMode === 'request' && (
              <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-bold text-[#102A43] space-y-1">
                  <div className="font-black text-[#164E83] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>الإرسال السري إلى البريد الإلكتروني المعتمد بالمنظومة</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    حفاظاً على الخصوصية والأمان، يتم إرسال كلمة المرور المؤقتة ورابط التغيير المشفر تلقائياً من الخادم إلى البريد الإلكتروني المسجل لدى الإدارة دون كشفه في الشاشة العامة.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#102A43] mb-1.5">
                    اسم المستخدم أو الرقم القومي للحساب المراد استعادته
                  </label>
                  <input
                    type="text"
                    required
                    value={fpIdentifier}
                    onChange={(e) => setFpIdentifier(e.target.value)}
                    placeholder="أدخل اسم المستخدم المعتمد (مثال: admin)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#164E83]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetViewMode('update_view')}
                    className="text-xs font-black text-[#164E83] hover:underline cursor-pointer"
                  >
                    لديك رمز استعادة بالفعل؟ انتقل لشاشة تغيير كلمة المرور
                  </button>
                  <button
                    type="submit"
                    disabled={fpLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-[#102A43] to-[#164E83] hover:from-[#164E83] hover:to-[#102A43] text-white font-black rounded-xl text-xs shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4 text-[#C6A15B]" />
                    <span>
                      {fpLoading
                        ? 'جاري توليد كلمة المرور وإرسالها إلى البريد الرسمي المعتمد...'
                        : 'إرسال كلمة المرور ورابط التغيير إلى البريد المعتمد'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* ٢. شاشة تأكيد الإرسال الآمن */}
            {resetViewMode === 'email_dispatched' && deliveryInfo && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-[#C6A15B] bg-[#FAFBFD] p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-[#164E83]" />
                      <div>
                        <span className="text-[10.5px] font-black text-slate-500 block">
                          رسالة الاستعادة الصادرة من الخادم المؤمن
                        </span>
                        <span className="text-xs font-black text-[#102A43]">
                          إلى: {deliveryInfo.recipientLabel || 'البريد الإلكتروني الرسمي المعتمد للإدارة'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black">
                      تم الإرسال والتفعيل
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-700 space-y-2 leading-relaxed">
                    <p>
                      مرحباً <strong className="text-[#102A43]">{deliveryInfo.fullName}</strong> (اسم المستخدم:{' '}
                      <strong className="font-mono text-[#164E83]">{deliveryInfo.username}</strong>)،
                    </p>
                    <p>
                      تم إرسال كلمة المرور الجديدة ورابط الاستعادة المشفر إلى البريد الرسمي المسجل للإدارة وتفعيلها فوراً:
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border-2 border-[#164E83]/30 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10.5px] font-black text-slate-500 block">
                        كلمة المرور المؤقتة المرسلة للبريد الرسمي المعتمد:
                      </span>
                      <span className="text-lg font-mono font-black text-[#102A43] tracking-wider select-all">
                        {deliveryInfo.tempPassword}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          void navigator.clipboard.writeText(deliveryInfo.tempPassword);
                          setFpNotice('تم نسخ كلمة المرور المؤقتة بنجاح.');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[11px] font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFpError('');
                        setFpNotice('أدخل كلمة المرور الجديدة التي ترغب في تعيينها لحسابك.');
                        setResetViewMode('update_view');
                      }}
                      className="py-3 px-4 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>تغيير كلمة المرور الآن</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUsername(deliveryInfo.username);
                        setPassword(deliveryInfo.tempPassword);
                        setShowForgotPassword(false);
                        setSuccessMsg(
                          'تم تعبئة كلمة المرور المؤقتة المعتمدة — اضغط على دخول المنظومة.'
                        );
                      }}
                      className="py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>استخدام كلمة المرور للدخول</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ٣. الواجهة المخصصة لتغيير وتحديث كلمة المرور عبر رابط البريد الإلكتروني */}
            {resetViewMode === 'update_view' && (
              <form onSubmit={handleConfirmNewPasswordFromEmail} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 space-y-1">
                  <div className="font-black text-[#102A43] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>تحديث كلمة المرور عبر رمز الاستعادة الآمن</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    الحساب المستهدف: <strong className="text-[#164E83] font-mono">{fpIdentifier || 'admin'}</strong> — سيتم تشفير وحفظ كلمة المرور الجديدة في قاعدة البيانات فوراً.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#102A43] mb-1.5">
                    رمز الاستعادة المرسل للبريد (Reset Token)
                  </label>
                  <input
                    type="text"
                    required
                    value={fpToken}
                    onChange={(e) => setFpToken(e.target.value)}
                    placeholder="أدخل رمز الاستعادة المرسل للبريد"
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-[11px] font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#102A43] mb-1.5">
                    كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    required
                    value={fpNewPassword}
                    onChange={(e) => setFpNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة (٤ أحرف أو أرقام على الأقل)"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#164E83]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#102A43] mb-1.5">
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    required
                    value={fpConfirmNewPassword}
                    onChange={(e) => setFpConfirmNewPassword(e.target.value)}
                    placeholder="أعد كتابة كلمة المرور الجديدة للتأكيد"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#164E83]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetViewMode('request')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>طلب رمز جديد</span>
                  </button>
                  <button
                    type="submit"
                    disabled={fpLoading}
                    className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{fpLoading ? 'جاري حفظ كلمة المرور الجديدة...' : 'اعتماد وتغيير كلمة المرور الآن'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* ٤. شاشة اكتمال تغيير كلمة المرور بنجاح */}
            {resetViewMode === 'completed' && (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-[#102A43]">
                    تم تغيير كلمة المرور وحفظها بنجاح
                  </h4>
                  <p className="text-xs text-slate-600 font-bold">
                    تم حفظ كلمة المرور الجديدة لحساب (<strong className="font-mono">{fpIdentifier}</strong>) مشفرة في قاعدة البيانات.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setSuccessMsg('تم تحديث كلمة المرور وتعبئة بيانات الدخول — اضغط على دخول المنظومة.');
                  }}
                  className="px-6 py-3 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer shadow-md"
                >
                  العودة لشاشة الدخول بكلمة المرور الجديدة
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
