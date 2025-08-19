import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SpecData, TaskProgressData, TaskInfo, ApprovalData, SteeringStatus, PhaseStatus } from '../types';
import { ApprovalEditorService } from './ApprovalEditorService';

export class SpecWorkflowService {
  private workspaceRoot: string | null = null;
  private specWorkflowRoot: string | null = null;
  private approvalWatcher: vscode.FileSystemWatcher | null = null;
  private onApprovalsChangedCallback: (() => void) | null = null;
  private approvalEditorService: ApprovalEditorService | null = null;

  constructor() {
    this.updateWorkspaceRoot();

    // Note: ApprovalEditorService will be initialized in extension.ts to avoid circular dependency

    // Listen for workspace folder changes
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.updateWorkspaceRoot();
      this.setupApprovalWatcher();
    });

    this.setupApprovalWatcher();
  }

  setOnApprovalsChanged(callback: () => void) {
    this.onApprovalsChangedCallback = callback;
  }

  setApprovalEditorService(approvalEditorService: ApprovalEditorService) {
    this.approvalEditorService = approvalEditorService;
  }

  private setupApprovalWatcher() {
    // Dispose existing watcher
    if (this.approvalWatcher) {
      this.approvalWatcher.dispose();
      this.approvalWatcher = null;
    }

    if (!this.specWorkflowRoot) {
      return;
    }

    const approvalsPattern = new vscode.RelativePattern(
      path.join(this.specWorkflowRoot, 'approvals'),
      '**/*.json'
    );

    this.approvalWatcher = vscode.workspace.createFileSystemWatcher(approvalsPattern);

    const handleApprovalChange = (uri: vscode.Uri) => {
      // Extract approval ID from file path
      const fileName = path.basename(uri.fsPath, '.json');

      // Notify approval editor service about the change
      if (this.approvalEditorService) {
        this.approvalEditorService.handleExternalApprovalChange(fileName);
      }

      // Notify sidebar about the change
      if (this.onApprovalsChangedCallback) {
        this.onApprovalsChangedCallback();
      }
    };

    this.approvalWatcher.onDidCreate(handleApprovalChange);
    this.approvalWatcher.onDidChange(handleApprovalChange);
    this.approvalWatcher.onDidDelete(handleApprovalChange);
  }

  dispose() {
    if (this.approvalWatcher) {
      this.approvalWatcher.dispose();
    }
  }

  private updateWorkspaceRoot() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.workspaceRoot = workspaceFolders[0].uri.fsPath;
      this.specWorkflowRoot = path.join(this.workspaceRoot, '.spec-workflow');
    } else {
      this.workspaceRoot = null;
      this.specWorkflowRoot = null;
    }
  }

  private async ensureSpecWorkflowExists(): Promise<boolean> {
    if (!this.specWorkflowRoot) {
      throw new Error('No workspace folder found');
    }

    try {
      await fs.access(this.specWorkflowRoot);
      return true;
    } catch {
      return false;
    }
  }

  async refreshData() {
    // This method can be used to clear any caches if needed
    // For now, it just ensures the directory exists
    return this.ensureSpecWorkflowExists();
  }

  async getAllSpecs(): Promise<SpecData[]> {
    if (!await this.ensureSpecWorkflowExists()) {
      console.log('SpecWorkflow: No .spec-workflow directory found');
      return [];
    }

    const specs: SpecData[] = [];
    
    try {
      // First, try the standard structure: .spec-workflow/specs/
      const specsDir = path.join(this.specWorkflowRoot!, 'specs');
      console.log('SpecWorkflow: Checking specs directory:', specsDir);
      
      try {
        await fs.access(specsDir);
        const entries = await fs.readdir(specsDir, { withFileTypes: true });
        const specDirs = entries.filter(entry => entry.isDirectory());
        console.log('SpecWorkflow: Found spec directories in specs/:', specDirs.map(d => d.name));
        
        for (const specDir of specDirs) {
          try {
            const specData = await this.parseSpecDirectory(path.join(specsDir, specDir.name), specDir.name);
            if (specData) {
              specs.push(specData);
            }
          } catch (error) {
            console.warn(`Failed to parse spec ${specDir.name}:`, error);
          }
        }
      } catch {
        console.log('SpecWorkflow: No specs/ subdirectory found');
      }

      // If no specs found, try looking directly in .spec-workflow for spec directories
      if (specs.length === 0) {
        console.log('SpecWorkflow: Checking root .spec-workflow directory for specs');
        const entries = await fs.readdir(this.specWorkflowRoot!, { withFileTypes: true });
        const excludeDirs = new Set(['specs', 'steering', 'approvals', '.git', 'node_modules']);
        const potentialSpecs = entries.filter(entry => 
          entry.isDirectory() && !excludeDirs.has(entry.name) && !entry.name.startsWith('.')
        );
        
        console.log('SpecWorkflow: Found potential spec directories in root:', potentialSpecs.map(d => d.name));
        
        for (const specDir of potentialSpecs) {
          try {
            const specPath = path.join(this.specWorkflowRoot!, specDir.name);
            const specData = await this.parseSpecDirectory(specPath, specDir.name);
            if (specData) {
              specs.push(specData);
            }
          } catch (error) {
            console.warn(`Failed to parse spec ${specDir.name}:`, error);
          }
        }
      }

      console.log(`SpecWorkflow: Found ${specs.length} total specs`);
      return specs.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    } catch (error) {
      console.error('Error reading specs:', error);
      return [];
    }
  }

  private async parseSpecDirectory(specPath: string, specName: string): Promise<SpecData | null> {
    const phases = {
      requirements: await this.parsePhaseFile(path.join(specPath, 'requirements.md')),
      design: await this.parsePhaseFile(path.join(specPath, 'design.md')),
      tasks: await this.parsePhaseFile(path.join(specPath, 'tasks.md')),
      implementation: { exists: false } // Implementation is not a file but a phase status
    };

    // Get the most recent modification time
    const timestamps = [phases.requirements, phases.design, phases.tasks]
      .filter(phase => phase.exists && phase.lastModified)
      .map(phase => new Date(phase.lastModified!).getTime());
    
    if (timestamps.length === 0) {
      return null;
    }

    const lastModified = new Date(Math.max(...timestamps)).toISOString();
    const createdAt = new Date(Math.min(...timestamps)).toISOString();

    // Parse task progress if tasks file exists
    let taskProgress;
    if (phases.tasks.exists && phases.tasks.content) {
      try {
        const taskInfo = this.parseTasksContent(phases.tasks.content);
        taskProgress = {
          total: taskInfo.summary.total,
          completed: taskInfo.summary.completed,
          pending: taskInfo.summary.total - taskInfo.summary.completed
        };
      } catch (error) {
        console.warn(`Failed to parse tasks for ${specName}:`, error);
      }
    }

    return {
      name: specName,
      displayName: this.formatDisplayName(specName),
      createdAt,
      lastModified,
      phases,
      taskProgress
    };
  }

  private async parsePhaseFile(filePath: string): Promise<PhaseStatus> {
    try {
      const stat = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      
      return {
        exists: true,
        lastModified: stat.mtime.toISOString(),
        content
      };
    } catch {
      return { exists: false };
    }
  }

  private formatDisplayName(specName: string): string {
    return specName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async getTaskProgress(specName: string): Promise<TaskProgressData | null> {
    if (!await this.ensureSpecWorkflowExists()) {
      return null;
    }

    try {
      const tasksPath = path.join(this.specWorkflowRoot!, 'specs', specName, 'tasks.md');
      const content = await fs.readFile(tasksPath, 'utf-8');
      
      const taskInfo = this.parseTasksContent(content);
      
      return {
        specName,
        total: taskInfo.summary.total,
        completed: taskInfo.summary.completed,
        progress: taskInfo.summary.total > 0 ? (taskInfo.summary.completed / taskInfo.summary.total) * 100 : 0,
        taskList: taskInfo.tasks,
        inProgress: taskInfo.inProgressTask
      };
    } catch (error) {
      console.error(`Failed to get task progress for ${specName}:`, error);
      return null;
    }
  }

  private parseTasksContent(content: string): { 
    tasks: TaskInfo[]; 
    summary: { total: number; completed: number; }; 
    inProgressTask?: string;
  } {
    const lines = content.split('\n');
    const tasks: TaskInfo[] = [];
    let inProgressTask: string | undefined;
    let taskCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {continue;}
      
      // Check for headers (section dividers)
      const headerMatch = trimmedLine.match(/^#{1,6}\s*(.+)/);
      if (headerMatch) {
        const headerText = headerMatch[1].trim();
        tasks.push({
          id: `header-${taskCounter++}`,
          description: headerText,
          status: 'completed',
          completed: false,
          isHeader: true
        });
        continue;
      }
      
      // Check for task items with checkboxes
      const checkboxMatch = line.match(/^(\s*)[-*•]\s*\[([x\s])\]\s*(.+)/i);
      if (checkboxMatch) {
        const [, indent, checkbox, description] = checkboxMatch;
        const completed = checkbox.toLowerCase() === 'x';
        const isInProgress = description.includes('🔄') || description.includes('(in progress)') || description.includes('[WIP]');
        const cleanDescription = description.replace(/🔄|\(in progress\)|\[WIP\]/gi, '').trim();
        
        // Generate a simple ID if not provided
        let taskId: string;
        const taskIdMatch = cleanDescription.match(/^(?:Task\s+)?([0-9.]+)[\s:]/i);
        if (taskIdMatch) {
          taskId = taskIdMatch[1];
        } else {
          taskId = `task-${taskCounter++}`;
        }
        
        if (isInProgress && !completed) {
          inProgressTask = taskId;
        }

        tasks.push({
          id: taskId,
          description: cleanDescription,
          status: isInProgress ? 'in-progress' : (completed ? 'completed' : 'pending'),
          completed,
          isHeader: false
        });
        continue;
      }
      
      // Check for numbered task items without checkboxes
      const numberedMatch = trimmedLine.match(/^([0-9.]+)[\s.]\s*(.+)/);
      if (numberedMatch) {
        const [, taskNum, description] = numberedMatch;
        const isInProgress = description.includes('🔄') || description.includes('(in progress)') || description.includes('[WIP]');
        const cleanDescription = description.replace(/🔄|\(in progress\)|\[WIP\]/gi, '').trim();
        
        tasks.push({
          id: taskNum,
          description: cleanDescription,
          status: isInProgress ? 'in-progress' : 'pending',
          completed: false,
          isHeader: false
        });
      }
    }

    // Filter out headers from the task count
    const actualTasks = tasks.filter(task => !task.isHeader);
    const summary = {
      total: actualTasks.length,
      completed: actualTasks.filter(task => task.completed).length
    };

    return { tasks, summary, inProgressTask };
  }

  async updateTaskStatus(specName: string, taskId: string, status: string): Promise<void> {
    if (!await this.ensureSpecWorkflowExists()) {
      throw new Error('Spec workflow directory not found');
    }

    const tasksPath = path.join(this.specWorkflowRoot!, 'specs', specName, 'tasks.md');
    
    try {
      let content = await fs.readFile(tasksPath, 'utf-8');
      
      // Update the task status in the markdown
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const taskMatch = line.match(/^(\s*[-*]\s*)\[([x\s])\](\s*Task\s+)([^:]+):\s*(.+)/i);
        
        if (taskMatch && taskMatch[4].trim() === taskId) {
          const [, prefix, , taskPrefix, id, description] = taskMatch;
          let newCheckbox = ' ';
          let newDescription = description.replace(/🔄|\(in progress\)/gi, '').trim();
          
          if (status === 'completed') {
            newCheckbox = 'x';
          } else if (status === 'in-progress') {
            newDescription = `🔄 ${newDescription}`;
          }
          
          lines[i] = `${prefix}[${newCheckbox}]${taskPrefix}${id}: ${newDescription}`;
          break;
        }
      }
      
      content = lines.join('\n');
      await fs.writeFile(tasksPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to update task status: ${error}`);
    }
  }

  async saveDocument(specName: string, docType: string, content: string): Promise<void> {
    if (!await this.ensureSpecWorkflowExists()) {
      throw new Error('Spec workflow directory not found');
    }

    const allowedDocTypes = ['requirements', 'design', 'tasks'];
    if (!allowedDocTypes.includes(docType)) {
      throw new Error(`Invalid document type: ${docType}`);
    }

    const docPath = path.join(this.specWorkflowRoot!, 'specs', specName, `${docType}.md`);
    
    try {
      // Ensure the spec directory exists
      const specDir = path.dirname(docPath);
      await fs.mkdir(specDir, { recursive: true });
      
      await fs.writeFile(docPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save document: ${error}`);
    }
  }

  async getApprovals(): Promise<ApprovalData[]> {
    if (!await this.ensureSpecWorkflowExists()) {
      return [];
    }

    try {
      const approvalsDir = path.join(this.specWorkflowRoot!, 'approvals');

      try {
        await fs.access(approvalsDir);
      } catch {
        return [];
      }

      const approvals: ApprovalData[] = [];

      // Read category directories (hierarchical structure like MCP server)
      try {
        const categoryEntries = await fs.readdir(approvalsDir, { withFileTypes: true });
        for (const categoryEntry of categoryEntries) {
          if (categoryEntry.isDirectory()) {
            const categoryPath = path.join(approvalsDir, categoryEntry.name);
            try {
              const approvalFiles = await fs.readdir(categoryPath);
              for (const file of approvalFiles) {
                if (file.endsWith('.json')) {
                  try {
                    const approvalPath = path.join(categoryPath, file);
                    const content = await fs.readFile(approvalPath, 'utf-8');
                    const approval = JSON.parse(content);
                    approvals.push(approval);
                  } catch (error) {
                    console.warn(`Failed to parse approval ${file} in category ${categoryEntry.name}:`, error);
                  }
                }
              }
            } catch (error) {
              console.warn(`Failed to read category directory ${categoryEntry.name}:`, error);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read approvals directory structure:', error);
      }

      // Also check for legacy flat structure files for backward compatibility
      try {
        const entries = await fs.readdir(approvalsDir);
        for (const entry of entries) {
          if (entry.endsWith('.json')) {
            try {
              const approvalPath = path.join(approvalsDir, entry);
              const content = await fs.readFile(approvalPath, 'utf-8');
              const approval = JSON.parse(content);
              approvals.push(approval);
            } catch (error) {
              console.warn(`Failed to parse legacy approval ${entry}:`, error);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read legacy approval files:', error);
      }

      return approvals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Error reading approvals:', error);
      return [];
    }
  }

  async approveRequest(id: string, response: string): Promise<void> {
    await this.updateApprovalStatus(id, 'approved', response);
  }

  async rejectRequest(id: string, response: string): Promise<void> {
    await this.updateApprovalStatus(id, 'rejected', response);
  }

  async requestRevisionRequest(id: string, response: string, annotations?: string, comments?: any[]): Promise<void> {
    await this.updateApprovalStatus(id, 'needs-revision', response, annotations, comments);
  }

  async getApprovalContent(id: string): Promise<string | null> {
    if (!await this.ensureSpecWorkflowExists()) {
      return null;
    }

    const approvalPath = await this.findApprovalPath(id);
    if (!approvalPath) {
      return null;
    }

    try {
      const content = await fs.readFile(approvalPath, 'utf-8');
      const approval = JSON.parse(content);

      if (!approval.filePath) {
        return null;
      }

      // Use the same robust file path resolution as ApprovalEditorService
      const resolvedFilePath = await this.resolveApprovalFilePath(approval.filePath);
      if (!resolvedFilePath) {
        console.warn(`Could not resolve file path for approval ${id}: ${approval.filePath}`);
        return null;
      }

      try {
        const fileContent = await fs.readFile(resolvedFilePath, 'utf-8');
        return fileContent;
      } catch (error) {
        console.warn(`Failed to read approval file content at ${resolvedFilePath}:`, error);
        return null;
      }
    } catch (error) {
      console.error(`Failed to get approval content for ${id}:`, error);
      return null;
    }
  }

  private async resolveApprovalFilePath(filePath: string): Promise<string | null> {
    if (!this.workspaceRoot) {
      return null;
    }

    // Use the same robust resolution strategy as the working dashboard server
    const candidates: string[] = [];
    const p = filePath;

    // 1) As provided relative to project root (most common case)
    candidates.push(path.join(this.workspaceRoot, p));

    // 2) If path is already absolute, try it directly
    if (path.isAbsolute(p) || p.startsWith('/') || p.match(/^[A-Za-z]:[\\\/]/)) {
      candidates.push(p);
    }

    // 3) If not already under .spec-workflow, try under that root
    if (!p.includes('.spec-workflow')) {
      candidates.push(path.join(this.workspaceRoot, '.spec-workflow', p));
    }

    // 4) Handle legacy path formats - try with path separator normalization
    const normalizedPath = p.replace(/\\/g, '/');
    if (normalizedPath !== p) {
      // Try the normalized version relative to project root
      candidates.push(path.join(this.workspaceRoot, normalizedPath));

      // Try the normalized version under .spec-workflow if not already there
      if (!normalizedPath.includes('.spec-workflow')) {
        candidates.push(path.join(this.workspaceRoot, '.spec-workflow', normalizedPath));
      }
    }

    // 5) Try common spec document locations as fallback
    const fileName = path.basename(p);
    const specWorkflowRoot = path.join(this.workspaceRoot, '.spec-workflow');

    // Try in specs directory structure
    candidates.push(path.join(specWorkflowRoot, 'specs', fileName));

    // Try in test directory structure (for cases like the failing example)
    candidates.push(path.join(specWorkflowRoot, 'test', fileName));

    // Try with common spec names if filePath looks like a spec document
    if (fileName.match(/\.(md|txt)$/)) {
      const baseName = path.basename(fileName, path.extname(fileName));
      candidates.push(path.join(specWorkflowRoot, 'specs', baseName, fileName));
      candidates.push(path.join(specWorkflowRoot, 'test', baseName, fileName));
    }

    // Test each candidate path
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        console.log(`Successfully resolved approval file path: ${p} -> ${candidate}`);
        return candidate;
      } catch {
        // File doesn't exist at this location, try next candidate
      }
    }

    // Log all attempted paths for debugging
    console.warn(`Failed to resolve approval file path: ${p}. Tried paths:`, candidates);
    return null;
  }

  async openApprovalInEditor(id: string): Promise<boolean> {
    if (!this.approvalEditorService) {
      return false;
    }

    const approvalPath = await this.findApprovalPath(id);
    if (!approvalPath) {
      return false;
    }

    try {
      const content = await fs.readFile(approvalPath, 'utf-8');
      const approval = JSON.parse(content) as ApprovalData;

      const editor = await this.approvalEditorService.openApprovalInEditor(approval);
      return editor !== null;
    } catch (error) {
      console.error(`Failed to open approval in editor for ${id}:`, error);
      return false;
    }
  }

  async saveApprovalData(approval: ApprovalData): Promise<void> {
    const approvalPath = await this.findApprovalPath(approval.id);
    if (!approvalPath) {
      throw new Error(`Approval ${approval.id} not found`);
    }

    try {
      await fs.writeFile(approvalPath, JSON.stringify(approval, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save approval data: ${error}`);
    }
  }

  async findApprovalPath(id: string): Promise<string | null> {
    if (!this.specWorkflowRoot) {
      return null;
    }

    const approvalsDir = path.join(this.specWorkflowRoot, 'approvals');

    // Search in hierarchical structure (category directories)
    try {
      const categoryEntries = await fs.readdir(approvalsDir, { withFileTypes: true });
      for (const categoryEntry of categoryEntries) {
        if (categoryEntry.isDirectory()) {
          const approvalPath = path.join(approvalsDir, categoryEntry.name, `${id}.json`);
          try {
            await fs.access(approvalPath);
            return approvalPath;
          } catch {
            // File doesn't exist in this location, continue searching
          }
        }
      }
    } catch {
      // Approvals directory doesn't exist or can't be read
    }

    // Also check legacy flat structure for backward compatibility
    try {
      const legacyPath = path.join(approvalsDir, `${id}.json`);
      await fs.access(legacyPath);
      return legacyPath;
    } catch {
      // Legacy file doesn't exist
    }

    return null;
  }

  private async updateApprovalStatus(
    id: string,
    status: 'approved' | 'rejected' | 'needs-revision',
    response: string,
    annotations?: string,
    comments?: any[]
  ): Promise<void> {
    if (!await this.ensureSpecWorkflowExists()) {
      throw new Error('Spec workflow directory not found');
    }

    const approvalPath = await this.findApprovalPath(id);

    if (!approvalPath) {
      throw new Error(`Approval ${id} not found`);
    }

    try {
      const content = await fs.readFile(approvalPath, 'utf-8');
      const approval = JSON.parse(content);

      approval.status = status;
      approval.response = response;
      approval.respondedAt = new Date().toISOString();

      if (annotations) {
        approval.annotations = annotations;
      }

      if (comments) {
        approval.comments = comments;
      }

      await fs.writeFile(approvalPath, JSON.stringify(approval, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to update approval status: ${error}`);
    }
  }



  async getSteeringStatus(): Promise<SteeringStatus | null> {
    if (!await this.ensureSpecWorkflowExists()) {
      return null;
    }

    try {
      const steeringDir = path.join(this.specWorkflowRoot!, 'steering');
      
      const documents = {
        product: false,
        tech: false,
        structure: false
      };

      let exists = false;
      let lastModified: string | undefined;

      for (const docName of Object.keys(documents) as (keyof typeof documents)[]) {
        const docPath = path.join(steeringDir, `${docName}.md`);
        try {
          const stat = await fs.stat(docPath);
          documents[docName] = true;
          exists = true;
          
          if (!lastModified || stat.mtime.getTime() > new Date(lastModified).getTime()) {
            lastModified = stat.mtime.toISOString();
          }
        } catch {
          // File doesn't exist, keep false
        }
      }

      return {
        exists,
        documents,
        lastModified
      };
    } catch (error) {
      console.error('Error reading steering status:', error);
      return null;
    }
  }

  async getSpecDocuments(specName: string): Promise<{ name: string; exists: boolean; path: string; lastModified?: string }[]> {
    if (!await this.ensureSpecWorkflowExists()) {
      return [];
    }

    const documents = ['requirements', 'design', 'tasks'];
    const result = [];

    for (const docType of documents) {
      // Try specs/ subdirectory first
      let docPath = path.join(this.specWorkflowRoot!, 'specs', specName, `${docType}.md`);
      let found = false;
      
      try {
        const stat = await fs.stat(docPath);
        result.push({
          name: docType,
          exists: true,
          path: docPath,
          lastModified: stat.mtime.toISOString()
        });
        found = true;
      } catch {
        // Try root directory structure
        docPath = path.join(this.specWorkflowRoot!, specName, `${docType}.md`);
        try {
          const stat = await fs.stat(docPath);
          result.push({
            name: docType,
            exists: true,
            path: docPath,
            lastModified: stat.mtime.toISOString()
          });
          found = true;
        } catch {
          result.push({
            name: docType,
            exists: false,
            path: docPath
          });
        }
      }
      
      console.log(`SpecWorkflow: Document ${docType}.md for ${specName}: ${found ? 'found' : 'not found'} at ${docPath}`);
    }

    return result;
  }

  async getSteeringDocuments(): Promise<{ name: string; exists: boolean; path: string; lastModified?: string }[]> {
    if (!await this.ensureSpecWorkflowExists()) {
      return [];
    }

    const documents = ['product', 'tech', 'structure'];
    const result = [];

    for (const docType of documents) {
      const docPath = path.join(this.specWorkflowRoot!, 'steering', `${docType}.md`);
      try {
        const stat = await fs.stat(docPath);
        result.push({
          name: docType,
          exists: true,
          path: docPath,
          lastModified: stat.mtime.toISOString()
        });
      } catch {
        result.push({
          name: docType,
          exists: false,
          path: docPath
        });
      }
    }

    return result;
  }

  async getDocumentPath(specName: string, docType: string): Promise<string | null> {
    if (!this.specWorkflowRoot) {return null;}
    const allowedDocTypes = ['requirements', 'design', 'tasks'];
    if (!allowedDocTypes.includes(docType)) {return null;}
    
    // Try specs/ subdirectory first
    let docPath = path.join(this.specWorkflowRoot, 'specs', specName, `${docType}.md`);
    try {
      await fs.access(docPath);
      return docPath;
    } catch {
      // Try root directory structure
      docPath = path.join(this.specWorkflowRoot, specName, `${docType}.md`);
      try {
        await fs.access(docPath);
        return docPath;
      } catch {
        return null;
      }
    }
  }

  getSteeringDocumentPath(docType: string): string | null {
    if (!this.specWorkflowRoot) {return null;}
    const allowedDocTypes = ['product', 'tech', 'structure'];
    if (!allowedDocTypes.includes(docType)) {return null;}
    return path.join(this.specWorkflowRoot, 'steering', `${docType}.md`);
  }

}