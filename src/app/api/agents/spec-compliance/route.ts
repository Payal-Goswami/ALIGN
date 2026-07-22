import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { explainNonConformance } from '@/lib/llm/prompts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [submittals, nonConformances, specDocs] = await Promise.all([
    prisma.submittal.findMany({
      include: { contractor: true, requirement: { include: { specDoc: true } }, equipment: true },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.nonConformance.findMany({
      include: { submittal: true, requirement: true },
      orderBy: { raisedAt: 'desc' },
    }),
    prisma.specificationDocument.findMany({ include: { requirements: true } }),
  ]);

  return NextResponse.json({
    specDocs: specDocs.map((d) => ({ id: d.id, title: d.title, standardRef: d.standardRef, version: d.version, requirementCount: d.requirements.length })),
    submittals: submittals.map((s) => ({
      id: s.id,
      submittalNumber: s.submittalNumber,
      title: s.title,
      contractor: s.contractor.companyName,
      status: s.status,
      submittedAt: s.submittedAt,
      requirement: s.requirement ? { clauseRef: s.requirement.clauseRef, parameter: s.requirement.parameter, standardRef: s.requirement.specDoc.standardRef } : null,
      submittedValue: s.submittedValue,
      requiredValue: s.requirement?.requiredValue ?? null,
    })),
    nonConformances: nonConformances.map((nc) => ({
      id: nc.id,
      severity: nc.severity,
      status: nc.status,
      deviationDetail: nc.deviationDetail,
      raisedAt: nc.raisedAt,
      submittalNumber: nc.submittal?.submittalNumber ?? null,
      submittalTitle: nc.submittal?.title ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const nonConformanceId: string | undefined = body.nonConformanceId;
  if (!nonConformanceId) return NextResponse.json({ error: 'nonConformanceId is required' }, { status: 400 });

  const nc = await prisma.nonConformance.findUnique({ where: { id: nonConformanceId }, include: { submittal: true } });
  if (!nc) return NextResponse.json({ error: 'Non-conformance not found' }, { status: 404 });

  const result = await explainNonConformance({
    deviationDetail: nc.deviationDetail,
    severity: nc.severity,
    submittalTitle: nc.submittal?.title ?? 'Submittal',
  });

  return NextResponse.json({ explanationText: result.text, model: result.model, usedFallbackTemplate: result.usedFallbackTemplate });
}
