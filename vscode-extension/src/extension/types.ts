// Shared types between extension and webview
export interface SpecData {
  name: string;
  displayName: string;
  description?: string;
  createdAt: string;
  lastModified: string;
  phases: {
    requirements: PhaseStatus;
    design: PhaseStatus;
    tasks: PhaseStatus;
    implementation: PhaseStatus;
  };
  taskProgress?: {
    total: number;
    completed: number;
    pending: number;
  };
}

export interface PhaseStatus {
  exists: boolean;
  approved?: boolean;
  lastModified?: string;
  content?: string;
}

export interface TaskProgressData {
  specName: string;
  total: number;
  completed: number;
  progress: number;
  taskList: TaskInfo[];
  inProgress?: string;
}

export interface TaskInfo {
  id: string;
  description: string;
  status: TaskStatus;
  completed: boolean;
  isHeader?: boolean;
  files?: string[];
  implementationDetails?: string[];
  requirements?: string[];
  leverage?: string;
}

export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export interface ApprovalComment {
  id: string;
  text: string;
  lineNumber?: number;
  timestamp: string;
  resolved?: boolean;
}

export interface ApprovalData {
  id: string;
  title: string;
  description?: string;
  filePath: string; // Path to the file to be reviewed
  type: 'document' | 'action';
  status: 'pending' | 'approved' | 'rejected' | 'needs-revision';
  createdAt: string;
  respondedAt?: string;
  response?: string;
  annotations?: string;
  comments?: ApprovalComment[];
  revisionHistory?: {
    version: number;
    content: string;
    timestamp: string;
    reason?: string;
  }[];
  metadata?: Record<string, any>;
  category: 'spec';
  categoryName: string; // spec name
}

export interface SteeringStatus {
  exists: boolean;
  documents: {
    product: boolean;
    tech: boolean;
    structure: boolean;
  };
  lastModified?: string;
}