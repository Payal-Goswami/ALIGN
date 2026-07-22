export type RiskBand = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';

export const RISK_BAND_COLOR: Record<RiskBand, string> = {
  LOW: 'success',
  MODERATE: 'warning',
  HIGH: 'warning',
  SEVERE: 'danger',
};

export interface DashboardKpis {
  totalTasks: number;
  criticalPathTasks: number;
  openConflicts: number;
  resolvedConflictsThisMonth: number;
  avgNegotiationDaysSaved: number;
  openNonConformances: number;
  atRiskEquipment: number;
  openRfis: number;
  scheduleHealthScore: number; // 0-100 composite
}
