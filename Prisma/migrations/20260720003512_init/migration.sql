-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_projectId_fkey";

-- DropForeignKey
ALTER TABLE "change_orders" DROP CONSTRAINT "change_orders_projectId_fkey";

-- DropForeignKey
ALTER TABLE "commissioning_tests" DROP CONSTRAINT "commissioning_tests_projectId_fkey";

-- DropForeignKey
ALTER TABLE "equipment" DROP CONSTRAINT "equipment_projectId_fkey";

-- DropForeignKey
ALTER TABLE "equipment" DROP CONSTRAINT "equipment_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "negotiation_outcomes" DROP CONSTRAINT "negotiation_outcomes_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "negotiation_participants" DROP CONSTRAINT "negotiation_participants_contractorId_fkey";

-- DropForeignKey
ALTER TABLE "negotiation_participants" DROP CONSTRAINT "negotiation_participants_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "negotiation_rounds" DROP CONSTRAINT "negotiation_rounds_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "negotiation_sessions" DROP CONSTRAINT "negotiation_sessions_conflictId_fkey";

-- DropForeignKey
ALTER TABLE "non_conformances" DROP CONSTRAINT "non_conformances_requirementId_fkey";

-- DropForeignKey
ALTER TABLE "non_conformances" DROP CONSTRAINT "non_conformances_submittalId_fkey";

-- DropForeignKey
ALTER TABLE "non_conformances" DROP CONSTRAINT "non_conformances_taskId_fkey";

-- DropForeignKey
ALTER TABLE "rfis" DROP CONSTRAINT "rfis_projectId_fkey";

-- DropForeignKey
ALTER TABLE "rfis" DROP CONSTRAINT "rfis_taskId_fkey";

-- DropForeignKey
ALTER TABLE "risk_assessments" DROP CONSTRAINT "risk_assessments_taskId_fkey";

-- DropForeignKey
ALTER TABLE "schedule_conflicts" DROP CONSTRAINT "schedule_conflicts_taskAId_fkey";

-- DropForeignKey
ALTER TABLE "schedule_conflicts" DROP CONSTRAINT "schedule_conflicts_taskBId_fkey";

-- DropForeignKey
ALTER TABLE "shipment_events" DROP CONSTRAINT "shipment_events_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "spec_requirements" DROP CONSTRAINT "spec_requirements_specDocId_fkey";

-- DropForeignKey
ALTER TABLE "specification_documents" DROP CONSTRAINT "specification_documents_projectId_fkey";

-- DropForeignKey
ALTER TABLE "submittals" DROP CONSTRAINT "submittals_contractorId_fkey";

-- DropForeignKey
ALTER TABLE "submittals" DROP CONSTRAINT "submittals_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "submittals" DROP CONSTRAINT "submittals_requirementId_fkey";

-- DropForeignKey
ALTER TABLE "task_dependencies" DROP CONSTRAINT "task_dependencies_predecessorId_fkey";

-- DropForeignKey
ALTER TABLE "task_dependencies" DROP CONSTRAINT "task_dependencies_successorId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_contractorId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_projectId_fkey";

-- DropForeignKey
ALTER TABLE "trade_contractors" DROP CONSTRAINT "trade_contractors_projectId_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "change_orders" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commissioning_tests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "equipment" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "negotiation_outcomes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "negotiation_participants" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "negotiation_rounds" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "negotiation_sessions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "non_conformances" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "rfis" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "risk_assessments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "schedule_conflicts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shipment_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "spec_requirements" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "specification_documents" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "submittals" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "suppliers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "task_dependencies" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "trade_contractors" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "trade_contractors" ADD CONSTRAINT "trade_contractors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "trade_contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_conflicts" ADD CONSTRAINT "schedule_conflicts_taskAId_fkey" FOREIGN KEY ("taskAId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_conflicts" ADD CONSTRAINT "schedule_conflicts_taskBId_fkey" FOREIGN KEY ("taskBId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_sessions" ADD CONSTRAINT "negotiation_sessions_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES "schedule_conflicts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_participants" ADD CONSTRAINT "negotiation_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "negotiation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_participants" ADD CONSTRAINT "negotiation_participants_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "trade_contractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_rounds" ADD CONSTRAINT "negotiation_rounds_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "negotiation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_outcomes" ADD CONSTRAINT "negotiation_outcomes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "negotiation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specification_documents" ADD CONSTRAINT "specification_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spec_requirements" ADD CONSTRAINT "spec_requirements_specDocId_fkey" FOREIGN KEY ("specDocId") REFERENCES "specification_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submittals" ADD CONSTRAINT "submittals_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "trade_contractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submittals" ADD CONSTRAINT "submittals_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submittals" ADD CONSTRAINT "submittals_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "spec_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_submittalId_fkey" FOREIGN KEY ("submittalId") REFERENCES "submittals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "spec_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissioning_tests" ADD CONSTRAINT "commissioning_tests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
