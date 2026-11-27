import { z } from 'zod';

/**
 * Sanitizes user-provided strings to prevent XSS, HTML tag injection, script URL schemes,
 * null bytes, and malformed control characters.
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    // Strip null bytes and non-printable control characters (keep newlines/tabs)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Remove dangerous HTML script/style/iframe/object/embed blocks
    .replace(/<(script|style|iframe|object|embed|svg|math)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Strip any remaining HTML tags
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    // Strip inline event handlers & dangerous URI schemes
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/\bon[a-z]+\s*=/gi, '')
    // Neutralize remaining angle brackets
    .replace(/[<>]/g, '')
    .trim();
}

const DANGEROUS_PAYLOAD_PATTERN =
  /(<\s*\/?\s*(script|iframe|object|embed|svg|img|style|link|meta)\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|\bon[a-z]{2,}\s*=)/i;

/**
 * Creates a sanitized Zod string schema that rejects XSS/injection payloads and normalizes input.
 */
export function sanitizedString(options: {
  min?: number;
  max?: number;
  minMessage?: string;
  maxMessage?: string;
  pattern?: RegExp;
  patternMessage?: string;
} = {}) {
  const {
    min = 0,
    max = 500,
    minMessage = 'هذا الحقل مطلوب',
    maxMessage = `الحد الأقصى لطول النص هو ${max} حرفاً`,
    pattern,
    patternMessage = 'صيغة الحقل غير صالحة',
  } = options;

  let base = z
    .string()
    .max(max * 2, { message: maxMessage })
    .refine((val) => !DANGEROUS_PAYLOAD_PATTERN.test(val), {
      message: 'تم رفض الإدخال لاحتوائه على رموز أو وسوم برمجية غير آمنة (XSS Protection).',
    })
    .transform((val) => sanitizeText(val))
    .refine((val) => val.length >= min, { message: minMessage })
    .refine((val) => val.length <= max, { message: maxMessage });

  if (pattern) {
    base = base.refine((val) => pattern.test(val), { message: patternMessage });
  }

  return base;
}

export const loginFormSchema = z.object({
  username: sanitizedString({
    min: 1,
    max: 80,
    minMessage: 'اسم المستخدم مطلوب',
  }),
  password: z
    .string()
    .min(1, { message: 'كلمة المرور مطلوبة' })
    .max(256, { message: 'كلمة المرور طويلة جداً' }),
  branchId: sanitizedString({ min: 0, max: 40 }).optional(),
  isDirectRegistration: z.boolean().optional(),
  registeredUser: z
    .object({
      id: sanitizedString({ min: 1, max: 60 }),
      fullName: sanitizedString({ min: 2, max: 140 }),
      role: sanitizedString({ min: 2, max: 60 }),
      primaryBranchId: sanitizedString({ min: 1, max: 40 }),
    })
    .optional(),
});

export const forgotPasswordStep1Schema = z.object({
  identifier: sanitizedString({
    min: 3,
    max: 80,
    minMessage: 'يرجى إدخال اسم المستخدم أو الرقم القومي بشكل صحيح',
  }),
});

export const forgotPasswordStep2Schema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, { message: 'رمز التحقق يجب أن يتكون من ٤ إلى ٦ أرقام' }),
});

export const forgotPasswordStep3Schema = z
  .object({
    newPassword: z.string().min(6, { message: 'كلمة المرور الجديدة يجب أن تكون ٦ أحرف على الأقل' }).max(128),
    confirmNewPassword: z.string().min(6, { message: 'تأكيد كلمة المرور مطلوب' }).max(128),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'كلمة المرور الجديدة وتأكيدها غير متطابقين',
    path: ['confirmNewPassword'],
  });

export const registerSchema = z
  .object({
    fullName: sanitizedString({
      min: 6,
      max: 140,
      minMessage: 'الاسم الرباعي يجب أن يكون 6 أحرف على الأقل',
    }),
    nationalId: z
      .string()
      .trim()
      .regex(/^\d{14}$/, { message: 'الرقم القومي يجب أن يتكون من 14 رقماً بالضبط دون حروف أو رموز' }),
    phone: z
      .string()
      .trim()
      .regex(/^01[0125]\d{8}$/, {
        message: 'رقم الهاتف يجب أن يتكون من 11 رقماً مصرياً صحيحاً (يبدأ بـ 010 أو 011 أو 012 أو 015)',
      }),
    email: z
      .string()
      .trim()
      .email({ message: 'البريد الإلكتروني غير صحيح' })
      .max(140)
      .optional()
      .or(z.literal('')),
    username: sanitizedString({
      min: 3,
      max: 60,
      minMessage: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل',
      pattern: /^[a-zA-Z0-9_.\-\u0600-\u06FF]+$/,
      patternMessage: 'اسم المستخدم يجب ألا يحتوي على رموز خاصة غير مسموحة',
    }),
    tempPassword: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }).max(128),
    confirmPassword: z.string().min(6, { message: 'تأكيد كلمة المرور مطلوب' }).max(128),
    jobTitle: sanitizedString({
      min: 2,
      max: 120,
      minMessage: 'المسمى الوظيفي مطلوب',
    }),
  })
  .refine((data) => data.tempPassword === data.confirmPassword, {
    message: 'كلمة المرور وتأكيد كلمة المرور غير متطابقين',
    path: ['confirmPassword'],
  });

export const bakeryStep1Schema = z.object({
  bakeryNumber: sanitizedString({ min: 1, max: 40, minMessage: 'رقم المخبز مطلوب' }),
  posNumber: sanitizedString({ min: 2, max: 50, minMessage: 'رقم ماكينة POS مطلوب' }),
  name: sanitizedString({ min: 3, max: 140, minMessage: 'اسم المخبز مطلوب (3 أحرف على الأقل)' }),
  village: sanitizedString({ min: 2, max: 100, minMessage: 'يرجى تحديد القرية' }),
  localUnit: sanitizedString({ min: 2, max: 120, minMessage: 'الوحدة المحلية مطلوبة' }),
  address: sanitizedString({ min: 4, max: 250, minMessage: 'العنوان التفصيلي للمخبز مطلوب' }),
});

export const bakeryStep2Schema = z.object({
  ownerName: sanitizedString({ min: 4, max: 140, minMessage: 'اسم صاحب المخبز الرباعي مطلوب' }),
  ownerNationalId: z
    .string()
    .trim()
    .regex(/^\d{14}$/, { message: 'الرقم القومي لصاحب المخبز يجب أن يتكون من 14 رقماً بالضبط' }),
  phone: z
    .string()
    .trim()
    .regex(/^01[0125]\d{8}$/, { message: 'رقم هاتف صاحب المخبز يجب أن يتكون من 11 رقماً صحيحاً' }),
});

export const inspectionFormSchema = z.object({
  recordNumber: sanitizedString({ min: 2, max: 60, minMessage: 'رقم المحضر أو الحملة مطلوب' }),
  bakeryId: sanitizedString({ min: 1, max: 60, minMessage: 'يرجى اختيار المخبز' }),
  inspectorName: sanitizedString({ min: 3, max: 120, minMessage: 'اسم المفتش المسؤول مطلوب' }),
  violationTitle: sanitizedString({ min: 4, max: 300, minMessage: 'وصف المخالفة أو نتيجة المرور مطلوب' }),
  fineAmountEgp: z.coerce.number().min(0, { message: 'قيمة الغرامة لا يمكن أن تكون سالبة' }).max(10_000_000),
  notes: sanitizedString({ min: 0, max: 600 }).optional(),
});

export const debtTransactionFormSchema = z.object({
  receiptNumber: sanitizedString({ min: 2, max: 60, minMessage: 'رقم الإيصال أو المستند مطلوب' }),
  bakeryId: sanitizedString({ min: 1, max: 60, minMessage: 'يرجى اختيار المخبز' }),
  amountEgp: z.coerce.number().positive({ message: 'المبلغ يجب أن يكون أكبر من صفر' }).max(50_000_000),
  paymentMethod: sanitizedString({ min: 2, max: 120, minMessage: 'طريقة السداد أو القيد مطلوبة' }),
  notes: sanitizedString({ min: 0, max: 600 }).optional(),
});

export const taskCreationFormSchema = z.object({
  title: sanitizedString({ min: 3, max: 180, minMessage: 'عنوان المهمة مطلوب (٣ أحرف على الأقل)' }),
  description: sanitizedString({ min: 3, max: 1000, minMessage: 'تفاصيل المهمة مطلوبة' }),
  requiredInstructions: sanitizedString({ min: 0, max: 600 }).optional(),
  notes: sanitizedString({ min: 0, max: 600 }).optional(),
});

export const internalChatMessageSchema = z.object({
  text: sanitizedString({
    min: 1,
    max: 1500,
    minMessage: 'نص الرسالة لا يمكن أن يكون فارغاً أو يحتوي على وسوم غير آمنة',
  }),
});

export const searchInputSchema = z.object({
  query: sanitizedString({ min: 0, max: 200 }),
});

export const auditLogCreateSchema = z.object({
  action: sanitizedString({ min: 2, max: 140, minMessage: 'اسم العملية مطلوب' }),
  module: sanitizedString({ min: 2, max: 140, minMessage: 'اسم القسم أو الوحدة مطلوب' }),
  details: sanitizedString({ min: 2, max: 600, minMessage: 'تفاصيل العملية مطلوبة' }),
  branchId: sanitizedString({ min: 0, max: 40 }).optional(),
  fullName: sanitizedString({ min: 0, max: 140 }).optional(),
  status: z.enum(['success', 'failed', 'warning']).default('success'),
});

