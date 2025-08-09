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

type ApiContextType = {
  specs: SpecSummary[];
  approvals: Approval[];
  info?: ProjectInfo;
  reloadAll: () => Promise<void>;
  getAllSpecDocuments: (name: string) => Promise<Record<string, { content: string; lastModified: string } | null>>;
  getSpecTasksProgress: (name: string) => Promise<any>;
  approvalsAction: (id: string, action: 'approve' | 'reject' | 'needs-revision', payload: any) => Promise<{ ok: boolean; status: number }>;
  getApprovalContent: (id: string) => Promise<{ content: string; filePath?: string }>;
};

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function ApiProvider({ initial, children, version }: { initial?: { specs?: SpecSummary[]; approvals?: Approval[] }; children: React.ReactNode; version?: number }) {
  const [specs, setSpecs] = useState<SpecSummary[]>(initial?.specs || []);
  const [approvals, setApprovals] = useState<Approval[]>(initial?.approvals || []);
  const [info, setInfo] = useState<ProjectInfo | undefined>(undefined);

  const reloadAll = useCallback(async () => {
    const [s, a, i] = await Promise.all([
      getJson<SpecSummary[]>('/api/specs'),
      getJson<Approval[]>('/api/approvals'),
      getJson<ProjectInfo>('/api/info').catch(() => ({ projectName: 'Project' } as ProjectInfo)),
    ]);
    setSpecs(s);
    setApprovals(a);
    setInfo(i);
  }, []);

  // Automatically reload when WebSocket version changes
  useEffect(() => {
    if (version !== undefined) {
      reloadAll();
    }
  }, [version, reloadAll]);

  const value = useMemo<ApiContextType>(() => ({
    specs,
    approvals,
    info,
    reloadAll,
    getAllSpecDocuments: (name: string) => getJson(`/api/specs/${encodeURIComponent(name)}/all`),
    getSpecTasksProgress: (name: string) => getJson(`/api/specs/${encodeURIComponent(name)}/tasks/progress`),
    approvalsAction: (id, action, body) => postJson(`/api/approvals/${encodeURIComponent(id)}/${action}`, body),
    getApprovalContent: (id: string) => getJson(`/api/approvals/${encodeURIComponent(id)}/content`),
  }), [specs, approvals, info, reloadAll]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiContextType {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used within ApiProvider');
  return ctx;
}


