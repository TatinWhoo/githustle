import type { GHNode, GHEdge } from './lib/flowchart-utils';

export interface Job {
  id: string;
  title: string;
  description: string;
  budget: number;
  budgetType: 'fixed' | 'hourly';
  skills: string[];
  field: string;
  experienceLevel: 'entry' | 'mid' | 'senior';
  deadline: string;
  postedDate: string;
  client: {
    name: string;
    company: string;
    rating: number;
    location: string;
  };
  proposalsCount: number;
}

export interface Milestone {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  deliverableDesc: string;
  submittedFile: string | null;
  submittedAt: string | null;
}

export interface Proposal {
  id: string;
  jobId: string;
  freelancerName: string;
  freelancerAvatar: string;
  coverLetter: string;
  proposedRate: number;
  timelineWeeks: number;
  status: 'pending' | 'accepted' | 'declined';
  milestones: Milestone[];
}

export interface Message {
  id: string;
  senderName: string;
  senderRole: 'client' | 'freelancer';
  text: string;
  timestamp: string;
}

export interface CollabDocument {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  updatedBy: string;
}

export interface BoardElement {
  id: string;
  type: 'rectangle' | 'circle' | 'arrow' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  color: string;
  fromId?: string;
  toId?: string;
}

export interface StickyNote {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  isShared: boolean;
}

export interface CallRecord {
  id: string;
  startTime: string;
  durationSeconds: number;
  whiteboardSnapshots: string[];
}

export interface Project {
  id: string;
  jobTitle: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  totalBudget: number;
  status: 'active' | 'completed' | 'disputed';
  milestones: Milestone[];
  messages: Message[];
  documents: CollabDocument[];
  boardElements: BoardElement[];
  stickyNotes: StickyNote[];
  calls: CallRecord[];
  auditLogs: AuditLogEntry[];
  invoices?: Invoice[];
  sharedTables: SharedTable[];
  sharedFlowcharts?: {
    id: string;
    name: string;
    nodes: GHNode[];
    edges: GHEdge[];
    createdAt: string;
    createdBy: 'client' | 'freelancer';
  }[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface Dispute {
  id: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  freelancerName: string;
  reason: string;
  amountDisputed: number;
  status: 'open' | 'resolved' | 'escalated';
  createdAt: string;
  milestoneTitle: string;
}

export interface FreelancerService {
  id: string;
  title: string;
  description: string;
  freelancerName: string;
  skills: string[];
  field: string;
  rate: number;
  experienceLevel: 'entry' | 'mid' | 'senior';
  deliveryDays: number;
  rating: number;
  completedJobs: number;
}

export interface Invoice {
  id: string;              // INV-2026-XXXX from server
  milestone_id: string;
  milestone_title: string;
  project_id: string;
  project_title: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'disputed';
  notes?: string;
  due_date: string;        // ISO
  paid_at?: string;
  payment_method?: 'gcash' | 'maya' | 'bank' | 'card' | 'paypal';
  created_at: string;
}

export interface Review {
  id: string;
  project_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: 'client' | 'freelancer';
  rating: number;          // 1-5
  categories: Record<string, number>;
  comment: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: 'proposal_received' | 'proposal_accepted' | 'proposal_rejected' | 'milestone_submitted' | 'milestone_approved' | 'message_received' | 'invoice_paid' | 'invoice_overdue' | 'dispute_opened';
  title: string;
  body: string;
  is_read: boolean;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  role: 'client' | 'freelancer' | 'admin';
  status: 'active' | 'warned' | 'suspended';
  joined_at: string;
  jobs_posted?: number;
  proposals_submitted?: number;
  rating: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  actor: string;
  action: string;
  entity: string;
  stack_trace?: string;
}

export interface AnalyticsSummary {
  totalUsers: number;
  totalUsersWoW: number;
  gmvThisMonth: number;
  gmvWoW: number;
  totalDisputes: number;
  openDisputes: number;
  uptime: number;
}

export interface SharedTableCell {
  value: string;
}

export type CellType = 'text' | 'status' | 'priority' | 'currency' | 'date' | 'url' | 'number';

export interface ColumnDef {
  id: string;
  header: string;
  type: CellType;
  width: number;
}

export interface TableRow {
  id: string;
  cells: Record<string, string>;
}

export interface SharedTable {
  id: string;
  name: string;
  columns: ColumnDef[];
  rows: TableRow[];
  createdAt: string;
  createdBy: 'client' | 'freelancer';
}



