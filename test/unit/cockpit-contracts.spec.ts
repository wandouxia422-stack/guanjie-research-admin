import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STATUS_LABELS } from '../../shared/status-labels';
import { canClaimJob, isDuplicateEventId } from '../../server/modules/research-admin/project-progress';

describe('V1.1 contracts', () => {
  it('ignores a duplicate Codex event id', () => {
    expect(isDuplicateEventId(['event-1'], 'event-1')).toBe(true);
    expect(isDuplicateEventId(['event-1'], 'event-2')).toBe(false);
  });
  it('shows blocked state as 资料不足', () => { expect(STATUS_LABELS.blocked).toBe('资料不足'); });
  it('allows only pending jobs to be claimed', () => {
    expect(canClaimJob('pending')).toBe(true);
    expect(canClaimJob('claimed')).toBe(false);
    expect(canClaimJob('running')).toBe(false);
  });
  it('preserves V1 projects and resources in additive migration', () => {
    const migration = readFileSync(resolve(process.cwd(), 'migrations/0002_project_cockpit.sql'), 'utf8');
    expect(migration).toContain('ALTER TABLE research_project');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+(research_project|resource_entry)/i);
  });
  it('creates new projects from the reusable default template', () => {
    const service = readFileSync(resolve(process.cwd(), 'server/modules/research-admin/research-admin.service.ts'), 'utf8');
    const migration = readFileSync(resolve(process.cwd(), 'migrations/0002_project_cockpit.sql'), 'utf8');
    expect(service).toContain("input.templateCode ?? 'brand-full-case-v1'");
    expect(migration).toContain("'brand-full-case-v1', '品牌全案'");
    expect(migration).toContain("('validation-90d','validation','06 90 天落地验证'");
  });
});
