import type { JSX, ReactNode } from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { ToastProvider } from '../ui/Toast';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <Topbar />
      <div className="flex flex-1 justify-center">
        <div className="flex w-full max-w-app">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-6 pb-20 nav:pb-6">{children}</main>
        </div>
      </div>
      <MobileNav />
      <ToastProvider />
    </div>
  );
}
