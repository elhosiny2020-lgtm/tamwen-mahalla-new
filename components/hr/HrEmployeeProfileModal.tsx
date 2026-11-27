'use client';

import React, { useState } from 'react';
import {
  X,
  UserCheck,
  Briefcase,
  GraduationCap,
  History,
  Clock,
  AlertTriangle,
  CalendarDays,
  ShieldAlert,
  Globe,
  FileText,
  FolderOpen,
  ClipboardCheck,
  Printer,
  PlusCircle,
  Save,
} from 'lucide-react';
import {
  HrEmployeeUnifiedRecord,
  HrPersonnelStoreData,
  HrServiceActionCategory,
  HrEmploymentCategory,
  HrEmployeeJobStatus,
  maskNationalId,
} from '@/lib/hr-personnel-store';
import { User } from '@/types';
import { toArabicNumerals, formatDateArabic, formatArabicCurrency } from '@/lib/utils';

export type HrProfileModalMode = 'profile' | 'create' | 'edit';

interface HrEmployeeProfileModalProps {
  mode: HrProfileModalMode;
  employee: HrEmployeeUnifiedRecord | null;
  store: HrPersonnelStoreData;
  updateStore: (updater: (prev: HrPersonnelStoreData) => HrPersonnelStoreData) => void;
  currentUser: User;
  canViewFullNationalId: boolean;
  isHrAdminOrSupervisor: boolean;
  todayRef: string;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

const PROFILE_TABS = [
  { id: 'personal', label: '١. البيانات الشخصية', icon: UserCheck },
  { id: 'job', label: '٢. البيانات الوظيفية', icon: Briefcase },
  { id: 'qualifications', label: '٣. المؤهلات', icon: GraduationCap },
  { id: 'history', label: '٤. التدرج الوظيفي', icon: History },
  { id: 'attendance', label: '٥. الحضور والانصراف', icon: Clock },
  { id: 'delays', label: '٦. التأخيرات', icon: AlertTriangle },
  { id: 'leaves', label: '٧. الإجازات', icon: CalendarDays },
  { id: 'penalties', label: '٨. الإنذارات والجزاءات', icon: ShieldAlert },
  { id: 'secondments', label: '٩. الإعارات والندب', icon: Globe },
  { id: 'contracts', label: '١٠. العقود والتجديدات', icon: FileText },
  { id: 'documents', label: '١١. المستندات والمرفقات', icon: FolderOpen },
  { id: 'audit', label: '١٢. سجل التعديلات والاعتمادات', icon: ClipboardCheck },
] as const;

type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];

export default function HrEmployeeProfileModal({
  mode,
  employee,
  store,
  updateStore,
  currentUser,
  canViewFullNationalId,
  isHrAdminOrSupervisor,
  todayRef,
  onClose,
  onNotify,
}: HrEmployeeProfileModalProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>('personal');
  const [showFullIdOverride, setShowFullIdOverride] = useState(false);

  // نموذج إضافة / تعديل بيانات موظف
  const isEditing = mode === 'edit' && Boolean(employee);
  const nextCodeNum = 1001 + store.employees.length;
  const [formState, setFormState] = useState({
    fullName: isEditing && employee ? employee.fullName : '',
    nationalId: isEditing && employee ? employee.nationalId : '',
    employeeCode: isEditing && employee ? employee.employeeCode : `HR-GH-${nextCodeNum}`,
    employeeNumber: isEditing && employee ? employee.employeeNumber : String(45000 + store.employees.length + 1),
    phone: isEditing && employee ? employee.phone : '',
    altPhone: isEditing && employee ? employee.altPhone : '',
    email: isEditing && employee ? employee.email : '',
    birthDate: isEditing && employee ? employee.birthDate : '1990-01-01',
    gender: (isEditing && employee ? employee.gender : 'ذكر') as 'ذكر' | 'أنثى',
    centerCity: isEditing && employee ? employee.centerCity : 'المحلة الكبرى',
    village: isEditing && employee ? employee.village : '',
    detailedAddress: isEditing && employee ? employee.detailedAddress : '',
    supplyAdministration:
      isEditing && employee ? employee.supplyAdministration : 'إدارة تموين مركز المحلة الكبرى',
    departmentName: isEditing && employee ? employee.departmentName : 'الرقابة التموينية',
    workLocation: isEditing && employee ? employee.workLocation : 'مقر الإدارة التموينية',
    jobTitle: isEditing && employee ? employee.jobTitle : '',
    financialGrade: isEditing && employee ? employee.financialGrade : 'الثالثة التخصصية',
    employmentCategory: (isEditing && employee ? employee.employmentCategory : 'دائم') as HrEmploymentCategory,
    jobStatus: (isEditing && employee ? employee.jobStatus : 'على رأس العمل') as HrEmployeeJobStatus,
    appointmentType: isEditing && employee ? employee.appointmentType : 'تعيين دائم',
    appointmentDecisionNumber: isEditing && employee ? employee.appointmentDecisionNumber : '',
    appointmentDecisionDate: isEditing && employee ? employee.appointmentDecisionDate : todayRef,
    workStartDate: isEditing && employee ? employee.workStartDate : todayRef,
    qualificationDegree: isEditing && employee ? employee.qualificationDegree : 'بكالوريوس',
    educationalInstitution: isEditing && employee ? employee.educationalInstitution : 'جامعة طنطا',
    approvedFunctionalWageEgp: isEditing && employee ? employee.approvedFunctionalWageEgp : 5500,
    supplementaryWageEgp: isEditing && employee ? employee.supplementaryWageEgp : 2000,
  });
  const [formError, setFormError] = useState('');

  // نموذج إضافة قرار جديد للتدرج الوظيفي (يحفظ التاريخ السابق دون استبدال)
  const [decisionCat, setDecisionCat] = useState<HrServiceActionCategory>('الترقية');
  const [decisionNumber, setDecisionNumber] = useState('');
  const [decisionDate, setDecisionDate] = useState(todayRef);
  const [decisionNewVal, setDecisionNewVal] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const cleanNid = formState.nationalId.trim();
    if (!/^\d{14}$/.test(cleanNid)) {
      setFormError('الرقم القومي يجب أن يتكون من ١٤ رقماً صحيحاً بالضبط.');
      return;
    }
    if (!formState.fullName.trim() || !formState.jobTitle.trim() || !formState.phone.trim()) {
      setFormError('يرجى استيفاء الاسم الرباعي والمسمى الوظيفي ورقم الهاتف.');
      return;
    }
    const duplicate = store.employees.find(
      (emp) => emp.nationalId === cleanNid && (!isEditing || emp.id !== employee?.id)
    );
    if (duplicate) {
      setFormError(`رفض الحفظ: الرقم القومي (${cleanNid}) مسجل بالفعل باسم الموظف (${duplicate.fullName}).`);
      return;
    }

    const nowIso = new Date().toISOString();
    if (isEditing && employee) {
      updateStore((prev) => ({
        ...prev,
        employees: prev.employees.map((item) =>
          item.id === employee.id
            ? {
                ...item,
                ...formState,
                nationalId: cleanNid,
                currentJob: formState.jobTitle,
                updatedAt: nowIso,
              }
            : item
        ),
        auditLogs: [
          {
            id: `hra-${Date.now()}`,
            timestamp: nowIso,
            actorName: currentUser.fullName,
            actorRole: currentUser.jobTitle || currentUser.role,
            actionType: 'تعديل',
            targetSection: 'قاعدة بيانات العاملين – الملف الوظيفي الموحد',
            targetRecordCode: formState.employeeCode,
            employeeName: formState.fullName,
            details: 'تحديث البيانات الشخصية والوظيفية والمالية في الملف الموحد',
          },
          ...prev.auditLogs,
        ],
      }));
      onNotify(`تم تحديث الملف الوظيفي للموظف (${formState.fullName}) بنجاح.`);
      onClose();
      return;
    }

    const newEmp: HrEmployeeUnifiedRecord = {
      id: `emp-${Date.now()}`,
      employeeCode: formState.employeeCode,
      nationalId: cleanNid,
      fullName: formState.fullName.trim(),
      birthDate: formState.birthDate,
      gender: formState.gender,
      birthPlace: 'محافظة الغربية',
      governorate: 'الغربية',
      centerCity: formState.centerCity,
      village: formState.village || 'مدينة المحلة الكبرى',
      detailedAddress: formState.detailedAddress || 'محافظة الغربية',
      phone: formState.phone.trim(),
      altPhone: formState.altPhone.trim(),
      email: formState.email.trim() || `${formState.employeeCode.toLowerCase()}@supply.gov.eg`,
      maritalStatus: 'متزوج',
      emergencyContactName: 'قريب من الدرجة الأولى',
      emergencyContactPhone: formState.phone.trim(),
      personalPhotoLabel: 'صورة_شخصية.jpg',
      nationalIdDocLabel: 'صورة_البطاقة.pdf',
      employeeNumber: formState.employeeNumber.trim(),
      jobTitle: formState.jobTitle.trim(),
      occupationalGroup: 'الوظائف التخصصية التموينية',
      financialGrade: formState.financialGrade,
      jobLevel: 'المستوى الأول',
      workplaceEntity: 'مديرية التموين والتجارة الداخلية بالغربية',
      directorateName: 'مديرية التموين والتجارة الداخلية بالغربية',
      supplyAdministration: formState.supplyAdministration,
      departmentName: formState.departmentName,
      organizationalUnit: formState.departmentName,
      workLocation: formState.workLocation,
      appointmentDate: formState.appointmentDecisionDate,
      workStartDate: formState.workStartDate,
      confirmationDate: formState.workStartDate,
      appointmentType: formState.appointmentType,
      employmentCategory: formState.employmentCategory,
      jobStatus: formState.jobStatus,
      currentJob: formState.jobTitle.trim(),
      previousJobs: 'لا يوجد',
      qualificationDegree: formState.qualificationDegree,
      specialization: 'إدارة وتجارة / شؤون تموينية',
      graduationYear: 2015,
      educationalInstitution: formState.educationalInstitution,
      trainingCourses: 'دورة التحول الرقمي والحوكمة التموينية',
      previousExperience: 'عمل إداري وميداني',
      appointmentDecisionNumber: formState.appointmentDecisionNumber || `ق-${nextCodeNum}/٢٠٢٦`,
      appointmentDecisionDate: formState.appointmentDecisionDate,
      personnelFileNumber: `ملف-${nextCodeNum}`,
      notes: '',
      gradeAcquisitionDate: formState.workStartDate,
      approvedFunctionalWageEgp: Number(formState.approvedFunctionalWageEgp) || 0,
      supplementaryWageEgp: Number(formState.supplementaryWageEgp) || 0,
      approvedAllowancesEgp: 900,
      periodicIncrementsEgp: 350,
      lastPromotionDate: formState.workStartDate,
      expectedNextPromotionDate: '2028-07-01',
      disbursementAuthority: 'مديرية التموين والتجارة الداخلية بالغربية',
      socialInsuranceNumber: `INS-${nextCodeNum}`,
      isProfileComplete: true,
      missingProfileItems: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    updateStore((prev) => ({
      ...prev,
      employees: [newEmp, ...prev.employees],
      auditLogs: [
        {
          id: `hra-${Date.now()}`,
          timestamp: nowIso,
          actorName: currentUser.fullName,
          actorRole: currentUser.jobTitle || currentUser.role,
          actionType: 'إضافة',
          targetSection: 'قاعدة بيانات العاملين – الملف الوظيفي الموحد',
          targetRecordCode: newEmp.employeeCode,
          employeeName: newEmp.fullName,
          details: `إضافة موظف جديد برقم قومي فريد (${newEmp.employeeCode})`,
        },
        ...prev.auditLogs,
      ],
    }));
    onNotify(`تم إنشاء الملف الوظيفي الموحد للموظف (${newEmp.fullName}) بنجاح.`);
    onClose();
  };

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
        <div
          className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-4xl w-full overflow-hidden my-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#102A43] text-white px-5 py-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-black text-[#C6A15B] block">
                قاعدة بيانات العاملين – الملف الوظيفي الموحد
              </span>
              <h3 className="text-base font-black">
                {isEditing ? `تعديل بيانات الموظف: ${employee?.fullName}` : 'إضافة موظف جديد بالملف الوظيفي الموحد'}
              </h3>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveEmployee} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 font-black">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block font-black text-[#102A43] mb-1">الاسم الرباعي *</label>
                <input
                  type="text"
                  required
                  value={formState.fullName}
                  onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">الرقم القومي (١٤ رقماً فريد) *</label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  value={formState.nationalId}
                  onChange={(e) => setFormState({ ...formState, nationalId: e.target.value.replace(/\D/g, '') })}
                  placeholder="29001011600000"
                  className="num-cell w-full px-3 py-2 rounded-xl border border-slate-300 font-black"
                />
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">كود الموظف / الرقم الوظيفي *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={formState.employeeCode}
                    className="num-cell px-2 py-2 rounded-xl border border-slate-200 bg-slate-100 font-black"
                  />
                  <input
                    type="text"
                    required
                    value={formState.employeeNumber}
                    onChange={(e) => setFormState({ ...formState, employeeNumber: e.target.value })}
                    className="num-cell px-2 py-2 rounded-xl border border-slate-300 font-black"
                  />
                </div>
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">رقم الهاتف *</label>
                <input
                  type="text"
                  required
                  value={formState.phone}
                  onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                  className="num-cell w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">المسمى الوظيفي *</label>
                <input
                  type="text"
                  required
                  value={formState.jobTitle}
                  onChange={(e) => setFormState({ ...formState, jobTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">الإدارة التموينية</label>
                <input
                  type="text"
                  value={formState.supplyAdministration}
                  onChange={(e) => setFormState({ ...formState, supplyAdministration: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">القسم</label>
                <input
                  type="text"
                  value={formState.departmentName}
                  onChange={(e) => setFormState({ ...formState, departmentName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">الدرجة المالية</label>
                <input
                  type="text"
                  value={formState.financialGrade}
                  onChange={(e) => setFormState({ ...formState, financialGrade: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">فئة الموظف</label>
                <select
                  value={formState.employmentCategory}
                  onChange={(e) => setFormState({ ...formState, employmentCategory: e.target.value as HrEmploymentCategory })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black"
                >
                  <option value="دائم">دائم</option>
                  <option value="خدمة عامة">خدمة عامة</option>
                  <option value="استعانة">استعانة</option>
                  <option value="عقد مؤقت">عقد مؤقت</option>
                  <option value="منتدب">منتدب</option>
                  <option value="معار">معار</option>
                </select>
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">الحالة الوظيفية</label>
                <select
                  value={formState.jobStatus}
                  onChange={(e) => setFormState({ ...formState, jobStatus: e.target.value as HrEmployeeJobStatus })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black"
                >
                  <option value="على رأس العمل">على رأس العمل</option>
                  <option value="إجازة">إجازة</option>
                  <option value="مأمورية">مأمورية</option>
                  <option value="منتدب">منتدب</option>
                  <option value="معار">معار</option>
                  <option value="انتهت خدمته">انتهت خدمته</option>
                </select>
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">المؤهل العلمي والجهة</label>
                <input
                  type="text"
                  value={formState.qualificationDegree}
                  onChange={(e) => setFormState({ ...formState, qualificationDegree: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-200 text-[#102A43] font-black cursor-pointer">
                إلغاء
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center gap-1.5 cursor-pointer">
                <Save className="w-4 h-4" />
                <span>{isEditing ? 'حفظ التعديلات' : 'حفظ وإضافة للملف الموحد'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  const empHistory = store.serviceHistory.filter((h) => h.employeeId === employee.id);
  const empAttendance = store.attendance.filter((a) => a.employeeId === employee.id);
  const empDelays = empAttendance.filter((a) => a.delayMinutes > 0 || a.earlyLeaveMinutes > 0 || a.dayStatus === 'تأخير');
  const empLeaves = store.leaves.filter((l) => l.employeeId === employee.id);
  const empWarnings = store.warnings.filter((w) => w.employeeId === employee.id);
  const empPenalties = store.disciplinaryActions.filter((d) => d.employeeId === employee.id);
  const empSecondments = store.secondments.filter((s) => s.employeeId === employee.id);
  const empContracts = store.assistanceContracts.filter((c) => c.employeeId === employee.id);
  const empRenewals = store.renewalRequests.filter((r) => r.employeeId === employee.id);
  const empDocs = store.documents.filter((d) => d.employeeId === employee.id);
  const empAudits = store.auditLogs.filter((a) => a.employeeName === employee.fullName);

  const handleAddServiceDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionNumber.trim() || !decisionNewVal.trim()) return;
    const nowIso = new Date().toISOString();
    updateStore((prev) => ({
      ...prev,
      serviceHistory: [
        {
          id: `sh-${Date.now()}`,
          employeeId: employee.id,
          actionCategory: decisionCat,
          decisionNumber: decisionNumber.trim(),
          decisionDate,
          effectiveDate: decisionDate,
          issuingAuthority: 'مديرية التموين والتجارة الداخلية بالغربية',
          previousValue: `${employee.jobTitle} — ${employee.supplyAdministration}`,
          newValue: decisionNewVal.trim(),
          attachmentName: `${decisionNumber.trim()}.pdf`,
          notes: decisionNotes.trim() || 'قرار إداري موثق مع الاحتفاظ بالتاريخ الوظيفي السابق',
          recordedBy: currentUser.fullName,
          recordedAt: nowIso,
        },
        ...prev.serviceHistory,
      ],
      auditLogs: [
        {
          id: `hra-${Date.now()}`,
          timestamp: nowIso,
          actorName: currentUser.fullName,
          actorRole: currentUser.jobTitle || currentUser.role,
          actionType: 'إضافة',
          targetSection: 'التدرج الوظيفي والقرارات',
          targetRecordCode: decisionNumber.trim(),
          employeeName: employee.fullName,
          details: `تسجيل قرار (${decisionCat}) برقم ${decisionNumber.trim()} مع الاحتفاظ بالسجل التاريخي السابق`,
        },
        ...prev.auditLogs,
      ],
    }));
    setDecisionNumber('');
    setDecisionNewVal('');
    setDecisionNotes('');
    onNotify(`تم توثيق قرار (${decisionCat}) في التدرج الوظيفي للموظف (${employee.fullName}) دون استبدال السجل السابق.`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-6xl w-full overflow-hidden my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-[#0B1F33] via-[#102A43] to-[#164E83] text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-black text-[#C6A15B] block">
              الملف الوظيفي الموحد (١٢ تبويباً) · {employee.employeeCode} · رقم وظيفي {toArabicNumerals(employee.employeeNumber)}
            </span>
            <h3 className="text-lg font-black">{employee.fullName}</h3>
            <p className="text-[11px] font-bold text-slate-200">
              {employee.jobTitle} — {employee.supplyAdministration} ({employee.departmentName}) · الحالة: {employee.jobStatus}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-[#C6A15B] text-[#102A43] text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة بيان الحالة A4</span>
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 12 Sub-tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex flex-wrap gap-1.5 print:hidden">
          {PROFILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  active ? 'bg-[#102A43] text-[#C6A15B] shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-5 max-h-[68vh] overflow-y-auto text-xs space-y-4">
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">الرقم القومي (١٤ رقماً)</span>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="num-cell font-black text-[#102A43]">
                    {toArabicNumerals(maskNationalId(employee.nationalId, canViewFullNationalId && showFullIdOverride))}
                  </span>
                  {canViewFullNationalId && (
                    <button
                      type="button"
                      onClick={() => setShowFullIdOverride((v) => !v)}
                      className="text-[10px] text-[#164E83] font-black underline cursor-pointer"
                    >
                      {showFullIdOverride ? 'إخفاء' : 'إظهار كامل'}
                    </button>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">تاريخ الميلاد / النوع</span>
                <span className="font-black text-[#102A43]">{formatDateArabic(employee.birthDate)} · {employee.gender}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">رقم الهاتف / البديل</span>
                <span className="num-cell font-black text-[#102A43]">{toArabicNumerals(employee.phone)} {employee.altPhone ? `— ${toArabicNumerals(employee.altPhone)}` : ''}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">البريد الإلكتروني</span>
                <span className="font-black text-[#164E83]">{employee.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">العنوان التفصيلي</span>
                <span className="font-black text-[#102A43]">{employee.governorate} — {employee.centerCity} — {employee.detailedAddress}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">جهة الاتصال في الطوارئ</span>
                <span className="font-black text-[#102A43]">{employee.emergencyContactName} ({toArabicNumerals(employee.emergencyContactPhone)})</span>
              </div>
            </div>
          )}

          {activeTab === 'job' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">الجهة / المديرية</span>
                <span className="font-black text-[#102A43]">{employee.directorateName}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">الإدارة التموينية / القسم</span>
                <span className="font-black text-[#102A43]">{employee.supplyAdministration} — {employee.departmentName}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">مقر العمل الفعلي</span>
                <span className="font-black text-[#102A43]">{employee.workLocation}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">الدرجة المالية وتاريخها</span>
                <span className="font-black text-[#164E83]">{employee.financialGrade} ({formatDateArabic(employee.gradeAcquisitionDate)})</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">الأجر الوظيفي / المكمل المعتمد</span>
                <span className="num-cell font-black text-emerald-800">
                  {formatArabicCurrency(employee.approvedFunctionalWageEgp)} / {formatArabicCurrency(employee.supplementaryWageEgp)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">رقم الملف الورقي وقرار التعيين</span>
                <span className="font-black text-[#102A43]">{employee.personnelFileNumber} · {employee.appointmentDecisionNumber}</span>
              </div>
            </div>
          )}

          {activeTab === 'qualifications' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold block">المؤهل الدراسي والتخصص</span>
                <p className="font-black text-[#102A43] text-sm">{employee.qualificationDegree} — {employee.specialization}</p>
                <p className="text-slate-600 font-bold">{employee.educationalInstitution} (دفعة {toArabicNumerals(employee.graduationYear)})</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold block">الدورات التدريبية والخبرات السابقة</span>
                <p className="font-black text-[#102A43]">{employee.trainingCourses}</p>
                <p className="text-slate-600 font-bold">{employee.previousExperience}</p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {isHrAdminOrSupervisor && (
                <form onSubmit={handleAddServiceDecision} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                  <div>
                    <label className="block font-black text-[#102A43] mb-1">نوع القرار</label>
                    <select value={decisionCat} onChange={(e) => setDecisionCat(e.target.value as HrServiceActionCategory)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black bg-white">
                      <option value="قرارات التعيين">قرارات التعيين</option>
                      <option value="النقل">النقل</option>
                      <option value="الندب">الندب</option>
                      <option value="الإعارة">الإعارة</option>
                      <option value="الترقية">الترقية</option>
                      <option value="تغيير المسمى الوظيفي">تغيير المسمى الوظيفي</option>
                      <option value="تغيير الإدارة">تغيير الإدارة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-black text-[#102A43] mb-1">رقم القرار *</label>
                    <input type="text" required value={decisionNumber} onChange={(e) => setDecisionNumber(e.target.value)} placeholder="ق-٢٠٢٦/١١٢" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white" />
                  </div>
                  <div>
                    <label className="block font-black text-[#102A43] mb-1">تاريخ القرار</label>
                    <input type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white" />
                  </div>
                  <div>
                    <label className="block font-black text-[#102A43] mb-1">الوضع الجديد *</label>
                    <input type="text" required value={decisionNewVal} onChange={(e) => setDecisionNewVal(e.target.value)} placeholder="الوصف الجديد..." className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white" />
                  </div>
                  <button type="submit" className="px-3 py-2 rounded-lg bg-[#102A43] text-[#C6A15B] font-black flex items-center justify-center gap-1 cursor-pointer">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>إضافة دون استبدال</span>
                  </button>
                </form>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#102A43] text-white">
                      <th className="p-2 border border-slate-300">الفئة</th>
                      <th className="p-2 border border-slate-300">رقم وتاريخ القرار</th>
                      <th className="p-2 border border-slate-300">الوضع السابق</th>
                      <th className="p-2 border border-slate-300">الوضع الجديد</th>
                      <th className="p-2 border border-slate-300">الجهة المصدرة</th>
                      <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empHistory.map((h) => (
                      <tr key={h.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-200 font-black text-[#164E83]">{h.actionCategory}</td>
                        <td className="p-2 border border-slate-200 num-cell font-bold">{h.decisionNumber} ({formatDateArabic(h.decisionDate)})</td>
                        <td className="p-2 border border-slate-200 text-slate-600 font-bold">{h.previousValue}</td>
                        <td className="p-2 border border-slate-200 font-black text-[#102A43]">{h.newValue}</td>
                        <td className="p-2 border border-slate-200 font-bold">{h.issuingAuthority}</td>
                        <td className="p-2 border border-slate-200 text-center">
                          <button type="button" onClick={() => window.print()} className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer">طباعة</button>
                        </td>
                      </tr>
                    ))}
                    {empHistory.length === 0 && (
                      <tr><td colSpan={6} className="p-4 text-center text-slate-500 font-bold">لا توجد حركات تدرج وظيفي مسجلة بعد.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === 'attendance' || activeTab === 'delays') && (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">التاريخ</th>
                    <th className="p-2 border border-slate-300 text-center">الحضور الفعلي</th>
                    <th className="p-2 border border-slate-300 text-center">الانصراف الفعلي</th>
                    <th className="p-2 border border-slate-300 text-center">التأخير (دقيقة)</th>
                    <th className="p-2 border border-slate-300 text-center">انصراف مبكر</th>
                    <th className="p-2 border border-slate-300 text-center">الحالة</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'delays' ? empDelays : empAttendance).map((a) => (
                    <tr key={a.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 num-cell font-black">{formatDateArabic(a.date)}</td>
                      <td className="p-2 border border-slate-200 text-center num-cell">{toArabicNumerals(a.actualCheckIn || '—')}</td>
                      <td className="p-2 border border-slate-200 text-center num-cell">{toArabicNumerals(a.actualCheckOut || '—')}</td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black text-red-700">{toArabicNumerals(a.delayMinutes)}</td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black text-amber-700">{toArabicNumerals(a.earlyLeaveMinutes)}</td>
                      <td className="p-2 border border-slate-200 text-center font-black">{a.dayStatus}</td>
                      <td className="p-2 border border-slate-200 text-center">
                        <button type="button" onClick={() => onNotify(`سجل حضور ${formatDateArabic(a.date)}: ${a.needsHumanReview ? 'مرصود للمراجعة البشرية دون جزاء تلقائي' : 'منتظم'}`)} className="px-2 py-1 rounded bg-slate-100 text-[#102A43] text-[10px] font-black cursor-pointer">معاينة</button>
                      </td>
                    </tr>
                  ))}
                  {(activeTab === 'delays' ? empDelays : empAttendance).length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-slate-500 font-bold">لا توجد سجلات مطابقة.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'leaves' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">رقم الطلب</th>
                    <th className="p-2 border border-slate-300">النوع</th>
                    <th className="p-2 border border-slate-300">الفترة</th>
                    <th className="p-2 border border-slate-300 text-center">المدة</th>
                    <th className="p-2 border border-slate-300">القائم بالعمل</th>
                    <th className="p-2 border border-slate-300 text-center">الحالة</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {empLeaves.map((l) => (
                    <tr key={l.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 num-cell font-black text-[#164E83]">{l.requestNumber}</td>
                      <td className="p-2 border border-slate-200 font-black">{l.leaveType}</td>
                      <td className="p-2 border border-slate-200 num-cell">{formatDateArabic(l.startDate)} — {formatDateArabic(l.endDate)}</td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black">{toArabicNumerals(l.daysCount)} يوم</td>
                      <td className="p-2 border border-slate-200 font-bold">{l.substituteEmployeeName}</td>
                      <td className="p-2 border border-slate-200 text-center font-black">{l.status}</td>
                      <td className="p-2 border border-slate-200 text-center">
                        <button type="button" onClick={() => window.print()} className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer">طباعة</button>
                      </td>
                    </tr>
                  ))}
                  {empLeaves.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-slate-500 font-bold">لا توجد إجازات مسجلة.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'penalties' && (
            <div className="space-y-3">
              <h5 className="font-black text-[#102A43]">الإنذارات ({toArabicNumerals(empWarnings.length)}) والجزاءات المعتمدة ({toArabicNumerals(empPenalties.length)})</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#102A43] text-white">
                      <th className="p-2 border border-slate-300">المرجع / القرار</th>
                      <th className="p-2 border border-slate-300">النوع / الوصف</th>
                      <th className="p-2 border border-slate-300">التاريخ والجهة</th>
                      <th className="p-2 border border-slate-300">الحالة / التظلم</th>
                      <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empWarnings.map((w) => (
                      <tr key={w.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-200 num-cell font-black text-amber-800">{w.warningNumber}</td>
                        <td className="p-2 border border-slate-200 font-bold">إنذار ({w.incidentType}): {w.incidentDescription}</td>
                        <td className="p-2 border border-slate-200 num-cell">{formatDateArabic(w.issueDate)} · {w.issuingAuthority}</td>
                        <td className="p-2 border border-slate-200 font-black">{w.status}</td>
                        <td className="p-2 border border-slate-200 text-center">
                          <button type="button" onClick={() => window.print()} className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer">طباعة</button>
                        </td>
                      </tr>
                    ))}
                    {empPenalties.map((p) => (
                      <tr key={p.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-200 num-cell font-black text-red-800">{p.decisionNumber}</td>
                        <td className="p-2 border border-slate-200 font-bold">{p.penaltyType} ({p.penaltyDurationOrValue})</td>
                        <td className="p-2 border border-slate-200 num-cell">{formatDateArabic(p.decisionDate)} · {p.competentAuthority}</td>
                        <td className="p-2 border border-slate-200 font-black">{p.grievanceStatus}</td>
                        <td className="p-2 border border-slate-200 text-center">
                          <button type="button" onClick={() => window.print()} className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer">طباعة</button>
                        </td>
                      </tr>
                    ))}
                    {empWarnings.length === 0 && empPenalties.length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-emerald-700 font-black">سجل نظيف: لا توجد إنذارات أو جزاءات.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'secondments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">رقم الإعارة / القرار</th>
                    <th className="p-2 border border-slate-300">الجهة المعار إليها</th>
                    <th className="p-2 border border-slate-300">الفترة</th>
                    <th className="p-2 border border-slate-300 text-center">الحالة</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {empSecondments.map((s) => (
                    <tr key={s.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 num-cell font-black">{s.secondmentNumber} / {s.decisionNumber}</td>
                      <td className="p-2 border border-slate-200 font-bold">{s.hostEntity}</td>
                      <td className="p-2 border border-slate-200 num-cell">{formatDateArabic(s.startDate)} — {formatDateArabic(s.endDate)}</td>
                      <td className="p-2 border border-slate-200 text-center font-black">{s.status}</td>
                      <td className="p-2 border border-slate-200 text-center">
                        <button type="button" onClick={() => window.print()} className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer">طباعة</button>
                      </td>
                    </tr>
                  ))}
                  {empSecondments.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-500 font-bold">لا توجد إعارات مسجلة.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">الرقم</th>
                    <th className="p-2 border border-slate-300">النوع</th>
                    <th className="p-2 border border-slate-300">الفترة</th>
                    <th className="p-2 border border-slate-300 text-center">الحالة</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {empContracts.map((c) => (
                    <tr key={c.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 num-cell font-black">{c.contractNumber}</td>
                      <td className="p-2 border border-slate-200 font-bold">{c.contractType}</td>
                      <td className="p-2 border border-slate-200 num-cell">{formatDateArabic(c.contractStartDate)} — {formatDateArabic(c.contractEndDate)}</td>
                      <td className="p-2 border border-slate-200 text-center font-black">{c.status}</td>
                      <td className="p-2 border border-slate-200 text-center">
                        <button type="button" onClick={() => window.print()} className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer">طباعة</button>
                      </td>
                    </tr>
                  ))}
                  {empRenewals.map((r) => (
                    <tr key={r.id} className="border-b border-slate-200 bg-blue-50/30">
                      <td className="p-2 border border-slate-200 num-cell font-black text-[#164E83]">{r.requestNumber}</td>
                      <td className="p-2 border border-slate-200 font-bold">{r.requestType}</td>
                      <td className="p-2 border border-slate-200 num-cell">{formatDateArabic(r.requestedEffectiveStartDate)} — {formatDateArabic(r.requestedNewEndDate)}</td>
                      <td className="p-2 border border-slate-200 text-center font-black">{r.workflowStatus}</td>
                      <td className="p-2 border border-slate-200 text-center">
                        <button type="button" onClick={() => window.print()} className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer">طباعة</button>
                      </td>
                    </tr>
                  ))}
                  {empContracts.length === 0 && empRenewals.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-500 font-bold">لا توجد عقود أو طلبات تجديد مسجلة.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">الكود</th>
                    <th className="p-2 border border-slate-300">عنوان المستند</th>
                    <th className="p-2 border border-slate-300">النوع</th>
                    <th className="p-2 border border-slate-300 text-center">حالة التحقق</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {empDocs.map((d) => (
                    <tr key={d.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 num-cell font-black">{d.documentCode}</td>
                      <td className="p-2 border border-slate-200 font-black">{d.documentTitle}</td>
                      <td className="p-2 border border-slate-200 font-bold">{d.documentType}</td>
                      <td className="p-2 border border-slate-200 text-center font-black">{d.verificationStatus}</td>
                      <td className="p-2 border border-slate-200 text-center">
                        <button type="button" onClick={() => onNotify(`معاينة المرفق: ${d.attachmentName}`)} className="px-2 py-1 rounded bg-slate-100 text-[#102A43] text-[10px] font-black cursor-pointer">معاينة</button>
                      </td>
                    </tr>
                  ))}
                  {empDocs.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-500 font-bold">جميع المستندات الأساسية مكتملة ومؤرشفة ({employee.personnelFileNumber}).</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">الوقت</th>
                    <th className="p-2 border border-slate-300">المسؤول</th>
                    <th className="p-2 border border-slate-300">العملية</th>
                    <th className="p-2 border border-slate-300">التفاصيل</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {empAudits.map((a) => (
                    <tr key={a.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 num-cell">{formatDateArabic(a.timestamp, true)}</td>
                      <td className="p-2 border border-slate-200 font-black">{a.actorName}</td>
                      <td className="p-2 border border-slate-200 font-bold text-[#164E83]">{a.actionType}</td>
                      <td className="p-2 border border-slate-200 font-bold">{a.details}</td>
                      <td className="p-2 border border-slate-200 text-center">
                        <button type="button" onClick={() => onNotify(a.details)} className="px-2 py-1 rounded bg-slate-100 text-[#102A43] text-[10px] font-black cursor-pointer">تفاصيل</button>
                      </td>
                    </tr>
                  ))}
                  {empAudits.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-500 font-bold">لا توجد تعديلات مسجلة بعد.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
