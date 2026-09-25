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
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  description: string;
  responsible: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  dueDate: string;
  progress: number;
  budget: number;
  spent: number;
  tags: string[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string;
  priority: Priority;
  dueDate?: string;
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

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'material' | 'labor';
}

export interface Quote {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  status: QuoteStatus;
  items: QuoteItem[];
  discount: number;
  tax: number;
  notes?: string;
  createdAt: string;
  validUntil: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'maker' | 'viewer';
  avatar?: string;
  active: boolean;
}
