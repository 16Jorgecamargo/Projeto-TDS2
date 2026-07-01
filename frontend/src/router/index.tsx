import { createBrowserRouter } from 'react-router-dom';
import { App } from '../App';
import { NotFound } from '../pages/NotFound';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/login', element: <div /> },
      { path: '/forbidden', element: <div /> },
      {
        element: <ProtectedRoute />,
        children: [],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
