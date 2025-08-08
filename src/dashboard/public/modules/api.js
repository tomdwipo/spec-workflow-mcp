export async function loadInitialData(app) {
  const [specsRes, approvalsRes, infoRes] = await Promise.all([
    fetch('/api/specs'),
    fetch('/api/approvals'),
    fetch('/api/info'),
  ]);

  app.specs = await specsRes.json();
  app.approvals = await approvalsRes.json();
  const info = await infoRes.json();
  app.projectName = info.projectName || 'Project';
  app.steeringStatus = info.steering;
}

export async function fetchAllSpecDocuments(specName) {
  const response = await fetch(`/api/specs/${specName}/all`);
  return response.json();
}

export async function fetchApprovalContent(approvalId) {
  const response = await fetch(`/api/approvals/${approvalId}/content`);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to fetch approval content (${response.status}): ${text}`);
  }
  return response.json();
}

export async function fetchTaskProgress(specName) {
  const response = await fetch(`/api/specs/${specName}/tasks/progress`);
  if (!response.ok) throw new Error(`Failed to load task progress: ${response.status}`);
  return response.json();
}

export async function postApprovalAction(approvalId, action, payload) {
  const res = await fetch(`/api/approvals/${approvalId}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res;
}


