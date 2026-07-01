export type { Role, AuthUser } from '../plugins/auth';

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export function toPaginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, total, page, limit };
}
