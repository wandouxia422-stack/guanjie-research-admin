import { calculateProgressPercent, isBridgeOnline, isWeightTotalValid } from '../../server/modules/research-admin/project-progress';

describe('project cockpit rules', () => {
  it('calculates progress from done task weights only', () => {
    expect(calculateProgressPercent([{ weight: 40, status: 'done' }, { weight: 60, status: 'running' }])).toBe(40);
  });
  it('does not count waiting approval as progress', () => {
    expect(calculateProgressPercent([{ weight: 50, status: 'waiting_approval' }, { weight: 50, status: 'done' }])).toBe(50);
  });
  it('validates the template weight total', () => {
    expect(isWeightTotalValid([{ weight: 10, status: 'todo' }, { weight: 90, status: 'todo' }])).toBe(true);
  });
  it('marks stale bridge heartbeat offline', () => {
    const now = new Date('2026-08-29T00:02:00Z');
    expect(isBridgeOnline(new Date('2026-08-29T00:00:00Z'), now)).toBe(false);
    expect(isBridgeOnline(new Date('2026-08-29T00:01:00Z'), now)).toBe(true);
  });
});
