export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter((entry): entry is string => Boolean(entry)).join(' ');
}

export function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: string | number): string {
  return currencyFormatter.format(toNumber(value));
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

export function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return dateFormatter.format(date);
}

export function formatRelativeDays(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  return `${diffDays} dias`;
}

export function formatShortName(fullName: string): string {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const lastName = rest[rest.length - 1];
  return lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;
}
