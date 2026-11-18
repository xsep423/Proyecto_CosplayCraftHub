import { createBrowserRouter, Navigate } from 'react-router';

import Layout from './components/layout/Layout';
import PlatformLayout from './components/layout/PlatformLayout';
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

// Páginas que se descargan solo cuando se visitan (el portafolio público no
// necesita el resto de la app, y la consola de plataforma solo la usa el super admin)
const page = (load: () => Promise<{ default: React.ComponentType }>) => () =>
  load().then(m => ({ Component: m.default }));

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
    path: '/forgot-password',
    lazy: page(() => import('./pages/ForgotPassword')),
  },
  {
    path: '/reset-password',
    lazy: page(() => import('./pages/ResetPassword')),
  },
  {
    // Portafolio público del taller (sin sesión)
    path: '/p/:slug',
    lazy: page(() => import('./pages/PublicPortfolio')),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        // Documento imprimible, fuera del Layout para que el PDF salga limpio
        path: '/quotes/:id/print',
        lazy: page(() => import('./pages/QuotePrint')),
      },
      {
        // Consola del super admin de la plataforma
        path: '/platform',
        Component: PlatformLayout,
        children: [
          { index: true, lazy: page(() => import('./pages/platform/PlatformDashboard')) },
          { path: 'workshops', lazy: page(() => import('./pages/platform/PlatformWorkshops')) },
          { path: 'workshops/:id', lazy: page(() => import('./pages/platform/PlatformWorkshopDetail')) },
        ],
      },
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
            path: 'calendar',
            lazy: page(() => import('./pages/Calendar')),
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

