import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('marketplace-overview dashboard', () => {
  it('é JSON válido com os painéis esperados', () => {
    const raw = readFileSync(join(__dirname, 'marketplace-overview.json'), 'utf-8');
    const dashboard = JSON.parse(raw);
    expect(dashboard.title).toBe('Marketplace Overview');
    const titles = dashboard.panels.map((p: { title: string }) => p.title);
    expect(titles).toContain('HTTP p95 latency');
    expect(titles).toContain('Demands created');
    const exprs = dashboard.panels.flatMap((p: { targets?: { expr: string }[] }) => (p.targets ?? []).map((t) => t.expr));
    expect(exprs.join(' ')).toContain('http_request_duration_seconds_bucket');
    expect(exprs.join(' ')).toContain('marketplace_demands_created_total');
  });
});
