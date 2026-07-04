import { useEffect, type JSX } from 'react';
import { Outlet } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';
import { bootstrapSession } from './features/auth/bootstrap';

export function App(): JSX.Element {
  useEffect(() => {
    void bootstrapSession();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <AppShell>
        <Outlet />
      </AppShell>
    </MotionConfig>
  );
}
