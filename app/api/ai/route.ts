import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/lib/server/auth-guard';
import {
  checkSlidingWindowRateLimit,
  rateLimitExceededResponse,
} from '@/lib/server/rate-limit';

const AiRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, 'النص المطلوب فارغ.')
    .max(8000, 'الحد الأقصى لطول النص هو ٨٠٠٠ حرف.'),
  systemInstruction: z.string().trim().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  // Always verify session directly in route handler
  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const rl = checkSlidingWindowRateLimit({
    key: `api:ai:${auth.session.userId}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(
      'تم تجاوز الحد المسموح لطلبات المساعد الذكي (٢٠ طلباً كل ١٠ دقائق). يرجى المحاولة لاحقاً.',
      rl.retryAfterSeconds
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }

  const parsed = AiRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || 'بيانات الطلب غير مطابقة للمواصفات.';
    return NextResponse.json({ ok: false, error: firstIssue }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? '';
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'خدمة الذكاء الاصطناعي غير مهيأة حالياً على الخادم.' },
      { status: 503 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parsed.data.prompt,
      config: parsed.data.systemInstruction
        ? { systemInstruction: parsed.data.systemInstruction }
        : undefined,
    });

    return NextResponse.json(
      { ok: true, text: response.text ?? '' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    // Never return raw error stacks or API key details to the client
    return NextResponse.json(
      { ok: false, error: 'تعذر معالجة طلب التحليل الذكي حالياً. يرجى المحاولة لاحقاً.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
