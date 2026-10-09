import type { AnalyticsDashboard, DashboardOperationalSummary } from './api';
import { formatBusinessInstant } from './business-time.ts';
import type { DashboardSummaryData } from './dashboard-summary-state';

// Both HTTP operations are bounded by the central client's deadline. Failure
// of one source must not turn the other into fabricated zeros or an error.
export async function loadDashboardSummary(
  operational: Promise<DashboardOperationalSummary>,
  analytics: Promise<AnalyticsDashboard | null>,
): Promise<DashboardSummaryData> {
  const [agenda, metrics] = await Promise.allSettled([operational, analytics]);
  return {
    operational: agenda.status === 'fulfilled' ? agenda.value : null,
    analytics: metrics.status === 'fulfilled' ? metrics.value : null,
    operationalError: agenda.status === 'rejected'
      ? 'No pudimos cargar la agenda y la carga de hoy. Vuelve a intentarlo.' : null,
    analyticsError: metrics.status === 'rejected'
      ? 'No pudimos cargar las métricas. La agenda disponible se mantiene visible.' : null,
  };
}

export function summaryDateLabel(generatedAt: string, timeZone: string) {
  return formatBusinessInstant(generatedAt, timeZone);
}

export function summaryGreeting(generatedAt: string, timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', hourCycle: 'h23',
  }).format(new Date(generatedAt)));
  return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
}
