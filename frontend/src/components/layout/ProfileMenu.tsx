import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth';
import { Avatar } from '../ui/Avatar';

const roleLabels: Record<string, string> = {
  client: 'Cliente',
  professional: 'Profissional',
  admin: 'Administrador',
};

export function ProfileMenu(): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = user.name ?? roleLabels[user.role];

  function handleLogout() {
    clear();
    setOpen(false);
    navigate('/login');
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-sm p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Avatar name={displayName} size="sm" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-dropdown mt-2 w-56 rounded-md bg-bg py-2 shadow-modal">
          <div className="px-4 py-2">
            <p className="text-sm font-semibold text-ink">{displayName}</p>
            <p className="text-xs text-muted">{roleLabels[user.role]}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink hover:bg-surface"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            Configurações
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink hover:bg-surface"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
