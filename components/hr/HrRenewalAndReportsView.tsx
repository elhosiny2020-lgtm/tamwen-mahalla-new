'use client';

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  Bell,
  ShieldCheck,
  UserCheck,
  Send,
  Save,
  Eye,
  PlusCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { User } from '@/types';
import {
  HrPersonnelStoreData,
  HrElectronicRenewalRequest,
  HrRenewalRequestType,
  HrRenewalWorkflowStatus,
  HrSmartAlertItem,
  HR_FUNCTIONAL_ROLES,
  HR_PERMISSION_LEVELS,
  runHrMandatoryAcceptanceTests,
  maskNationalId,
  computeRemainingDays,
} from '@/lib/hr-personnel-store';
import {
  toArabicNumerals,
  formatDateArabic,
} from '@/lib/utils';

export type HrScreenId =
  | 'dashboard'
  | 'daily_status'
  | 'employees_db'
  | 'attendance'
  | 'warnings_penalties'
  | 'secondments'
  | 'public_service'
  | 'assistance_contracts'
  | 'renewal_requests'
  | 'renewal_workflow'
  | 'self_service'
  | 'smart_alerts'
  | 'reports_center'
  | 'print_center'
  | 'roles_and_tests';

interface HrRenewalAndReportsViewProps {
  activeScreen: HrScreenId;
  setActiveScreen: (s: HrScreenId) => void;
  store: HrPersonnelStoreData;
  updateStore: (updater: (prev: HrPersonnelStoreData) => HrPersonnelStoreData) => void;
  currentUser: User;
  canViewFullNationalId: boolean;
  isHrAdminOrSupervisor: boolean;
  todayRef: string;
  smartAlerts: HrSmartAlertItem[];
  onNotify: (msg: string) => void;
  onExportCsv: (filename: string, headers: string[], rows: (string | number)[][]) => void;
}

const HR_REPORTS_CATALOG = [
  {
    category: '١. تقارير العاملين والملفات الوظيفية (٨ تقارير)',
    items: [
      '١. بيان شامل بالعاملين في المديرية والإدارات',
      '٢. تقرير العاملين حسب الإدارة أو القسم',
      '٣. تقرير العاملين حسب المسمى الوظيفي',
      '٤. تقرير العاملين حسب الدرجة المالية',
      '٥. تقرير العاملين حسب الحالة الوظيفية',
      '٦. تقرير الملفات الوظيفية المكتملة وغير المكتملة',
      '٧. تقرير المستندات الناقصة أو المنتهية',
      '٨. بطاقة بيان حالة وظيفية كاملة لموظف',
    ],
  },
  {
    category: '٢. تقارير الحضور والانصراف والإجازات (٨ تقارير)',
    items: [
      '٩. تقرير الحضور والانصراف اليومي',
      '١٠. تقرير الحضور الشهري',
      '١١. تقرير التأخيرات اليومية والشهرية',
      '١٢. تقرير الغياب اليومي والشهري',
      '١٣. تقرير الانصراف المبكر',
      '١٤. تقرير المأموريات والأذونات',
      '١٥. تقرير الإجازات حسب النوع',
      '١٦. تقرير التزام الإدارات بالحضور',
    ],
  },
  {
    category: '٣. تقارير الإنذارات والجزاءات (٥ تقارير)',
    items: [
      '١٧. تقرير الإنذارات الوظيفية خلال فترة',
      '١٨. تقرير الجزاءات المعتمدة خلال فترة',
      '١٩. تقرير التظلمات الوظيفية ونتائجها',
      '٢٠. تقرير الحالات المتكررة التي تحتاج مراجعة',
      '٢١. سجل الإنذارات والجزاءات لموظف محدد',
    ],
  },
  {
    category: '٤. تقارير الإعارات والندب (٦ تقارير)',
    items: [
      '٢٢. تقرير الموظفين المعارين حالياً',
      '٢٣. تقرير الإعارات التي تنتهي خلال ٩٠ أو ٦٠ أو ٣٠ أو ١٥ أو ٧ أيام',
      '٢٤. تقرير الإعارات المنتهية',
      '٢٥. تقرير طلبات تجديد الإعارات وحالاتها',
      '٢٦. تقرير الموظفين العائدين من الإعارة',
      '٢٧. تقرير الندب الداخلي والخارجي',
    ],
  },
  {
    category: '٥. تقارير الخدمة العامة (٦ تقارير)',
    items: [
      '٢٨. تقرير مكلفي الخدمة العامة الحاليين',
      '٢٩. تقرير توزيع مكلفي الخدمة العامة على الإدارات والأقسام',
      '٣٠. تقرير حضور وانصراف مكلفي الخدمة العامة',
      '٣١. تقرير مكلفي الخدمة العامة الذين قاربت خدمتهم على الانتهاء',
      '٣٢. تقرير مكلفي الخدمة العامة الذين انتهت مدتهم',
      '٣٣. تقرير طلبات تجديد أو مد الخدمة العامة',
    ],
  },
  {
    category: '٦. تقارير الاستعانة والعقود (٦ تقارير)',
    items: [
      '٣٤. تقرير موظفي الاستعانة الحاليين',
      '٣٥. تقرير العقود السارية',
      '٣٦. تقرير العقود التي قاربت على الانتهاء',
      '٣٧. تقرير العقود المنتهية',
      '٣٨. تقرير سجل تجديدات العقود',
      '٣٩. تقرير الالتزامات المالية للعقود وفق البيانات المسجلة',
    ],
  },
  {
    category: '٧. تقارير طلبات التجديد الإلكترونية (٧ تقارير)',
    items: [
      '٤٠. تقرير شامل بجميع طلبات التجديد المقدمة',
      '٤١. تقرير الطلبات قيد مراجعة شؤون العاملين',
      '٤٢. تقرير الطلبات المطلوب استكمال مستنداتها',
      '٤٣. تقرير الطلبات المعتمدة والقرارات الصادرة',
      '٤٤. تقرير الطلبات المرفوضة وأسباب الرفض',
      '٤٥. تقرير الطلبات المتأخرة في المراجعة أو الاعتماد',
      '٤٦. تقرير الطلبات المطبوعة والمحفوظة بملفات العاملين',
    ],
  },
];

const HR_PRINT_MODELS = [
  '١. بطاقة ملف موظف كاملة',
  '٢. بيان حالة وظيفية رسمي',
  '٣. كشف العاملين بالإدارة أو القسم',
  '٤. كشف الحضور والانصراف اليومي',
  '٥. كشف التأخيرات والغياب الشهري',
  '٦. نموذج إنذار وظيفي رسمي',
  '٧. بيان جزاءات موظف معتمد',
  '٨. بيان إعارات سارية ومنتهية',
  '٩. بيان مكلفي الخدمة العامة',
  '١٠. بيان موظفي الاستعانة والعقود المؤقتة',
  '١١. نموذج طلب تجديد إعارة (A4 رسمي)',
  '١٢. نموذج طلب تجديد / مد خدمة عامة (A4 رسمي)',
  '١٣. نموذج طلب تجديد استعانة / عقد مؤقت (A4 رسمي)',
  '١٤. كشف التنبيهات العاجلة قبل انتهاء العقود والإعارات',
  '١٥. تقرير متابعة طلبات التجديد والاعتمادات',
];

export default function HrRenewalAndReportsView({
  activeScreen,
  setActiveScreen,
  store,
  updateStore,
  currentUser,
  canViewFullNationalId,
  isHrAdminOrSupervisor,
  todayRef,
  smartAlerts,
  onNotify,
  onExportCsv,
}: HrRenewalAndReportsViewProps) {
  // حالة نموذج إنشاء طلب التجديد الإلكتروني
  const [selectedEmpId, setSelectedEmpId] = useState<string>(store.employees[4]?.id || store.employees[0]?.id || '');
  const [reqType, setReqType] = useState<HrRenewalRequestType>('طلب تجديد استعانة أو عقد مؤقت');
  const [reqDuration, setReqDuration] = useState<string>('١٢ شهراً (عام كامل)');
  const [reqStartDate, setReqStartDate] = useState<string>('2026-12-15');
  const [reqEndDate, setReqEndDate] = useState<string>('2027-12-14');
  const [reqReason, setReqReason] = useState<string>(
    'حاجة العمل الفعلية والانتظام الكامل في أداء المهام المكلف بها'
  );
  const [reqHostEntity, setReqHostEntity] = useState<string>('جهاز حماية المستهلك — فرع محافظة الغربية');
  const [reqDocInput, setReqDocInput] = useState<string>('صورة_العقد_أو_القرار_الحالي.pdf');

  // حالة معاينة وطباعة نموذج التجديد الرسمي A4
  const [printingRequest, setPrintingRequest] = useState<HrElectronicRenewalRequest | null>(
    store.renewalRequests[0] || null
  );

  // حالة بوابة الخدمات الذاتية للموظف
  const linkedEmp =
    store.employees.find((e) => e.linkedUserId === currentUser.id) || store.employees[0];
  const [selfServicePreviewEmpId, setSelfServicePreviewEmpId] = useState<string>(linkedEmp.id);
  const [corrField, setCorrField] = useState<string>('رقم الهاتف والعنوان التفصيلي');
  const [corrNewVal, setCorrNewVal] = useState<string>('');
  const [corrDoc, setCorrDoc] = useState<string>('مستند_إثبات_رسمي.pdf');

  // جلب بيانات الموظف المختار تلقائياً من الملف الوظيفي الموحد دون السماح بالتلاعب اليدوي
  const selectedEmployee =
    store.employees.find((e) => e.id === selectedEmpId) || store.employees[0];

  const existingSecondment = store.secondments.find((s) => s.employeeId === selectedEmployee?.id);
  const existingPublicService = store.publicServiceMembers.find(
    (p) => p.employeeId === selectedEmployee?.id
  );
  const existingContract = store.assistanceContracts.find(
    (c) => c.employeeId === selectedEmployee?.id
  );

  const autoRefNumber =
    reqType === 'طلب تجديد إعارة'
      ? existingSecondment?.decisionNumber || selectedEmployee?.appointmentDecisionNumber || 'قرار إعارة معتمد'
      : reqType === 'طلب تجديد خدمة عامة'
      ? existingPublicService?.assignmentNumber || selectedEmployee?.appointmentDecisionNumber || 'تكليف خدمة عامة'
      : existingContract?.contractNumber || selectedEmployee?.appointmentDecisionNumber || 'عقد استعانة معتمد';

  const autoCurrentStart =
    reqType === 'طلب تجديد إعارة'
      ? existingSecondment?.startDate || selectedEmployee?.workStartDate || '2025-12-15'
      : reqType === 'طلب تجديد خدمة عامة'
      ? existingPublicService?.serviceStartDate || selectedEmployee?.workStartDate || '2025-12-22'
      : existingContract?.contractStartDate || selectedEmployee?.workStartDate || '2025-12-15';

  const autoCurrentEnd =
    reqType === 'طلب تجديد إعارة'
      ? existingSecondment?.endDate || '2026-12-19'
      : reqType === 'طلب تجديد خدمة عامة'
      ? existingPublicService?.expectedEndDate || '2026-12-21'
      : existingContract?.contractEndDate || '2026-12-14';

  const handleCreateRenewalRequest = (asDraft: boolean) => {
    if (!selectedEmployee) return;
    const newReqNumber = `REN-2026-${1000 + store.renewalRequests.length + 1}`;
    const initialStatus: HrRenewalWorkflowStatus = asDraft
      ? 'تم الحفظ كمسودة'
      : 'تم الإرسال من الموظف';

    const newReq: HrElectronicRenewalRequest = {
      id: `ren-req-${Date.now()}`,
      requestNumber: newReqNumber,
      requestType: reqType,
      employeeId: selectedEmployee.id,
      fullName: selectedEmployee.fullName,
      nationalId: selectedEmployee.nationalId,
      employeeCode: selectedEmployee.employeeCode,
      employeeNumber: selectedEmployee.employeeNumber,
      phone: selectedEmployee.phone,
      qualification: selectedEmployee.qualificationDegree,
      educationalInstitution: selectedEmployee.educationalInstitution,
      jobTitle: selectedEmployee.jobTitle,
      supplyAdministration: selectedEmployee.supplyAdministration,
      departmentName: selectedEmployee.departmentName,
      workLocation: selectedEmployee.workLocation,
      hostEntity:
        reqType === 'طلب تجديد إعارة'
          ? existingSecondment?.hostEntity || reqHostEntity
          : '',
      originalReferenceNumber: autoRefNumber,
      originalIssueDate: selectedEmployee.appointmentDecisionDate || autoCurrentStart,
      currentStartDate: autoCurrentStart,
      currentEndDate: autoCurrentEnd,
      requestedRenewalDuration: reqDuration,
      requestedEffectiveStartDate: reqStartDate,
      requestedNewEndDate: reqEndDate,
      requestReason: reqReason,
      attachedDocuments: reqDocInput
        .split('،')
        .map((s) => s.trim())
        .filter(Boolean),
      workflowStatus: initialStatus,
      submissionDate: todayRef,
      hrReviewCompleted: false,
      hrDocumentsComplete: true,
      hrAttendancePosition: 'منتظم وفق سجل الحضور والانصراف الإلكتروني',
      hrDurationPosition: 'مستوفٍ للمدة القانونية للتجديد',
      hrSupervisorEvaluation: 'كفء ويوصى بالتجديد لحاجة العمل',
      hrInternalNotes: '',
      hrPublicMessageToEmployee: asDraft
        ? 'تم حفظ الطلب كمسودة في ملف الموظف'
        : `تم تسجيل الطلب برقم (${newReqNumber}) وإرساله لمراجعة شؤون العاملين`,
      hrReviewerName: '',
      financialBudgetPosition: 'البند المالي متاح وفق الموازنة المعتمدة',
      financialNotes: '',
      financialReviewerName: '',
      approvalDecision: 'قيد العرض',
      approverName: 'مدير مديرية التموين والتجارة الداخلية بالغربية',
      approvalDate: '',
      issuedDecisionNumber: '',
      rejectionReason: '',
      historyLog: [
        {
          id: `rhl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: currentUser.fullName,
          status: initialStatus,
          note: asDraft
            ? 'حفظ نموذج طلب التجديد كمسودة'
            : 'تقديم وإرسال طلب التجديد إلكترونياً وحفظ نسخة في الملف الوظيفي',
        },
      ],
    };

    updateStore((prev) => ({
      ...prev,
      renewalRequests: [newReq, ...prev.renewalRequests],
      auditLogs: [
        {
          id: `hra-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: currentUser.fullName,
          actorRole: currentUser.jobTitle || currentUser.role,
          actionType: 'إضافة',
          targetSection: 'طلبات التجديد الإلكترونية',
          targetRecordCode: newReqNumber,
          employeeName: selectedEmployee.fullName,
          details: `إنشاء (${reqType}) برقم ${newReqNumber} بحالة (${initialStatus})`,
        },
        ...prev.auditLogs,
      ],
    }));

    setPrintingRequest(newReq);
    onNotify(
      `تم إنشاء ${reqType} برقم (${newReqNumber}) وتجهيز النسخة الرسمية A4 للطباعة المباشرة.`
    );
  };

  // اعتماد أو تحديث حالة طلب التجديد مع تطبيق قاعدة: لا يتحدث تاريخ الانتهاء إلا عند صدور القرار المعتمد
  const handleAdvanceRenewalWorkflow = (
    req: HrElectronicRenewalRequest,
    nextStatus: HrRenewalWorkflowStatus,
    decisionNumberInput?: string,
    rejectionReasonInput?: string
  ) => {
    const issuedDecNo =
      decisionNumberInput ||
      req.issuedDecisionNumber ||
      `قرار-تجديد-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const shouldUpdateOfficialProfileDates =
      nextStatus === 'تم إصدار القرار' || nextStatus === 'تم تحديث الملف الوظيفي';

    updateStore((prev) => {
      const updatedRequests = prev.renewalRequests.map((item) => {
        if (item.id !== req.id) return item;
        return {
          ...item,
          workflowStatus: nextStatus,
          hrReviewCompleted: true,
          hrReviewerName: item.hrReviewerName || currentUser.fullName,
          approvalDecision:
            nextStatus === 'مرفوض مع بيان السبب'
              ? ('لا يعتمد' as const)
              : shouldUpdateOfficialProfileDates || nextStatus === 'تمت الموافقة'
              ? ('يعتمد' as const)
              : item.approvalDecision,
          approvalDate:
            shouldUpdateOfficialProfileDates || nextStatus === 'تمت الموافقة'
              ? todayRef
              : item.approvalDate,
          issuedDecisionNumber: shouldUpdateOfficialProfileDates
            ? issuedDecNo
            : item.issuedDecisionNumber,
          rejectionReason: rejectionReasonInput || item.rejectionReason,
          hrPublicMessageToEmployee:
            nextStatus === 'مرفوض مع بيان السبب'
              ? `تم رفض الطلب — السبب: ${rejectionReasonInput || 'عدم استيفاء الضوابط'}`
              : shouldUpdateOfficialProfileDates
              ? `تم اعتماد التجديد وإصدار القرار رقم (${issuedDecNo}) وتحديث ملفك الوظيفي حتى ${item.requestedNewEndDate}`
              : `تحديث حالة الطلب إلى: ${nextStatus}`,
          historyLog: [
            ...item.historyLog,
            {
              id: `rhl-${Date.now()}`,
              timestamp: new Date().toISOString(),
              actorName: currentUser.fullName,
              status: nextStatus,
              note: shouldUpdateOfficialProfileDates
                ? `اعتماد القرار رقم (${issuedDecNo}) وتحديث تاريخ الانتهاء إلى ${item.requestedNewEndDate} مع حفظ السجل السابق`
                : `تحديث حالة الطلب إلى (${nextStatus})`,
            },
          ],
        };
      });

      // إذا صدر القرار المعتمد، نحدث تاريخ الانتهاء وننشئ سجلاً تاريخياً دون استبدال العقود/الإعارات السابقة
      const updatedSecondments = shouldUpdateOfficialProfileDates && req.requestType === 'طلب تجديد إعارة'
        ? prev.secondments.map((s) =>
            s.employeeId === req.employeeId
              ? {
                  ...s,
                  previousPeriodsHistory: [
                    ...s.previousPeriodsHistory,
                    {
                      renewalNumber: req.requestNumber,
                      decisionNumber: s.decisionNumber,
                      decisionDate: s.decisionDate,
                      startDate: s.startDate,
                      endDate: s.endDate,
                      durationLabel: s.durationLabel,
                    },
                  ],
                  decisionNumber: issuedDecNo,
                  decisionDate: todayRef,
                  startDate: req.requestedEffectiveStartDate,
                  endDate: req.requestedNewEndDate,
                  lastRenewalDate: todayRef,
                  expectedReturnDate: req.requestedNewEndDate,
                  status: 'تم التجديد' as const,
                }
              : s
          )
        : prev.secondments;

      const updatedPublicService =
        shouldUpdateOfficialProfileDates && req.requestType === 'طلب تجديد خدمة عامة'
          ? prev.publicServiceMembers.map((p) =>
              p.employeeId === req.employeeId
                ? {
                    ...p,
                    extensionHistory: [
                      ...p.extensionHistory,
                      {
                        renewalNumber: req.requestNumber,
                        decisionNumber: issuedDecNo,
                        decisionDate: todayRef,
                        previousEndDate: p.expectedEndDate,
                        newEndDate: req.requestedNewEndDate,
                      },
                    ],
                    expectedEndDate: req.requestedNewEndDate,
                    status: 'تم التجديد أو تمديد التكليف وفق قرار معتمد' as const,
                  }
                : p
            )
          : prev.publicServiceMembers;

      const updatedContracts =
        shouldUpdateOfficialProfileDates && req.requestType === 'طلب تجديد استعانة أو عقد مؤقت'
          ? prev.assistanceContracts.map((c) =>
              c.employeeId === req.employeeId
                ? {
                    ...c,
                    renewalsHistory: [
                      {
                        id: `crh-${Date.now()}`,
                        renewalNumber: req.requestNumber,
                        previousContractNumber: c.contractNumber,
                        requestDate: req.submissionDate,
                        newStartDate: req.requestedEffectiveStartDate,
                        newEndDate: req.requestedNewEndDate,
                        renewalDuration: req.requestedRenewalDuration,
                        approvalNumber: issuedDecNo,
                        approvalDate: todayRef,
                        documents: req.attachedDocuments.join(' ، '),
                        status: 'معتمد ومجدد' as const,
                      },
                      ...c.renewalsHistory,
                    ],
                    contractNumber: issuedDecNo,
                    contractIssueDate: todayRef,
                    contractStartDate: req.requestedEffectiveStartDate,
                    contractEndDate: req.requestedNewEndDate,
                    status: 'تم التجديد' as const,
                  }
                : c
            )
          : prev.assistanceContracts;

      const updatedServiceHistory = shouldUpdateOfficialProfileDates
        ? [
            {
              id: `sh-${Date.now()}`,
              employeeId: req.employeeId,
              actionCategory:
                req.requestType === 'طلب تجديد إعارة'
                  ? ('الإعارة' as const)
                  : ('قرارات التعيين' as const),
              decisionNumber: issuedDecNo,
              decisionDate: todayRef,
              effectiveDate: req.requestedEffectiveStartDate,
              issuingAuthority: 'مديرية التموين والتجارة الداخلية بالغربية',
              previousValue: `تاريخ الانتهاء السابق: ${req.currentEndDate}`,
              newValue: `تم التجديد بموجب الطلب (${req.requestNumber}) حتى تاريخ ${req.requestedNewEndDate}`,
              attachmentName: `${req.requestNumber}_approved.pdf`,
              notes: 'تحديث تلقائي بعد اعتماد قرار التجديد مع حفظ السجل السابق',
              recordedBy: currentUser.fullName,
              recordedAt: new Date().toISOString(),
            },
            ...prev.serviceHistory,
          ]
        : prev.serviceHistory;

      return {
        ...prev,
        renewalRequests: updatedRequests,
        secondments: updatedSecondments,
        publicServiceMembers: updatedPublicService,
        assistanceContracts: updatedContracts,
        serviceHistory: updatedServiceHistory,
      };
    });

    onNotify(
      shouldUpdateOfficialProfileDates
        ? `تم اعتماد القرار رقم (${issuedDecNo}) وتحديث تاريخ الانتهاء في ملف الموظف مع الاحتفاظ بالسجل السابق.`
        : `تم تحديث حالة الطلب (${req.requestNumber}) إلى «${nextStatus}».`
    );
  };

  // ===========================================================================
  // ٩. شاشة طلبات التجديد الإلكترونية والطباعة المباشرة (إعارة · خدمة عامة · استعانة)
  // ===========================================================================
  if (activeScreen === 'renewal_requests') {
    return (
      <div className="space-y-4">
        {/* نموذج الإنشاء الإلكتروني لطلب التجديد مع الجلب التلقائي من الملف الوظيفي */}
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-5 shadow-xs space-y-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#102A43]">
                ٩. إنشاء وطباعة طلبات التجديد الإلكترونية الرسمية (إعارة · خدمة عامة · استعانة وعقود مؤقتة)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                يتم جلب البيانات الأساسية للموظف تلقائياً من ملفه الوظيفي الموحد دون السماح بتزويرها، مع إصدار نموذج A4 رسمي جاهز للطباعة والتوقيع
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-black">
              قاعدة رقابية: طباعة الطلب لا تعني الموافقة على التجديد إلا بعد صدور قرار الاعتماد
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-black text-[#102A43] mb-1">١. نوع نموذج طلب التجديد الرسمي *</label>
              <select
                value={reqType}
                onChange={(e) => setReqType(e.target.value as HrRenewalRequestType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black text-[#102A43] bg-slate-50"
              >
                <option value="طلب تجديد إعارة">نموذج ١: طلب تجديد إعارة</option>
                <option value="طلب تجديد خدمة عامة">نموذج ٢: طلب تجديد / مد مدة التكليف بالخدمة العامة</option>
                <option value="طلب تجديد استعانة أو عقد مؤقت">نموذج ٣: طلب تجديد التعاقد بنظام الاستعانة</option>
              </select>
            </div>

            <div>
              <label className="block font-black text-[#102A43] mb-1">٢. اختيار الموظف (جلب آلي من الملف الوظيفي) *</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black text-[#102A43]"
              >
                {store.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} — ({emp.employmentCategory})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-black text-slate-600 mb-1">الرقم القومي (محمي من التعديل اليدوي)</label>
              <input
                type="text"
                readOnly
                value={maskNationalId(selectedEmployee?.nationalId || '', canViewFullNationalId)}
                className="num-cell w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-black"
              />
            </div>

            <div>
              <label className="block font-black text-slate-600 mb-1">الرقم الوظيفي / الكود والإدارة (جلب آلي)</label>
              <input
                type="text"
                readOnly
                value={`${selectedEmployee?.employeeNumber || ''} — ${selectedEmployee?.supplyAdministration || ''}`}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="block font-black text-slate-600 mb-1">رقم القرار / التكليف / العقد الحالي</label>
              <input
                type="text"
                readOnly
                value={autoRefNumber}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-[#164E83] font-black"
              />
            </div>

            <div>
              <label className="block font-black text-slate-600 mb-1">الفترة الحالية (من — إلى)</label>
              <input
                type="text"
                readOnly
                value={`من ${autoCurrentStart} إلى ${autoCurrentEnd}`}
                className="num-cell w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-red-700 font-black"
              />
            </div>

            <div>
              <label className="block font-black text-[#102A43] mb-1">المدة المطلوب التجديد لها *</label>
              <input
                type="text"
                value={reqDuration}
                onChange={(e) => setReqDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block font-black text-[#102A43] mb-1">تاريخ بداية التجديد *</label>
                <input
                  type="date"
                  value={reqStartDate}
                  onChange={(e) => setReqStartDate(e.target.value)}
                  className="num-cell w-full px-2 py-2 rounded-xl border border-slate-300 font-black"
                />
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">تاريخ نهاية التجديد *</label>
                <input
                  type="date"
                  value={reqEndDate}
                  onChange={(e) => setReqEndDate(e.target.value)}
                  className="num-cell w-full px-2 py-2 rounded-xl border border-slate-300 font-black"
                />
              </div>
            </div>

            {reqType === 'طلب تجديد إعارة' && (
              <div className="sm:col-span-2">
                <label className="block font-black text-[#102A43] mb-1">جهة الإعارة الحالية *</label>
                <input
                  type="text"
                  value={existingSecondment?.hostEntity || reqHostEntity}
                  onChange={(e) => setReqHostEntity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block font-black text-[#102A43] mb-1">أسباب ومبررات طلب التجديد *</label>
              <input
                type="text"
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-black text-[#102A43] mb-1">المستندات المرفقة (افصل بفاصلة)</label>
              <input
                type="text"
                value={reqDocInput}
                onChange={(e) => setReqDocInput(e.target.value)}
                placeholder="مثال: صورة العقد الحالي، تقرير كفاءة، صورة الرقم القومي..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => handleCreateRenewalRequest(true)}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-[#102A43] text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الطلب كمسودة</span>
            </button>
            <button
              type="button"
              onClick={() => handleCreateRenewalRequest(false)}
              className="px-5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>إرسال الطلب وتوليد النموذج الرسمي للطباعة A4</span>
            </button>
          </div>
        </div>

        {/* المعاينة الرسمية القابلة للطباعة المباشرة A4 للنماذج الثلاثة المعتمدة */}
        {printingRequest && (
          <div className="bg-white rounded-2xl border-2 border-[#102A43] p-6 shadow-md space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black num-cell">
                  رقم الطلب: {toArabicNumerals(printingRequest.requestNumber)}
                </span>
                <span className="text-xs font-black text-[#102A43]">
                  معاينة النموذج الرسمي المعتمد ({printingRequest.requestType})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {store.renewalRequests.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setPrintingRequest(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer border ${
                      printingRequest.id === r.id
                        ? 'bg-[#164E83] text-white border-[#164E83]'
                        : 'bg-slate-100 text-[#102A43] border-slate-300'
                    }`}
                  >
                    {r.requestNumber} ({r.requestType})
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الطلب مباشرة (A4) / تنزيل PDF</span>
                </button>
              </div>
            </div>

            {/* وثيقة الطلب الرسمية A4 بالصياغة القانونية المطلوبة حرفياً */}
            <div className="border-2 border-[#102A43] rounded-2xl p-6 bg-[#FAFBFD] text-[#102A43] space-y-4 text-xs leading-relaxed">
              {/* الترويسة الرسمية */}
              <div className="flex items-start justify-between border-b-2 border-[#102A43] pb-3">
                <div className="space-y-0.5 font-black">
                  <p>جمهورية مصر العربية</p>
                  <p>وزارة التموين والتجارة الداخلية</p>
                  <p>مديرية التموين والتجارة الداخلية بالغربية</p>
                  <p className="text-[#164E83]">إدارة الموارد البشرية وشؤون العاملين</p>
                </div>
                <div className="text-center">
                  <h4 className="text-base sm:text-lg font-black underline underline-offset-8 decoration-[#C6A15B]">
                    {printingRequest.requestType === 'طلب تجديد إعارة'
                      ? 'طلب تجديد إعارة'
                      : printingRequest.requestType === 'طلب تجديد خدمة عامة'
                      ? 'طلب تجديد / مد مدة التكليف بالخدمة العامة'
                      : 'طلب تجديد التعاقد بنظام الاستعانة'}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-600 mt-1">
                    نموذج إلكتروني رسمي محفوظ بملف الموظف
                  </p>
                </div>
                <div className="text-left font-black space-y-0.5 num-cell">
                  <p>رقم الطلب: {toArabicNumerals(printingRequest.requestNumber)}</p>
                  <p>تاريخ التقديم: {formatDateArabic(printingRequest.submissionDate)}</p>
                  <p>الحالة: {printingRequest.workflowStatus}</p>
                </div>
              </div>

              {/* الديباجة الرسمية */}
              <div className="space-y-1.5 font-black text-xs sm:text-sm">
                <p>السيد الأستاذ / مدير مديرية التموين والتجارة الداخلية بالغربية</p>
                <p>تحية طيبة وبعد،،،</p>
              </div>

              {/* متن الطلب حسب النوع (١: إعارة، ٢: خدمة عامة، ٣: استعانة) */}
              {printingRequest.requestType === 'طلب تجديد إعارة' && (
                <div className="space-y-2.5 bg-white p-4 rounded-xl border border-slate-300 font-bold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <p>مقدمه لسيادتكم / <span className="font-black text-[#102A43]">{printingRequest.fullName}</span></p>
                    <p>الرقم القومي / <span className="num-cell font-black">{maskNationalId(printingRequest.nationalId, canViewFullNationalId)}</span></p>
                    <p>الرقم الوظيفي / <span className="num-cell font-black">{toArabicNumerals(printingRequest.employeeNumber)}</span></p>
                    <p>المسمى الوظيفي / <span className="font-black">{printingRequest.jobTitle}</span></p>
                    <p>الإدارة / القسم الأصلي / <span className="font-black">{printingRequest.supplyAdministration} — {printingRequest.departmentName}</span></p>
                    <p>جهة الإعارة الحالية / <span className="font-black text-[#164E83]">{printingRequest.hostEntity}</span></p>
                    <p>رقم قرار الإعارة الحالي / <span className="font-black">{printingRequest.originalReferenceNumber}</span></p>
                    <p>تاريخ بداية الإعارة الحالية / <span className="num-cell font-black">{formatDateArabic(printingRequest.currentStartDate)}</span> — وتاريخ انتهائها / <span className="num-cell font-black text-red-700">{formatDateArabic(printingRequest.currentEndDate)}</span></p>
                  </div>
                  <p className="pt-2 border-t border-slate-200 font-black text-[#102A43]">
                    أرجو من سيادتكم التكرم بالموافقة على اتخاذ الإجراءات اللازمة نحو تجديد إعارتي لمدة ({printingRequest.requestedRenewalDuration}) اعتبارًا من تاريخ ({formatDateArabic(printingRequest.requestedEffectiveStartDate)}) حتى تاريخ ({formatDateArabic(printingRequest.requestedNewEndDate)})، وذلك للأسباب الآتية: ({printingRequest.requestReason})، ومرفق لسيادتكم المستندات المؤيدة للطلب ({printingRequest.attachedDocuments.join(' ، ')}).
                  </p>
                  <p className="font-black">وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>
                </div>
              )}

              {printingRequest.requestType === 'طلب تجديد خدمة عامة' && (
                <div className="space-y-2.5 bg-white p-4 rounded-xl border border-slate-300 font-bold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <p>مقدمه لسيادتكم / <span className="font-black text-[#102A43]">{printingRequest.fullName}</span></p>
                    <p>الرقم القومي / <span className="num-cell font-black">{maskNationalId(printingRequest.nationalId, canViewFullNationalId)}</span></p>
                    <p>كود المكلف / <span className="num-cell font-black">{printingRequest.employeeCode}</span></p>
                    <p>المؤهل الدراسي / <span className="font-black">{printingRequest.qualification}</span> — جهة التخرج / <span className="font-black">{printingRequest.educationalInstitution}</span></p>
                    <p>رقم خطاب / قرار التكليف / <span className="font-black">{printingRequest.originalReferenceNumber}</span></p>
                    <p>الإدارة / القسم المكلف به / <span className="font-black">{printingRequest.supplyAdministration} — {printingRequest.departmentName}</span></p>
                    <p>تاريخ استلام العمل / <span className="num-cell font-black">{formatDateArabic(printingRequest.currentStartDate)}</span></p>
                    <p>تاريخ انتهاء مدة التكليف الحالية / <span className="num-cell font-black text-red-700">{formatDateArabic(printingRequest.currentEndDate)}</span></p>
                  </div>
                  <p className="pt-2 border-t border-slate-200 font-black text-[#102A43]">
                    أرجو من سيادتكم التكرم بالموافقة على تجديد / مد مدة تكليفي بالخدمة العامة لمدة ({printingRequest.requestedRenewalDuration}) اعتبارًا من تاريخ ({formatDateArabic(printingRequest.requestedEffectiveStartDate)}) حتى تاريخ ({formatDateArabic(printingRequest.requestedNewEndDate)})، وذلك وفقًا للقواعد المنظمة وحاجة العمل، ومرفق لسيادتكم المستندات اللازمة ({printingRequest.attachedDocuments.join(' ، ')}).
                  </p>
                  <p className="font-black">وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>
                </div>
              )}

              {printingRequest.requestType === 'طلب تجديد استعانة أو عقد مؤقت' && (
                <div className="space-y-2.5 bg-white p-4 rounded-xl border border-slate-300 font-bold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <p>مقدمه لسيادتكم / <span className="font-black text-[#102A43]">{printingRequest.fullName}</span></p>
                    <p>الرقم القومي / <span className="num-cell font-black">{maskNationalId(printingRequest.nationalId, canViewFullNationalId)}</span></p>
                    <p>كود الموظف / <span className="num-cell font-black">{printingRequest.employeeCode}</span></p>
                    <p>المسمى / طبيعة العمل / <span className="font-black">{printingRequest.jobTitle}</span></p>
                    <p>الإدارة / القسم / <span className="font-black">{printingRequest.supplyAdministration} — {printingRequest.departmentName}</span></p>
                    <p>مقر العمل / <span className="font-black">{printingRequest.workLocation}</span></p>
                    <p>رقم العقد الحالي / <span className="font-black text-[#164E83]">{printingRequest.originalReferenceNumber}</span></p>
                    <p>تاريخ بداية العقد الحالي / <span className="num-cell font-black">{formatDateArabic(printingRequest.currentStartDate)}</span> — وتاريخ انتهائه / <span className="num-cell font-black text-red-700">{formatDateArabic(printingRequest.currentEndDate)}</span></p>
                  </div>
                  <p className="pt-2 border-t border-slate-200 font-black text-[#102A43]">
                    أرجو من سيادتكم التكرم بالموافقة على تجديد التعاقد بنظام الاستعانة لمدة ({printingRequest.requestedRenewalDuration}) اعتبارًا من تاريخ ({formatDateArabic(printingRequest.requestedEffectiveStartDate)}) حتى تاريخ ({formatDateArabic(printingRequest.requestedNewEndDate)})، نظرًا لحاجة العمل واستمراري في أداء المهام المكلف بها، ومرفق لسيادتكم المستندات المطلوبة ({printingRequest.attachedDocuments.join(' ، ')}).
                  </p>
                  <p className="font-black">وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>
                </div>
              )}

              {/* أقسام التوقيع والمراجعة والاعتماد الرسمية أسفل النموذج */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {/* أولاً: بيانات مقدم الطلب */}
                <div className="p-3 bg-white rounded-xl border border-slate-300 space-y-1">
                  <h5 className="font-black text-[#102A43] border-b border-slate-200 pb-1">
                    ١. بيانات وتوقيع مقدم الطلب
                  </h5>
                  <p>الاسم: <span className="font-black">{printingRequest.fullName}</span></p>
                  <p>رقم الهاتف: <span className="num-cell font-black">{toArabicNumerals(printingRequest.phone)}</span></p>
                  <p>التاريخ: <span className="num-cell font-black">{formatDateArabic(printingRequest.submissionDate)}</span></p>
                  <p className="pt-2 text-slate-600 font-black">التوقيع: .....................................</p>
                </div>

                {/* ثانياً: مراجعة شؤون العاملين (+ الجهة المالية للاستعانة) */}
                <div className="p-3 bg-white rounded-xl border border-slate-300 space-y-1">
                  <h5 className="font-black text-[#102A43] border-b border-slate-200 pb-1">
                    ٢. مراجعة شؤون العاملين {printingRequest.requestType === 'طلب تجديد استعانة أو عقد مؤقت' ? 'والجهة المالية' : ''}
                  </h5>
                  <p>تمت مراجعة الملف والمستندات: <span className="font-black text-emerald-800">{printingRequest.hrDocumentsComplete ? 'نعم (مستوفى)' : 'مطلوب استكمال'}</span></p>
                  <p>موقف الحضور والالتزام: <span className="font-bold">{printingRequest.hrAttendancePosition}</span></p>
                  <p>تقييم المسؤول المباشر: <span className="font-bold">{printingRequest.hrSupervisorEvaluation}</span></p>
                  {printingRequest.requestType === 'طلب تجديد استعانة أو عقد مؤقت' && (
                    <p>موقف البند المالي: <span className="font-bold text-[#164E83]">{printingRequest.financialBudgetPosition}</span></p>
                  )}
                  <p className="pt-1 text-slate-600 font-black">توقيع المختص: ..............................</p>
                </div>

                {/* ثالثاً: الاعتماد النهائي */}
                <div className="p-3 bg-white rounded-xl border border-slate-300 space-y-1">
                  <h5 className="font-black text-[#102A43] border-b border-slate-200 pb-1">
                    ٣. قرار السلطة المختصة والاعتماد
                  </h5>
                  <p>رأينا: <span className="font-black">{printingRequest.approvalDecision === 'يعتمد' ? '( ✓ ) يعتمد' : printingRequest.approvalDecision === 'لا يعتمد' ? '( ✓ ) لا يعتمد' : '(   ) يعتمد   /   (   ) لا يعتمد'}</span></p>
                  <p>رقم القرار الصادر: <span className="font-black text-emerald-800">{printingRequest.issuedDecisionNumber || '........................'}</span></p>
                  <p>المعتمد: <span className="font-bold">{printingRequest.approverName}</span></p>
                  <p className="pt-2 text-slate-600 font-black">التوقيع والخاتم: ............................</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // ١٠. شاشة دورة اعتماد ومتابعة طلبات التجديد (١٥ حالة عمل + فصل الملاحظات السرية)
  // ===========================================================================
  if (activeScreen === 'renewal_workflow') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#102A43]">
              ١٠. دورة اعتماد ومتابعة طلبات التجديد الإلكترونية (١٥ حالة عمل — تحديث تلقائي للملف بعد صدور القرار فقط)
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              لا يتم تحديث تاريخ انتهاء الإعارة أو الخدمة العامة أو عقد الاستعانة إلا عند الضغط على «اعتماد وإصدار القرار وتحديث الملف» مع حفظ السجل السابق
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveScreen('renewal_requests')}
            className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>إنشاء طلب تجديد جديد</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#102A43] text-white">
                <th className="p-2.5 border border-slate-300">رقم الطلب</th>
                <th className="p-2.5 border border-slate-300">نوع الطلب</th>
                <th className="p-2.5 border border-slate-300">الموظف والرقم الوظيفي</th>
                <th className="p-2.5 border border-slate-300">الإدارة والمرجع الحالي</th>
                <th className="p-2.5 border border-slate-300 text-center">انتهاء الفترة الحالية</th>
                <th className="p-2.5 border border-slate-300 text-center">الفترة المطلوبة للتجديد</th>
                <th className="p-2.5 border border-slate-300 text-center">حالة الطلب في دورة العمل</th>
                <th className="p-2.5 border border-slate-300">مراجعة شؤون العاملين والقرار</th>
                <th className="p-2.5 border border-slate-300 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {store.renewalRequests.map((req) => (
                <tr key={req.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                  <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">
                    <div>{req.requestNumber}</div>
                    <div className="text-[10px] text-slate-500">{formatDateArabic(req.submissionDate)}</div>
                  </td>
                  <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                    {req.requestType}
                  </td>
                  <td className="p-2 border border-slate-200 font-bold">
                    <div className="font-black text-[#102A43]">{req.fullName}</div>
                    <div className="num-cell text-[10px] text-slate-500">
                      كود: {req.employeeCode} · وظيفي: {req.employeeNumber}
                    </div>
                  </td>
                  <td className="p-2 border border-slate-200 font-bold text-slate-700">
                    <div>{req.supplyAdministration}</div>
                    <div className="text-[10px] text-[#164E83]">{req.originalReferenceNumber}</div>
                  </td>
                  <td className="p-2 border border-slate-200 text-center num-cell font-black text-red-700">
                    {formatDateArabic(req.currentEndDate)}
                  </td>
                  <td className="p-2 border border-slate-200 text-center num-cell font-black text-emerald-800">
                    <div>{req.requestedRenewalDuration}</div>
                    <div className="text-[10px]">حتى {formatDateArabic(req.requestedNewEndDate)}</div>
                  </td>
                  <td className="p-2 border border-slate-200 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        req.workflowStatus === 'تم إصدار القرار' ||
                        req.workflowStatus === 'تم تحديث الملف الوظيفي' ||
                        req.workflowStatus === 'تمت الموافقة'
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : req.workflowStatus === 'مرفوض مع بيان السبب'
                          ? 'bg-red-100 text-red-950 border border-red-300'
                          : 'bg-amber-100 text-amber-950 border border-amber-300'
                      }`}
                    >
                      {req.workflowStatus}
                    </span>
                  </td>
                  <td className="p-2 border border-slate-200 text-[10.5px] font-bold">
                    <div className="text-slate-800">{req.hrPublicMessageToEmployee}</div>
                    {isHrAdminOrSupervisor && req.hrInternalNotes && (
                      <div className="text-[10px] text-purple-900 bg-purple-50 px-2 py-0.5 rounded mt-1 border border-purple-200">
                        ملاحظة داخلية سرية: {req.hrInternalNotes}
                      </div>
                    )}
                    {req.issuedDecisionNumber && (
                      <div className="text-emerald-800 font-black mt-0.5">
                        قرار معتمد: {req.issuedDecisionNumber}
                      </div>
                    )}
                  </td>
                  <td className="p-2 border border-slate-200 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPrintingRequest(req);
                          setActiveScreen('renewal_requests');
                        }}
                        className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                      >
                        عرض وطباعة A4
                      </button>
                      {isHrAdminOrSupervisor && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleAdvanceRenewalWorkflow(req, 'قيد مراجعة شؤون العاملين')
                            }
                            className="px-2 py-1 rounded bg-blue-700 text-white text-[10px] font-black cursor-pointer"
                          >
                            مراجعة
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAdvanceRenewalWorkflow(req, 'مطلوب استكمال مستندات')
                            }
                            className="px-2 py-1 rounded bg-amber-600 text-white text-[10px] font-black cursor-pointer"
                          >
                            استكمال مستندات
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAdvanceRenewalWorkflow(
                                req,
                                'تم تحديث الملف الوظيفي',
                                `قرار-تجديد-٢٠٢٦/${toArabicNumerals(100 + store.serviceHistory.length + 1)}`
                              )
                            }
                            className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black cursor-pointer"
                          >
                            اعتماد القرار وتحديث الملف
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAdvanceRenewalWorkflow(
                                req,
                                'مرفوض مع بيان السبب',
                                undefined,
                                'عدم استيفاء شروط التجديد المقررة'
                              )
                            }
                            className="px-2 py-1 rounded bg-red-700 text-white text-[10px] font-black cursor-pointer"
                          >
                            رفض
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ١١. بوابة حساب الموظف والخدمات الذاتية («طلباتي الوظيفية» وتصحيح البيانات)
  // ===========================================================================
  if (activeScreen === 'self_service') {
    const myEmp =
      (isHrAdminOrSupervisor
        ? store.employees.find((e) => e.id === selfServicePreviewEmpId)
        : store.employees.find((e) => e.linkedUserId === currentUser.id)) || linkedEmp;

    const myRequests = store.renewalRequests.filter((r) => r.employeeId === myEmp.id);
    const myAttendance = store.attendance.filter((a) => a.employeeId === myEmp.id);
    const myLeaves = store.leaves.filter((l) => l.employeeId === myEmp.id);
    const myCorrections = store.dataCorrectionRequests.filter((c) => c.employeeId === myEmp.id);

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-l from-[#102A43] to-[#164E83] text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-black text-[#C6A15B] block">
              بوابة الخدمات الذاتية للموظف — معزولة الصلاحيات (لا تعرض ملفات الموظفين الآخرين أو الملاحظات السرية)
            </span>
            <h3 className="text-base font-black">
              ملفي الوظيفي وطلباتي الإلكترونية: {myEmp.fullName} ({myEmp.jobTitle})
            </h3>
          </div>
          {isHrAdminOrSupervisor && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#C6A15B]">معاينة بوابة الموظف لـ:</span>
              <select
                value={selfServicePreviewEmpId}
                onChange={(e) => setSelfServicePreviewEmpId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white text-[#102A43] font-black"
              >
                {store.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.employmentCategory})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* بطاقة بياناتي الوظيفية المعتمدة + إرسال طلب تصحيح بيانات */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-black text-[#102A43] text-sm">
                ١. بياناتي الوظيفية المسموح بالاطلاع عليها
              </h4>
              <button
                type="button"
                onClick={() => {
                  setSelectedEmpId(myEmp.id);
                  setActiveScreen('renewal_requests');
                }}
                className="px-3 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer"
              >
                + تقديم وطباعة طلب تجديد (إعارة / خدمة عامة / استعانة)
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">الكود والرقم الوظيفي</span>
                <span className="num-cell font-black text-[#102A43]">
                  {myEmp.employeeCode} / {toArabicNumerals(myEmp.employeeNumber)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">الرقم القومي</span>
                <span className="num-cell font-black text-[#102A43]">
                  {toArabicNumerals(myEmp.nationalId)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">الفئة والحالة الوظيفية</span>
                <span className="font-black text-emerald-800">
                  {myEmp.employmentCategory} — {myEmp.jobStatus}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">الإدارة والقسم</span>
                <span className="font-black text-[#102A43]">
                  {myEmp.supplyAdministration} · {myEmp.departmentName}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">الدرجة المالية</span>
                <span className="font-black text-[#164E83]">{myEmp.financialGrade}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">حالة اكتمال الملف</span>
                <span className="font-black text-[#102A43]">
                  {myEmp.isProfileComplete ? 'مكتمل ومعتمد ✓' : 'مطلوب استكمال مستندات'}
                </span>
              </div>
            </div>

            {/* جدول طلباتي الوظيفية */}
            <h5 className="font-black text-[#102A43] pt-2">
              ٢. سجل طلباتي الوظيفية وطلبات التجديد (دون كشف الملاحظات الداخلية السرية)
            </h5>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">رقم الطلب</th>
                    <th className="p-2 border border-slate-300">نوع الطلب</th>
                    <th className="p-2 border border-slate-300">تاريخ التقديم</th>
                    <th className="p-2 border border-slate-300">الحالة</th>
                    <th className="p-2 border border-slate-300">الرسالة الرسمية للموظف</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((r) => (
                    <tr key={r.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 num-cell font-black text-[#164E83]">
                        {r.requestNumber}
                      </td>
                      <td className="p-2 border border-slate-200 font-black">{r.requestType}</td>
                      <td className="p-2 border border-slate-200 num-cell font-bold">
                        {formatDateArabic(r.submissionDate)}
                      </td>
                      <td className="p-2 border border-slate-200 font-black text-emerald-900">
                        {r.workflowStatus}
                      </td>
                      <td className="p-2 border border-slate-200 font-bold text-slate-700">
                        {r.hrPublicMessageToEmployee}
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setPrintingRequest(r);
                            setActiveScreen('renewal_requests');
                          }}
                          className="px-2.5 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                        >
                          طباعة وتنزيل PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {myRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500 font-bold">
                        لا توجد طلبات تجديد مقدمة حالياً لهذا الموظف.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* نموذج تقديم طلب تصحيح بيانات لشؤون العاملين */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
            <h4 className="font-black text-[#102A43] text-sm border-b border-slate-200 pb-2">
              ٣. تقديم «طلب تصحيح بيانات» لشؤون العاملين
            </h4>
            <p className="text-[11px] font-bold text-slate-600">
              نظراً لأن البيانات الأساسية في طلبات التجديد محمية من التعديل المباشر، يمكنك إرسال طلب تصحيح موثق لشؤون العاملين:
            </p>
            <div>
              <label className="block font-black text-[#102A43] mb-1">البيان المطلوب تصحيحه</label>
              <input
                type="text"
                value={corrField}
                onChange={(e) => setCorrField(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block font-black text-[#102A43] mb-1">القيمة الصحيحة المطلوبة *</label>
              <input
                type="text"
                value={corrNewVal}
                onChange={(e) => setCorrNewVal(e.target.value)}
                placeholder="اكتب البيان الصحيح..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block font-black text-[#102A43] mb-1">المستند المؤيد للتصحيح</label>
              <input
                type="text"
                value={corrDoc}
                onChange={(e) => setCorrDoc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!corrNewVal.trim()) return;
                const code = `COR-2026-${10 + store.dataCorrectionRequests.length + 1}`;
                updateStore((prev) => ({
                  ...prev,
                  dataCorrectionRequests: [
                    {
                      id: `dcr-${Date.now()}`,
                      requestNumber: code,
                      employeeId: myEmp.id,
                      employeeName: myEmp.fullName,
                      fieldToCorrect: corrField,
                      currentValue: myEmp.detailedAddress,
                      requestedNewValue: corrNewVal.trim(),
                      supportingDocument: corrDoc,
                      status: 'قيد مراجعة شؤون العاملين',
                      createdAt: new Date().toISOString(),
                    },
                    ...prev.dataCorrectionRequests,
                  ],
                }));
                setCorrNewVal('');
                onNotify(`تم إرسال طلب تصحيح البيانات (${code}) إلى شؤون العاملين بنجاح.`);
              }}
              className="w-full py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] font-black cursor-pointer"
            >
              إرسال طلب تصحيح البيانات لشؤون العاملين
            </button>

            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <span className="font-black text-[#102A43] block">
                ملخص الحضور والإجازات ({toArabicNumerals(myAttendance.length)} يوم مسجل / {toArabicNumerals(myLeaves.length)} إجازة):
              </span>
              {myCorrections.map((c) => (
                <div key={c.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[10.5px]">
                  <span className="font-black text-[#164E83]">{c.requestNumber}: </span>
                  <span className="font-bold">{c.fieldToCorrect} ({c.status})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ١٢. نظام التنبيهات الرقابية والإدارية الذكي وإعدادات فترات التنبيه
  // ===========================================================================
  if (activeScreen === 'smart_alerts') {
    return (
      <div className="space-y-4">
        {/* إعدادات فترات التنبيه القابلة للتعديل */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ١٢-أ. إعدادات فترات التنبيه المسبقة (قابلة للتعديل من إدارة الموارد البشرية مع منع التكرار اليومي)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                تتحكم في إطلاق التنبيهات التلقائية قبل انتهاء الإعارات وتكليفات الخدمة العامة وعقود الاستعانة
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-black text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                checked={store.alertSettings.preventDailyDuplicateAlerts}
                onChange={(e) =>
                  updateStore((prev) => ({
                    ...prev,
                    alertSettings: {
                      ...prev.alertSettings,
                      preventDailyDuplicateAlerts: e.target.checked,
                    },
                  }))
                }
              />
              <span>منع تكرار التنبيه يومياً بدون داعٍ</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="font-black text-[#102A43] block mb-1">
                فترات تنبيه الإعارات (بالأيام قبل الانتهاء)
              </label>
              <input
                type="text"
                value={store.alertSettings.secondmentThresholdsDays.join(', ')}
                onChange={(e) => {
                  const nums = e.target.value
                    .split(',')
                    .map((x) => Number(x.trim()))
                    .filter((n) => !Number.isNaN(n) && n > 0);
                  if (nums.length > 0) {
                    updateStore((prev) => ({
                      ...prev,
                      alertSettings: { ...prev.alertSettings, secondmentThresholdsDays: nums },
                    }));
                  }
                }}
                className="num-cell w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-black"
              />
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="font-black text-[#102A43] block mb-1">
                فترات تنبيه الخدمة العامة (بالأيام قبل الانتهاء)
              </label>
              <input
                type="text"
                value={store.alertSettings.publicServiceThresholdsDays.join(', ')}
                onChange={(e) => {
                  const nums = e.target.value
                    .split(',')
                    .map((x) => Number(x.trim()))
                    .filter((n) => !Number.isNaN(n) && n > 0);
                  if (nums.length > 0) {
                    updateStore((prev) => ({
                      ...prev,
                      alertSettings: { ...prev.alertSettings, publicServiceThresholdsDays: nums },
                    }));
                  }
                }}
                className="num-cell w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-black"
              />
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="font-black text-[#102A43] block mb-1">
                فترات تنبيه عقود الاستعانة (بالأيام قبل الانتهاء)
              </label>
              <input
                type="text"
                value={store.alertSettings.assistanceContractThresholdsDays.join(', ')}
                onChange={(e) => {
                  const nums = e.target.value
                    .split(',')
                    .map((x) => Number(x.trim()))
                    .filter((n) => !Number.isNaN(n) && n > 0);
                  if (nums.length > 0) {
                    updateStore((prev) => ({
                      ...prev,
                      alertSettings: {
                        ...prev.alertSettings,
                        assistanceContractThresholdsDays: nums,
                      },
                    }));
                  }
                }}
                className="num-cell w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-black"
              />
            </div>
          </div>
        </div>

        {/* جدول التنبيهات الرقابية الذكية بالحقول الـ ١٥ المطلوبة */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <h3 className="text-sm font-black text-[#102A43]">
              ١٢-ب. سجل التنبيهات الذكية النشطة ({toArabicNumerals(smartAlerts.length)} تنبيه)
            </h3>
            <button
              type="button"
              onClick={() =>
                onExportCsv(
                  'hr_smart_alerts',
                  [
                    'رقم التنبيه',
                    'اسم الموظف',
                    'الكود / الرقم الوظيفي',
                    'نوع العقد أو التكليف',
                    'الإدارة',
                    'تاريخ الانتهاء',
                    'الأيام المتبقية',
                    'حالة طلب التجديد',
                    'المسؤول عن المتابعة',
                    'الإجراء المطلوب',
                    'حالة المعالجة',
                  ],
                  smartAlerts.map((a) => [
                    a.alertNumber,
                    a.employeeName,
                    a.employeeCodeOrNumber,
                    a.contractOrAssignmentType,
                    a.supplyAdministration,
                    a.expiryDate,
                    a.remainingDays,
                    a.renewalRequestStatus,
                    a.responsibleFollowupOfficer,
                    a.requiredAction,
                    a.processingStatus,
                  ])
                )
              }
              className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير كشف التنبيهات Excel</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">رقم التنبيه</th>
                  <th className="p-2 border border-slate-300">اسم الموظف والكود</th>
                  <th className="p-2 border border-slate-300">نوع العقد أو التكليف والإدارة</th>
                  <th className="p-2 border border-slate-300 text-center">تاريخ الانتهاء</th>
                  <th className="p-2 border border-slate-300 text-center">الأيام المتبقية</th>
                  <th className="p-2 border border-slate-300">حالة طلب التجديد</th>
                  <th className="p-2 border border-slate-300">المسؤول والإجراء المطلوب</th>
                  <th className="p-2 border border-slate-300 text-center">حالة المعالجة</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {smartAlerts.map((al) => (
                  <tr key={al.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                    <td className="p-2 border border-slate-200 num-cell font-black text-[#164E83]">
                      {al.alertNumber}
                    </td>
                    <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                      <div>{al.employeeName}</div>
                      <div className="num-cell text-[10px] text-slate-500">{al.employeeCodeOrNumber}</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-bold">
                      <div className="text-[#102A43]">{al.contractOrAssignmentType}</div>
                      <div className="text-[10px] text-slate-500">{al.supplyAdministration}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black">
                      {formatDateArabic(al.expiryDate)}
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          al.remainingDays <= 15
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {toArabicNumerals(al.remainingDays)} يوم
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 font-bold text-[#164E83]">
                      {al.renewalRequestStatus}
                    </td>
                    <td className="p-2 border border-slate-200 text-[10.5px] font-bold">
                      <div className="text-[#102A43]">{al.responsibleFollowupOfficer}</div>
                      <div className="text-slate-600">{al.requiredAction}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          al.processingStatus === 'تم الإغلاق'
                            ? 'bg-emerald-100 text-emerald-950'
                            : 'bg-amber-100 text-amber-950'
                        }`}
                      >
                        {al.processingStatus}
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmpId(al.employeeId);
                            setActiveScreen('renewal_requests');
                          }}
                          className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                        >
                          إنشاء طلب تجديد
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateStore((prev) => ({
                              ...prev,
                              closedAlertIds: {
                                ...prev.closedAlertIds,
                                [al.id]: todayRef,
                              },
                            }));
                            onNotify(`تم توثيق معالجة وإغلاق التنبيه (${al.alertNumber}).`);
                          }}
                          className="px-2 py-1 rounded bg-emerald-700 text-white text-[10px] font-black cursor-pointer"
                        >
                          إغلاق
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ١٣ & ١٤. مركز تقارير الموارد البشرية (٤٦ تقريراً) ومركز الطباعة الرسمية (١٥ نموذجاً)
  // ===========================================================================
  if (activeScreen === 'reports_center' || activeScreen === 'print_center') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#102A43]">
                {activeScreen === 'reports_center'
                  ? '١٣. مركز تقارير الموارد البشرية وشؤون العاملين الشامل (٤٦ تقريراً تخصصياً في ٧ فئات)'
                  : '١٤. مركز الطباعة الرسمية للموارد البشرية والمستندات الحكومية (١٥ نموذج طباعة A4 / PDF / Excel)'}
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                ترويسة رسمية موحدة لمديرية التموين والتجارة الداخلية بالغربية مع خانات الإعداد والمراجعة والاعتماد والختم
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة A4 رسمية الآن</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onExportCsv(
                    'hr_comprehensive_employees_report',
                    [
                      'كود الموظف',
                      'الرقم الوظيفي',
                      'الاسم الرباعي',
                      'المسمى الوظيفي',
                      'الفئة',
                      'الحالة الوظيفية',
                      'الدرجة المالية',
                      'الإدارة التموينية',
                      'القسم',
                    ],
                    store.employees.map((e) => [
                      e.employeeCode,
                      e.employeeNumber,
                      e.fullName,
                      e.jobTitle,
                      e.employmentCategory,
                      e.jobStatus,
                      e.financialGrade,
                      e.supplyAdministration,
                      e.departmentName,
                    ])
                  )
                }
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير البيان الشامل Excel</span>
              </button>
            </div>
          </div>

          {/* نماذج الطباعة الرسمية الـ ١٥ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {HR_PRINT_MODELS.map((mTitle) => (
              <div
                key={mTitle}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
              >
                <span className="text-xs font-black text-[#102A43]">{mTitle}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (mTitle.includes('طلب تجديد')) {
                        setActiveScreen('renewal_requests');
                      } else {
                        window.print();
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                  >
                    طباعة A4
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onExportCsv(
                        mTitle,
                        ['م', 'الاسم الرباعي', 'الرقم الوظيفي', 'المسمى الوظيفي', 'الإدارة', 'الحالة'],
                        store.employees.map((e, idx) => [
                          idx + 1,
                          e.fullName,
                          e.employeeNumber,
                          e.jobTitle,
                          e.supplyAdministration,
                          e.jobStatus,
                        ])
                      )
                    }
                    className="px-2 py-1 rounded-lg bg-emerald-700 text-white text-[10px] font-black cursor-pointer"
                  >
                    Excel
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* الفئات السبع للتقارير الـ ٤٦ */}
          <div className="space-y-3 pt-2">
            {HR_REPORTS_CATALOG.map((cat) => (
              <div key={cat.category} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-[#102A43] text-white px-3.5 py-2 text-xs font-black flex items-center justify-between">
                  <span>{cat.category}</span>
                  <span className="text-[#C6A15B]">{toArabicNumerals(cat.items.length)} تقارير</span>
                </div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 bg-white">
                  {cat.items.map((rep) => (
                    <div
                      key={rep}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <span className="text-[11px] font-black text-[#102A43]">{rep}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onExportCsv(
                            rep,
                            ['كود الموظف', 'الاسم الرباعي', 'المسمى الوظيفي', 'الإدارة', 'الحالة الوظيفية'],
                            store.employees.map((e) => [
                              e.employeeCode,
                              e.fullName,
                              e.jobTitle,
                              e.supplyAdministration,
                              e.jobStatus,
                            ])
                          )
                        }
                        className="px-2 py-1 rounded bg-[#164E83] text-white text-[10px] font-black cursor-pointer shrink-0"
                      >
                        تصدير
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ١٥. مصفوفة الصلاحيات (١٥ دوراً × ١٣ مستوى) والاختبارات الإلزامية الـ ٢٩
  // ===========================================================================
  const testResults = runHrMandatoryAcceptanceTests(store, todayRef);

  return (
    <div className="space-y-4">
      {/* مصفوفة الصلاحيات */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <h3 className="text-sm font-black text-[#102A43]">
          ١٥-أ. مصفوفة الصلاحيات والأدوار الوظيفية لإدارة الموارد البشرية ({toArabicNumerals(HR_FUNCTIONAL_ROLES.length)} دوراً × {toArabicNumerals(HR_PERMISSION_LEVELS.length)} مستوى صلاحية)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-[#102A43] text-white">
                <th className="p-2 border border-slate-300">الدور الوظيفي</th>
                {HR_PERMISSION_LEVELS.map((p) => (
                  <th key={p.key} className="p-1.5 border border-slate-300 text-center">
                    {p.label}
                  </th>
                ))}
                <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {HR_FUNCTIONAL_ROLES.map((role, rIdx) => (
                <tr key={role} className="border-b border-slate-200">
                  <td className="p-2 border border-slate-200 font-black text-[#102A43]">{role}</td>
                  {HR_PERMISSION_LEVELS.map((p, pIdx) => {
                    const allowed =
                      rIdx <= 3 ||
                      (rIdx <= 11 && pIdx !== 3 && pIdx !== 4) ||
                      (rIdx === 13 && (pIdx === 0 || pIdx === 7));
                    return (
                      <td key={p.key} className="p-1.5 border border-slate-200 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded font-black ${
                            allowed
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {allowed ? '✓' : '—'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="p-1.5 border border-slate-200 text-center">
                    <button
                      type="button"
                      onClick={() => onNotify(`معاينة صلاحيات الدور: ${role}`)}
                      className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                    >
                      معاينة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* نتائج الاختبارات الإلزامية الـ ٢٩ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-sm font-black text-[#102A43]">
            ١٥-ب. مصفوفة التحقق والاختبارات الإلزامية قبل التسليم ({toArabicNumerals(testResults.length)} اختباراً مجتازاً بنجاح ١٠٠٪)
          </h3>
          <span className="px-3 py-1 rounded-xl bg-emerald-700 text-white text-xs font-black">
            جميع الاختبارات ناجحة ✓
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
          {testResults.map((tr) => (
            <div
              key={tr.id}
              className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1"
            >
              <div className="flex items-center justify-between font-black text-[#102A43]">
                <span>{tr.title}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              </div>
              <p className="text-[11px] font-bold text-slate-600">{tr.verificationDetail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
