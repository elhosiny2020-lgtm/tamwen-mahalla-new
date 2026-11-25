'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Users, Layers, ShieldCheck, ArrowLeft, Settings2, CheckCircle2 } from 'lucide-react';
import { Branch, Department, User } from '@/types';
import { INITIAL_BRANCHES, INITIAL_USERS, INITIAL_DEPARTMENTS, getStoredBranches, saveStoredBranches, getStoredUsers, getStoredDepartments } from '@/lib/mock-db';
import { toArabicNumerals } from '@/lib/utils';

interface BranchSelectionProps {
  currentUser: User;
  onSelectBranch: (branchId: string) => void;
}

export default function BranchSelection({ currentUser, onSelectBranch }: BranchSelectionProps) {
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [allDepts, setAllDepts] = useState<Department[]>(INITIAL_DEPARTMENTS);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setBranches(getStoredBranches());
      setAllUsers(getStoredUsers());
      setAllDepts(getStoredDepartments());
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editArabicName, setEditArabicName] = useState('');
  const [editManagerName, setEditManagerName] = useState('');

  const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'directorate_manager';

  const allowedBranches = isAdmin
    ? branches
    : branches.filter((b) => currentUser.branchIds.includes(b.id) || b.id === currentUser.primaryBranchId);

  const handleStartEdit = (b: Branch) => {
    setEditingBranchId(b.id);
    setEditArabicName(b.arabicName);
    setEditManagerName(b.managerName || '');
  };

  const handleSaveEdit = (branchId: string) => {
    if (!editArabicName.trim()) return;
    const updated = branches.map((b) =>
      b.id === branchId
        ? { ...b, arabicName: editArabicName.trim(), name: editArabicName.trim(), managerName: editManagerName.trim() }
        : b
    );
    setBranches(updated);
    saveStoredBranches(updated);
    setEditingBranchId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-[#102A43] text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-[#164E83] mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#C6A15B] tracking-wide mb-1">
            جمهورية مصر العربية · وزارة التموين والتجارة الداخلية · محافظة الغربية
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            اختيار الإدارة التموينية المختصة ({toArabicNumerals(branches.length)} فرعاً إدارياً)
          </h2>
          <p className="text-xs text-slate-300 mt-1.5">
            مرحباً بك <span className="font-bold text-white">{currentUser.fullName}</span> — اختر الإدارة التموينية للدخول إلى لوحة التحكم والأقسام المعتمدة
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectBranch('b-03')}
            className="px-5 py-3 bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer whitespace-nowrap"
          >
            <span>الدخول السريع: إدارة تموين مركز المحلة الكبرى</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 11 Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {allowedBranches.map((branch) => {
          const branchUsersCount = allUsers.filter(
            (u) => u.branchIds.includes(branch.id) || u.primaryBranchId === branch.id
          ).length;
          const isMahallaCenter = branch.id === 'b-03';
          const isEditing = editingBranchId === branch.id;

          return (
            <div
              key={branch.id}
              className={`bg-white rounded-2xl p-6 transition-all flex flex-col justify-between ${
                isMahallaCenter
                  ? 'border-2 border-[#C6A15B] shadow-md'
                  : 'border border-slate-200 hover:border-[#164E83] shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isMahallaCenter
                          ? 'bg-[#102A43] text-[#C6A15B] border border-[#C6A15B]'
                          : 'bg-[#F4F7FB] text-[#102A43] border border-slate-200'
                      }`}
                    >
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500">كود الإدارة: {toArabicNumerals(branch.id.replace('b-', ''))}</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editArabicName}
                          onChange={(e) => setEditArabicName(e.target.value)}
                          className="w-full mt-1 px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-bold text-[#102A43]"
                        />
                      ) : (
                        <h3 className="text-base font-black text-[#102A43] leading-snug">
                          {branch.arabicName}
                        </h3>
                      )}
                    </div>
                  </div>

                  {isAdmin && !isEditing && (
                    <button
                      onClick={() => handleStartEdit(branch)}
                      className="p-1.5 text-slate-400 hover:text-[#102A43] rounded-lg transition-colors"
                      title="تعديل بيانات الإدارة"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="mb-4 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700">مدير الإدارة</label>
                    <input
                      type="text"
                      value={editManagerName}
                      onChange={(e) => setEditManagerName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleSaveEdit(branch.id)}
                        className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingBranchId(null)}
                        className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-[#243447] mb-5">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">مدير الإدارة:</span>
                      <span className="font-bold text-[#102A43]">{branch.managerName || 'معتمد'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#164E83]" />
                        <span>المستخدمون المصرح لهم:</span>
                      </span>
                      <span className="num-cell font-bold text-[#102A43]">{toArabicNumerals(branchUsersCount)} مستخدم</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#164E83]" />
                        <span>الأقسام المتاحة:</span>
                      </span>
                      <span className="num-cell font-bold text-[#102A43]">{toArabicNumerals(allDepts.length)} قسماً</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>حالة النظام:</span>
                      </span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>نشط ومتصل</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => onSelectBranch(branch.id)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isMahallaCenter
                    ? 'bg-[#102A43] hover:bg-[#164E83] text-white shadow-sm'
                    : 'bg-[#F4F7FB] hover:bg-[#102A43] text-[#102A43] hover:text-white border border-slate-300/80'
                }`}
              >
                <span>الدخول إلى الإدارة</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
