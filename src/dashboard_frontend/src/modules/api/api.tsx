import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';

export type SpecSummary = {
  name: string;
  displayName: string;
  status?: string;
  lastModified?: string;
  taskProgress?: { total: number; completed: number };
  phases?: any;
};

export type Approval = {
  id: string;
  title: string;
  status: string;
  type?: string;
  filePath?: string;
  content?: string;
  createdAt?: string;
};

export type ProjectInfo = {
  projectName: string;
  steering?: any;
  version?: string;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status };
}

async function putJson(url: string, body: any) {
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : null };
}

type ApiContextType = {
  specs: SpecSummary[];
  archivedSpecs: SpecSummary[];
  approvals: Approval[];
  info?: ProjectInfo;
  steeringDocuments?: any;
  reloadAll: () => Promise<void>;
  getAllSpecDocuments: (name: string) => Promise<Record<string, { content: string; lastModified: string } | null>>;
  getAllArchivedSpecDocuments: (name: string) => Promise<Record<string, { content: string; lastModified: string } | null>>;
  getSpecTasksProgress: (name: string) => Promise<any>;
  updateTaskStatus: (specName: string, taskId: string, status: 'pending' | 'in-progress' | 'completed') => Promise<{ ok: boolean; status: number; data?: any }>;
  approvalsAction: (id: string, action: 'approve' | 'reject' | 'needs-revision', payload: any) => Promise<{ ok: boolean; status: number }>;
  getApprovalContent: (id: string) => Promise<{ content: string; filePath?: string }>;
  saveSpecDocument: (name: string, document: string, content: string) => Promise<{ ok: boolean; status: number }>;
  saveArchivedSpecDocument: (name: string, document: string, content: string) => Promise<{ ok: boolean; status: number }>;
  archiveSpec: (name: string) => Promise<{ ok: boolean; status: number }>;
  unarchiveSpec: (name: string) => Promise<{ ok: boolean; status: number }>;
  getSteeringDocument: (name: string) => Promise<{ content: string; lastModified: string }>;
  saveSteeringDocument: (name: string, content: string) => Promise<{ ok: boolean; status: number }>;
};

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function ApiProvider({ initial, children, version }: { initial?: { specs?: SpecSummary[]; archivedSpecs?: SpecSummary[]; approvals?: Approval[] }; children: React.ReactNode; version?: number }) {
  const [specs, setSpecs] = useState<SpecSummary[]>(initial?.specs || []);
  const [archivedSpecs, setArchivedSpecs] = useState<SpecSummary[]>(initial?.archivedSpecs || []);
  const [approvals, setApprovals] = useState<Approval[]>(initial?.approvals || []);
  const [info, setInfo] = useState<ProjectInfo | undefined>(undefined);
  const [steeringDocuments, setSteeringDocuments] = useState<any>(undefined);

  const reloadAll = useCallback(async () => {
    const [s, as, a, i] = await Promise.all([
      getJson<SpecSummary[]>('/api/specs'),
      getJson<SpecSummary[]>('/api/specs/archived'),
      getJson<Approval[]>('/api/approvals'),
      getJson<ProjectInfo>('/api/info').catch(() => ({ projectName: 'Project' } as ProjectInfo)),
    ]);
    setSpecs(s);
    setArchivedSpecs(as);
    setApprovals(a);
    setInfo(i);
    setSteeringDocuments(i.steering);
  }, []);

  // Automatically reload when WebSocket version changes
  useEffect(() => {
    if (version !== undefined) {
      reloadAll();
    }
  }, [version, reloadAll]);

  const value = useMemo<ApiContextType>(() => ({
    specs,
    archivedSpecs,
    approvals,
    info,
    steeringDocuments,
    reloadAll,
    getAllSpecDocuments: (name: string) => getJson(`/api/specs/${encodeURIComponent(name)}/all`),
    getAllArchivedSpecDocuments: (name: string) => getJson(`/api/specs/${encodeURIComponent(name)}/all/archived`),
    getSpecTasksProgress: (name: string) => getJson(`/api/specs/${encodeURIComponent(name)}/tasks/progress`),
    updateTaskStatus: (specName: string, taskId: string, status: 'pending' | 'in-progress' | 'completed') => putJson(`/api/specs/${encodeURIComponent(specName)}/tasks/${encodeURIComponent(taskId)}/status`, { status }),
    approvalsAction: (id, action, body) => postJson(`/api/approvals/${encodeURIComponent(id)}/${action}`, body),
    getApprovalContent: (id: string) => getJson(`/api/approvals/${encodeURIComponent(id)}/content`),
    saveSpecDocument: (name: string, document: string, content: string) => putJson(`/api/specs/${encodeURIComponent(name)}/${encodeURIComponent(document)}`, { content }),
    saveArchivedSpecDocument: (name: string, document: string, content: string) => putJson(`/api/specs/${encodeURIComponent(name)}/${encodeURIComponent(document)}/archived`, { content }),
    archiveSpec: (name: string) => postJson(`/api/specs/${encodeURIComponent(name)}/archive`, {}),
    unarchiveSpec: (name: string) => postJson(`/api/specs/${encodeURIComponent(name)}/unarchive`, {}),
    getSteeringDocument: (name: string) => getJson(`/api/steering/${encodeURIComponent(name)}`),
    saveSteeringDocument: (name: string, content: string) => putJson(`/api/steering/${encodeURIComponent(name)}`, { content }),
  }), [specs, archivedSpecs, approvals, info, steeringDocuments, reloadAll]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiContextType {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used within ApiProvider');
  return ctx;
}


