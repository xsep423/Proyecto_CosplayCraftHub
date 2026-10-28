export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'invoiced';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type StockStatus = 'ok' | 'low' | 'critical' | 'out';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  projects: number;
  totalSpent: number;
  status: 'active' | 'inactive';
  joinedAt: string;
  avatar?: string;
  notes?: string;
}

export interface Project {
  id: number;
  name: string;
  clientId: number;
  clientName: string;
  description: string;
  responsibleId: number | null;
  responsible: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  dueDate: string;
  progress: number;
  budget: number;
  laborCost: number;
  otherCost: number;
  materialsCost: number;
  spent: number;
  tags: string[];
  taskCount: number;
  doneTasks: number;
  createdAt: string;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId: number | null;
  assignee: string;
  priority: Priority;
  dueDate: string | null;
}

export interface ProjectMaterial {
  id: number;
  projectId: number;
  materialId: number;
  materialName: string;
  category: string;
  unit: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface Option {
  id: number;
  name: string;
}

export interface Workshop {
  id: number;
  name: string;
  slug: string;
}

export interface DashboardAlert {
  type: 'danger' | 'warning' | 'info';
  kind: 'stock' | 'project' | 'quote';
  text: string;
  link: string;
}

export interface DashboardSummary {
  workshop: { id: number; name: string; currency: string };
  stats: {
    activeProjects: number;
    newProjectsThisMonth: number;
    activeClients: number;
    newClientsThisMonth: number;
    stockAlerts: number;
    criticalStock: number;
    pendingQuotes: number;
    sentQuotesTotal: number;
    wonQuotesTotal: number;
  };
  projectsByStatus: Record<ProjectStatus, number>;
  upcoming: Project[];
  inProgress: Project[];
  alerts: DashboardAlert[];
}

export interface Material {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  minStock: number;
  stock: StockStatus;
  supplier?: string;
  location?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'maker' | 'viewer';
  avatar?: string;
  active: boolean;
}

export interface QuoteItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'material' | 'labor';
}

export interface Quote {
  id: number;
  number: string;
  clientId: number;
  clientName: string;
  projectId?: number | null;
  projectName?: string;
  status: QuoteStatus;
  items: QuoteItem[];
  discount: number;
  tax: number;
  notes: string;
  createdAt: string;
  validUntil: string;
  subtotal: number;
  total: number;
}

// ---- Consola de plataforma (super admin) ----

export interface PlatformWorkshop {
  id: number;
  name: string;
  slug: string;
  owner: string;
  email: string;
  city: string;
  isActive: boolean;
  createdAt: string;
  users: number;
  clients: number;
  projects: number;
  quotes: number;
}

export interface PlatformMember {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'maker' | 'viewer';
  active: boolean;
  lastLogin: string | null;
  dateJoined: string;
}

export interface PlatformWorkshopDetail extends PlatformWorkshop {
  phone: string;
  address: string;
  currency: string;
  quotePrefix: string;
  activeProjects: number;
  wonQuotesTotal: number;
  members: PlatformMember[];
}

export interface PlatformSummary {
  workshops: number;
  activeWorkshops: number;
  users: number;
  clients: number;
  projects: number;
  activeProjects: number;
  quotes: number;
  recentWorkshops: PlatformWorkshop[];
}
