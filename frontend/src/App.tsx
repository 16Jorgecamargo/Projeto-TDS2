import type { JSX } from 'react';
import { Outlet } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';

export function App(): JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <AppShell>
        <Outlet />
      </AppShell>
    </MotionConfig>
  );
}
