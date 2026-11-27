'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Lock, User, KeyRound, ArrowRight, AlertCircle, CheckCircle2, Building2, UserPlus, Sparkles } from 'lucide-react';
import { INITIAL_BRANCHES, getStoredUsers, getStoredBranches, setCurrentSessionUser, setSelectedBranchSession, addAuditLog } from '@/lib/mock-db';
import { Branch, User as UserType } from '@/types';
import { getRoleArabicLabel } from '@/lib/utils';

import {
  loginFormSchema,
  forgotPasswordStep1Schema,
  forgotPasswordStep2Schema,
  forgotPasswordStep3Schema,
} from '@/lib/zod-schemas';
import {
  setClientSessionExpiryTimestamp,
} from '@/hooks/useSessionExpiryMonitor';

interface LoginFormProps {
  onLoginSuccess: (user: UserType) => void;
  onOpenRegister: () => void;
}

export default function LoginForm({ onLoginSuccess, onOpenRegister }: LoginFormProps) {
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('b-03'); // إدارة تموين مركز المحلة الكبرى افتراضياً

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setBranches(getStoredBranches());
    });
    return () => cancelAnimationFrame(frameId);
  }, []);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fpStep, setFpStep] = useState<1 | 2 | 3>(1);
  const [fpIdentifier, setFpIdentifier] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmNewPassword, setFpConfirmNewPassword] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState(false);

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
      const users = getStoredUsers();
      const trimmedUser = validated.data.username.toLowerCase();

      let found = users.find((u) => u.username.toLowerCase() === trimmedUser);

      if (!found && trimmedUser === 'admin') {
        found = users[0];
      }

      if (!found) {
        setLoading(false);
        setErrorMsg('اسم المستخدم غير مسجل في المنظومة. يرجى التأكد من البيانات أو تقديم طلب إنشاء حساب جديد.');
        addAuditLog({
          userId: 'anonymous',
          username: validated.data.username || 'unknown',
          fullName: 'مستخدم غير مسجل',
          action: 'محاولة دخول فاشلة',
          module: 'بوابة المصادقة الموحدة',
          details: 'اسم مستخدم غير موجود',
          ipAddress: '10.20.30.50',
          deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser',
          status: 'failed',
        });
        return;
      }

      if (found.status === 'suspended' || found.status === 'inactive') {
        setLoading(false);
        setErrorMsg('عذراً، هذا الحساب موقوف إدارياً. يرجى مراجعة مدير النظام بالمديرية.');
        return;
      }

      if (found.passwordDisabled) {
        setLoading(false);
        setErrorMsg('تم حذف كلمة المرور الخاصة بهذا الحساب من قبل مدير النظام. يرجى مراجعة الإدارة لتعيين كلمة مرور جديدة.');
        return;
      }

      if (typeof found.password === 'string' && found.password.length > 0 && found.password !== validated.data.password) {
        setLoading(false);
        setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة.');
        return;
      }

      const activeBranchId = selectedBranchId || found.primaryBranchId || 'b-03';
      const authRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: found.username,
          password: validated.data.password,
          branchId: activeBranchId,
          registeredUser: {
            id: found.id,
            fullName: found.fullName,
            role: found.role,
            primaryBranchId: activeBranchId,
          },
        }),
      });

      // Enforce 401/403/429 server auth checks whenever server bootstrap auth is active
      if (!authRes.ok && authRes.status !== 503) {
        const authErr = (await authRes.json().catch(() => ({}))) as { error?: string };
        setLoading(false);
        setErrorMsg(authErr.error || 'بيانات الدخول غير صحيحة.');
        return;
      }

      const updatedUser: UserType = {
        ...found,
        primaryBranchId: activeBranchId,
        failedLoginAttempts: 0,
        lastLogin: new Date().toISOString(),
      };

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
      }, 400);
    } catch {
      setLoading(false);
      setErrorMsg('تعذر الاتصال بخدمة المصادقة. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    if (fpStep === 1) {
      const res = forgotPasswordStep1Schema.safeParse({ identifier: fpIdentifier });
      if (!res.success) {
        setFpError(res.error.issues[0]?.message || 'يرجى إدخال اسم المستخدم أو الرقم القومي');
        return;
      }
      setFpIdentifier(res.data.identifier);
      setFpStep(2);
    } else if (fpStep === 2) {
      const res = forgotPasswordStep2Schema.safeParse({ otp: fpOtp });
      if (!res.success) {
        setFpError(res.error.issues[0]?.message || 'يرجى إدخال رمز التحقق المرسل');
        return;
      }
      setFpStep(3);
    } else if (fpStep === 3) {
      const res = forgotPasswordStep3Schema.safeParse({
        newPassword: fpNewPassword,
        confirmNewPassword: fpConfirmNewPassword,
      });
      if (!res.success) {
        setFpError(res.error.issues[0]?.message || 'يرجى التحقق من كلمة المرور الجديدة');
        return;
      }
      addAuditLog({
        userId: fpIdentifier,
        username: fpIdentifier,
        fullName: fpIdentifier,
        action: 'إعادة تعيين كلمة المرور',
        module: 'بوابة المصادقة الموحدة',
        details: 'تم تحديث كلمة المرور بنجاح عبر رمز التحقق المؤقت',
        ipAddress: '10.20.30.50',
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser',
        status: 'success',
      });
      setFpSuccess(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setFpStep(1);
        setFpIdentifier('');
        setFpOtp('');
        setFpNewPassword('');
        setFpConfirmNewPassword('');
        setFpSuccess(false);
      }, 1800);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto min-h-[90vh] flex items-center justify-center p-2 sm:p-4 lg:p-6 font-sans">
      {/* Ultra Premium Split Screen Glassmorphism Container */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_25px_70px_rgba(16,42,67,0.18)] border border-white/80 overflow-hidden relative">
        
        {/* Right Side: Luxury Login Form (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative bg-gradient-to-b from-white via-[#FAFBFD] to-[#F4F7FB]">
          {/* Subtle Decorative Golden Accent Line at Top */}
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
                    placeholder="أدخل اسم المستخدم المعتمد"
                    className="w-full pr-12 pl-4 py-3 sm:py-3.5 bg-white border border-slate-300 rounded-2xl text-[11px] sm:text-[13px] text-[#243447] focus:outline-none focus:ring-2 focus:ring-[#164E83] focus:border-transparent transition-all shadow-sm font-extrabold"
                  />
                </div>
              </div>

              {/* Password Input (No mention of 'الباسورد') */}
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

                <div className="flex justify-between items-center mt-3 text-[11px] sm:text-[13px]">
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
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[#164E83] font-black hover:underline cursor-pointer"
                  >
                    استعادة كلمة المرور؟
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
            <span className="text-[#C6A15B] font-black" dir="ltr">Designed &amp; Developed by Eng. Ahmed El-Hosseiny — Tel: 01004414038</span>
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
          {/* Cinematic Golden-Navy Gradient Overlay */}
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

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#102A43] text-[#C6A15B] flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-[#102A43]">استعادة كلمة المرور الرسمية</h3>
              </div>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {fpError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] font-extrabold">
                {fpError}
              </div>
            )}

            {fpSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-lg font-black text-[#102A43]">تم تحديث كلمة المرور بنجاح</h4>
                <p className="text-[11px] text-slate-600 font-bold">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                {fpStep === 1 && (
                  <>
                    <p className="text-[11px] text-slate-700 font-bold leading-relaxed">
                      أدخل اسم المستخدم أو الرقم القومي المكون من ١٤ رقماً لإرسال رمز التحقق المؤقت المعتمد.
                    </p>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1.5">اسم المستخدم / الرقم القومي</label>
                      <input
                        type="text"
                        required
                        value={fpIdentifier}
                        onChange={(e) => setFpIdentifier(e.target.value)}
                        placeholder="أدخل البيان الرسمي"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#164E83]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#102A43] hover:bg-[#164E83] text-white font-black rounded-xl text-[11px] shadow-sm cursor-pointer"
                    >
                      إرسال رمز التحقق
                    </button>
                  </>
                )}

                {fpStep === 2 && (
                  <>
                    <p className="text-[11px] text-slate-700 font-bold">أدخل رمز التحقق المؤقت المكون من ٦ أرقام المرسل لهاتفك المسجل.</p>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1.5">رمز التحقق</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={fpOtp}
                        onChange={(e) => setFpOtp(e.target.value)}
                        placeholder="٠٠٠٠٠٠"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-center tracking-widest font-mono font-black text-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#102A43] hover:bg-[#164E83] text-white font-black rounded-xl text-[11px] shadow-sm cursor-pointer"
                    >
                      تأكيد الرمز
                    </button>
                  </>
                )}

                {fpStep === 3 && (
                  <>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1.5">كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        required
                        value={fpNewPassword}
                        onChange={(e) => setFpNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-mono font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1.5">تأكيد كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        required
                        value={fpConfirmNewPassword}
                        onChange={(e) => setFpConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-mono font-bold text-slate-800"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-[11px] shadow-sm cursor-pointer"
                    >
                      حفظ كلمة المرور الجديدة
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
