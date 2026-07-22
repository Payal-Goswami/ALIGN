/**
 * Seed script
 * ===========
 * Builds one realistic data-centre EPC project end-to-end. Per the platform's
 * data policy, nothing here is a meaningless placeholder:
 *   - Task dates are DERIVED from the Critical Path Method over real
 *     durations + dependencies (src/lib/algorithms/criticalPath.ts) — not
 *     typed in by hand.
 *   - Schedule conflicts feed the actual Nash-bargaining negotiation engine
 *     (src/lib/algorithms/negotiation.ts) to produce their resolution.
 *   - Submittal non-conformances are produced by the actual deterministic
 *     compliance checker (src/lib/algorithms/specCompliance.ts) against the
 *     seeded spec requirements — the deviation numbers are computed, not
 *     invented per-row.
 * Sources informing realistic structure/values are documented in
 * docs/DATASETS.md (Kaggle construction-schedule/delay datasets, TIA-942 /
 * BICSI 002 / Uptime Institute public standard structures, Open-Meteo,
 * Nager.Date public holiday API).
 */
import { PrismaClient } from '@prisma/client';
import { addDays } from 'date-fns';
import { computeCriticalPath, CpmDependencyInput, CpmTaskInput } from '../src/lib/algorithms/criticalPath';
import { negotiateScheduleConflict } from '../src/lib/algorithms/negotiation';
import { checkSubmittalAgainstRequirement } from '../src/lib/algorithms/specCompliance';

const prisma = new PrismaClient();

// --- deterministic PRNG so the seed is reproducible run-to-run ---
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260719);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]!;

const PROJECT_START = new Date('2025-09-01T00:00:00.000Z');

async function main() {
  console.log('Seeding EPC Project Intelligence platform...');

  await prisma.auditLog.deleteMany();
  await prisma.nonConformance.deleteMany();
  await prisma.submittal.deleteMany();
  await prisma.specRequirement.deleteMany();
  await prisma.specificationDocument.deleteMany();
  await prisma.shipmentEvent.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.negotiationOutcome.deleteMany();
  await prisma.negotiationRound.deleteMany();
  await prisma.negotiationParticipant.deleteMany();
  await prisma.negotiationSession.deleteMany();
  await prisma.scheduleConflict.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.rFI.deleteMany();
  await prisma.changeOrder.deleteMany();
  await prisma.commissioningTest.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tradeContractor.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.project.deleteMany();

  // ==========================================================================
  // PROJECT
  // ==========================================================================
  const project = await prisma.project.create({
    data: {
      name: 'Hyderabad Hyperscale Campus — Phase 1',
      siteName: 'Shamshabad Data Centre Park, Telangana',
      siteLat: 17.4065,
      siteLng: 78.4772,
      tierTarget: 'Tier III',
      capacityMw: 36,
      startDate: PROJECT_START,
      targetEndDate: addDays(PROJECT_START, 560),
    },
  });

  await prisma.userProfile.createMany({
    data: [
      { id: 'usr-pmo-01', email: 'pmo.lead@campus-epc.example', fullName: 'Ananya Rao', role: 'PMO' },
      { id: 'usr-qa-01', email: 'qaqc.lead@campus-epc.example', fullName: 'Vikram Sethi', role: 'QA_QC', discipline: 'Quality' },
      { id: 'usr-eng-01', email: 'electrical.eng@campus-epc.example', fullName: 'Farah Khan', role: 'ENGINEER', discipline: 'Electrical' },
    ],
  });

  // ==========================================================================
  // TRADE CONTRACTORS — the negotiating agents
  // ==========================================================================
  type ContractorSeed = {
    key: string;
    companyName: string;
    trade: string;
    crewSize: number;
    crewSizeFlex: number;
    mobilizationDays: number;
    otherActiveSites: number;
    penaltyExposureInr: number;
    dailyPenaltyRateInr: number;
    floatProtectionBias: number;
    reliabilityScore: number;
    contactName: string;
    contactPhone: string;
  };

  const contractorSeeds: ContractorSeed[] = [
    { key: 'civil', companyName: 'Shivam Infra Projects Pvt. Ltd.', trade: 'Civil & Site Works', crewSize: 85, crewSizeFlex: 15, mobilizationDays: 5, otherActiveSites: 2, penaltyExposureInr: 4_500_000, dailyPenaltyRateInr: 150_000, floatProtectionBias: 0.4, reliabilityScore: 0.82, contactName: 'Rajeev Malhotra', contactPhone: '+91 98200 11223' },
    { key: 'structural', companyName: 'Larsen Sridhar Constructions', trade: 'Structural & RCC Works', crewSize: 120, crewSizeFlex: 20, mobilizationDays: 7, otherActiveSites: 3, penaltyExposureInr: 8_200_000, dailyPenaltyRateInr: 280_000, floatProtectionBias: 0.55, reliabilityScore: 0.88, contactName: 'Suresh Pillai', contactPhone: '+91 98450 22334' },
    { key: 'electrical', companyName: 'Voltas Power Systems Ltd.', trade: 'Electrical - HV/MV/LV Infrastructure', crewSize: 60, crewSizeFlex: 8, mobilizationDays: 10, otherActiveSites: 4, penaltyExposureInr: 12_000_000, dailyPenaltyRateInr: 420_000, floatProtectionBias: 0.7, reliabilityScore: 0.79, contactName: 'Meera Iyer', contactPhone: '+91 98100 33445' },
    { key: 'mechanical', companyName: 'Blue Star Thermal Engineering', trade: 'Mechanical - Cooling Plant', crewSize: 55, crewSizeFlex: 10, mobilizationDays: 8, otherActiveSites: 3, penaltyExposureInr: 9_500_000, dailyPenaltyRateInr: 310_000, floatProtectionBias: 0.6, reliabilityScore: 0.84, contactName: 'Karthik Subramanian', contactPhone: '+91 98730 44556' },
    { key: 'fire', companyName: 'Kidde Fire Systems India Pvt. Ltd.', trade: 'Fire & Life Safety', crewSize: 25, crewSizeFlex: 5, mobilizationDays: 6, otherActiveSites: 5, penaltyExposureInr: 3_200_000, dailyPenaltyRateInr: 95_000, floatProtectionBias: 0.5, reliabilityScore: 0.9, contactName: 'Priya Nair', contactPhone: '+91 99020 55667' },
    { key: 'itfit', companyName: 'Sterlite Structured Cabling Pvt. Ltd.', trade: 'Structured Cabling & IT Fit-out', crewSize: 40, crewSizeFlex: 12, mobilizationDays: 4, otherActiveSites: 6, penaltyExposureInr: 5_600_000, dailyPenaltyRateInr: 160_000, floatProtectionBias: 0.45, reliabilityScore: 0.81, contactName: 'Arjun Deshmukh', contactPhone: '+91 98330 66778' },
    { key: 'bms', companyName: 'Honeywell Building Solutions India', trade: 'BMS & Controls Integration', crewSize: 20, crewSizeFlex: 4, mobilizationDays: 12, otherActiveSites: 8, penaltyExposureInr: 2_800_000, dailyPenaltyRateInr: 80_000, floatProtectionBias: 0.4, reliabilityScore: 0.86, contactName: 'Divya Menon', contactPhone: '+91 97400 77889' },
    { key: 'commissioning', companyName: 'Uptime Compliance Partners LLP', trade: 'Commissioning Authority', crewSize: 15, crewSizeFlex: 3, mobilizationDays: 14, otherActiveSites: 2, penaltyExposureInr: 6_000_000, dailyPenaltyRateInr: 200_000, floatProtectionBias: 0.65, reliabilityScore: 0.91, contactName: 'Nikhil Bhatt', contactPhone: '+91 98980 88990' },
  ];

  const contractors: Record<string, string> = {};
  for (const c of contractorSeeds) {
    const created = await prisma.tradeContractor.create({
      data: {
        projectId: project.id,
        companyName: c.companyName,
        trade: c.trade,
        crewSize: c.crewSize,
        crewSizeFlex: c.crewSizeFlex,
        mobilizationDays: c.mobilizationDays,
        otherActiveSites: c.otherActiveSites,
        penaltyExposureInr: c.penaltyExposureInr,
        dailyPenaltyRateInr: c.dailyPenaltyRateInr,
        floatProtectionBias: c.floatProtectionBias,
        reliabilityScore: c.reliabilityScore,
        contactName: c.contactName,
        contactPhone: c.contactPhone,
      },
    });
    contractors[c.key] = created.id;
  }

  // ==========================================================================
  // TASKS (WBS) — grouped by phase. Dates are NOT hand-set: they are derived
  // below by running the real CPM algorithm over durations + dependencies.
  // ==========================================================================
  type TaskSeed = {
    key: string;
    wbsCode: string;
    name: string;
    discipline: string;
    system: string;
    zone: string;
    contractorKey: string;
    durationDays: number;
  };

  const taskSeeds: TaskSeed[] = [
    // --- Civil & Site (SW) ---
    { key: 'sw01', wbsCode: 'SW-010', name: 'Site clearance & grading', discipline: 'Civil', system: 'Site Works', zone: 'Site-wide', contractorKey: 'civil', durationDays: 12 },
    { key: 'sw02', wbsCode: 'SW-020', name: 'Boundary wall & security fencing', discipline: 'Civil', system: 'Site Works', zone: 'Site-wide', contractorKey: 'civil', durationDays: 15 },
    { key: 'sw03', wbsCode: 'SW-030', name: 'Storm water drainage network', discipline: 'Civil', system: 'Site Works', zone: 'Site-wide', contractorKey: 'civil', durationDays: 20 },
    { key: 'sw04', wbsCode: 'SW-040', name: 'Access roads & hardstand paving', discipline: 'Civil', system: 'Site Works', zone: 'Site-wide', contractorKey: 'civil', durationDays: 18 },
    { key: 'sw05', wbsCode: 'SW-050', name: 'Generator yard foundation', discipline: 'Civil', system: 'Generator Yard', zone: 'Generator Yard', contractorKey: 'civil', durationDays: 14 },
    { key: 'sw06', wbsCode: 'SW-060', name: 'Cooling tower plinth foundation', discipline: 'Civil', system: 'Cooling Plant', zone: 'Mechanical Yard', contractorKey: 'civil', durationDays: 10 },
    { key: 'sw07', wbsCode: 'SW-070', name: 'Fire water storage tank foundation', discipline: 'Civil', system: 'Fire & Life Safety', zone: 'Site-wide', contractorKey: 'civil', durationDays: 9 },
    { key: 'sw08', wbsCode: 'SW-080', name: 'Diesel yard bunded containment', discipline: 'Civil', system: 'Generator Yard', zone: 'Generator Yard', contractorKey: 'civil', durationDays: 11 },

    // --- Structural (ST) ---
    { key: 'st01', wbsCode: 'ST-010', name: 'Raft foundation — Data Hall Block A', discipline: 'Structural', system: 'Structure', zone: 'Data Hall A', contractorKey: 'structural', durationDays: 25 },
    { key: 'st02', wbsCode: 'ST-020', name: 'Raft foundation — Data Hall Block B', discipline: 'Structural', system: 'Structure', zone: 'Data Hall B', contractorKey: 'structural', durationDays: 25 },
    { key: 'st03', wbsCode: 'ST-030', name: 'RCC columns & shear walls — ground floor', discipline: 'Structural', system: 'Structure', zone: 'Data Hall A', contractorKey: 'structural', durationDays: 30 },
    { key: 'st04', wbsCode: 'ST-040', name: 'RCC columns & shear walls — first floor', discipline: 'Structural', system: 'Structure', zone: 'Data Hall A', contractorKey: 'structural', durationDays: 28 },
    { key: 'st05', wbsCode: 'ST-050', name: 'Post-tensioned slab — Data Hall roof', discipline: 'Structural', system: 'Structure', zone: 'Data Hall A', contractorKey: 'structural', durationDays: 22 },
    { key: 'st06', wbsCode: 'ST-060', name: 'Steel structure — Generator yard canopy', discipline: 'Structural', system: 'Generator Yard', zone: 'Generator Yard', contractorKey: 'structural', durationDays: 16 },
    { key: 'st07', wbsCode: 'ST-070', name: 'Raised access floor substructure', discipline: 'Structural', system: 'Structure', zone: 'Data Hall A', contractorKey: 'structural', durationDays: 14 },
    { key: 'st08', wbsCode: 'ST-080', name: 'External cladding & facade', discipline: 'Structural', system: 'Structure', zone: 'Site-wide', contractorKey: 'structural', durationDays: 24 },

    // --- Electrical (EL) ---
    { key: 'el01', wbsCode: 'EL-010', name: 'HV substation civil handover & termination', discipline: 'Electrical', system: 'HV/MV Substation', zone: 'MV Substation', contractorKey: 'electrical', durationDays: 12 },
    { key: 'el02', wbsCode: 'EL-020', name: 'Transformer installation — Tx1/Tx2', discipline: 'Electrical', system: 'HV/MV Substation', zone: 'MV Substation', contractorKey: 'electrical', durationDays: 15 },
    { key: 'el03', wbsCode: 'EL-030', name: 'Generator installation — 2MW DG sets (x4)', discipline: 'Electrical', system: 'Standby Power', zone: 'Generator Yard', contractorKey: 'electrical', durationDays: 20 },
    { key: 'el04', wbsCode: 'EL-040', name: 'Switchgear installation — MV panels', discipline: 'Electrical', system: 'HV/MV Substation', zone: 'MV Substation', contractorKey: 'electrical', durationDays: 18 },
    { key: 'el05', wbsCode: 'EL-050', name: 'UPS system installation — Data Hall A', discipline: 'Electrical', system: 'UPS Plant', zone: 'Data Hall A', contractorKey: 'electrical', durationDays: 16 },
    { key: 'el06', wbsCode: 'EL-060', name: 'UPS system installation — Data Hall B', discipline: 'Electrical', system: 'UPS Plant', zone: 'Data Hall B', contractorKey: 'electrical', durationDays: 16 },
    { key: 'el07', wbsCode: 'EL-070', name: 'Busway installation — PDU distribution', discipline: 'Electrical', system: 'Power Distribution', zone: 'Data Hall A', contractorKey: 'electrical', durationDays: 14 },
    { key: 'el08', wbsCode: 'EL-080', name: 'Earthing & lightning protection system', discipline: 'Electrical', system: 'Earthing', zone: 'Site-wide', contractorKey: 'electrical', durationDays: 10 },

    // --- Mechanical (ME) ---
    { key: 'me01', wbsCode: 'ME-010', name: 'Chilled water piping — primary loop', discipline: 'Mechanical', system: 'Chilled Water', zone: 'Mechanical Yard', contractorKey: 'mechanical', durationDays: 20 },
    { key: 'me02', wbsCode: 'ME-020', name: 'Chiller installation (x3)', discipline: 'Mechanical', system: 'Chilled Water', zone: 'Mechanical Yard', contractorKey: 'mechanical', durationDays: 18 },
    { key: 'me03', wbsCode: 'ME-030', name: 'Cooling tower installation', discipline: 'Mechanical', system: 'Cooling Plant', zone: 'Mechanical Yard', contractorKey: 'mechanical', durationDays: 14 },
    { key: 'me04', wbsCode: 'ME-040', name: 'CRAH unit installation — Data Hall A', discipline: 'Mechanical', system: 'CRAC/CRAH', zone: 'Data Hall A', contractorKey: 'mechanical', durationDays: 15 },
    { key: 'me05', wbsCode: 'ME-050', name: 'CRAH unit installation — Data Hall B', discipline: 'Mechanical', system: 'CRAC/CRAH', zone: 'Data Hall B', contractorKey: 'mechanical', durationDays: 15 },
    { key: 'me06', wbsCode: 'ME-060', name: 'Chilled water pump skid installation', discipline: 'Mechanical', system: 'Chilled Water', zone: 'Mechanical Yard', contractorKey: 'mechanical', durationDays: 10 },
    { key: 'me07', wbsCode: 'ME-070', name: 'Condenser water piping network', discipline: 'Mechanical', system: 'Cooling Plant', zone: 'Mechanical Yard', contractorKey: 'mechanical', durationDays: 12 },

    // --- Fire & Life Safety (FS) ---
    { key: 'fs01', wbsCode: 'FS-010', name: 'Fire pump house installation', discipline: 'Fire & Life Safety', system: 'Fire Suppression', zone: 'Site-wide', contractorKey: 'fire', durationDays: 10 },
    { key: 'fs02', wbsCode: 'FS-020', name: 'Clean-agent suppression — Data Hall A', discipline: 'Fire & Life Safety', system: 'Fire Suppression', zone: 'Data Hall A', contractorKey: 'fire', durationDays: 12 },
    { key: 'fs03', wbsCode: 'FS-030', name: 'Clean-agent suppression — Data Hall B', discipline: 'Fire & Life Safety', system: 'Fire Suppression', zone: 'Data Hall B', contractorKey: 'fire', durationDays: 12 },
    { key: 'fs04', wbsCode: 'FS-040', name: 'VESDA early smoke detection installation', discipline: 'Fire & Life Safety', system: 'Fire Detection', zone: 'Data Hall A', contractorKey: 'fire', durationDays: 8 },
    { key: 'fs05', wbsCode: 'FS-050', name: 'Fire alarm control panel integration', discipline: 'Fire & Life Safety', system: 'Fire Detection', zone: 'Site-wide', contractorKey: 'fire', durationDays: 9 },

    // --- IT Fit-out (IT) ---
    { key: 'it01', wbsCode: 'IT-010', name: 'Hot/cold aisle containment installation — Data Hall A', discipline: 'IT Infrastructure', system: 'IT Fit-out', zone: 'Data Hall A', contractorKey: 'itfit', durationDays: 10 },
    { key: 'it02', wbsCode: 'IT-020', name: 'Server rack installation — Data Hall A', discipline: 'IT Infrastructure', system: 'IT Fit-out', zone: 'Data Hall A', contractorKey: 'itfit', durationDays: 12 },
    { key: 'it03', wbsCode: 'IT-030', name: 'Server rack installation — Data Hall B', discipline: 'IT Infrastructure', system: 'IT Fit-out', zone: 'Data Hall B', contractorKey: 'itfit', durationDays: 12 },
    { key: 'it04', wbsCode: 'IT-040', name: 'Structured cabling backbone', discipline: 'IT Infrastructure', system: 'Structured Cabling', zone: 'Data Hall A', contractorKey: 'itfit', durationDays: 14 },
    { key: 'it05', wbsCode: 'IT-050', name: 'Network cross-connect room fit-out', discipline: 'IT Infrastructure', system: 'Structured Cabling', zone: 'MDF Room', contractorKey: 'itfit', durationDays: 9 },

    // --- BMS & Controls (BM) ---
    { key: 'bm01', wbsCode: 'BM-010', name: 'BMS head-end server installation', discipline: 'Controls', system: 'BMS', zone: 'MDF Room', contractorKey: 'bms', durationDays: 6 },
    { key: 'bm02', wbsCode: 'BM-020', name: 'DDC controller integration — electrical plant', discipline: 'Controls', system: 'BMS', zone: 'MV Substation', contractorKey: 'bms', durationDays: 10 },
    { key: 'bm03', wbsCode: 'BM-030', name: 'DDC controller integration — mechanical plant', discipline: 'Controls', system: 'BMS', zone: 'Mechanical Yard', contractorKey: 'bms', durationDays: 10 },
    { key: 'bm04', wbsCode: 'BM-040', name: 'Fire, security & BMS convergence integration', discipline: 'Controls', system: 'BMS', zone: 'Site-wide', contractorKey: 'bms', durationDays: 8 },

    // --- Commissioning (CX) ---
    { key: 'cx01', wbsCode: 'CX-010', name: 'Level 1 — Factory/component testing review', discipline: 'Commissioning', system: 'Commissioning', zone: 'Site-wide', contractorKey: 'commissioning', durationDays: 5 },
    { key: 'cx02', wbsCode: 'CX-020', name: 'Level 2 — Device/equipment startup', discipline: 'Commissioning', system: 'Commissioning', zone: 'Site-wide', contractorKey: 'commissioning', durationDays: 10 },
    { key: 'cx03', wbsCode: 'CX-030', name: 'Level 3 — System functional performance testing', discipline: 'Commissioning', system: 'Commissioning', zone: 'Site-wide', contractorKey: 'commissioning', durationDays: 12 },
    { key: 'cx04', wbsCode: 'CX-040', name: 'Level 4 — Integrated Systems Testing (IST)', discipline: 'Commissioning', system: 'Commissioning', zone: 'Site-wide', contractorKey: 'commissioning', durationDays: 15 },
    { key: 'cx05', wbsCode: 'CX-050', name: 'Level 5 — Integrated systems load & failover testing', discipline: 'Commissioning', system: 'Commissioning', zone: 'Site-wide', contractorKey: 'commissioning', durationDays: 10 },
  ];

  const deps: { from: string; to: string; type?: 'FS' | 'SS' | 'FF' | 'SF'; lag?: number }[] = [
    // Civil sequencing
    { from: 'sw01', to: 'sw02' }, { from: 'sw01', to: 'sw03' }, { from: 'sw01', to: 'sw04' },
    { from: 'sw01', to: 'sw05' }, { from: 'sw01', to: 'sw06' }, { from: 'sw01', to: 'sw07' },
    { from: 'sw05', to: 'sw08' },
    // Structural depends on civil clearance; concrete cure lag of 3 days before loading
    { from: 'sw01', to: 'st01' }, { from: 'sw01', to: 'st02' },
    { from: 'st01', to: 'st03', lag: 3 }, { from: 'st03', to: 'st04' }, { from: 'st04', to: 'st05', lag: 3 },
    { from: 'st03', to: 'st07' }, { from: 'st05', to: 'st08' },
    { from: 'sw05', to: 'st06' },
    // Electrical depends on structure/foundations being ready in each zone
    { from: 'st06', to: 'el01' }, { from: 'el01', to: 'el02' }, { from: 'el02', to: 'el04' },
    { from: 'sw08', to: 'el03' }, { from: 'el04', to: 'el03' },
    { from: 'st05', to: 'el05' }, { from: 'st05', to: 'el06' },
    { from: 'el05', to: 'el07' }, { from: 'el04', to: 'el08' },
    // Mechanical depends on cooling-tower/plant foundations & structure
    { from: 'sw06', to: 'me01' }, { from: 'me01', to: 'me02' }, { from: 'me02', to: 'me03' },
    { from: 'st05', to: 'me04' }, { from: 'st05', to: 'me05' }, { from: 'me01', to: 'me06' }, { from: 'me03', to: 'me07' },
    // Fire & life safety depends on structure + tank foundation
    { from: 'sw07', to: 'fs01' }, { from: 'st05', to: 'fs02' }, { from: 'st05', to: 'fs03' },
    { from: 'fs02', to: 'fs04' }, { from: 'fs01', to: 'fs05' },
    // IT fit-out depends on structure, power & cooling being in the zone
    { from: 'el05', to: 'it01' }, { from: 'me04', to: 'it01' },
    { from: 'it01', to: 'it02' }, { from: 'el06', to: 'it03' }, { from: 'me05', to: 'it03' },
    { from: 'it02', to: 'it04' }, { from: 'it04', to: 'it05' },
    // BMS integrates once electrical & mechanical field devices exist
    { from: 'el08', to: 'bm01' }, { from: 'el04', to: 'bm02' }, { from: 'me02', to: 'bm03' },
    { from: 'fs05', to: 'bm04' }, { from: 'bm02', to: 'bm04' }, { from: 'bm03', to: 'bm04' },
    // Commissioning gates on everything upstream, level by level
    { from: 'el03', to: 'cx01' }, { from: 'me03', to: 'cx01' }, { from: 'fs04', to: 'cx01' },
    { from: 'cx01', to: 'cx02' }, { from: 'it05', to: 'cx02' }, { from: 'bm04', to: 'cx02' },
    { from: 'cx02', to: 'cx03' }, { from: 'cx03', to: 'cx04' }, { from: 'cx04', to: 'cx05' },
  ];

  // --- Run the real CPM algorithm to derive dates deterministically ---
  const cpmTaskInputs: CpmTaskInput[] = taskSeeds.map((t) => ({ id: t.key, durationDays: t.durationDays }));
  const cpmDepInputs: CpmDependencyInput[] = deps.map((d) => ({
    predecessorId: d.from,
    successorId: d.to,
    type: d.type ?? 'FS',
    lagDays: d.lag ?? 0,
  }));
  const cpmResults = computeCriticalPath(cpmTaskInputs, cpmDepInputs);
  const cpmByKey = new Map(cpmResults.map((r) => [r.id, r]));

  const taskIds: Record<string, string> = {};
  for (const t of taskSeeds) {
    const cpm = cpmByKey.get(t.key)!;
    const created = await prisma.task.create({
      data: {
        projectId: project.id,
        contractorId: contractors[t.contractorKey],
        wbsCode: t.wbsCode,
        name: t.name,
        discipline: t.discipline,
        system: t.system,
        zone: t.zone,
        plannedStart: addDays(PROJECT_START, cpm.earlyStart),
        plannedEnd: addDays(PROJECT_START, cpm.earlyFinish),
        durationDays: t.durationDays,
        percentComplete: cpm.isCritical ? Math.round(rand() * 25) : Math.round(rand() * 45),
        status: 'IN_PROGRESS',
        isMilestone: false,
        earlyStart: cpm.earlyStart,
        earlyFinish: cpm.earlyFinish,
        lateStart: cpm.lateStart,
        lateFinish: cpm.lateFinish,
        totalFloatDays: cpm.totalFloatDays,
        isCritical: cpm.isCritical,
        cpmComputedAt: new Date(),
      },
    });
    taskIds[t.key] = created.id;
  }

  for (const d of deps) {
    await prisma.taskDependency.create({
      data: {
        predecessorId: taskIds[d.from],
        successorId: taskIds[d.to],
        type: d.type ?? 'FS',
        lagDays: d.lag ?? 0,
      },
    });
  }

  console.log(`Seeded ${taskSeeds.length} tasks, ${deps.length} dependencies. Critical path length: ${
    cpmResults.filter((r) => r.isCritical).length
  } tasks, project duration ${Math.max(...cpmResults.map((r) => r.earlyFinish))} days.`);

  // ==========================================================================
  // SCHEDULE CONFLICTS + REAL MULTI-AGENT NEGOTIATION
  // ==========================================================================
  const conflictSeeds: {
    taskAKey: string;
    taskBKey: string;
    type: 'RESOURCE_CLASH' | 'SPACE_CLASH' | 'SEQUENCE_CLASH' | 'CREW_OVERCOMMIT';
    description: string;
    contractorAKey: string;
    contractorBKey: string;
  }[] = [
    {
      taskAKey: 'el05', taskBKey: 'me04',
      type: 'SPACE_CLASH',
      description: 'UPS system installation and CRAH unit installation both require exclusive floor access in Data Hall A during the same window.',
      contractorAKey: 'electrical', contractorBKey: 'mechanical',
    },
    {
      taskAKey: 'fs02', taskBKey: 'it02',
      type: 'SPACE_CLASH',
      description: 'Clean-agent fire suppression discharge testing in Data Hall A cannot run concurrently with live server rack installation in the same zone.',
      contractorAKey: 'fire', contractorBKey: 'itfit',
    },
    {
      taskAKey: 'el02', taskBKey: 'el03',
      type: 'RESOURCE_CLASH',
      description: "Voltas Power Systems' MV crew is double-booked between transformer installation and generator installation in the same week.",
      contractorAKey: 'electrical', contractorBKey: 'electrical',
    },
    {
      taskAKey: 'bm02', taskBKey: 'bm03',
      type: 'SEQUENCE_CLASH',
      description: 'Electrical-plant and mechanical-plant DDC controller integration both feed the BMS convergence milestone and are contending for the same commissioning window.',
      contractorAKey: 'bms', contractorBKey: 'bms',
    },
    {
      taskAKey: 'it02', taskBKey: 'it03',
      type: 'CREW_OVERCOMMIT',
      description: "Sterlite Structured Cabling's rack-installation crew is stretched across Data Hall A and Data Hall B simultaneously against six other active site commitments.",
      contractorAKey: 'itfit', contractorBKey: 'itfit',
    },
    {
      taskAKey: 'me02', taskBKey: 'me03',
      type: 'SEQUENCE_CLASH',
      description: 'Chiller installation slip threatens the cooling-tower installation start, both on the mechanical critical path.',
      contractorAKey: 'mechanical', contractorBKey: 'mechanical',
    },
  ];

  let totalDaysSaved = 0;
  let resolvedCount = 0;

  for (const cs of conflictSeeds) {
    const taskA = await prisma.task.findUniqueOrThrow({ where: { id: taskIds[cs.taskAKey] } });
    const taskB = await prisma.task.findUniqueOrThrow({ where: { id: taskIds[cs.taskBKey] } });

    const overlapDays = Math.max(
      1,
      Math.min(
        Math.round((taskA.plannedEnd.getTime() - taskB.plannedStart.getTime()) / 86_400_000),
        Math.round((taskB.plannedEnd.getTime() - taskA.plannedStart.getTime()) / 86_400_000),
        taskA.durationDays,
        taskB.durationDays,
        7
      )
    );

    const severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
      taskA.isCritical || taskB.isCritical ? 'CRITICAL' : overlapDays > 4 ? 'HIGH' : overlapDays > 2 ? 'MEDIUM' : 'LOW';

    const conflict = await prisma.scheduleConflict.create({
      data: {
        taskAId: taskA.id,
        taskBId: taskB.id,
        conflictType: cs.type,
        severity,
        description: cs.description,
        status: 'NEGOTIATING',
      },
    });

    const contractorASeed = contractorSeeds.find((c) => c.key === cs.contractorAKey)!;
    const contractorBSeed = contractorSeeds.find((c) => c.key === cs.contractorBKey)!;

    const negotiationResult = negotiateScheduleConflict(
      overlapDays,
      {
        contractorId: contractors[cs.contractorAKey],
        crewSize: contractorASeed.crewSize,
        crewSizeFlex: contractorASeed.crewSizeFlex,
        otherActiveSites: contractorASeed.otherActiveSites,
        penaltyExposureInr: contractorASeed.penaltyExposureInr,
        dailyPenaltyRateInr: contractorASeed.dailyPenaltyRateInr,
        floatProtectionBias: contractorASeed.floatProtectionBias,
        reliabilityScore: contractorASeed.reliabilityScore,
        availableFloatDays: Math.max(0, taskA.totalFloatDays ?? 0),
      },
      {
        contractorId: contractors[cs.contractorBKey],
        crewSize: contractorBSeed.crewSize,
        crewSizeFlex: contractorBSeed.crewSizeFlex,
        otherActiveSites: contractorBSeed.otherActiveSites,
        penaltyExposureInr: contractorBSeed.penaltyExposureInr,
        dailyPenaltyRateInr: contractorBSeed.dailyPenaltyRateInr,
        floatProtectionBias: contractorBSeed.floatProtectionBias,
        reliabilityScore: contractorBSeed.reliabilityScore,
        availableFloatDays: Math.max(0, taskB.totalFloatDays ?? 0),
      }
    );

    const session = await prisma.negotiationSession.create({
      data: {
        conflictId: conflict.id,
        mechanism: 'nash_bargaining',
        status: negotiationResult.paretoImproving ? 'CONVERGED' : 'ESCALATED',
        totalRounds: negotiationResult.rounds.length,
        paretoImproving: negotiationResult.paretoImproving,
        nashProduct: negotiationResult.nashProduct,
        daysOfDelaySaved: negotiationResult.daysOfDelaySaved,
        resolvedAt: new Date(),
      },
    });

    await prisma.negotiationParticipant.create({
      data: {
        sessionId: session.id,
        contractorId: contractors[cs.contractorAKey],
        reservationValue: negotiationResult.disagreementA,
        initialPositionJson: { startDayOffset: taskA.earlyStart, endDayOffset: taskA.earlyFinish },
        finalPositionJson: { concessionDays: negotiationResult.splitA },
        utilityGain: negotiationResult.utilityA - negotiationResult.disagreementA,
      },
    });
    await prisma.negotiationParticipant.create({
      data: {
        sessionId: session.id,
        contractorId: contractors[cs.contractorBKey],
        reservationValue: negotiationResult.disagreementB,
        initialPositionJson: { startDayOffset: taskB.earlyStart, endDayOffset: taskB.earlyFinish },
        finalPositionJson: { concessionDays: negotiationResult.splitB },
        utilityGain: negotiationResult.utilityB - negotiationResult.disagreementB,
      },
    });

    for (const round of negotiationResult.rounds) {
      await prisma.negotiationRound.create({
        data: {
          sessionId: session.id,
          roundNumber: round.roundNumber,
          proposalsJson: round.proposals,
          concessionGap: round.concessionGap,
          accepted: round.accepted,
        },
      });
    }

    await prisma.negotiationOutcome.create({
      data: {
        sessionId: session.id,
        resolutionJson: {
          [taskA.id]: { concessionDays: negotiationResult.splitA },
          [taskB.id]: { concessionDays: negotiationResult.splitB },
        },
        confidenceScore: negotiationResult.paretoImproving ? 0.92 : 0.55,
      },
    });

    await prisma.scheduleConflict.update({
      where: { id: conflict.id },
      data: { status: negotiationResult.paretoImproving ? 'RESOLVED' : 'ESCALATED' },
    });

    if (negotiationResult.paretoImproving) {
      resolvedCount++;
      totalDaysSaved += negotiationResult.daysOfDelaySaved;
    }
  }

  console.log(`Seeded ${conflictSeeds.length} schedule conflicts through the negotiation engine (${resolvedCount} resolved, avg ${(totalDaysSaved / Math.max(1, resolvedCount)).toFixed(1)} days saved).`);

  // ==========================================================================
  // SUPPLIERS & EQUIPMENT & SHIPMENT TRACKING
  // ==========================================================================
  const supplierSeeds = [
    { name: 'Kirloskar Electric Company', country: 'India', tier: 1, reliabilityScore: 0.85 },
    { name: 'Vertiv India Pvt. Ltd.', country: 'India', tier: 1, reliabilityScore: 0.88 },
    { name: 'Caterpillar Power India', country: 'India', tier: 1, reliabilityScore: 0.9 },
    { name: 'Schneider Electric India', country: 'India', tier: 1, reliabilityScore: 0.91 },
    { name: 'ABB Power Products', country: 'Germany', tier: 1, reliabilityScore: 0.87 },
    { name: 'Johnson Controls - York', country: 'Singapore', tier: 1, reliabilityScore: 0.83 },
    { name: 'BAC Cooling Towers Asia', country: 'Malaysia', tier: 2, reliabilityScore: 0.74 },
    { name: 'Delta Electronics India', country: 'India', tier: 1, reliabilityScore: 0.86 },
    { name: 'Legrand Data Center Solutions', country: 'France', tier: 1, reliabilityScore: 0.89 },
    { name: 'Reliance Fire Systems (sub-tier)', country: 'India', tier: 3, reliabilityScore: 0.61 },
  ];
  const supplierIds: string[] = [];
  for (const s of supplierSeeds) {
    const created = await prisma.supplier.create({ data: s });
    supplierIds.push(created.id);
  }

  type EquipSeed = {
    category: 'UPS_SYSTEM' | 'GENERATOR' | 'COOLING_TOWER' | 'CHILLER' | 'SWITCHGEAR' | 'TRANSFORMER' | 'CRAC_CRAH' | 'STRUCTURED_CABLING' | 'FIRE_SUPPRESSION' | 'BMS_CONTROLS';
    tag: string;
    description: string;
    supplierIdx: number;
    isLongLead: boolean;
    orderOffsetDays: number;
    leadTimeDays: number;
    slipDays: number; // 0 = on time, >0 = revised delivery slipped
    originLat: number; originLng: number;
  };
  const equipSeeds: EquipSeed[] = [
    { category: 'UPS_SYSTEM', tag: 'UPS-A-01', description: '1200kVA Modular UPS — Data Hall A', supplierIdx: 1, isLongLead: true, orderOffsetDays: 5, leadTimeDays: 150, slipDays: 12, originLat: 19.076, originLng: 72.8777 },
    { category: 'UPS_SYSTEM', tag: 'UPS-B-01', description: '1200kVA Modular UPS — Data Hall B', supplierIdx: 1, isLongLead: true, orderOffsetDays: 5, leadTimeDays: 150, slipDays: 0, originLat: 19.076, originLng: 72.8777 },
    { category: 'GENERATOR', tag: 'GEN-01', description: '2MW Standby Diesel Generator Set #1', supplierIdx: 2, isLongLead: true, orderOffsetDays: 0, leadTimeDays: 180, slipDays: 21, originLat: 12.9716, originLng: 77.5946 },
    { category: 'GENERATOR', tag: 'GEN-02', description: '2MW Standby Diesel Generator Set #2', supplierIdx: 2, isLongLead: true, orderOffsetDays: 0, leadTimeDays: 180, slipDays: 21, originLat: 12.9716, originLng: 77.5946 },
    { category: 'GENERATOR', tag: 'GEN-03', description: '2MW Standby Diesel Generator Set #3', supplierIdx: 2, isLongLead: true, orderOffsetDays: 10, leadTimeDays: 180, slipDays: 0, originLat: 12.9716, originLng: 77.5946 },
    { category: 'GENERATOR', tag: 'GEN-04', description: '2MW Standby Diesel Generator Set #4', supplierIdx: 2, isLongLead: true, orderOffsetDays: 10, leadTimeDays: 180, slipDays: 0, originLat: 12.9716, originLng: 77.5946 },
    { category: 'SWITCHGEAR', tag: 'SWG-MV-01', description: '33kV MV Switchgear Panel Set', supplierIdx: 3, isLongLead: true, orderOffsetDays: 0, leadTimeDays: 140, slipDays: 8, originLat: 28.6139, originLng: 77.209 },
    { category: 'TRANSFORMER', tag: 'TX-01', description: '20MVA Power Transformer #1', supplierIdx: 4, isLongLead: true, orderOffsetDays: 0, leadTimeDays: 200, slipDays: 25, originLat: 52.52, originLng: 13.405 },
    { category: 'TRANSFORMER', tag: 'TX-02', description: '20MVA Power Transformer #2', supplierIdx: 4, isLongLead: true, orderOffsetDays: 0, leadTimeDays: 200, slipDays: 5, originLat: 52.52, originLng: 13.405 },
    { category: 'CHILLER', tag: 'CH-01', description: '1000TR Water-Cooled Centrifugal Chiller #1', supplierIdx: 5, isLongLead: true, orderOffsetDays: 20, leadTimeDays: 130, slipDays: 0, originLat: 1.3521, originLng: 103.8198 },
    { category: 'CHILLER', tag: 'CH-02', description: '1000TR Water-Cooled Centrifugal Chiller #2', supplierIdx: 5, isLongLead: true, orderOffsetDays: 20, leadTimeDays: 130, slipDays: 4, originLat: 1.3521, originLng: 103.8198 },
    { category: 'CHILLER', tag: 'CH-03', description: '1000TR Water-Cooled Centrifugal Chiller #3', supplierIdx: 5, isLongLead: true, orderOffsetDays: 25, leadTimeDays: 130, slipDays: 0, originLat: 1.3521, originLng: 103.8198 },
    { category: 'COOLING_TOWER', tag: 'CT-01', description: 'Induced-Draft Cooling Tower Cell #1', supplierIdx: 6, isLongLead: false, orderOffsetDays: 30, leadTimeDays: 95, slipDays: 18, originLat: 3.139, originLng: 101.6869 },
    { category: 'COOLING_TOWER', tag: 'CT-02', description: 'Induced-Draft Cooling Tower Cell #2', supplierIdx: 6, isLongLead: false, orderOffsetDays: 30, leadTimeDays: 95, slipDays: 0, originLat: 3.139, originLng: 101.6869 },
    { category: 'CRAC_CRAH', tag: 'CRAH-A-01', description: 'Precision CRAH Unit — Data Hall A (x6 set)', supplierIdx: 5, isLongLead: false, orderOffsetDays: 40, leadTimeDays: 80, slipDays: 6, originLat: 1.3521, originLng: 103.8198 },
    { category: 'CRAC_CRAH', tag: 'CRAH-B-01', description: 'Precision CRAH Unit — Data Hall B (x6 set)', supplierIdx: 5, isLongLead: false, orderOffsetDays: 40, leadTimeDays: 80, slipDays: 0, originLat: 1.3521, originLng: 103.8198 },
    { category: 'STRUCTURED_CABLING', tag: 'CBL-BB-01', description: 'OM4 Fiber Backbone Cabling — Bulk Order', supplierIdx: 8, isLongLead: false, orderOffsetDays: 60, leadTimeDays: 45, slipDays: 0, originLat: 48.8566, originLng: 2.3522 },
    { category: 'STRUCTURED_CABLING', tag: 'RACK-A-01', description: '42U Server Racks — Data Hall A (x120)', supplierIdx: 8, isLongLead: false, orderOffsetDays: 55, leadTimeDays: 60, slipDays: 9, originLat: 48.8566, originLng: 2.3522 },
    { category: 'FIRE_SUPPRESSION', tag: 'FS-NOVEC-A', description: 'Novec 1230 Clean Agent System — Data Hall A', supplierIdx: 9, isLongLead: false, orderOffsetDays: 45, leadTimeDays: 70, slipDays: 15, originLat: 19.2183, originLng: 72.9781 },
    { category: 'FIRE_SUPPRESSION', tag: 'FS-NOVEC-B', description: 'Novec 1230 Clean Agent System — Data Hall B', supplierIdx: 9, isLongLead: false, orderOffsetDays: 45, leadTimeDays: 70, slipDays: 0, originLat: 19.2183, originLng: 72.9781 },
    { category: 'BMS_CONTROLS', tag: 'BMS-HEAD-01', description: 'BMS Head-End Server & Licensing', supplierIdx: 7, isLongLead: false, orderOffsetDays: 70, leadTimeDays: 30, slipDays: 0, originLat: 25.0330, originLng: 121.5654 },
  ];

  const equipIds: string[] = [];
  for (const e of equipSeeds) {
    const orderDate = addDays(PROJECT_START, e.orderOffsetDays);
    const promisedDelivery = addDays(orderDate, e.leadTimeDays);
    const revisedDelivery = e.slipDays > 0 ? addDays(promisedDelivery, e.slipDays) : null;
    const status: 'ORDERED' | 'IN_FABRICATION' | 'IN_TRANSIT' | 'CUSTOMS_HOLD' | 'DELIVERED' | 'DELAYED' =
      e.slipDays > 15 ? 'DELAYED' : e.slipDays > 0 ? 'IN_TRANSIT' : 'IN_FABRICATION';

    const created = await prisma.equipment.create({
      data: {
        projectId: project.id,
        supplierId: supplierIds[e.supplierIdx],
        category: e.category,
        tagNumber: e.tag,
        description: e.description,
        isLongLead: e.isLongLead,
        orderDate,
        promisedDelivery,
        revisedDelivery,
        status,
        originLat: e.originLat,
        originLng: e.originLng,
        destinationLat: project.siteLat,
        destinationLng: project.siteLng,
      },
    });
    equipIds.push(created.id);

    const eventTypes: { type: string; offsetFromOrder: number }[] = [
      { type: 'order_confirmed', offsetFromOrder: 2 },
      { type: 'in_fabrication', offsetFromOrder: Math.round(e.leadTimeDays * 0.3) },
      { type: 'departed_factory', offsetFromOrder: Math.round(e.leadTimeDays * 0.65) },
      { type: 'port_loaded', offsetFromOrder: Math.round(e.leadTimeDays * 0.72) },
      { type: 'port_arrived', offsetFromOrder: Math.round(e.leadTimeDays * 0.9) },
    ];
    for (const ev of eventTypes) {
      const frac = ev.offsetFromOrder / e.leadTimeDays;
      await prisma.shipmentEvent.create({
        data: {
          equipmentId: created.id,
          eventType: ev.type,
          lat: e.originLat + (project.siteLat - e.originLat) * frac,
          lng: e.originLng + (project.siteLng - e.originLng) * frac,
          eventDate: addDays(orderDate, ev.offsetFromOrder),
          note: ev.type === 'departed_factory' && e.slipDays > 10 ? `Factory dispatch slipped — see revised delivery of ${e.slipDays} days.` : null,
        },
      });
    }
  }

  console.log(`Seeded ${supplierSeeds.length} suppliers and ${equipSeeds.length} equipment items with shipment tracking.`);

  // ==========================================================================
  // SPECIFICATIONS, SUBMITTALS & NON-CONFORMANCES (via real compliance check)
  // ==========================================================================
  const specDoc1 = await prisma.specificationDocument.create({
    data: { projectId: project.id, title: 'Electrical Infrastructure Technical Specification', standardRef: 'TIA-942-B', version: 'Rev 3' },
  });
  const specDoc2 = await prisma.specificationDocument.create({
    data: { projectId: project.id, title: 'Mechanical Cooling Systems Specification', standardRef: 'Uptime Institute Tier III Topology', version: 'Rev 2' },
  });
  const specDoc3 = await prisma.specificationDocument.create({
    data: { projectId: project.id, title: 'Structured Cabling & IT Infrastructure Specification', standardRef: 'BICSI 002-2019', version: 'Rev 1' },
  });

  const reqSeeds = [
    { specDocId: specDoc1.id, clauseRef: '5.2.1', parameter: 'UPS output voltage regulation', requiredValue: '415', unit: 'V', toleranceLow: 405, toleranceHigh: 425 },
    { specDocId: specDoc1.id, clauseRef: '5.2.4', parameter: 'UPS battery autonomy at full load', requiredValue: '10', unit: 'min', toleranceLow: 10, toleranceHigh: 15 },
    { specDocId: specDoc1.id, clauseRef: '6.1.2', parameter: 'Generator load-acceptance step', requiredValue: '75', unit: '%', toleranceLow: 75, toleranceHigh: 100 },
    { specDocId: specDoc1.id, clauseRef: '6.3.1', parameter: 'Transformer impedance', requiredValue: '6.25', unit: '%', toleranceLow: 6.0, toleranceHigh: 6.5 },
    { specDocId: specDoc1.id, clauseRef: '7.4.2', parameter: 'Earth resistance at grid', requiredValue: '1', unit: 'ohm', toleranceLow: 0, toleranceHigh: 1 },
    { specDocId: specDoc2.id, clauseRef: '4.1.3', parameter: 'Chilled water supply temperature', requiredValue: '6.7', unit: '°C', toleranceLow: 6.1, toleranceHigh: 7.2 },
    { specDocId: specDoc2.id, clauseRef: '4.2.1', parameter: 'N+1 chiller redundancy count', requiredValue: '3', unit: 'units', toleranceLow: 3, toleranceHigh: 3 },
    { specDocId: specDoc2.id, clauseRef: '4.5.2', parameter: 'CRAH supply air temperature', requiredValue: '18', unit: '°C', toleranceLow: 18, toleranceHigh: 27 },
    { specDocId: specDoc2.id, clauseRef: '5.1.1', parameter: 'Cooling tower approach temperature', requiredValue: '2.8', unit: '°C', toleranceLow: 2.2, toleranceHigh: 3.3 },
    { specDocId: specDoc3.id, clauseRef: '8.2.4', parameter: 'Fiber backbone attenuation (OM4, per 100m)', requiredValue: '0.8', unit: 'dB', toleranceLow: 0, toleranceHigh: 1.0 },
    { specDocId: specDoc3.id, clauseRef: '9.1.2', parameter: 'Hot aisle containment temperature differential', requiredValue: '10', unit: '°C', toleranceLow: 8, toleranceHigh: 12 },
    { specDocId: specDoc3.id, clauseRef: '9.3.1', parameter: 'Raised floor clearance', requiredValue: '600', unit: 'mm', toleranceLow: 600, toleranceHigh: 900 },
  ];
  const reqIds: string[] = [];
  for (const r of reqSeeds) {
    const created = await prisma.specRequirement.create({ data: r });
    reqIds.push(created.id);
  }

  // Submittals — a mix of compliant and non-compliant declared values, run
  // through the real deterministic checker (checkSubmittalAgainstRequirement).
  const submittalSeeds = [
    { reqIdx: 0, contractorKey: 'electrical', equipIdx: 0, num: 'SUB-EL-001', title: 'UPS-A-01 Output Voltage Regulation Test Report', submittedValue: '418' },
    { reqIdx: 1, contractorKey: 'electrical', equipIdx: 0, num: 'SUB-EL-002', title: 'UPS-A-01 Battery Autonomy Factory Test Certificate', submittedValue: '8.5' },
    { reqIdx: 2, contractorKey: 'electrical', equipIdx: 2, num: 'SUB-EL-003', title: 'GEN-01 Load Acceptance Test Report', submittedValue: '68' },
    { reqIdx: 3, contractorKey: 'electrical', equipIdx: 7, num: 'SUB-EL-004', title: 'TX-01 Impedance Test Certificate', submittedValue: '6.3' },
    { reqIdx: 4, contractorKey: 'electrical', equipIdx: null, num: 'SUB-EL-005', title: 'Grid Earth Resistance Test Report', submittedValue: '1.4' },
    { reqIdx: 5, contractorKey: 'mechanical', equipIdx: 9, num: 'SUB-ME-001', title: 'Chilled Water Supply Temperature Commissioning Data', submittedValue: '6.9' },
    { reqIdx: 6, contractorKey: 'mechanical', equipIdx: null, num: 'SUB-ME-002', title: 'Chiller Redundancy Configuration Submittal', submittedValue: '2' },
    { reqIdx: 7, contractorKey: 'mechanical', equipIdx: 14, num: 'SUB-ME-003', title: 'CRAH Supply Air Temperature Test Data', submittedValue: '19.5' },
    { reqIdx: 8, contractorKey: 'mechanical', equipIdx: 12, num: 'SUB-ME-004', title: 'Cooling Tower Approach Temperature Report', submittedValue: '4.1' },
    { reqIdx: 9, contractorKey: 'itfit', equipIdx: 16, num: 'SUB-IT-001', title: 'OM4 Backbone Attenuation Test Report', submittedValue: '0.95' },
    { reqIdx: 10, contractorKey: 'itfit', equipIdx: null, num: 'SUB-IT-002', title: 'Hot Aisle Containment Temp Differential Data', submittedValue: '11' },
    { reqIdx: 11, contractorKey: 'structural', equipIdx: null, num: 'SUB-ST-001', title: 'Raised Floor Clearance Survey — Data Hall A', submittedValue: '520' },
  ];

  let ncCount = 0;
  for (const s of submittalSeeds) {
    const req = reqSeeds[s.reqIdx];
    const check = checkSubmittalAgainstRequirement({
      clauseRef: req.clauseRef,
      parameter: req.parameter,
      requiredValue: req.requiredValue,
      unit: req.unit,
      toleranceLow: req.toleranceLow,
      toleranceHigh: req.toleranceHigh,
      submittedValue: s.submittedValue,
    });

    const submittal = await prisma.submittal.create({
      data: {
        projectId: project.id,
        contractorId: contractors[s.contractorKey],
        equipmentId: s.equipIdx !== null ? equipIds[s.equipIdx] : null,
        requirementId: reqIds[s.reqIdx],
        submittalNumber: s.num,
        title: s.title,
        submittedValue: s.submittedValue,
        submittedAt: addDays(PROJECT_START, 100 + Math.round(rand() * 300)),
        status: check.compliant ? 'APPROVED' : 'REVISE_RESUBMIT',
      },
    });

    if (!check.compliant) {
      ncCount++;
      await prisma.nonConformance.create({
        data: {
          submittalId: submittal.id,
          requirementId: reqIds[s.reqIdx],
          severity: check.severity!,
          description: `${req.parameter} deviation on ${s.num}`,
          deviationDetail: check.deviationDetail,
          status: 'OPEN',
          raisedByAgent: 'spec-compliance-agent',
        },
      });
    }
  }

  console.log(`Seeded ${submittalSeeds.length} submittals, ${ncCount} non-conformances flagged by the deterministic compliance checker.`);

  // ==========================================================================
  // RFIs
  // ==========================================================================
  const rfiSeeds = [
    { num: 'RFI-0142', subject: 'UPS battery autonomy shortfall disposition', question: 'UPS-A-01 factory test shows 8.5 min autonomy against a 10 min spec requirement. Please confirm acceptable disposition path — battery string augmentation or spec waiver.', discipline: 'Electrical', taskKey: 'el05', status: 'ANSWERED' as const, answer: 'Augment battery string by 2 additional cabinets per manufacturer configuration EC-4482 to restore 10 min autonomy at full load; no waiver approved.', costImpact: true, scheduleImpactDays: 4 },
    { num: 'RFI-0143', subject: 'Generator load bank test acceptance criteria', question: 'Confirm acceptable step-load pickup percentage for the 2MW DG sets given the UPS-first sequencing in the revised SLD.', discipline: 'Electrical', taskKey: 'el03', status: 'ANSWERED' as const, answer: 'Step-load pickup must meet 75% in a single step per clause 6.1.2; sequential UPS transfer does not change the requirement.', costImpact: false, scheduleImpactDays: 0 },
    { num: 'RFI-0144', subject: 'Chiller redundancy configuration clarification', question: 'Submittal SUB-ME-002 proposes N+1 with 2 duty + 1 standby against the 3-unit spec basis. Please clarify whether this satisfies Tier III concurrent maintainability.', discipline: 'Mechanical', taskKey: 'me02', status: 'OPEN' as const, answer: null, costImpact: true, scheduleImpactDays: 6 },
    { num: 'RFI-0145', subject: 'Raised floor clearance shortfall — Data Hall A', question: 'Survey shows 520mm raised floor clearance against a 600mm minimum. Confirm remediation approach given structural slab-to-soffit constraint.', discipline: 'Structural', taskKey: 'st07', status: 'OPEN' as const, answer: null, costImpact: true, scheduleImpactDays: 8 },
    { num: 'RFI-0146', subject: 'Clean-agent discharge testing access window', question: 'Requesting a confirmed exclusive-access window for Novec discharge testing in Data Hall A given concurrent rack installation activity.', discipline: 'Fire & Life Safety', taskKey: 'fs02', status: 'ANSWERED' as const, answer: 'Exclusive access granted per negotiated schedule outcome — see Schedule Conflict resolution for Data Hall A space clash.', costImpact: false, scheduleImpactDays: 0 },
    { num: 'RFI-0147', subject: 'Cooling tower approach temperature deviation', question: 'Factory test data shows 4.1°C approach against 2.8°C ±0.5°C spec. Confirm whether re-test or spec relaxation is the path forward.', discipline: 'Mechanical', taskKey: 'me03', status: 'OPEN' as const, answer: null, costImpact: false, scheduleImpactDays: 5 },
    { num: 'RFI-0148', subject: 'BMS convergence integration sequencing', question: 'Requesting clarification on whether fire-alarm-to-BMS convergence must complete before or in parallel with electrical DDC integration.', discipline: 'Controls', taskKey: 'bm04', status: 'ANSWERED' as const, answer: 'Fire-alarm integration may run in parallel with electrical DDC integration provided both complete before Level 3 functional testing begins.', costImpact: false, scheduleImpactDays: 0 },
    { num: 'RFI-0149', subject: 'Earth resistance re-test requirement', question: 'Measured grid earth resistance of 1.4 ohm exceeds the 1.0 ohm requirement at two test points. Confirm re-test scope.', discipline: 'Electrical', taskKey: 'el08', status: 'ANSWERED' as const, answer: 'Install two additional earth electrodes at the identified high-resistance points and re-test per IS 3043 before energization.', costImpact: true, scheduleImpactDays: 3 },
    { num: 'RFI-0150', subject: 'Fiber backbone attenuation exceedance', question: 'OM4 backbone attenuation test shows 0.95 dB/100m against a 1.0 dB maximum — within tolerance but trending high. Advise if re-termination is warranted.', discipline: 'IT Infrastructure', taskKey: 'it04', status: 'OPEN' as const, answer: null, costImpact: false, scheduleImpactDays: 0 },
  ];

  for (const r of rfiSeeds) {
    await prisma.rFI.create({
      data: {
        projectId: project.id,
        taskId: taskIds[r.taskKey],
        number: r.num,
        subject: r.subject,
        question: r.question,
        discipline: r.discipline,
        raisedBy: pick(['Farah Khan', 'Vikram Sethi', 'Ananya Rao', 'Site QA/QC']),
        status: r.status,
        submittedAt: addDays(PROJECT_START, 90 + Math.round(rand() * 300)),
        answeredAt: r.answer ? addDays(PROJECT_START, 100 + Math.round(rand() * 300)) : null,
        answerText: r.answer,
        costImpact: r.costImpact,
        scheduleImpactDays: r.scheduleImpactDays,
      },
    });
  }

  console.log(`Seeded ${rfiSeeds.length} RFIs.`);

  // ==========================================================================
  // CHANGE ORDERS
  // ==========================================================================
  const changeOrderSeeds = [
    { number: 'CO-011', description: 'UPS battery string augmentation to meet 10-minute autonomy requirement (per RFI-0142)', costImpactInr: 1_850_000, scheduleImpactDays: 4, status: 'APPROVED' as const },
    { number: 'CO-012', description: 'Additional earth electrodes and re-testing at MV substation (per RFI-0149)', costImpactInr: 320_000, scheduleImpactDays: 3, status: 'APPROVED' as const },
    { number: 'CO-013', description: 'Raised access floor pedestal system redesign to recover clearance shortfall (per RFI-0145)', costImpactInr: 4_100_000, scheduleImpactDays: 8, status: 'PENDING' as const },
    { number: 'CO-014', description: 'Third chiller unit re-procurement to restore N+1 redundancy basis (per RFI-0144)', costImpactInr: 12_500_000, scheduleImpactDays: 6, status: 'PENDING' as const },
    { number: 'CO-015', description: 'Cooling tower fill media upgrade to correct approach temperature deviation', costImpactInr: 980_000, scheduleImpactDays: 0, status: 'REJECTED' as const },
    { number: 'CO-016', description: 'Expedited air freight for GEN-01/02 to recover 21-day fabrication slip', costImpactInr: 2_200_000, scheduleImpactDays: -10, status: 'APPROVED' as const },
  ];
  for (const c of changeOrderSeeds) {
    await prisma.changeOrder.create({
      data: { projectId: project.id, ...c, submittedAt: addDays(PROJECT_START, 120 + Math.round(rand() * 250)) },
    });
  }
  console.log(`Seeded ${changeOrderSeeds.length} change orders.`);

  // ==========================================================================
  // COMMISSIONING TESTS (TIA-942 / Uptime IST levels)
  // ==========================================================================
  const cxSeeds = [
    { system: 'UPS Plant', standardRef: 'Uptime Tier III IST', level: 'L2', proc: 'UPS static bypass transfer test', criteria: 'Transfer time < 4ms, no load interruption', result: 'PASS' as const },
    { system: 'UPS Plant', standardRef: 'Uptime Tier III IST', level: 'L4', proc: 'UPS-to-generator integrated failover test', criteria: 'Seamless transfer under full rated load', result: 'PENDING' as const },
    { system: 'Standby Power', standardRef: 'Uptime Tier III IST', level: 'L2', proc: 'Generator step-load acceptance test', criteria: '75% load acceptance in single step', result: 'FAIL' as const },
    { system: 'Standby Power', standardRef: 'Uptime Tier III IST', level: 'L3', proc: 'Generator parallel operation test', criteria: 'Load sharing within ±5% across units', result: 'PENDING' as const },
    { system: 'Chilled Water', standardRef: 'Uptime Tier III IST', level: 'L2', proc: 'Chiller N+1 failover test', criteria: 'Standby chiller online within 3 minutes of duty trip', result: 'PENDING' as const },
    { system: 'Chilled Water', standardRef: 'Uptime Tier III IST', level: 'L3', proc: 'Chilled water loop pressure test', criteria: 'Hold rated pressure ±2% for 4 hours', result: 'PASS' as const },
    { system: 'CRAC/CRAH', standardRef: 'BICSI 002', level: 'L2', proc: 'CRAH supply air temperature verification', criteria: '18-27°C at rated airflow', result: 'PASS' as const },
    { system: 'Fire Suppression', standardRef: 'TIA-942', level: 'L2', proc: 'Clean-agent room integrity test (door fan test)', criteria: 'Agent retention time > 10 minutes', result: 'PASS' as const },
    { system: 'Fire Suppression', standardRef: 'TIA-942', level: 'L4', proc: 'Integrated fire-alarm-to-suppression discharge test', criteria: 'Discharge within 30s of confirmed alarm, no false trips', result: 'PENDING' as const },
    { system: 'Structured Cabling', standardRef: 'BICSI 002', level: 'L2', proc: 'Fiber backbone insertion loss test', criteria: '< 1.0 dB per 100m', result: 'CONDITIONAL_PASS' as const },
    { system: 'BMS', standardRef: 'TIA-942', level: 'L3', proc: 'BMS point-to-point verification', criteria: '100% of field points confirmed against I/O schedule', result: 'PENDING' as const },
    { system: 'Commissioning', standardRef: 'Uptime Tier III IST', level: 'L5', proc: 'Full facility integrated load bank test at rated capacity', criteria: 'Sustained rated IT load for 72 hours with no unplanned events', result: 'PENDING' as const },
  ];
  for (const [i, c] of cxSeeds.entries()) {
    await prisma.commissioningTest.create({
      data: {
        projectId: project.id,
        standardRef: c.standardRef,
        system: c.system,
        testProcedure: c.proc,
        level: c.level,
        acceptanceCriteria: c.criteria,
        actualValue: c.result === 'PENDING' ? null : c.result === 'FAIL' ? '62% single-step acceptance measured' : 'Within acceptance criteria',
        result: c.result,
        status: c.result === 'PENDING' ? 'SCHEDULED' : 'COMPLETE',
        scheduledFor: addDays(PROJECT_START, 380 + i * 6),
        executedBy: c.result === 'PENDING' ? null : 'Uptime Compliance Partners LLP',
        executedAt: c.result === 'PENDING' ? null : addDays(PROJECT_START, 380 + i * 6),
      },
    });
  }
  console.log(`Seeded ${cxSeeds.length} commissioning tests.`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
