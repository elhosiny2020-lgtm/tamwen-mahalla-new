'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FolderKanban,
  MessageSquare,
  Paperclip,
  Pin,
  PlusCircle,
  Printer,
  Reply,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  BakeryRecord,
  DailyTaskPriority,
  DailyTaskRecord,
  DailyTaskStatus,
  DailyTaskType,
  Department,
  EmployeePresenceStatus,
  InspectionRecord,
  InternalChatConversation,
  InternalChatMessage,
  TaskConfidentialityLevel,
  UnifiedSystemNotification,
  User,
} from '@/types';
import {
  formatArabicCurrency,
  formatDateArabic,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import { evaluateDocumentExpiry } from '@/lib/bakery-math';
import { exportCsvUtf8Bom, loadDebtsStore } from '@/lib/debts-data';
import {
  loadChatConversations,
  loadChatMessages,
  loadDailyTasks,
  loadDebtThresholdSetting,
  loadOfficialViolationReports,
  loadUnifiedNotifications,
  saveChatConversations,
  saveChatMessages,
  saveDailyTasks,
  saveUnifiedNotifications,
} from '@/lib/major-debts-tasks-chat-store';
import AnimatedStatCard from './AnimatedStatCard';
import SmartAutoFitTable, { SmartTableColumn } from './SmartAutoFitTable';
import { OfficialPrintModal } from './debts/DebtsSharedUi';

export type TasksModuleSubTab =
  | 'dashboard'
  | 'tasks_list'
  | 'cross_followup'
  | 'internal_chat'
  | 'notifications'
  | 'reports_center';

interface DailyTasksAndInternalChatModuleProps {
  currentUser: User;
  allUsers: User[];
  departments: Department[];
  bakeries: BakeryRecord[];
  inspections: InspectionRecord[];
  todayRef: string;
  initialSubTab?: TasksModuleSubTab;
  onNavigateToDepartment: (deptId: string, focusRecordId?: string) => void;
  onSelectBakeryDetails: (bakery: BakeryRecord) => void;
}

const TASK_TYPES_LIST: DailyTaskType[] = [
  'مهمة يومية',
  'مهمة أسبوعية',
  'مهمة شهرية',
  'مهمة عاجلة',
  'تكليف إداري',
  'متابعة مخالفة',
  'متابعة مديونية',
  'مراجعة مستندات',
  'فحص أو تفتيش',
  'صيانة أو إصلاح',
  'متابعة شكوى',
  'إعداد تقرير',
  'متابعة توريد أو صرف',
  'متابعة تراخيص',
  'مهمة أخرى',
];

const TASK_PRIORITIES_LIST: DailyTaskPriority[] = ['عادية', 'متوسطة', 'مهمة', 'عاجلة جداً'];

const TASK_STATUSES_LIST: DailyTaskStatus[] = [
  'جديدة',
  'تم الإسناد',
  'تم الاطلاع',
  'جارٍ التنفيذ',
  'متوقفة مؤقتاً',
  'تنتظر مستندات',
  'تنتظر اعتماد',
  'مكتملة',
  'مرفوضة',
  'متأخرة',
  'ملغاة بسبب موثق',
];

export default function DailyTasksAndInternalChatModule({
  currentUser,
  allUsers,
  departments,
  bakeries,
  inspections,
  todayRef,
  initialSubTab = 'dashboard',
  onNavigateToDepartment,
  onSelectBakeryDetails,
}: DailyTasksAndInternalChatModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<TasksModuleSubTab>(initialSubTab);
  const [tasks, setTasks] = useState<DailyTaskRecord[]>(() => loadDailyTasks());
  const [conversations, setConversations] = useState<InternalChatConversation[]>(() =>
    loadChatConversations()
  );
  const [messages, setMessages] = useState<InternalChatMessage[]>(() => loadChatMessages());
  const [notifications, setNotifications] = useState<UnifiedSystemNotification[]>(() =>
    loadUnifiedNotifications()
  );

  // مزامنة فورية عبر علامات التبويب (BroadcastChannel + storage event — تحاكي Supabase Realtime)
  useEffect(() => {
    const onStorageSync = () => {
      setTasks(loadDailyTasks());
      setConversations(loadChatConversations());
      setMessages(loadChatMessages());
      setNotifications(loadUnifiedNotifications());
    };
    const onOpenSubTab = (ev: Event) => {
      const custom = ev as CustomEvent<{ subTab?: TasksModuleSubTab }>;
      if (custom.detail?.subTab) {
        setActiveSubTab(custom.detail.subTab);
      }
    };
    window.addEventListener('storage', onStorageSync);
    window.addEventListener('gharbia-open-tasks-subtab', onOpenSubTab);
    return () => {
      window.removeEventListener('storage', onStorageSync);
      window.removeEventListener('gharbia-open-tasks-subtab', onOpenSubTab);
    };
  }, []);

  const [toast, setToast] = useState<string>('');
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // البحث والفلاتر في جدول المهام
  const [taskSearch, setTaskSearch] = useState<string>('');
  const [taskDeptFilter, setTaskDeptFilter] = useState<string>('ALL');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('ALL');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('ALL');
  const [onlyMyAssignedTasks, setOnlyMyAssignedTasks] = useState<boolean>(false);
  const [pinnedTaskCols, setPinnedTaskCols] = useState<string[]>([
    'taskNumber',
    'title',
    'primaryAssigneeName',
  ]);

  // نافذة إنشاء مهمة يومية جديدة
  const [showCreateTaskModal, setShowCreateTaskModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newDeptId, setNewDeptId] = useState<string>(departments[1]?.id || 'd-02');
  const [newPrimaryAssigneeId, setNewPrimaryAssigneeId] = useState<string>(
    allUsers[1]?.id || currentUser.id
  );
  const [newParticipantIds, setNewParticipantIds] = useState<string[]>([currentUser.id]);
  const [newStartDate, setNewStartDate] = useState<string>(todayRef);
  const [newDueDate, setNewDueDate] = useState<string>(todayRef);
  const [newPriority, setNewPriority] = useState<DailyTaskPriority>('مهمة');
  const [newTaskType, setNewTaskType] = useState<DailyTaskType>('مهمة يومية');
  const [newConf, setNewConf] = useState<TaskConfidentialityLevel>('عام للإدارة');
  const [newInstructions, setNewInstructions] = useState<string>('');
  const [newAttachments, setNewAttachments] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  // نافذة متابعة المهمة وتقديم تقرير الإنجاز ومحادثة المهمة المرتبطة
  const [selectedTask, setSelectedTask] = useState<DailyTaskRecord | null>(null);
  const [taskModalView, setTaskModalView] = useState<'details' | 'task_chat'>('details');
  const [updateProgressVal, setUpdateProgressVal] = useState<number>(0);
  const [updateCompletionReport, setUpdateCompletionReport] = useState<string>('');
  const [updateCommentText, setUpdateCommentText] = useState<string>('');
  const [updateAttachmentName, setUpdateAttachmentName] = useState<string>('');
  const [updateError, setUpdateError] = useState<string>('');

  // حالة الشات الداخلي المباشر بين الموظفين
  const [activeConvId, setActiveConvId] = useState<string>(
    conversations[0]?.id || 'conv-direct-1'
  );
  const [chatUserSearch, setChatUserSearch] = useState<string>('');
  const [chatMsgSearch, setChatMsgSearch] = useState<string>('');
  const [chatInputText, setChatInputText] = useState<string>('');
  const [chatReplyTo, setChatReplyTo] = useState<InternalChatMessage | null>(null);
  const [chatAttachmentName, setChatAttachmentName] = useState<string>('');
  const [presenceMap, setPresenceMap] = useState<Record<string, EmployeePresenceStatus>>({
    'usr-001': 'متصل',
    'usr-002': 'متصل',
  });
  const [showNewGroupModal, setShowNewGroupModal] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupType, setNewGroupType] = useState<'department_group' | 'cross_department_group'>(
    'department_group'
  );
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // مركز التقارير الموحد (١٥ تقريراً رسمياً)
  const [selectedReportId, setSelectedReportId] = useState<string>('rep-major-debts');
  const [repPrintOpen, setRepPrintOpen] = useState<boolean>(false);

  const isManagerOrAdmin =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'directorate_manager' ||
    currentUser.role === 'supply_admin_manager';

  // المؤشرات الإحصائية الاثنا عشر للوحة متابعة المهام اليومية
  const taskDashboardMetrics = useMemo(() => {
    const debtsStore = loadDebtsStore();
    const totalTasks = tasks.length;
    const newTasksCount = tasks.filter((t) => t.status === 'جديدة').length;
    const assignedCount = tasks.filter(
      (t) => t.status === 'تم الإسناد' || t.status === 'تم الاطلاع'
    ).length;
    const inProgressCount = tasks.filter((t) => t.status === 'جارٍ التنفيذ').length;
    const completedCount = tasks.filter((t) => t.status === 'مكتملة').length;
    const overdueCount = tasks.filter(
      (t) => t.status === 'متأخرة' || (t.status !== 'مكتملة' && t.dueDate < todayRef)
    ).length;
    const urgentCount = tasks.filter(
      (t) => (t.priority === 'عاجلة جداً' || t.priority === 'مهمة') && t.status !== 'مكتملة'
    ).length;
    const awaitingApprovalCount = tasks.filter((t) => t.status === 'تنتظر اعتماد').length;
    const openNotesCount = tasks.reduce((s, t) => s + t.comments.length, 0);
    const violationsNeedingFollowup =
      debtsStore.violations.filter((v) => !v.linkedDebtId).length +
      inspections.filter((i) => i.status === 'قيد التحقيق').length;

    const avgCompletionRate =
      totalTasks > 0
        ? Math.round(tasks.reduce((s, t) => s + (t.progressPercent || 0), 0) / totalTasks)
        : 100;

    return {
      totalTasks,
      newTasksCount,
      assignedCount,
      inProgressCount,
      completedCount,
      overdueCount,
      urgentCount,
      awaitingApprovalCount,
      openNotesCount,
      violationsNeedingFollowup,
      avgCompletionRate,
    };
  }, [tasks, inspections, todayRef]);

  // عدادات الرسائل غير المقروءة والإشعارات غير المقروءة
  const unreadChatCount = useMemo(
    () =>
      messages.filter(
        (m) =>
          !m.isDeletedFromUi &&
          m.senderId !== currentUser.id &&
          !m.readByUserIds.includes(currentUser.id)
      ).length,
    [messages, currentUser.id]
  );

  const unreadNotifsCount = useMemo(
    () =>
      notifications.filter(
        (n) =>
          !n.isRead &&
          (n.recipientUserId === 'ALL' || n.recipientUserId === currentUser.id)
      ).length,
    [notifications, currentUser.id]
  );

  const pushSystemNotification = (
    payload: Omit<UnifiedSystemNotification, 'id' | 'createdAt' | 'isRead'>
  ) => {
    const rec: UnifiedSystemNotification = {
      ...payload,
      id: `unot-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    const next = [rec, ...notifications];
    setNotifications(next);
    saveUnifiedNotifications(next);
    window.dispatchEvent(new CustomEvent('gharbia-chat-updated'));
  };

  // إنشاء مهمة يومية جديدة + إنشاء محادثة مرتبطة برقم المهمة تلقائياً
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const dept = departments.find((d) => d.id === newDeptId) || departments[0];
    const primaryUser =
      allUsers.find((u) => u.id === newPrimaryAssigneeId) || currentUser;
    const allPartIds = Array.from(
      new Set([currentUser.id, primaryUser.id, ...newParticipantIds])
    );
    const allPartNames = allPartIds.map(
      (uid) => allUsers.find((u) => u.id === uid)?.fullName || currentUser.fullName
    );

    const taskNumber = `TSK-2026-${String(tasks.length + 1).padStart(3, '0')}`;
    const taskId = `tsk-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newTask: DailyTaskRecord = {
      id: taskId,
      taskNumber,
      title: newTitle.trim(),
      description: newDesc.trim() || newTitle.trim(),
      departmentId: dept?.id || 'd-02',
      departmentName: dept?.arabicName || 'منظومة الرقابة على المخابز',
      primaryAssigneeId: primaryUser.id,
      primaryAssigneeName: primaryUser.fullName,
      participantIds: allPartIds,
      participantNames: allPartNames,
      createdById: currentUser.id,
      createdByName: currentUser.fullName,
      createdAt: nowIso,
      startDate: newStartDate,
      dueDate: newDueDate,
      priority: newPriority,
      taskType: newTaskType,
      confidentiality: newConf,
      status: 'تم الإسناد',
      progressPercent: 0,
      requiredInstructions: newInstructions.trim() || 'التنفيذ وفق التعليمات والضوابط المعتمدة',
      notes: newNotes.trim(),
      attachments: newAttachments
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      comments: [],
      actionLogs: [
        {
          id: `tal-${Date.now()}`,
          actorName: currentUser.fullName,
          actionTitle: 'إنشاء وإسناد المهمة',
          details: `تم إسناد المهمة إلى ${primaryUser.fullName} بأولوية (${newPriority})`,
          timestamp: nowIso,
        },
      ],
      updatedAt: nowIso,
    };

    const nextTasks = [newTask, ...tasks];
    setTasks(nextTasks);
    saveDailyTasks(nextTasks);

    // إنشاء محادثة خاصة بالمهمة تلقائياً
    const taskConv: InternalChatConversation = {
      id: `conv-task-${taskId}`,
      title: `محادثة المهمة ${taskNumber}: ${newTask.title}`,
      type: 'task_chat',
      linkedTaskId: taskId,
      linkedTaskNumber: taskNumber,
      participantIds: allPartIds,
      participantNames: allPartNames,
      isPinned: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const nextConvs = [taskConv, ...conversations];
    setConversations(nextConvs);
    saveChatConversations(nextConvs);

    pushSystemNotification({
      recipientUserId: primaryUser.id,
      category: 'إسناد مهمة',
      title: `إسناد مهمة جديدة (${taskNumber})`,
      message: `تم إسناد مهمة "${newTask.title}" إليك بواسطة ${currentUser.fullName} — الموعد النهائي: ${newDueDate}`,
      severity: newPriority === 'عاجلة جداً' ? 'urgent' : 'info',
      targetDeptId: 'd-25',
      targetRecordId: taskId,
    });

    setNewTitle('');
    setNewDesc('');
    setNewInstructions('');
    setNewAttachments('');
    setNewNotes('');
    setShowCreateTaskModal(false);
    notify(`تم إنشاء وإسناد المهمة (${taskNumber}) وتفعيل غرفة محادثة المهمة بنجاح.`);
  };

  // تحديث نسبة الإنجاز وتقرير التنفيذ (مع القاعدة الإلزامية: لا تتحول إلى مكتملة إلا بتقديم تقرير الإنجاز واعتماد الإغلاق)
  const handleSaveTaskProgressAndStatus = (nextStatus: DailyTaskStatus) => {
    if (!selectedTask) return;
    setUpdateError('');

    if (
      (nextStatus === 'مكتملة' || nextStatus === 'تنتظر اعتماد') &&
      !updateCompletionReport.trim()
    ) {
      setUpdateError(
        'قاعدة إلزامية: لا يمكن تحويل المهمة إلى «تنتظر اعتماد» أو «مكتملة» إلا بعد كتابة وتقديم تقرير الإنجاز الفعلي.'
      );
      return;
    }

    if (nextStatus === 'مكتملة' && !isManagerOrAdmin) {
      setUpdateError(
        'اعتماد إغلاق المهمة نهائياً إلى «مكتملة» يتطلب صلاحية مدير الإدارة أو المسؤول المختص؛ يمكنك اختيار «تنتظر اعتماد».'
      );
      return;
    }

    const nowIso = new Date().toISOString();
    const nextComments = updateCommentText.trim()
      ? [
          ...selectedTask.comments,
          {
            id: `tcm-${Date.now()}`,
            authorId: currentUser.id,
            authorName: currentUser.fullName,
            text: updateCommentText.trim(),
            createdAt: nowIso,
            attachmentName: updateAttachmentName.trim() || undefined,
          },
        ]
      : selectedTask.comments;

    const nextAttachments = updateAttachmentName.trim()
      ? Array.from(new Set([...selectedTask.attachments, updateAttachmentName.trim()]))
      : selectedTask.attachments;

    const updatedTask: DailyTaskRecord = {
      ...selectedTask,
      status: nextStatus,
      progressPercent: nextStatus === 'مكتملة' ? 100 : updateProgressVal,
      completionReportText: updateCompletionReport.trim() || selectedTask.completionReportText,
      comments: nextComments,
      attachments: nextAttachments,
      actionLogs: [
        {
          id: `tal-${Date.now()}`,
          actorName: currentUser.fullName,
          actionTitle: `تحديث الحالة إلى (${nextStatus}) — نسبة الإنجاز ${
            nextStatus === 'مكتملة' ? 100 : updateProgressVal
          }٪`,
          details:
            updateCompletionReport.trim() ||
            updateCommentText.trim() ||
            'تحديث متابعة المهمة',
          timestamp: nowIso,
        },
        ...selectedTask.actionLogs,
      ],
      updatedAt: nowIso,
      approvedBy: nextStatus === 'مكتملة' ? currentUser.fullName : selectedTask.approvedBy,
      approvedAt: nextStatus === 'مكتملة' ? nowIso : selectedTask.approvedAt,
    };

    const nextList = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    setTasks(nextList);
    saveDailyTasks(nextList);
    setSelectedTask(updatedTask);
    setUpdateCommentText('');
    setUpdateAttachmentName('');

    pushSystemNotification({
      recipientUserId: 'ALL',
      category: nextStatus === 'تنتظر اعتماد' ? 'طلب اعتماد' : 'تعديل مهمة',
      title: `تحديث المهمة ${updatedTask.taskNumber} (${nextStatus})`,
      message: `قام ${currentUser.fullName} بتحديث المهمة "${updatedTask.title}" إلى حالة (${nextStatus}).`,
      severity: nextStatus === 'مكتملة' ? 'success' : 'info',
      targetDeptId: 'd-25',
      targetRecordId: updatedTask.id,
    });

    notify(`تم حفظ متابعة المهمة (${updatedTask.taskNumber}) وتحديث حالتها إلى: ${nextStatus}.`);
  };

  // إرسال رسالة في الشات الداخلي المباشر (أو محادثة المهمة)
  const handleSendChatMessage = (targetConvId?: string) => {
    const convId = targetConvId || activeConvId;
    if (!chatInputText.trim() && !chatAttachmentName.trim()) return;

    const nowIso = new Date().toISOString();
    const newMsg: InternalChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: convId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderRoleLabel: currentUser.jobTitle || 'موظف مختص',
      text: chatInputText.trim() || `مرفق إداري: ${chatAttachmentName.trim()}`,
      sentAt: nowIso,
      readByUserIds: [currentUser.id],
      replyToMessageId: chatReplyTo?.id,
      replyToPreview: chatReplyTo?.text.slice(0, 70),
      attachmentName: chatAttachmentName.trim() || undefined,
      attachmentType: chatAttachmentName.trim() ? 'مستند إداري' : undefined,
    };

    const nextMsgs = [...messages, newMsg];
    setMessages(nextMsgs);
    saveChatMessages(nextMsgs);

    const nextConvs = conversations.map((c) =>
      c.id === convId ? { ...c, updatedAt: nowIso } : c
    );
    setConversations(nextConvs);
    saveChatConversations(nextConvs);

    setChatInputText('');
    setChatReplyTo(null);
    setChatAttachmentName('');

    pushSystemNotification({
      recipientUserId: 'ALL',
      category: 'رسالة شات داخلي',
      title: `رسالة جديدة من ${currentUser.fullName}`,
      message: newMsg.text.slice(0, 90),
      severity: 'info',
    });

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  // تعليم رسائل المحادثة النشطة كمقروءة
  const markConversationMessagesAsRead = (convId: string) => {
    let changed = false;
    const next = messages.map((m) => {
      if (m.conversationId === convId && !m.readByUserIds.includes(currentUser.id)) {
        changed = true;
        return { ...m, readByUserIds: [...m.readByUserIds, currentUser.id] };
      }
      return m;
    });
    if (changed) {
      setMessages(next);
      saveChatMessages(next);
      window.dispatchEvent(new CustomEvent('gharbia-chat-updated'));
    }
  };

  // فلترة المهام حسب صلاحيات الموظف والفلاتر المختارة
  const filteredTasks = useMemo(() => {
    const q = normalizeSearchText(taskSearch);
    return tasks.filter((t) => {
      // يظهر لكل موظف المهام المسندة إليه، مع إمكانية اطلاع المدير المختص على مهام إدارته
      if (!isManagerOrAdmin || onlyMyAssignedTasks) {
        const isMine =
          t.primaryAssigneeId === currentUser.id ||
          t.participantIds.includes(currentUser.id) ||
          t.createdById === currentUser.id;
        if (!isMine) return false;
      }
      if (taskDeptFilter !== 'ALL' && t.departmentId !== taskDeptFilter) return false;
      if (taskStatusFilter !== 'ALL' && t.status !== taskStatusFilter) return false;
      if (taskPriorityFilter !== 'ALL' && t.priority !== taskPriorityFilter) return false;
      if (!q) return true;
      return normalizeSearchText(
        `${t.taskNumber} ${t.title} ${t.description} ${t.departmentName} ${t.primaryAssigneeName} ${t.taskType}`
      ).includes(q);
    });
  }, [
    tasks,
    isManagerOrAdmin,
    onlyMyAssignedTasks,
    currentUser.id,
    taskDeptFilter,
    taskStatusFilter,
    taskPriorityFilter,
    taskSearch,
  ]);

  // المتابعة الشاملة للأقسام (تجميع كل الأعمال التي تحتاج متابعة من كافة أقسام المنظومة مع زر فتح السجل الأصلي)
  const crossDepartmentFollowupItems = useMemo(() => {
    const debtsStore = loadDebtsStore();
    const thSetting = loadDebtThresholdSetting();
    const officialReports = loadOfficialViolationReports();

    const items: {
      id: string;
      categoryLabel: string;
      departmentName: string;
      targetDeptId: string;
      recordRef: string;
      title: string;
      details: string;
      severity: 'urgent' | 'warning' | 'info';
      bakeryObj?: BakeryRecord;
    }[] = [];

    // ١. المديونيات التي تجاوزت الحد المالي المختار
    debtsStore.debts
      .filter(
        (d) =>
          d.approvalStatus === 'معتمد' &&
          d.remainingAmount >= thSetting.thresholdAmountEgp &&
          d.remainingAmount > 0
      )
      .forEach((d) => {
        const b = bakeries.find((x) => x.id === d.bakeryId);
        items.push({
          id: `cf-debt-${d.id}`,
          categoryLabel: 'مديونية تجاوزت الحد المالي',
          departmentName: 'مديونيات أصحاب المخابز',
          targetDeptId: 'd-03',
          recordRef: d.debtNumber,
          title: `${d.bakeryName} — POS: ${d.posNumber} (${d.ownerName})`,
          details: `المتبقي ${formatArabicCurrency(d.remainingAmount)} يتجاوز الحد المحدد (${formatArabicCurrency(
            thSetting.thresholdAmountEgp
          )})`,
          severity: 'urgent',
          bakeryObj: b,
        });
      });

    // ٢. الأقساط المتأخرة
    debtsStore.installments
      .filter((i) => i.remainingAmount > 0 && i.dueDate < todayRef)
      .forEach((i) => {
        const b = bakeries.find((x) => x.id === i.bakeryId);
        items.push({
          id: `cf-inst-${i.id}`,
          categoryLabel: 'قسط سداد متأخر',
          departmentName: 'مديونيات أصحاب المخابز — الجدولة',
          targetDeptId: 'd-03',
          recordRef: `${i.scheduleNumber} قسط #${i.installmentSerial}`,
          title: `${i.bakeryName} — POS: ${i.posNumber}`,
          details: `تاريخ الاستحقاق: ${formatDateArabic(i.dueDate)} — المتبقي: ${formatArabicCurrency(
            i.remainingAmount
          )}`,
          severity: 'urgent',
          bakeryObj: b,
        });
      });

    // ٣. محاضر المخالفات الجديدة أو غير المرحلة للمديونيات
    officialReports
      .filter((r) => !r.linkedDebtId)
      .forEach((r) => {
        const b = bakeries.find((x) => x.id === r.bakeryId);
        items.push({
          id: `cf-ovr-${r.id}`,
          categoryLabel: 'محضر مخالفات ينتظر الترحيل المالي',
          departmentName: 'المخالفات والمحاضر والنيابات',
          targetDeptId: 'd-16',
          recordRef: r.reportNumber,
          title: `${r.bakeryName} — ${r.issuingAuthoritySnapshot}`,
          details: `إجمالي الغرامة: ${formatArabicCurrency(r.totalFineAmountEgp)} (${
            r.items.length
          } بنود)`,
          severity: 'warning',
          bakeryObj: b,
        });
      });

    // ٤. التراخيص والبطاقات الضريبية المنتهية أو التي قاربت على الانتهاء
    bakeries.forEach((b) => {
      const lic = evaluateDocumentExpiry(b.licenseExpiryDate, b.licenseNumber, todayRef);
      if (lic.severity !== 'valid') {
        items.push({
          id: `cf-lic-${b.id}`,
          categoryLabel: 'ترخيص مخبز منتهي / قارب على الانتهاء',
          departmentName: 'منظومة الرقابة على المخابز',
          targetDeptId: 'd-02',
          recordRef: b.licenseNumber,
          title: `${b.name} — POS: ${b.posNumber} (${b.ownerName})`,
          details: `${lic.status} — تاريخ الانتهاء: ${formatDateArabic(b.licenseExpiryDate)}`,
          severity: lic.severity === 'expired' ? 'urgent' : 'warning',
          bakeryObj: b,
        });
      }
    });

    // ٥. تقارير التفتيش التي لم يتم إغلاقها
    inspections
      .filter((ins) => ins.status === 'قيد التحقيق')
      .forEach((ins) => {
        const b = bakeries.find((x) => x.id === ins.bakeryId);
        items.push({
          id: `cf-ins-${ins.id}`,
          categoryLabel: 'تقرير تفتيش قيد التحقيق لم يغلق',
          departmentName: 'الحملات والتفتيش التمويني',
          targetDeptId: 'd-15',
          recordRef: ins.recordNumber,
          title: `${ins.bakeryName} (${ins.village})`,
          details: `${ins.violationTitle} — المفتش: ${ins.inspectorName}`,
          severity: 'warning',
          bakeryObj: b,
        });
      });

    // ٦. المهام المتأخرة أو التي تنتظر اعتماد المدير
    tasks
      .filter((t) => t.status === 'متأخرة' || t.status === 'تنتظر اعتماد')
      .forEach((t) => {
        items.push({
          id: `cf-tsk-${t.id}`,
          categoryLabel:
            t.status === 'تنتظر اعتماد' ? 'مهمة تنتظر اعتماد الإغلاق' : 'مهمة يومية متأخرة',
          departmentName: t.departmentName,
          targetDeptId: t.departmentId,
          recordRef: t.taskNumber,
          title: t.title,
          details: `الموظف المكلف: ${t.primaryAssigneeName} — الموعد النهائي: ${formatDateArabic(
            t.dueDate
          )}`,
          severity: t.status === 'متأخرة' ? 'urgent' : 'info',
        });
      });

    return items;
  }, [bakeries, inspections, tasks, todayRef]);

  const taskColumns: SmartTableColumn<DailyTaskRecord>[] = useMemo(
    () => [
      {
        key: 'taskNumber',
        label: 'رقم المهمة',
        headerText: 'رقم المهمة',
        type: 'numeric',
        render: (t) => (
          <span className="num-cell font-black text-[#102A43]">
            {toArabicNumerals(t.taskNumber)}
          </span>
        ),
      },
      {
        key: 'title',
        label: 'عنوان المهمة والوصف',
        headerText: 'عنوان المهمة والوصف',
        type: 'longText',
        render: (t) => (
          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedTask(t);
                setUpdateProgressVal(t.progressPercent);
                setUpdateCompletionReport(t.completionReportText || '');
                setTaskModalView('details');
              }}
              className="font-black text-[#164E83] hover:underline text-right cursor-pointer block"
            >
              {t.title}
            </button>
            <span className="text-[10px] font-bold text-slate-500">{t.taskType}</span>
          </div>
        ),
      },
      {
        key: 'departmentName',
        label: 'الإدارة / القسم المعني',
        headerText: 'الإدارة / القسم المعني',
        type: 'text',
        render: (t) => <span className="font-black text-slate-800">{t.departmentName}</span>,
      },
      {
        key: 'primaryAssigneeName',
        label: 'الموظف المكلف',
        headerText: 'الموظف المكلف',
        type: 'name',
        render: (t) => (
          <div>
            <span className="font-black text-[#102A43] block">{t.primaryAssigneeName}</span>
            {t.participantNames.length > 1 && (
              <span className="text-[10px] font-bold text-slate-500">
                +{toArabicNumerals(t.participantNames.length - 1)} مشاركين
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'dueDate',
        label: 'الموعد النهائي',
        headerText: 'الموعد النهائي',
        type: 'date',
        render: (t) => (
          <span className="num-cell font-black">{formatDateArabic(t.dueDate)}</span>
        ),
      },
      {
        key: 'priority',
        label: 'درجة الأولوية',
        headerText: 'درجة الأولوية',
        type: 'badge',
        render: (t) => {
          const cls =
            t.priority === 'عاجلة جداً'
              ? 'bg-red-700 text-white'
              : t.priority === 'مهمة'
              ? 'bg-amber-100 text-amber-950 border border-amber-300'
              : 'bg-slate-100 text-slate-800';
          return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${cls}`}>
              {t.priority}
            </span>
          );
        },
      },
      {
        key: 'progressPercent',
        label: 'نسبة الإنجاز',
        headerText: 'نسبة الإنجاز',
        type: 'numeric',
        render: (t) => (
          <div className="w-24">
            <div className="flex justify-between text-[10px] font-black mb-0.5">
              <span className="num-cell">{toArabicNumerals(t.progressPercent)}٪</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full ${
                  t.progressPercent >= 100 ? 'bg-emerald-600' : 'bg-[#164E83]'
                }`}
                style={{ width: `${Math.min(100, t.progressPercent)}%` }}
              />
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'حالة المهمة',
        headerText: 'حالة المهمة',
        type: 'badge',
        render: (t) => {
          const cls =
            t.status === 'مكتملة'
              ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
              : t.status === 'متأخرة' || t.status === 'مرفوضة'
              ? 'bg-red-100 text-red-950 border-red-400'
              : t.status === 'تنتظر اعتماد'
              ? 'bg-amber-100 text-amber-950 border-amber-400'
              : 'bg-blue-50 text-blue-950 border-blue-300';
          return (
            <span className={`px-2 py-0.5 rounded border text-[10px] font-black ${cls}`}>
              {t.status}
            </span>
          );
        },
      },
      {
        key: 'actions',
        label: 'المتابعة والمحادثة',
        headerText: 'المتابعة والمحادثة',
        type: 'actions',
        render: (t) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setSelectedTask(t);
                setUpdateProgressVal(t.progressPercent);
                setUpdateCompletionReport(t.completionReportText || '');
                setTaskModalView('details');
              }}
              className="px-2 py-1 rounded bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-[10px] font-black cursor-pointer"
            >
              متابعة وإنجاز
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedTask(t);
                setUpdateProgressVal(t.progressPercent);
                setUpdateCompletionReport(t.completionReportText || '');
                setTaskModalView('task_chat');
              }}
              className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-3 h-3" />
              <span>محادثة المهمة</span>
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // محادثات الشات المتاحة للموظف الحالي (تطبيق قواعد الخصوصية: لا يطلع أي موظف على محادثة خاصة لا تخصه)
  const accessibleConversations = useMemo(() => {
    return [...conversations]
      .filter((c) => {
        if (c.type === 'cross_department_group' || c.type === 'department_group') return true;
        return c.participantIds.includes(currentUser.id) || isManagerOrAdmin;
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [conversations, currentUser.id, isManagerOrAdmin]);

  const activeConversation = useMemo(
    () =>
      accessibleConversations.find((c) => c.id === activeConvId) ||
      accessibleConversations[0] ||
      null,
    [accessibleConversations, activeConvId]
  );

  const activeConvMessages = useMemo(() => {
    if (!activeConversation) return [];
    const q = normalizeSearchText(chatMsgSearch);
    return messages.filter((m) => {
      if (m.conversationId !== activeConversation.id) return false;
      if (!q) return true;
      return normalizeSearchText(`${m.senderName} ${m.text}`).includes(q);
    });
  }, [messages, activeConversation, chatMsgSearch]);

  // قائمة التقارير الخمسة عشر الرسمية المطلوبة في مركز التقارير
  const officialReportsCatalog = [
    { id: 'rep-major-debts', title: '١. تقرير المديونيات الكبرى', category: 'تقارير المديونيات والتحصيل' },
    { id: 'rep-exceeding-bakeries', title: '٢. تقرير المخابز المتجاوزة للحد المالي', category: 'تقارير المديونيات والتحصيل' },
    { id: 'rep-due-installments', title: '٣. تقرير الأقساط المستحقة', category: 'تقارير المديونيات والتحصيل' },
    { id: 'rep-late-installments', title: '٤. تقرير الأقساط المتأخرة', category: 'تقارير المديونيات والتحصيل' },
    { id: 'rep-period-collection', title: '٥. تقرير التحصيل خلال فترة', category: 'تقارير المديونيات والتحصيل' },
    { id: 'rep-payment-plans', title: '٦. تقرير خطط السداد لكل مخبز', category: 'تقارير المديونيات والتحصيل' },
    { id: 'rep-viol-by-type', title: '٧. تقرير المخالفات حسب نوع المخالفة', category: 'تقارير المخالفات والمحاضر' },
    { id: 'rep-reports-by-authority', title: '٨. تقرير المحاضر حسب الجهة المحررة', category: 'تقارير المخالفات والمحاضر' },
    { id: 'rep-viol-by-village', title: '٩. تقرير المخالفات حسب الإدارة والقرية', category: 'تقارير المخالفات والمحاضر' },
    { id: 'rep-daily-tasks', title: '١٠. تقرير المهام اليومية', category: 'تقارير المهام والأداء' },
    { id: 'rep-emp-achievement', title: '١١. تقرير إنجاز الموظفين', category: 'تقارير المهام والأداء' },
    { id: 'rep-overdue-tasks', title: '١٢. تقرير المهام المتأخرة', category: 'تقارير المهام والأداء' },
    { id: 'rep-dept-followup', title: '١٣. تقرير متابعة كل إدارة', category: 'تقارير المهام والأداء' },
    { id: 'rep-tasks-by-priority', title: '١٤. تقرير المهام حسب الأولوية', category: 'تقارير المهام والأداء' },
    { id: 'rep-dept-performance', title: '١٥. تقرير أداء الإدارات خلال فترة', category: 'تقارير المهام والأداء' },
  ];

  return (
    <div className="space-y-4">
      {/* رأس قسم إدارة المهام اليومية والمتابعة والشات الداخلي المباشر */}
      <div className="bg-gradient-to-l from-[#0B1F33] via-[#102A43] to-[#164E83] text-white rounded-2xl p-5 shadow-md border border-[#164E83] space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#C6A15B] font-extrabold mb-1">
              <span>مديرية التموين والتجارة الداخلية بالغربية</span>
              <span>·</span>
              <span>إدارة تموين مركز المحلة الكبرى</span>
              <span>·</span>
              <span>المركز الموحد لإدارة المهام اليومية والمتابعة والشات الداخلي</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#C6A15B]" />
              <span>إدارة المهام اليومية والمتابعة الشاملة والمحادثات الداخلية بين الموظفين</span>
            </h2>
            <p className="text-[11px] font-bold text-slate-200 mt-0.5">
              مرتبط بجميع الأقسام (إدارة المخابز، مديونيات المخابز، السلع التموينية، التجارة الداخلية، صيانة الحبوب، الشون، الثلاجات، المطاحن، التراخيص والتفتيش)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('internal_chat')}
              className="px-5 py-3 rounded-xl bg-gradient-to-l from-[#C6A15B] to-[#d9b672] hover:from-[#b58f48] hover:to-[#C6A15B] text-[#102A43] text-sm font-black flex items-center gap-2 cursor-pointer border-2 border-white/40 shadow-md"
            >
              <MessageSquare className="w-5 h-5 text-[#102A43]" />
              <span>المحادثات الداخلية والإشعارات</span>
              {(unreadChatCount + unreadNotifsCount) > 0 && (
                <span className="num-cell px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px]">
                  {toArabicNumerals(unreadChatCount + unreadNotifsCount)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('notifications')}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer border border-[#C6A15B]/50"
            >
              <Bell className="w-4 h-4 text-[#C6A15B]" />
              <span>مركز التنبيهات</span>
              {unreadNotifsCount > 0 && (
                <span className="num-cell px-1.5 py-0.5 rounded-full bg-amber-500 text-[#102A43] text-[10px]">
                  {toArabicNumerals(unreadNotifsCount)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('reports_center')}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer border border-white/25"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#C6A15B]" />
              <span>مركز التقارير</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateTaskModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إنشاء مهمة جديدة</span>
            </button>
          </div>
        </div>

        {/* شريط التبويبات الفرعية للقسم (مكبرة درجتين) */}
        <div className="flex flex-wrap items-center gap-3 pt-3.5 border-t border-white/15 pb-1.5">
          {[
            { id: 'dashboard', label: '١. لوحة متابعة المهام اليومية', icon: ClipboardList },
            {
              id: 'tasks_list',
              label: '٢. سجل وإسناد المهام وإثبات الإنجاز',
              icon: FolderKanban,
              badge: tasks.length,
            },
            {
              id: 'cross_followup',
              label: '٣. المتابعة الشاملة للأقسام',
              icon: ExternalLink,
              badge: crossDepartmentFollowupItems.length,
            },
            {
              id: 'internal_chat',
              label: '٤. المحادثات الداخلية والإشعارات بين الموظفين',
              icon: MessageSquare,
              badge: unreadChatCount + unreadNotifsCount,
              prominent: true,
            },
            {
              id: 'notifications',
              label: '٥. مركز التنبيهات والإشعارات',
              icon: Bell,
              badge: unreadNotifsCount,
              prominent: true,
            },
            {
              id: 'reports_center',
              label: '٦. مركز التقارير والطباعة والتصدير (١٥)',
              icon: FileSpreadsheet,
              prominent: true,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            const isProminent = Boolean((tab as { prominent?: boolean }).prominent);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as TasksModuleSubTab)}
                className={`rounded-2xl font-black whitespace-nowrap flex items-center gap-2.5 cursor-pointer transition-all ${
                  isProminent
                    ? 'px-6 py-4 text-[15px] sm:text-base border-2 border-[#94C9CE]/70'
                    : 'px-5 py-3.5 text-sm sm:text-[15.5px] border border-white/25'
                } ${
                  active
                    ? 'bg-gradient-to-b from-[#E5F1F3] to-[#C2DCE0] text-[#1D3549] shadow-lg scale-[1.02]'
                    : isProminent
                    ? 'bg-[#2C4B63] text-white hover:bg-[#355A76] shadow-sm'
                    : 'bg-white/12 text-white hover:bg-white/22'
                }`}
              >
                <Icon className={isProminent ? 'w-5.5 h-5.5 shrink-0' : 'w-5 h-5 shrink-0'} />
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span
                    className={`num-cell px-2.5 py-0.5 rounded-full text-xs font-black ${
                      active ? 'bg-[#1D3549] text-[#E5F1F3]' : 'bg-red-600 text-white'
                    }`}
                  >
                    {toArabicNumerals(tab.badge)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className="p-3 rounded-xl bg-emerald-800 text-white text-xs font-black flex items-center justify-between shadow-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#C6A15B]" />
            {toast}
          </span>
          <button type="button" onClick={() => setToast('')} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ١. لوحة متابعة المهام اليومية (١٢ بطاقة إحصائية متحركة + سجل المهام السريع) */}
      {(activeSubTab === 'dashboard' || activeSubTab === 'tasks_list') && (
        <div className="space-y-4">
          {activeSubTab === 'dashboard' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <AnimatedStatCard
                title="إجمالي المهام"
                value={taskDashboardMetrics.totalTasks}
                unit="مهمة وتكليف"
                icon={ClipboardList}
                theme="navy"
                compact
              />
              <AnimatedStatCard
                title="المهام الجديدة والمسندة"
                value={
                  taskDashboardMetrics.newTasksCount + taskDashboardMetrics.assignedCount
                }
                unit="بانتظار البدء"
                icon={Users}
                theme="purple"
                compact
              />
              <AnimatedStatCard
                title="جارٍ تنفيذها حالياً"
                value={taskDashboardMetrics.inProgressCount}
                unit="قيد العمل"
                icon={Clock}
                theme="teal"
                compact
              />
              <AnimatedStatCard
                title="المهام المنجزة"
                value={taskDashboardMetrics.completedCount}
                unit="مهمة مكتملة"
                icon={CheckCircle2}
                theme="green"
                compact
              />
              <AnimatedStatCard
                title="المهام المتأخرة والعاجلة"
                value={
                  taskDashboardMetrics.overdueCount + taskDashboardMetrics.urgentCount
                }
                unit="أولوية قصوى"
                icon={AlertTriangle}
                theme="red"
                compact
              />
              <AnimatedStatCard
                title="تنتظر اعتماد المدير"
                value={taskDashboardMetrics.awaitingApprovalCount}
                unit={`معدل الإنجاز ${toArabicNumerals(
                  taskDashboardMetrics.avgCompletionRate
                )}٪`}
                icon={ShieldCheck}
                theme="gold"
                compact
              />
            </div>
          )}

          {/* فلاتر وجدول المهام اليومية */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[230px]">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="بحث برقم المهمة، العنوان، الموظف المكلف، أو الإدارة..."
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={taskDeptFilter}
                  onChange={(e) => setTaskDeptFilter(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-slate-300 font-black text-[#102A43]"
                >
                  <option value="ALL">جميع الأقسام والإدارات</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.arabicName}
                    </option>
                  ))}
                </select>

                <select
                  value={taskStatusFilter}
                  onChange={(e) => setTaskStatusFilter(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-slate-300 font-black text-[#102A43]"
                >
                  <option value="ALL">جميع حالات المهمة</option>
                  {TASK_STATUSES_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <select
                  value={taskPriorityFilter}
                  onChange={(e) => setTaskPriorityFilter(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-slate-300 font-black text-[#102A43]"
                >
                  <option value="ALL">جميع درجات الأولوية</option>
                  {TASK_PRIORITIES_LIST.map((pr) => (
                    <option key={pr} value={pr}>
                      {pr}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 font-black text-[#102A43] bg-slate-100 px-3 py-2 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyMyAssignedTasks}
                    onChange={(e) => setOnlyMyAssignedTasks(e.target.checked)}
                  />
                  <span>مهامي فقط</span>
                </label>
              </div>
            </div>

            <SmartAutoFitTable
              tableId="daily_tasks_followup_table"
              userId={currentUser.id}
              rows={filteredTasks}
              totalCount={tasks.length}
              getRowId={(t) => t.id}
              columns={taskColumns}
              pinnedKeys={pinnedTaskCols}
              onPinAll={() =>
                setPinnedTaskCols(['taskNumber', 'title', 'primaryAssigneeName'])
              }
              onUnpinAll={() => setPinnedTaskCols([])}
              onTogglePinColumn={(k) =>
                setPinnedTaskCols((prev) =>
                  prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
                )
              }
              onResetPinDefaults={() =>
                setPinnedTaskCols(['taskNumber', 'title', 'primaryAssigneeName'])
              }
              emptyMessage="لا توجد مهام مطابقة للفلاتر المحددة حالياً."
            />
          </div>
        </div>
      )}

      {/* ٣. شاشة المتابعة الشاملة للأقسام (مع زر «فتح السجل الأصلي» دون نسخ مكرر) */}
      {activeSubTab === 'cross_followup' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-black text-[#102A43]">
                شاشة المتابعة الشاملة للأقسام — الرصد اللحظي لجميع الأعمال التي تحتاج تدخلاً أو متابعة
              </h3>
              <p className="text-xs font-bold text-slate-600">
                تشمل محاضر المخالفات الجديدة، المديونيات المتجاوزة للحد، الأقساط المتأخرة، التراخيص المنتهية، تقارير التفتيش المفتوحة، والمهام المنتظرة للاعتماد
              </p>
            </div>
            <span className="num-cell px-3 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black">
              إجمالي عناصر المتابعة: {toArabicNumerals(crossDepartmentFollowupItems.length)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {crossDepartmentFollowupItems.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border-2 flex flex-col justify-between gap-2.5 ${
                  item.severity === 'urgent'
                    ? 'bg-red-50/60 border-red-300'
                    : item.severity === 'warning'
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-blue-50/60 border-blue-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black">
                      {item.categoryLabel}
                    </span>
                    <span className="num-cell text-[10.5px] font-black text-slate-600">
                      مرجع: {toArabicNumerals(item.recordRef)}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-[#102A43]">{item.title}</h4>
                  <p className="text-[11px] font-bold text-slate-700">{item.details}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                  <span className="text-[10.5px] font-black text-[#164E83]">
                    القسم المختص: {item.departmentName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {item.bakeryObj && (
                      <button
                        type="button"
                        onClick={() => onSelectBakeryDetails(item.bakeryObj!)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[#102A43] text-[10.5px] font-black cursor-pointer"
                      >
                        ملف المخبز (POS)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigateToDepartment(item.targetDeptId, item.recordRef)}
                      className="px-3 py-1 rounded-lg bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-[10.5px] font-black flex items-center gap-1 cursor-pointer"
                    >
                      <span>فتح السجل الأصلي</span>
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ٤. المحادثات الداخلية المباشرة بين الموظفين (الشات الداخلي) */}
      {activeSubTab === 'internal_chat' && (
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
          {/* القائمة الجانبية للموظفين والمحادثات والمجموعات */}
          <div className="lg:col-span-4 border-l border-slate-200 bg-[#FAFBFD] flex flex-col">
            <div className="p-3.5 bg-[#102A43] text-white space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#C6A15B]" />
                  <span>المحادثات الداخلية والمجموعات</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-[#C6A15B] text-[#102A43] text-[10.5px] font-black cursor-pointer"
                >
                  + مجموعة إدارة
                </button>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-300 absolute right-2.5 top-2" />
                <input
                  type="text"
                  value={chatUserSearch}
                  onChange={(e) => setChatUserSearch(e.target.value)}
                  placeholder="بحث عن موظف أو مجموعة أو مهمة..."
                  className="w-full pr-8 pl-2 py-1.5 rounded-lg bg-white/15 text-white placeholder:text-slate-300 text-[11px] font-bold"
                />
              </div>
            </div>

            {/* حالة الموظفين المتاحين للمراسلة */}
            <div className="p-2.5 border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10.5px] font-black text-slate-600">
                  الموظفون المتاحون للمراسلة الفورية
                </span>
                <select
                  value={presenceMap[currentUser.id] || 'متصل'}
                  onChange={(e) =>
                    setPresenceMap((prev) => ({
                      ...prev,
                      [currentUser.id]: e.target.value as EmployeePresenceStatus,
                    }))
                  }
                  className="text-[10px] font-black px-2 py-0.5 rounded border border-slate-300 bg-slate-50"
                >
                  <option value="متصل">حالتي: متصل ●</option>
                  <option value="غير متاح">حالتي: غير متاح ◐</option>
                  <option value="غير متصل">حالتي: غير متصل ○</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allUsers.map((u) => {
                  const status = presenceMap[u.id] || 'متصل';
                  const dotCls =
                    status === 'متصل'
                      ? 'bg-emerald-500'
                      : status === 'غير متاح'
                      ? 'bg-amber-500'
                      : 'bg-slate-400';
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        const existing = conversations.find(
                          (c) =>
                            c.type === 'direct' &&
                            c.participantIds.includes(u.id) &&
                            c.participantIds.includes(currentUser.id)
                        );
                        if (existing) {
                          setActiveConvId(existing.id);
                          markConversationMessagesAsRead(existing.id);
                        }
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10.5px] font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full ${dotCls}`} />
                      <span className="truncate max-w-[140px]">{u.fullName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* قائمة المحادثات الأخيرة والمثبتة */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200/70">
              {accessibleConversations
                .filter((c) => {
                  if (!chatUserSearch.trim()) return true;
                  return normalizeSearchText(
                    `${c.title} ${c.participantNames.join(' ')}`
                  ).includes(normalizeSearchText(chatUserSearch));
                })
                .map((conv) => {
                  const isSelected = activeConversation?.id === conv.id;
                  const convMsgs = messages.filter(
                    (m) => m.conversationId === conv.id && !m.isDeletedFromUi
                  );
                  const lastMsg = convMsgs[convMsgs.length - 1];
                  const unreadInConv = convMsgs.filter(
                    (m) =>
                      m.senderId !== currentUser.id &&
                      !m.readByUserIds.includes(currentUser.id)
                  ).length;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        markConversationMessagesAsRead(conv.id);
                      }}
                      className={`p-3 cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#102A43]/10 border-r-4 border-[#102A43]'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {conv.isPinned && (
                            <Pin className="w-3 h-3 text-[#C6A15B] shrink-0" />
                          )}
                          <h4 className="text-xs font-black text-[#102A43] truncate">
                            {conv.title}
                          </h4>
                        </div>
                        <p className="text-[10.5px] font-bold text-slate-600 truncate mt-0.5">
                          {lastMsg ? `${lastMsg.senderName}: ${lastMsg.text}` : 'لا توجد رسائل بعد'}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = conversations.map((x) =>
                              x.id === conv.id ? { ...x, isPinned: !x.isPinned } : x
                            );
                            setConversations(next);
                            saveChatConversations(next);
                          }}
                          title="تثبيت المحادثة المهمة"
                          className="text-slate-400 hover:text-[#102A43] cursor-pointer"
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        {unreadInConv > 0 && (
                          <span className="num-cell px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9.5px] font-black">
                            {toArabicNumerals(unreadInConv)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* نافذة المحادثة النشطة */}
          <div className="lg:col-span-8 flex flex-col bg-white">
            {activeConversation ? (
              <>
                <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-[#102A43]">
                      {activeConversation.title}
                    </h4>
                    <span className="text-[10.5px] font-bold text-slate-500">
                      المشاركون: {activeConversation.participantNames.join(' ، ')}
                    </span>
                  </div>
                  <div className="relative min-w-[190px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
                    <input
                      type="text"
                      value={chatMsgSearch}
                      onChange={(e) => setChatMsgSearch(e.target.value)}
                      placeholder="بحث داخل رسائل المحادثة..."
                      className="w-full pr-8 pl-2 py-1 rounded-lg border border-slate-300 text-[11px] font-bold bg-white"
                    />
                  </div>
                </div>

                <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px] bg-[#F4F7FB]/60">
                  {activeConvMessages.map((m) => {
                    const isMe = m.senderId === currentUser.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl p-3 shadow-2xs border ${
                            m.isDeletedFromUi
                              ? 'bg-slate-100 text-slate-400 border-slate-200 italic'
                              : isMe
                              ? 'bg-[#102A43] text-white border-[#164E83]'
                              : 'bg-white text-slate-900 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span
                              className={`text-[10.5px] font-black ${
                                isMe ? 'text-[#C6A15B]' : 'text-[#164E83]'
                              }`}
                            >
                              {m.senderName} ({m.senderRoleLabel})
                            </span>
                            <span
                              className={`num-cell text-[9.5px] font-bold ${
                                isMe ? 'text-slate-300' : 'text-slate-400'
                              }`}
                            >
                              {formatDateArabic(m.sentAt.slice(0, 10))} ·{' '}
                              {toArabicNumerals(m.sentAt.slice(11, 16))}
                            </span>
                          </div>

                          {m.replyToPreview && !m.isDeletedFromUi && (
                            <div className="mb-1.5 px-2 py-1 rounded bg-black/15 text-[10px] font-bold border-r-2 border-[#C6A15B]">
                              رداً على: {m.replyToPreview}
                            </div>
                          )}

                          <p className="text-xs font-bold leading-relaxed">
                            {m.isDeletedFromUi
                              ? 'تم إخفاء هذه الرسالة من واجهة العرض مع الاحتفاظ بها في سجل التدقيق الرسمي.'
                              : m.text}
                          </p>

                          {m.attachmentName && !m.isDeletedFromUi && (
                            <div className="mt-2 px-2.5 py-1 rounded-lg bg-black/15 text-[10.5px] font-black inline-flex items-center gap-1.5">
                              <Paperclip className="w-3.5 h-3.5 text-[#C6A15B]" />
                              <span>{m.attachmentName}</span>
                            </div>
                          )}

                          {!m.isDeletedFromUi && (
                            <div className="mt-1.5 pt-1 border-t border-white/10 flex items-center justify-between gap-3 text-[9.5px]">
                              <span className="font-bold opacity-80">
                                {m.readByUserIds.length > 1 ? '✓✓ تمت القراءة' : '✓ تم الإرسال'}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setChatReplyTo(m)}
                                  className="hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Reply className="w-3 h-3" />
                                  <span>رد</span>
                                </button>
                                {(isMe || isManagerOrAdmin) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = messages.map((x) =>
                                        x.id === m.id
                                          ? {
                                              ...x,
                                              isDeletedFromUi: true,
                                              deletedBy: currentUser.fullName,
                                              deletedAt: new Date().toISOString(),
                                            }
                                          : x
                                      );
                                      setMessages(next);
                                      saveChatMessages(next);
                                    }}
                                    className="hover:underline text-red-300 flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>حذف من الواجهة</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* شريط الرد وإرفاق المستندات وكتابة الرسالة */}
                <div className="p-3 border-t border-slate-200 bg-white space-y-2">
                  {chatReplyTo && (
                    <div className="px-3 py-1.5 rounded-lg bg-slate-100 border-r-4 border-[#102A43] flex items-center justify-between text-[11px]">
                      <span className="font-bold truncate">
                        الرد على ({chatReplyTo.senderName}): {chatReplyTo.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => setChatReplyTo(null)}
                        className="cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendChatMessage();
                        }
                      }}
                      placeholder="اكتب رسالتك المباشرة أو التعليمات الإدارية هنا..."
                      className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 focus:bg-white"
                    />
                    <input
                      type="text"
                      value={chatAttachmentName}
                      onChange={(e) => setChatAttachmentName(e.target.value)}
                      placeholder="اسم مرفق إداري (اختياري)..."
                      className="w-44 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendChatMessage()}
                      className="px-4 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال فوري</span>
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ٥. مركز التنبيهات والإشعارات */}
      {activeSubTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
            <h3 className="text-sm font-black text-[#102A43]">
              مركز الإشعارات والتنبيهات الموحد (المهام، الاعتمادات، المخالفات، المديونيات، الشات الداخلي)
            </h3>
            <button
              type="button"
              onClick={() => {
                const next = notifications.map((n) => ({ ...n, isRead: true }));
                setNotifications(next);
                saveUnifiedNotifications(next);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#102A43] text-xs font-black cursor-pointer"
            >
              تعليم جميع الإشعارات كمقروءة
            </button>
          </div>

          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  !n.isRead ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black">
                      {n.category}
                    </span>
                    <span className="font-black text-xs text-[#102A43]">{n.title}</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">{n.message}</p>
                </div>

                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = notifications.map((x) =>
                        x.id === n.id ? { ...x, isRead: true } : x
                      );
                      setNotifications(next);
                      saveUnifiedNotifications(next);
                    }}
                    className="px-3 py-1 rounded-lg bg-[#164E83] text-white text-[10.5px] font-black cursor-pointer shrink-0"
                  >
                    تم الاطلاع
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ٦. مركز التقارير والطباعة والتصدير (١٥ تقريراً رسمياً بـ Excel وطباعة A4) */}
      {activeSubTab === 'reports_center' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-black text-[#102A43]">
                مركز التقارير الرسمي الموحد (١٥ تقريراً للمديونيات الكبرى والمخالفات والمهام وأداء الإدارات)
              </h3>
              <p className="text-xs font-bold text-slate-600">
                دعم كامل لتصدير Excel باللغة العربية وطباعة A4 بشعار مديرية التموين والتجارة الداخلية بالغربية
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const repObj =
                    officialReportsCatalog.find((r) => r.id === selectedReportId) ||
                    officialReportsCatalog[0];
                  exportCsvUtf8Bom(
                    `${repObj.title}_${todayRef}`,
                    ['م', 'البيان / العنوان', 'القسم / الإدارة', 'المسؤول', 'الحالة / القيمة', 'التاريخ'],
                    tasks.map((t, i) => [
                      i + 1,
                      t.title,
                      t.departmentName,
                      t.primaryAssigneeName,
                      `${t.status} (${t.progressPercent}%)`,
                      t.dueDate,
                    ])
                  );
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير التقرير المختار Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setRepPrintOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>معاينة وطباعة A4 رسمية</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {officialReportsCatalog.map((rep) => {
              const active = selectedReportId === rep.id;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedReportId(rep.id)}
                  className={`p-3 rounded-xl border text-right cursor-pointer transition-all ${
                    active
                      ? 'bg-[#102A43] text-white border-[#102A43] shadow-sm'
                      : 'bg-slate-50 hover:bg-white text-[#102A43] border-slate-200'
                  }`}
                >
                  <span
                    className={`text-[10px] font-black block ${
                      active ? 'text-[#C6A15B]' : 'text-slate-500'
                    }`}
                  >
                    {rep.category}
                  </span>
                  <span className="text-xs font-black mt-0.5 block">{rep.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* نافذة إنشاء مهمة يومية جديدة */}
      {showCreateTaskModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowCreateTaskModal(false)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-3xl w-full overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#102A43] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-base font-black">
                إنشاء وإسناد مهمة يومية جديدة (مع إنشاء غرفة محادثة للمهمة تلقائياً)
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateTaskModal(false)}
                className="p-1.5 rounded-lg bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateTask}
              className="p-5 space-y-3 text-xs max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-black text-[#102A43] mb-1">عنوان المهمة *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: متابعة تحصيل مديونية مخبز / حملة تفتيش صباحية..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black"
                  />
                </div>

                <div>
                  <label className="block font-black text-[#102A43] mb-1">نوع المهمة *</label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value as DailyTaskType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black"
                  >
                    {TASK_TYPES_LIST.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    الإدارة أو القسم المعني *
                  </label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.arabicName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    الموظف المكلف (المسؤول الرئيسي) *
                  </label>
                  <select
                    value={newPrimaryAssigneeId}
                    onChange={(e) => setNewPrimaryAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">درجة الأولوية *</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as DailyTaskPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black"
                  >
                    {TASK_PRIORITIES_LIST.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">تاريخ بداية التنفيذ</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="num-cell w-full px-3 py-2 rounded-xl border border-slate-300 font-black"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    الموعد النهائي للتنفيذ *
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="num-cell w-full px-3 py-2 rounded-xl border border-slate-300 font-black"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">مستوى السرية</label>
                  <select
                    value={newConf}
                    onChange={(e) =>
                      setNewConf(e.target.value as TaskConfidentialityLevel)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="عام للإدارة">عام للإدارة</option>
                    <option value="مقيد للمكلفين">مقيد للمكلفين</option>
                    <option value="سري للإدارة العليا">سري للإدارة العليا</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-black text-slate-700 mb-1">
                    وصف المهمة بالتفصيل والتعليمات المطلوبة
                  </label>
                  <textarea
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="اكتب تفاصيل المهمة والتعليمات المطلوبة..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-black cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] font-black cursor-pointer"
                >
                  إنشاء وإسناد المهمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة متابعة المهمة وإثبات الإنجاز وتبويب «محادثة المهمة» */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-3xl w-full overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#102A43] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-black text-[#C6A15B] block">
                  ملف المهمة رقم {toArabicNumerals(selectedTask.taskNumber)} — {selectedTask.departmentName}
                </span>
                <h3 className="text-sm sm:text-base font-black">{selectedTask.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-lg bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-100 px-4 pt-2 gap-2 text-xs font-black">
              <button
                type="button"
                onClick={() => setTaskModalView('details')}
                className={`px-4 py-2 rounded-t-xl cursor-pointer ${
                  taskModalView === 'details'
                    ? 'bg-white text-[#102A43] border-t-2 border-[#102A43]'
                    : 'text-slate-600'
                }`}
              >
                ١. متابعة المهمة وتقرير الإنجاز
              </button>
              <button
                type="button"
                onClick={() => setTaskModalView('task_chat')}
                className={`px-4 py-2 rounded-t-xl flex items-center gap-1.5 cursor-pointer ${
                  taskModalView === 'task_chat'
                    ? 'bg-white text-[#102A43] border-t-2 border-[#102A43]'
                    : 'text-slate-600'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                <span>٢. محادثة المهمة ({toArabicNumerals(selectedTask.taskNumber)})</span>
              </button>
            </div>

            {taskModalView === 'details' ? (
              <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                {updateError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-950 font-black">
                    {updateError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-bold block">الموظف المكلف</span>
                    <span className="font-black text-[#102A43]">
                      {selectedTask.primaryAssigneeName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">الموعد النهائي</span>
                    <span className="num-cell font-black text-red-700">
                      {formatDateArabic(selectedTask.dueDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">الحالة الحالية</span>
                    <span className="font-black text-[#164E83]">{selectedTask.status}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-black text-[#102A43] mb-1">
                    تحديث نسبة الإنجاز ({toArabicNumerals(updateProgressVal)}٪)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={updateProgressVal}
                    onChange={(e) => setUpdateProgressVal(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block font-black text-[#102A43] mb-1">
                    تقرير الإنجاز الفعلي (إلزامي قبل تحويل المهمة إلى مكتملة أو طلب الاعتماد) *
                  </label>
                  <textarea
                    rows={3}
                    value={updateCompletionReport}
                    onChange={(e) => setUpdateCompletionReport(e.target.value)}
                    placeholder="اكتب بياناً تفصيلياً بما تم تنفيذه من أعمال ومستندات..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={updateCommentText}
                    onChange={(e) => setUpdateCommentText(e.target.value)}
                    placeholder="إضافة تعليق أو ملاحظة في سجل المهمة..."
                    className="px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                  <input
                    type="text"
                    value={updateAttachmentName}
                    onChange={(e) => setUpdateAttachmentName(e.target.value)}
                    placeholder="إرفاق مستند أو صورة إثبات إنجاز..."
                    className="px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleSaveTaskProgressAndStatus('جارٍ التنفيذ')}
                    className="px-3.5 py-2 rounded-xl bg-[#164E83] text-white font-black cursor-pointer"
                  >
                    حفظ التقدم (جارٍ التنفيذ)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveTaskProgressAndStatus('تنتظر اعتماد')}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 text-white font-black cursor-pointer"
                  >
                    تقديم تقرير الإنجاز لطلب الاعتماد
                  </button>
                  {isManagerOrAdmin && (
                    <button
                      type="button"
                      onClick={() => handleSaveTaskProgressAndStatus('مكتملة')}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black cursor-pointer"
                    >
                      اعتماد الإغلاق النهائي (مكتملة)
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-64 overflow-y-auto space-y-2">
                  {messages
                    .filter(
                      (m) =>
                        m.conversationId === `conv-task-${selectedTask.id}` ||
                        (selectedTask.id === 'tsk-2026-001' &&
                          m.conversationId === 'conv-task-001')
                    )
                    .map((m) => (
                      <div key={m.id} className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <div className="flex justify-between font-black text-[#102A43]">
                          <span>{m.senderName}</span>
                          <span className="num-cell text-[10px] text-slate-400">
                            {formatDateArabic(m.sentAt.slice(0, 10))}
                          </span>
                        </div>
                        <p className="font-bold text-slate-700 mt-1">{m.text}</p>
                      </div>
                    ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder={`اكتب رسالة في محادثة المهمة (${selectedTask.taskNumber})...`}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleSendChatMessage(
                        selectedTask.id === 'tsk-2026-001'
                          ? 'conv-task-001'
                          : `conv-task-${selectedTask.id}`
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer"
                  >
                    إرسال للمهمة
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة إنشاء مجموعة شات جديدة للإدارة أو مشتركة بين الإدارات */}
      {showNewGroupModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowNewGroupModal(false)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-md w-full p-5 space-y-3 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black text-[#102A43]">
              إنشاء مجموعة محادثة داخلية للإدارة أو مشتركة بين الإدارات
            </h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="اسم المجموعة..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
            />
            <select
              value={newGroupType}
              onChange={(e) =>
                setNewGroupType(
                  e.target.value as 'department_group' | 'cross_department_group'
                )
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
            >
              <option value="department_group">مجموعة خاصة بإدارة محددة</option>
              <option value="cross_department_group">مجموعة مشتركة بين الإدارات</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewGroupModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 font-black cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newGroupName.trim()) return;
                  const nowIso = new Date().toISOString();
                  const newConv: InternalChatConversation = {
                    id: `conv-grp-${Date.now()}`,
                    title: newGroupName.trim(),
                    type: newGroupType,
                    participantIds: allUsers.map((u) => u.id),
                    participantNames: allUsers.map((u) => u.fullName),
                    isPinned: false,
                    createdAt: nowIso,
                    updatedAt: nowIso,
                  };
                  const next = [newConv, ...conversations];
                  setConversations(next);
                  saveChatConversations(next);
                  setActiveConvId(newConv.id);
                  setNewGroupName('');
                  setShowNewGroupModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#102A43] text-[#C6A15B] font-black cursor-pointer"
              >
                إنشاء المجموعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة طباعة التقارير الرسمية A4 */}
      <OfficialPrintModal
        open={repPrintOpen}
        onClose={() => setRepPrintOpen(false)}
        title={
          officialReportsCatalog.find((r) => r.id === selectedReportId)?.title ||
          'تقرير المهام والمتابعة الرسمي'
        }
        subtitle={`تاريخ الإصدار: ${formatDateArabic(todayRef)}`}
        docNumber={`TSK-REP-${todayRef}`}
        printedBy={currentUser.fullName}
        todayRef={todayRef}
      >
        <table className="w-full text-right text-[10px] border-collapse border border-slate-300">
          <thead className="bg-slate-100 font-black">
            <tr>
              <th className="border border-slate-300 p-1.5">رقم المهمة</th>
              <th className="border border-slate-300 p-1.5">عنوان المهمة</th>
              <th className="border border-slate-300 p-1.5">الإدارة</th>
              <th className="border border-slate-300 p-1.5">الموظف المكلف</th>
              <th className="border border-slate-300 p-1.5">الموعد النهائي</th>
              <th className="border border-slate-300 p-1.5">نسبة الإنجاز</th>
              <th className="border border-slate-300 p-1.5">الحالة</th>
              <th className="border border-slate-300 p-1.5 print:hidden">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((t) => (
              <tr key={t.id}>
                <td className="border border-slate-300 p-1.5 num-cell">{toArabicNumerals(t.taskNumber)}</td>
                <td className="border border-slate-300 p-1.5 font-black">{t.title}</td>
                <td className="border border-slate-300 p-1.5">{t.departmentName}</td>
                <td className="border border-slate-300 p-1.5">{t.primaryAssigneeName}</td>
                <td className="border border-slate-300 p-1.5 num-cell">{formatDateArabic(t.dueDate)}</td>
                <td className="border border-slate-300 p-1.5 num-cell">{toArabicNumerals(t.progressPercent)}٪</td>
                <td className="border border-slate-300 p-1.5 font-bold">{t.status}</td>
                <td className="border border-slate-300 p-1.5 print:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setRepPrintOpen(false);
                      setSelectedTask(t);
                      setUpdateProgressVal(t.progressPercent);
                      setUpdateCompletionReport(t.completionReportText || '');
                      setTaskModalView('details');
                    }}
                    className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] font-black cursor-pointer"
                  >
                    متابعة وإنجاز
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </OfficialPrintModal>
    </div>
  );
}
