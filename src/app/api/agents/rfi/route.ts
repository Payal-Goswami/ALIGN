import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findSimilarRfis } from '@/lib/algorithms/rfiSearch';
import { synthesizeRfiAnswer } from '@/lib/llm/prompts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rfis = await prisma.rFI.findMany({ orderBy: { submittedAt: 'desc' } });
  return NextResponse.json({
    rfis: rfis.map((r) => ({
      id: r.id,
      number: r.number,
      subject: r.subject,
      question: r.question,
      discipline: r.discipline,
      status: r.status,
      submittedAt: r.submittedAt,
      answerText: r.answerText,
      costImpact: r.costImpact,
      scheduleImpactDays: r.scheduleImpactDays,
    })),
  });
}

/**
 * Body: { question: string, excludeRfiId?: string }
 * Runs the deterministic TF-IDF retrieval first (which prior RFIs are
 * relevant), then hands ONLY those retrieved facts to the LLM to phrase a
 * suggested answer — the retrieval ranking is never delegated to the model.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question: string | undefined = body.question;
  if (!question) return NextResponse.json({ error: 'question is required' }, { status: 400 });

  const allRfis = await prisma.rFI.findMany({
    where: body.excludeRfiId ? { id: { not: body.excludeRfiId } } : undefined,
  });

  const matches = findSimilarRfis(
    question,
    allRfis.map((r) => ({ id: r.id, number: r.number, subject: r.subject, question: r.question, answerText: r.answerText, status: r.status })),
    5
  );

  const result = await synthesizeRfiAnswer({
    question,
    matches: matches.map((m) => ({ number: m.document.number, subject: m.document.subject, answerText: m.document.answerText, similarity: m.similarity })),
  });

  return NextResponse.json({
    matches: matches.map((m) => ({
      rfiId: m.document.id,
      number: m.document.number,
      subject: m.document.subject,
      similarity: Number(m.similarity.toFixed(3)),
      status: m.document.status,
      hasAnswer: !!m.document.answerText,
    })),
    suggestedAnswer: result.text,
    model: result.model,
    usedFallbackTemplate: result.usedFallbackTemplate,
  });
}
