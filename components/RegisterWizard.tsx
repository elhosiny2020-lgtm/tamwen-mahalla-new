'use client';

import React, { useState, useEffect } from 'react';
import { User as UserIcon, Shield, Building2, Layers, CheckCircle2, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import {
  INITIAL_BRANCHES,
  INITIAL_DEPARTMENTS,
  getStoredBranches,
  getStoredDepartments,
  getStoredRegistrationRequests,
  saveStoredRegistrationRequests,
  getStoredUsers,
  saveStoredUsers,
  setCurrentSessionUser,
  setSelectedBranchSession,
  addAuditLog,
} from '@/lib/mock-db';
import { Branch, Department, User, UserRole, RegistrationRequest } from '@/types';
import { registerSchema } from '@/lib/zod-schemas';
import { getRoleArabicLabel, toArabicNumerals } from '@/lib/utils';
import { setClientSessionExpiryTimestamp } from '@/hooks/useSessionExpiryMonitor';

interface RegisterWizardProps {
  onClose: () => void;
  onSuccess: (newUser: User) => void;
}

export default function RegisterWizard({ onClose, onSuccess }: RegisterWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setBranches(getStoredBranches());
      setDepartments(getStoredDepartments());
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Form state
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [jobTitle, setJobTitle] = useState('');
  const [jobGrade, setJobGrade] = useState('درجة أولى أ');
  const [workplace, setWorkplace] = useState('');
  
  const [primaryBranchId, setPrimaryBranchId] = useState('b-03');
  const [selectedBranches, setSelectedBranches] = useState<string[]>(['b-03']);
  
  const [requestedRole, setRequestedRole] = useState<UserRole>('bakery_officer');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    INITIAL_DEPARTMENTS.map((d) => d.id)
  );
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      const result = registerSchema.safeParse({
        fullName,
        nationalId,
        phone,
        email,
        username,
        tempPassword,
        confirmPassword,
        jobTitle: jobTitle || 'موظف تموين'
      });

      if (!result.success) {
        const firstError = result.error.issues[0]?.message || 'يرجى التحقق من صحة المدخلات (الرقم القومي ١٤ رقماً والهاتف ١١ رقماً)';
        setErrorMsg(firstError);
        return;
      }

      const existingUsers = getStoredUsers();
      if (existingUsers.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
        setErrorMsg('اسم المستخدم مسجل بالفعل، يرجى اختيار اسم مستخدم آخر.');
        return;
      }
    }
    if (step < 5) setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5);
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5);
  };

  const handleSelectAllBranches = () => {
    setSelectedBranches(branches.map(b => b.id));
  };

  const handleClearAllBranches = () => {
    setSelectedBranches([primaryBranchId]);
  };

  const handleSelectAllDepartments = () => {
    setSelectedDepartments(departments.map(d => d.id));
  };

  const handleClearAllDepartments = () => {
    setSelectedDepartments([]);
  };

  const handleBranchToggle = (bId: string) => {
    if (selectedBranches.includes(bId)) {
      if (selectedBranches.length === 1) return;
      setSelectedBranches(selectedBranches.filter(id => id !== bId));
    } else {
      setSelectedBranches([...selectedBranches, bId]);
    }
  };

  const handleDeptToggle = (dId: string) => {
    if (selectedDepartments.includes(dId)) {
      setSelectedDepartments(selectedDepartments.filter(id => id !== dId));
    } else {
      setSelectedDepartments([...selectedDepartments, dId]);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');

    const nowIso = new Date().toISOString();
    const effectiveBranches = selectedBranches.length > 0 ? selectedBranches : [primaryBranchId];
    const effectiveDepts =
      selectedDepartments.length > 0 ? selectedDepartments : departments.map((d) => d.id);

    const newUser: User = {
      id: `usr-${Date.now()}`,
      fullName: fullName.trim(),
      nationalId: nationalId.trim(),
      phone: phone.trim(),
      email: email.trim() || `${username.trim()}@supply.gov.eg`,
      username: username.trim(),
      password: tempPassword,
      jobTitle: jobTitle.trim() || 'موظف تموين',
      jobGrade,
      workplace: workplace.trim() || 'إدارة تموين مركز المحلة الكبرى',
      primaryBranchId,
      branchIds: effectiveBranches,
      departmentIds: effectiveDepts,
      role: requestedRole,
      status: 'active',
      employeeNumber: String(Math.floor(10000 + Math.random() * 90000)),
      failedLoginAttempts: 0,
      createdAt: nowIso,
      lastLogin: nowIso,
    };

    const existingUsers = getStoredUsers();
    saveStoredUsers([newUser, ...existingUsers]);

    const newReq: RegistrationRequest = {
      id: `req-${Date.now()}`,
      fullName: newUser.fullName,
      nationalId: newUser.nationalId,
      phone: newUser.phone,
      email: newUser.email,
      username: newUser.username,
      tempPassword,
      jobTitle: newUser.jobTitle,
      jobGrade,
      workplace: newUser.workplace,
      primaryBranchId,
      branchIds: effectiveBranches,
      requestedRole,
      requestedDepartments: effectiveDepts,
      status: 'approved',
      createdAt: nowIso,
    };

    const reqs = getStoredRegistrationRequests();
    saveStoredRegistrationRequests([newReq, ...reqs]);

    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUser.username,
          password: tempPassword,
          branchId: primaryBranchId,
          isDirectRegistration: true,
          registeredUser: {
            id: newUser.id,
            fullName: newUser.fullName,
            role: newUser.role,
            primaryBranchId: newUser.primaryBranchId,
          },
        }),
      });
    } catch {
      // المتابعة للدخول الفوري حتى في حال عدم استجابة طلب الشبكة الثانوي
    }

    addAuditLog({
      userId: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      action: 'تسجيل مستخدم جديد ودخول فوري للنظام',
      module: 'إدارة المستخدمين',
      branchId: primaryBranchId,
      details: `تم إنشاء وتفعيل حساب المستخدم (${newUser.fullName}) برتبة (${getRoleArabicLabel(requestedRole)}) والدخول المباشر للمنظومة`,
      ipAddress: '192.168.1.50',
      deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser',
      status: 'success',
    });

    setCurrentSessionUser(newUser);
    setSelectedBranchSession(primaryBranchId);
    setClientSessionExpiryTimestamp();
    setIsSubmitting(false);
    onSuccess(newUser);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
          <div>
            <h2 className="text-2xl font-black text-[#102A43]">إنشاء حساب مستخدم جديد والدخول المباشر</h2>
            <p className="text-[11px] font-bold text-slate-600">مديرية التموين والتجارة الداخلية بالغربية · تفعيل ودخول فوري للمنظومة دون انتظار</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 cursor-pointer">✕</button>
        </div>

        <>
            {/* Step Progress Bar */}
            <div className="flex justify-between mb-8 relative">
              <div className="absolute top-1/2 right-0 left-0 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
              {[
                { s: 1, title: 'البيانات الشخصية', icon: UserIcon },
                { s: 2, title: 'الدور الوظيفي', icon: Shield },
                { s: 3, title: 'الفروع والنطاق', icon: Building2 },
                { s: 4, title: 'الأقسام والصلاحيات', icon: Layers },
                { s: 5, title: 'المراجعة والحفظ', icon: CheckCircle2 }
              ].map((item) => {
                const Icon = item.icon;
                const active = step === item.s;
                const completed = step > item.s;
                return (
                  <div key={item.s} className="relative z-10 flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black transition-all shadow-sm ${
                      active ? 'bg-[#102A43] text-[#C6A15B] ring-4 ring-blue-100' :
                      completed ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-extrabold text-[#102A43] mt-2 hidden sm:block">{item.title}</span>
                  </div>
                );
              })}
            </div>

            {errorMsg && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-[11px] font-extrabold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={step === 5 ? handleSubmitRequest : (e) => { e.preventDefault(); handleNextStep(); }}>
              {/* Step 1: Personal & Job Data */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-[#102A43] pb-2 border-b border-slate-100">
                    أولاً: البيانات الشخصية والوظيفية (الرقم القومي ١٤ رقماً والهاتف ١١ رقماً)
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">الاسم الرباعي الرسمي *</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مثل: أحمد محمد إبراهيم حسن"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">الرقم القومي (١٤ رقماً بالضبط) *</label>
                      <input
                        type="text"
                        required
                        maxLength={14}
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 14))}
                        placeholder="أدخل ١٤ رقماً"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-800 font-mono tracking-widest"
                      />
                      <span className="text-xs font-bold text-slate-600 mt-0.5 block">العدد الحالي: {toArabicNumerals(nationalId.length)}/{toArabicNumerals(14)}</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">رقم الهاتف المحمول (١١ رقماً) *</label>
                      <input
                        type="tel"
                        required
                        maxLength={11}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="أدخل ١١ رقماً"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-800 font-mono tracking-widest"
                      />
                      <span className="text-xs font-bold text-slate-600 mt-0.5 block">العدد الحالي: {toArabicNumerals(phone.length)}/{toArabicNumerals(11)}</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">البريد الإلكتروني الرسمي</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="البريد الرسمي للجهة"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">اسم المستخدم للدخول *</label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="أدخل اسم مستخدم فريد"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">المسمى الوظيفي الفعلي *</label>
                      <input
                        type="text"
                        required
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="مثل: مفتش تموين مخابز أول"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">كلمة المرور *</label>
                      <input
                        type="password"
                        required
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">تأكيد كلمة المرور *</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-800 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Role Selection */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-[#102A43] pb-2 border-b border-slate-100">
                    ثانياً: تحديد الدور الوظيفي المعتمد
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                    {[
                      { role: 'admin', title: 'مدير النظام العام', desc: 'صلاحيات إدارية كاملة على الفروع والمستخدمين والصلاحيات الأمنية' },
                      { role: 'supply_admin_manager', title: 'مدير إدارة تموينية', desc: 'إدارة شاملة لإدارة التموين والمخابز والتقارير والاعتمادات' },
                      { role: 'department_manager', title: 'رئيس قسم المخابز / الرقابة', desc: 'إدارة شاملة لمهام القسم ومتابعة الحصص والتراخيص' },
                      { role: 'bakery_officer', title: 'مسؤول المخابز والحصص', desc: 'متابعة المخابز والمعادلات السبع والتراخيص والعقود' },
                      { role: 'supply_inspector', title: 'مفتش تموين / رقابة', desc: 'إضافة ومتابعة المحاضر والحملات والأسواق التجارية' },
                      { role: 'data_entry', title: 'موظف إدخال بيانات', desc: 'إدخال وتحديث البيانات التشغيلية دون حذف أو اعتماد نهائي' },
                      { role: 'reviewer', title: 'موظف مراجعة واعتماد', desc: 'مراجعة وتدقيق واعتماد الطلبات والبيانات الواردة' },
                      { role: 'viewer', title: 'مستخدم قراءة فقط', desc: 'عرض التقارير والبيانات والاطلاع دون أي تعديل' }
                    ].map((item) => {
                      const isSelected = requestedRole === item.role;
                      return (
                        <div
                          key={item.role}
                          onClick={() => setRequestedRole(item.role as UserRole)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected ? 'border-[#102A43] bg-[#F4F7FB] shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="roleSelection"
                            checked={isSelected}
                            onChange={() => setRequestedRole(item.role as UserRole)}
                            className="text-[#102A43] mt-1 w-4 h-4 shrink-0"
                          />
                          <div>
                            <span className="text-[11px] font-black text-[#102A43] block mb-1">{item.title}</span>
                            <p className="text-xs font-bold text-slate-600 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Branch Selection */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100 gap-2">
                    <div>
                      <h3 className="text-[11px] font-black text-[#102A43]">ثالثاً: نطاق الفروع والإدارات التموينية ({toArabicNumerals(branches.length)} فرعاً)</h3>
                      <p className="text-[11px] font-bold text-slate-600">اختر الفرع الأساسي والفروع المسموح للمستخدم الاطلاع على بياناتها</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllBranches}
                        className="px-3 py-1.5 bg-[#102A43] hover:bg-[#164E83] text-white rounded-xl text-xs font-extrabold cursor-pointer"
                      >
                        تحديد كافة الفروع ({toArabicNumerals(branches.length)} فرعاً)
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllBranches}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-extrabold cursor-pointer"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-[#102A43] mb-1.5">الفرع الأساسي الافتراضي *</label>
                    <select
                      value={primaryBranchId}
                      onChange={(e) => setPrimaryBranchId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] text-[#102A43] font-extrabold"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.arabicName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-[#102A43] mb-2">الفروع التابعة المسموح بالوصول لبياناتها:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {branches.map(b => {
                        const isChecked = selectedBranches.includes(b.id);
                        return (
                          <div
                            key={b.id}
                            onClick={() => handleBranchToggle(b.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                              isChecked ? 'bg-blue-50 border-[#102A43] text-[#102A43] font-extrabold' : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleBranchToggle(b.id)}
                              className="w-4 h-4 accent-[#102A43]"
                            />
                            <span className="text-[11px]">{b.arabicName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Department Visibility */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100 gap-2">
                    <div>
                      <h3 className="text-[11px] font-black text-[#102A43]">رابعاً: اختيار الأقسام المصرح ظهورها</h3>
                      <p className="text-[11px] font-bold text-slate-600">تحديد الأقسام والوحدات التي تظهر للمستخدم داخل المنظومة</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllDepartments}
                        className="px-3 py-1.5 bg-[#102A43] hover:bg-[#164E83] text-white rounded-xl text-xs font-extrabold cursor-pointer"
                      >
                        تحديد كافة الأقسام
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllDepartments}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-extrabold cursor-pointer"
                      >
                        إلغاء تحديد الكل
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {departments.map(d => {
                      const isChecked = selectedDepartments.includes(d.id);
                      return (
                        <div
                          key={d.id}
                          onClick={() => handleDeptToggle(d.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                            isChecked ? 'bg-blue-50 border-[#102A43]' : 'bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleDeptToggle(d.id)}
                            className="w-4 h-4 mt-0.5 shrink-0 accent-[#102A43]"
                          />
                          <div>
                            <span className="text-[11px] font-extrabold text-[#102A43] block mb-0.5">{d.arabicName}</span>
                            <span className="text-xs font-bold text-slate-600 leading-tight block">{d.description}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 5: Review & Submit */}
              {step === 5 && (
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-[#102A43] pb-2 border-b border-slate-100">خامساً: مراجعة البيانات قبل تقديم طلب التسجيل</h3>
                  
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3 text-[11px]">
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600 font-bold">الاسم الرباعي:</span>
                      <span className="font-extrabold text-[#102A43]">{fullName}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600 font-bold">الرقم القومي (١٤ رقماً):</span>
                      <span className="num-cell text-[#102A43] font-extrabold">{toArabicNumerals(nationalId)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600 font-bold">رقم الهاتف (١١ رقماً):</span>
                      <span className="num-cell text-[#102A43] font-extrabold">{toArabicNumerals(phone)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600 font-bold">اسم المستخدم:</span>
                      <span className="text-[#102A43] font-extrabold">{username}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600 font-bold">الدور الوظيفي:</span>
                      <span className="font-extrabold text-[#102A43]">{getRoleArabicLabel(requestedRole)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600 font-bold">الفروع المتاحة:</span>
                      <span className="num-cell font-extrabold text-[#102A43]">{toArabicNumerals(selectedBranches.length)} فرع مصرح</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-600 font-bold">الأقسام المتاحة:</span>
                      <span className="num-cell font-extrabold text-[#102A43]">{toArabicNumerals(selectedDepartments.length)} قسم مصرح</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-200">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>السابق</span>
                  </button>
                ) : <div></div>}

                {step < 5 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-7 py-3 bg-[#102A43] hover:bg-[#164E83] text-white font-extrabold rounded-xl text-[11px] flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span>التالي</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-7 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-black rounded-xl text-[11px] flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span>{isSubmitting ? 'جارٍ تفعيل الحساب والدخول...' : 'إنشاء الحساب والدخول للنظام مباشرة'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </>
      </div>
    </div>
  );
}
