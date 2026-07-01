import type { JSX } from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';

export function App(): JSX.Element {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
