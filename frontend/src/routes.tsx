import { createBrowserRouter, Navigate } from 'react-router';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
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
    path: '/',
    Component: Layout,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'dashboard', Component: Dashboard },
      { path: 'projects', Component: Projects },
      { path: 'projects/new', Component: CreateProject },
      { path: 'projects/:id', Component: ProjectDetail },
      { path: 'clients', Component: Clients },
      { path: 'inventory', Component: Inventory },
      { path: 'quotes', Component: Quotes },
      { path: 'settings', Component: Settings },
    ],
  },
]);
