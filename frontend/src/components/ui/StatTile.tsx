import type { JSX } from 'react';
import { Card } from './Card';

export interface StatTileProps {
  label: string;
  value: string;
  onClick?: () => void;
}

export function StatTile({ label, value, onClick }: StatTileProps): JSX.Element {
  return (
    <Card
      interactive={Boolean(onClick)}
      onClick={onClick}
      className="flex flex-col gap-1 bg-primary text-center"
    >
      <span className="text-h3 font-bold text-bg">{value}</span>
      <span className="text-body-sm text-bg/80">{label}</span>
    </Card>
  );
}
