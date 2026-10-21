import { createBrowserRouter, Navigate } from 'react-router';

import Layout from './components/layout/Layout';
import ProtectedRoute from './components/protectRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import CreateProject from './pages/CreateProject';
import ProjectDetail from './pages/ProjectDetail';
import Clients from './pages/Clients';
import Inventory from './pages/Inventory';
import Quotes from './pages/Quotes';
import Settings from './pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/register',
    Component: Register,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        Component: Layout,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            Component: Dashboard,
          },
          {
            path: 'projects',
            Component: Projects,
          },
          {
            path: 'projects/new',
            Component: CreateProject,
          },
          {
            path: 'projects/:id',
            Component: ProjectDetail,
          },
          {
            path: 'projects/:id/edit',
            Component: CreateProject,
          },
          {
            path: 'clients',
            Component: Clients,
          },
          {
            path: 'inventory',
            Component: Inventory,
          },
          {
            path: 'quotes',
            Component: Quotes,
          },
          {
            path: 'settings',
            Component: Settings,
          },
        ],
      },
    ],
  },
]);

