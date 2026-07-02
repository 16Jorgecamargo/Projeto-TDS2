import type { ProgressUpdate } from '../api';

interface Props {
  updates: ProgressUpdate[];
}

export function ContractProgress({ updates }: Props) {
  return (
    <ol className="flex flex-col gap-2">
      {updates.map((update) => (
        <li key={update.id} className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">{update.description}</span>
            {update.percentage !== null && (
              <span className="text-sm text-slate-500">{update.percentage}%</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
