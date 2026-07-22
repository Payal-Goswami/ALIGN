-- ============================================================================
-- EPC Project Intelligence Platform — Initial Schema Migration
-- Generated to match prisma/schema.prisma. On a machine with normal internet
-- access you can instead run `npm run db:migrate` and Prisma will generate
-- (and apply) this same migration automatically. This file is provided so the
-- schema can also be applied directly via `psql` or the Supabase SQL editor.
-- ============================================================================

-- Extensions ------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums -------------------------------------------------------------------
create type "UserRole" as enum ('ADMIN','PMO','ENGINEER','QA_QC','CONTRACTOR_REP','VIEWER');
create type "TaskStatus" as enum ('NOT_STARTED','IN_PROGRESS','COMPLETE','ON_HOLD','DELAYED');
create type "DependencyType" as enum ('FS','SS','FF','SF');
create type "ConflictType" as enum ('RESOURCE_CLASH','SPACE_CLASH','SEQUENCE_CLASH','CREW_OVERCOMMIT');
create type "ConflictSeverity" as enum ('LOW','MEDIUM','HIGH','CRITICAL');
create type "ConflictStatus" as enum ('OPEN','NEGOTIATING','RESOLVED','ESCALATED');
create type "NegotiationStatus" as enum ('RUNNING','CONVERGED','ESCALATED');
create type "RiskBand" as enum ('LOW','MODERATE','HIGH','SEVERE');
create type "EquipmentCategory" as enum ('UPS_SYSTEM','GENERATOR','COOLING_TOWER','CHILLER','SWITCHGEAR','TRANSFORMER','CRAC_CRAH','STRUCTURED_CABLING','FIRE_SUPPRESSION','BMS_CONTROLS');
create type "EquipmentStatus" as enum ('ORDERED','IN_FABRICATION','IN_TRANSIT','CUSTOMS_HOLD','DELIVERED','DELAYED');
create type "SubmittalStatus" as enum ('PENDING_REVIEW','APPROVED','APPROVED_AS_NOTED','REJECTED','REVISE_RESUBMIT');
create type "NcSeverity" as enum ('MINOR','MAJOR','CRITICAL');
create type "NcStatus" as enum ('OPEN','UNDER_REVIEW','RESOLVED','WAIVED');
create type "RfiStatus" as enum ('OPEN','ANSWERED','CLOSED');
create type "ChangeOrderStatus" as enum ('PENDING','APPROVED','REJECTED');
create type "TestResult" as enum ('PENDING','PASS','FAIL','CONDITIONAL_PASS');
create type "TestStatus" as enum ('SCHEDULED','IN_PROGRESS','COMPLETE','BLOCKED');

-- Core ----------------------------------------------------------------------
create table "projects" (
  "id" text primary key default gen_random_uuid()::text,
  "name" text not null,
  "siteName" text not null,
  "siteLat" double precision not null,
  "siteLng" double precision not null,
  "tierTarget" text not null,
  "capacityMw" double precision not null,
  "startDate" timestamp(3) not null,
  "targetEndDate" timestamp(3) not null,
  "createdAt" timestamp(3) not null default now(),
  "updatedAt" timestamp(3) not null
);

create table "user_profiles" (
  "id" text primary key,
  "email" text not null unique,
  "fullName" text not null,
  "role" "UserRole" not null default 'ENGINEER',
  "discipline" text,
  "createdAt" timestamp(3) not null default now()
);

create table "trade_contractors" (
  "id" text primary key default gen_random_uuid()::text,
  "projectId" text not null references "projects"("id") on delete cascade,
  "companyName" text not null,
  "trade" text not null,
  "crewSize" integer not null,
  "crewSizeFlex" integer not null default 0,
  "mobilizationDays" integer not null default 7,
  "otherActiveSites" integer not null default 0,
  "penaltyExposureInr" decimal(14,2) not null,
  "dailyPenaltyRateInr" decimal(12,2) not null,
  "floatProtectionBias" double precision not null default 0.5,
  "reliabilityScore" double precision not null default 0.75,
  "contactName" text not null,
  "contactPhone" text not null,
  "createdAt" timestamp(3) not null default now(),
  "updatedAt" timestamp(3) not null
);
create index "trade_contractors_projectId_idx" on "trade_contractors"("projectId");

-- Schedule --------------------------------------------------------------
create table "tasks" (
  "id" text primary key default gen_random_uuid()::text,
  "projectId" text not null references "projects"("id") on delete cascade,
  "contractorId" text references "trade_contractors"("id"),
  "wbsCode" text not null,
  "name" text not null,
  "discipline" text not null,
  "system" text,
  "zone" text,
  "plannedStart" timestamp(3) not null,
  "plannedEnd" timestamp(3) not null,
  "durationDays" integer not null,
  "percentComplete" double precision not null default 0,
  "status" "TaskStatus" not null default 'NOT_STARTED',
  "isMilestone" boolean not null default false,
  "earlyStart" integer,
  "earlyFinish" integer,
  "lateStart" integer,
  "lateFinish" integer,
  "totalFloatDays" integer,
  "isCritical" boolean not null default false,
  "cpmComputedAt" timestamp(3),
  "createdAt" timestamp(3) not null default now(),
  "updatedAt" timestamp(3) not null,
  unique ("projectId","wbsCode")
);
create index "tasks_projectId_idx" on "tasks"("projectId");
create index "tasks_contractorId_idx" on "tasks"("contractorId");
create index "tasks_isCritical_idx" on "tasks"("isCritical");

create table "task_dependencies" (
  "id" text primary key default gen_random_uuid()::text,
  "predecessorId" text not null references "tasks"("id") on delete cascade,
  "successorId" text not null references "tasks"("id") on delete cascade,
  "type" "DependencyType" not null default 'FS',
  "lagDays" integer not null default 0,
  unique ("predecessorId","successorId")
);
create index "task_dependencies_successorId_idx" on "task_dependencies"("successorId");

-- Conflicts & Negotiation -------------------------------------------------
create table "schedule_conflicts" (
  "id" text primary key default gen_random_uuid()::text,
  "taskAId" text not null references "tasks"("id"),
  "taskBId" text not null references "tasks"("id"),
  "conflictType" "ConflictType" not null,
  "severity" "ConflictSeverity" not null,
  "description" text not null,
  "detectedAt" timestamp(3) not null default now(),
  "status" "ConflictStatus" not null default 'OPEN'
);
create index "schedule_conflicts_status_idx" on "schedule_conflicts"("status");

create table "negotiation_sessions" (
  "id" text primary key default gen_random_uuid()::text,
  "conflictId" text not null references "schedule_conflicts"("id") on delete cascade,
  "mechanism" text not null default 'nash_bargaining',
  "status" "NegotiationStatus" not null default 'RUNNING',
  "totalRounds" integer not null default 0,
  "paretoImproving" boolean,
  "nashProduct" double precision,
  "daysOfDelaySaved" double precision,
  "createdAt" timestamp(3) not null default now(),
  "resolvedAt" timestamp(3)
);
create index "negotiation_sessions_conflictId_idx" on "negotiation_sessions"("conflictId");

create table "negotiation_participants" (
  "id" text primary key default gen_random_uuid()::text,
  "sessionId" text not null references "negotiation_sessions"("id") on delete cascade,
  "contractorId" text not null references "trade_contractors"("id"),
  "reservationValue" double precision not null,
  "initialPositionJson" jsonb not null,
  "finalPositionJson" jsonb,
  "utilityGain" double precision
);
create index "negotiation_participants_sessionId_idx" on "negotiation_participants"("sessionId");

create table "negotiation_rounds" (
  "id" text primary key default gen_random_uuid()::text,
  "sessionId" text not null references "negotiation_sessions"("id") on delete cascade,
  "roundNumber" integer not null,
  "proposalsJson" jsonb not null,
  "concessionGap" double precision not null,
  "accepted" boolean not null default false,
  "createdAt" timestamp(3) not null default now()
);
create index "negotiation_rounds_sessionId_idx" on "negotiation_rounds"("sessionId");

create table "negotiation_outcomes" (
  "id" text primary key default gen_random_uuid()::text,
  "sessionId" text not null unique references "negotiation_sessions"("id") on delete cascade,
  "resolutionJson" jsonb not null,
  "explanationText" text,
  "explanationModel" text,
  "confidenceScore" double precision,
  "createdAt" timestamp(3) not null default now()
);

-- Risk ------------------------------------------------------------------
create table "risk_assessments" (
  "id" text primary key default gen_random_uuid()::text,
  "taskId" text not null references "tasks"("id") on delete cascade,
  "riskScore" double precision not null,
  "riskBand" "RiskBand" not null,
  "factorsJson" jsonb not null,
  "computedAt" timestamp(3) not null default now()
);
create index "risk_assessments_taskId_idx" on "risk_assessments"("taskId");
create index "risk_assessments_riskBand_idx" on "risk_assessments"("riskBand");

-- Supply chain ------------------------------------------------------------
create table "suppliers" (
  "id" text primary key default gen_random_uuid()::text,
  "name" text not null,
  "tier" integer not null default 1,
  "country" text not null,
  "reliabilityScore" double precision not null default 0.8
);

create table "equipment" (
  "id" text primary key default gen_random_uuid()::text,
  "projectId" text not null references "projects"("id") on delete cascade,
  "supplierId" text not null references "suppliers"("id"),
  "category" "EquipmentCategory" not null,
  "tagNumber" text not null,
  "description" text not null,
  "isLongLead" boolean not null default false,
  "orderDate" timestamp(3) not null,
  "promisedDelivery" timestamp(3) not null,
  "revisedDelivery" timestamp(3),
  "actualDelivery" timestamp(3),
  "status" "EquipmentStatus" not null default 'ORDERED',
  "originLat" double precision not null,
  "originLng" double precision not null,
  "destinationLat" double precision not null,
  "destinationLng" double precision not null,
  "createdAt" timestamp(3) not null default now(),
  "updatedAt" timestamp(3) not null,
  unique ("projectId","tagNumber")
);
create index "equipment_projectId_idx" on "equipment"("projectId");
create index "equipment_status_idx" on "equipment"("status");

create table "shipment_events" (
  "id" text primary key default gen_random_uuid()::text,
  "equipmentId" text not null references "equipment"("id") on delete cascade,
  "eventType" text not null,
  "lat" double precision not null,
  "lng" double precision not null,
  "eventDate" timestamp(3) not null,
  "note" text
);
create index "shipment_events_equipmentId_idx" on "shipment_events"("equipmentId");

-- Specification & Quality --------------------------------------------------
create table "specification_documents" (
  "id" text primary key default gen_random_uuid()::text,
  "projectId" text not null references "projects"("id") on delete cascade,
  "title" text not null,
  "standardRef" text not null,
  "version" text not null
);
create index "specification_documents_projectId_idx" on "specification_documents"("projectId");

create table "spec_requirements" (
  "id" text primary key default gen_random_uuid()::text,
  "specDocId" text not null references "specification_documents"("id") on delete cascade,
  "clauseRef" text not null,
  "parameter" text not null,
  "requiredValue" text not null,
  "unit" text,
  "toleranceLow" double precision,
  "toleranceHigh" double precision
);
create index "spec_requirements_specDocId_idx" on "spec_requirements"("specDocId");

create table "submittals" (
  "id" text primary key default gen_random_uuid()::text,
  "projectId" text not null,
  "contractorId" text not null references "trade_contractors"("id"),
  "equipmentId" text references "equipment"("id"),
  "requirementId" text references "spec_requirements"("id"),
  "submittalNumber" text not null,
  "title" text not null,
  "submittedValue" text not null,
  "submittedAt" timestamp(3) not null,
  "status" "SubmittalStatus" not null default 'PENDING_REVIEW',
  "reviewedAt" timestamp(3),
  unique ("projectId","submittalNumber")
);
create index "submittals_projectId_idx" on "submittals"("projectId");
create index "submittals_status_idx" on "submittals"("status");

create table "non_conformances" (
  "id" text primary key default gen_random_uuid()::text,
  "submittalId" text references "submittals"("id"),
  "requirementId" text references "spec_requirements"("id"),
  "taskId" text references "tasks"("id"),
  "severity" "NcSeverity" not null,
  "description" text not null,
  "deviationDetail" text not null,
  "status" "NcStatus" not null default 'OPEN',
  "raisedByAgent" text not null default 'spec-compliance-agent',
  "raisedAt" timestamp(3) not null default now(),
  "resolvedAt" timestamp(3)
);
create index "non_conformances_status_idx" on "non_conformances"("status");

-- RFI / Change orders -------------------------------------------------------
create table "rfis" (
  "id" text primary key default gen_random_uuid()::text,
  "projectId" text not null references "projects"("id") on delete cascade,
  "taskId" text references "tasks"("id"),
  "number" text not null,
  "subject" text not null,
  "question" text not null,
  "discipline" text not null,
  "raisedBy" text not null,
  "status" "RfiStatus" not null default 'OPEN',
  "submittedAt" timestamp(3) not null,
  "answeredAt" timestamp(3),
  "answerText" text,
  "costImpact" boolean not null default false,
  "scheduleImpactDays" integer not null default 0,
  unique ("projectId","number")
);
create index "rfis_projectId_idx" on "rfis"("projectId");
create index "rfis_status_idx" on "rfis"("status");

create table "change_orders" (
  "id" text primary key default gen_random_uuid()::text,
  "projectId" text not null references "projects"("id") on delete cascade,
  "number" text not null,
  "description" text not null,
  "costImpactInr" decimal(14,2) not null,
  "scheduleImpactDays" integer not null,
  "status" "ChangeOrderStatus" not null default 'PENDING',
  "submittedAt" timestamp(3) not null,
  unique ("projectId","number")
);
create index "change_orders_projectId_idx" on "change_orders"("projectId");

-- Commissioning -------------------------------------------------------------
create table "commissioning_tests" (
  "id" text primary key default gen_random_uuid()::text,
  "projectId" text not null references "projects"("id") on delete cascade,
  "standardRef" text not null,
  "system" text not null,
  "testProcedure" text not null,
  "level" text not null,
  "acceptanceCriteria" text not null,
  "actualValue" text,
  "result" "TestResult" not null default 'PENDING',
  "status" "TestStatus" not null default 'SCHEDULED',
  "scheduledFor" timestamp(3) not null,
  "executedBy" text,
  "executedAt" timestamp(3)
);
create index "commissioning_tests_projectId_idx" on "commissioning_tests"("projectId");
create index "commissioning_tests_status_idx" on "commissioning_tests"("status");

-- Audit -----------------------------------------------------------------
create table "audit_logs" (
  "id" text primary key default gen_random_uuid()::text,
  "projectId" text not null references "projects"("id") on delete cascade,
  "actorId" text references "user_profiles"("id"),
  "entityType" text not null,
  "entityId" text not null,
  "action" text not null,
  "agentName" text,
  "payloadJson" jsonb not null,
  "createdAt" timestamp(3) not null default now()
);
create index "audit_logs_projectId_idx" on "audit_logs"("projectId");
create index "audit_logs_entityType_entityId_idx" on "audit_logs"("entityType","entityId");
