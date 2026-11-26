import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/auth-guard';
import { rateLimit, tooManyRequests } from '@/lib/server/rate-limit';

const AiRequestSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(1, 'النص المطلوب فارغ.')
      .max(8000, 'الحد الأقصى لطول النص هو ٨٠٠٠ حرف.'),
    systemInstruction: z.string().trim().max(2000).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const g = await requireSession(request);
  if (!g.ok) return g.response;

  const rl = rateLimit('ai:' + g.session.sub, 20, 10 * 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
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
