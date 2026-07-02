import { useEffect, type JSX } from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { bootstrapSession } from './features/auth/bootstrap';

export function App(): JSX.Element {
  useEffect(() => {
    void bootstrapSession();
  }, []);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
