import { Registry, Histogram, Counter, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

function counter(name: string, help: string): Counter {
  return new Counter({ name, help, registers: [metricsRegistry] });
}

export const businessMetrics = {
  demandsCreated: counter('marketplace_demands_created_total', 'Demandas criadas'),
  quotesCreated: counter('marketplace_quotes_created_total', 'Orçamentos enviados'),
  contractsSigned: counter('marketplace_contracts_signed_total', 'Contratos assinados'),
  paymentsProcessed: counter('marketplace_payments_processed_total', 'Pagamentos processados'),
  reviewsCreated: counter('marketplace_reviews_created_total', 'Avaliações criadas'),
  notificationsSent: counter('marketplace_notifications_sent_total', 'Notificações entregues'),
};

export function observeHttp(method: string, route: string, statusCode: number, durationSeconds: number): void {
  httpRequestDuration.observe({ method, route, status_code: String(statusCode) }, durationSeconds);
}
