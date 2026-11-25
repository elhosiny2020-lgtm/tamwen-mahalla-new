import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(6, { message: 'الاسم الرباعي يجب أن يكون 6 أحرف على الأقل' }),
  nationalId: z
    .string()
    .regex(/^\d{14}$/, { message: 'الرقم القومي يجب أن يتكون من 14 رقماً بالضبط دون حروف أو رموز' }),
  phone: z
    .string()
    .regex(/^01[0125]\d{8}$/, { message: 'رقم الهاتف يجب أن يتكون من 11 رقماً مصرياً صحيحاً (يبدأ بـ 010 أو 011 أو 012 أو 015)' }),
  email: z.string().email({ message: 'البريد الإلكتروني غير صحيح' }).optional().or(z.literal('')),
  username: z.string().min(3, { message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' }),
  tempPassword: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
  confirmPassword: z.string().min(6, { message: 'تأكيد كلمة المرور مطلوب' }),
  jobTitle: z.string().min(2, { message: 'المسمى الوظيفي مطلوب' }),
}).refine((data) => data.tempPassword === data.confirmPassword, {
  message: 'كلمة المرور وتأكيد كلمة المرور غير متطابقين',
  path: ['confirmPassword'],
});

export const bakeryStep1Schema = z.object({
  bakeryNumber: z.string().min(1, { message: 'رقم المخبز مطلوب' }),
  posNumber: z.string().min(2, { message: 'رقم ماكينة POS مطلوب' }),
  name: z.string().min(3, { message: 'اسم المخبز مطلوب (3 أحرف على الأقل)' }),
  village: z.string().min(2, { message: 'يرجى تحديد القرية' }),
  localUnit: z.string().min(2, { message: 'الوحدة المحلية مطلوبة' }),
  address: z.string().min(4, { message: 'العنوان التفصيلي للمخبز مطلوب' }),
});

export const bakeryStep2Schema = z.object({
  ownerName: z.string().min(4, { message: 'اسم صاحب المخبز الرباعي مطلوب' }),
  ownerNationalId: z
    .string()
    .regex(/^\d{14}$/, { message: 'الرقم القومي لصاحب المخبز يجب أن يتكون من 14 رقماً بالضبط' }),
  phone: z
    .string()
    .regex(/^01[0125]\d{8}$/, { message: 'رقم هاتف صاحب المخبز يجب أن يتكون من 11 رقماً صحيحاً' }),
});
