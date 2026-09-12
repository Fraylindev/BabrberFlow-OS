import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDashboardSummary, summaryDateLabel, summaryGreeting } from './dashboard-summary-load.ts';
import type { AnalyticsDashboard, DashboardOperationalSummary } from './api';

const operational: DashboardOperationalSummary = {
  generatedAt: '2026-08-25T02:00:00Z', timeZone: 'America/Santo_Domingo', isBrandNew: false,
  agenda: { items: [], page: 2, limit: 20, total: 31, totalPages: 2, completed: 26, nextBookingId: null },
  workload: { items: [], page: 2, limit: 20, total: 25, totalPages: 2, idleCount: 24 },
};
const analytics: AnalyticsDashboard = {
  generatedAt: operational.generatedAt, revenue: { today: 10, yesterday: 5, last7Days: 20 },
  bookings: { today: 31, pending: 2, cancelled: 1 }, topProfessional: null,
};

test('financial dependency failure preserves agenda and complete server totals', async () => {
  const result = await loadDashboardSummary(Promise.resolve(operational), Promise.reject(new Error('internal detail')));
  assert.equal(result.operational, operational);
  assert.equal(result.analytics, null);
  assert.equal(result.operationalError, null);
  assert.ok(result.analyticsError);
  assert.ok(!result.analyticsError.includes('internal detail'));
});

test('operational dependency failure preserves real financial data and never fabricates a zero agenda', async () => {
  const result = await loadDashboardSummary(Promise.reject(new Error('failed')), Promise.resolve(analytics));
  assert.equal(result.analytics, analytics);
  assert.equal(result.operational, null);
  assert.ok(result.operationalError);
  assert.equal(result.analyticsError, null);
});

test('both failures are terminal and a later retry can succeed', async () => {
  const failed = await loadDashboardSummary(Promise.reject(new Error()), Promise.reject(new Error()));
  assert.ok(failed.operationalError && failed.analyticsError);
  const retry = await loadDashboardSummary(Promise.resolve(operational), Promise.resolve(analytics));
  assert.equal(retry.operationalError, null);
  assert.equal(retry.analyticsError, null);
});

test('BARBER does not need financial data to settle successfully', async () => {
  const result = await loadDashboardSummary(Promise.resolve({ ...operational, workload: null }), Promise.resolve(null));
  assert.equal(result.analyticsError, null);
  assert.equal(result.operational?.workload, null);
});

test('date and greeting use server instant in business timezone instead of browser timezone', () => {
  assert.match(summaryDateLabel(operational.generatedAt, operational.timeZone), /24/);
  assert.equal(summaryGreeting(operational.generatedAt, operational.timeZone), 'Buenas noches');
  assert.match(summaryDateLabel(operational.generatedAt, 'Asia/Tokyo'), /25/);
  assert.equal(summaryGreeting(operational.generatedAt, 'Asia/Tokyo'), 'Buenos días');
});
