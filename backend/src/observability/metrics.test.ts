import { describe, it, expect } from 'vitest';
import { metricsRegistry, businessMetrics, observeHttp } from './metrics';

describe('metrics registry', () => {
  it('expõe métricas default e o histograma HTTP', async () => {
    observeHttp('GET', '/health', 200, 0.01);
    const output = await metricsRegistry.metrics();
    expect(output).toContain('http_request_duration_seconds');
    expect(output).toContain('process_cpu_user_seconds_total');
  });

  it('incrementa contador de negócio', async () => {
    businessMetrics.demandsCreated.inc();
    const output = await metricsRegistry.metrics();
    expect(output).toMatch(/marketplace_demands_created_total \d+/);
  });
});
