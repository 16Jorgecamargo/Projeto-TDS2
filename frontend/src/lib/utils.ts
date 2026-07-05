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

export function formatShortName(fullName: string): string {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const lastName = rest[rest.length - 1];
  return lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;
}
