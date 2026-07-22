import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { computeEquipmentRisk } from '@/lib/algorithms/supplyChainRisk';

export const dynamic = 'force-dynamic';

export async function GET() {
  const equipment = await prisma.equipment.findMany({
    include: { supplier: true, shipmentEvents: { orderBy: { eventDate: 'asc' } } },
    orderBy: { promisedDelivery: 'asc' },
  });

  const today = new Date();

  const enriched = equipment.map((e) => {
    // Required-on-site date approximated as promised delivery + a standard
    // 14-day install buffer where no linked task exists yet in this view.
    const requiredOnSiteDate = new Date(e.promisedDelivery.getTime() + 14 * 86_400_000);
    const risk = computeEquipmentRisk({
      promisedDelivery: e.promisedDelivery,
      revisedDelivery: e.revisedDelivery,
      actualDelivery: e.actualDelivery,
      requiredOnSiteDate,
      supplierReliabilityScore: e.supplier.reliabilityScore,
      supplierTier: e.supplier.tier,
      isLongLead: e.isLongLead,
      today,
    });

    return {
      id: e.id,
      tagNumber: e.tagNumber,
      description: e.description,
      category: e.category,
      status: e.status,
      isLongLead: e.isLongLead,
      supplier: { name: e.supplier.name, tier: e.supplier.tier, country: e.supplier.country, reliabilityScore: e.supplier.reliabilityScore },
      orderDate: e.orderDate,
      promisedDelivery: e.promisedDelivery,
      revisedDelivery: e.revisedDelivery,
      origin: { lat: e.originLat, lng: e.originLng },
      destination: { lat: e.destinationLat, lng: e.destinationLng },
      lastEvent: e.shipmentEvents[e.shipmentEvents.length - 1] ?? null,
      eventCount: e.shipmentEvents.length,
      risk,
    };
  });

  return NextResponse.json({
    equipment: enriched.sort((a, b) => b.risk.score - a.risk.score),
    summary: {
      total: enriched.length,
      severe: enriched.filter((e) => e.risk.band === 'SEVERE').length,
      high: enriched.filter((e) => e.risk.band === 'HIGH').length,
      moderate: enriched.filter((e) => e.risk.band === 'MODERATE').length,
      low: enriched.filter((e) => e.risk.band === 'LOW').length,
    },
  });
}
