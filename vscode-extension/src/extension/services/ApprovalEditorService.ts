import * as vscode from 'vscode';
import * as path from 'path';
import { ApprovalData, ApprovalComment } from '../types';
import { SpecWorkflowService } from './SpecWorkflowService';

export interface ApprovalEditorContext {
  approval: ApprovalData;
  document: vscode.TextDocument;
  editor: vscode.TextEditor;
  decorationType: vscode.TextEditorDecorationType;
}

export class ApprovalEditorService {
  private static instance: ApprovalEditorService;
  private activeApprovalEditors = new Map<string, ApprovalEditorContext>();
  private decorationTypes = new Map<string, vscode.TextEditorDecorationType>();
  private specWorkflowService: SpecWorkflowService;

  constructor(specWorkflowService: SpecWorkflowService) {
    this.specWorkflowService = specWorkflowService;
    this.initializeDecorationTypes();
    this.setupEventListeners();
  }

  static getInstance(specWorkflowService: SpecWorkflowService): ApprovalEditorService {
    if (!ApprovalEditorService.instance) {
      ApprovalEditorService.instance = new ApprovalEditorService(specWorkflowService);
    }
    return ApprovalEditorService.instance;
  }

  private initializeDecorationTypes() {
    // Decoration for pending approval sections
    this.decorationTypes.set('pending', vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 193, 7, 0.1)',
      border: '1px solid rgba(255, 193, 7, 0.3)',
      borderRadius: '2px',
      isWholeLine: false,
      after: {
        contentText: ' 📋 Pending Approval',
        color: 'rgba(255, 193, 7, 0.8)',
        fontStyle: 'italic',
        margin: '0 0 0 10px'
      }
    }));

    // Decoration for approved sections
    this.decorationTypes.set('approved', vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(40, 167, 69, 0.1)',
      border: '1px solid rgba(40, 167, 69, 0.3)',
      borderRadius: '2px',
      isWholeLine: false,
      after: {
        contentText: ' ✅ Approved',
        color: 'rgba(40, 167, 69, 0.8)',
        fontStyle: 'italic',
        margin: '0 0 0 10px'
      }
    }));

    // Decoration for rejected sections
    this.decorationTypes.set('rejected', vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(220, 53, 69, 0.1)',
      border: '1px solid rgba(220, 53, 69, 0.3)',
      borderRadius: '2px',
      isWholeLine: false,
      after: {
        contentText: ' ❌ Rejected',
        color: 'rgba(220, 53, 69, 0.8)',
        fontStyle: 'italic',
        margin: '0 0 0 10px'
      }
    }));

    // Decoration for sections needing revision
    this.decorationTypes.set('needs-revision', vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 87, 34, 0.1)',
      border: '1px solid rgba(255, 87, 34, 0.3)',
      borderRadius: '2px',
      isWholeLine: false,
      after: {
        contentText: ' 🔄 Needs Revision',
        color: 'rgba(255, 87, 34, 0.8)',
        fontStyle: 'italic',
        margin: '0 0 0 10px'
      }
    }));

    // Decoration for commented sections
    this.decorationTypes.set('commented', vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(0, 123, 255, 0.1)',
      border: '1px solid rgba(0, 123, 255, 0.3)',
      borderRadius: '2px',
      isWholeLine: false,
      after: {
        contentText: ' 💬 Has Comments',
        color: 'rgba(0, 123, 255, 0.8)',
        fontStyle: 'italic',
        margin: '0 0 0 10px'
      }
    }));
  }

  private setupEventListeners() {
    // Listen for editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        this.updateEditorDecorations(editor);
      }
    });

    // Listen for document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document === event.document) {
        this.updateEditorDecorations(editor);
      }
    });
  }

  async openApprovalInEditor(approval: ApprovalData): Promise<vscode.TextEditor | null> {
    try {
      // Resolve the file path using the same strategy as MCP server
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder found');
        return null;
      }

      const resolvedFilePath = await this.resolveApprovalFilePath(approval.filePath, workspaceRoot);
      if (!resolvedFilePath) {
        const errorMsg = `Could not find file for approval "${approval.title}". ` +
          `Original path: ${approval.filePath}. ` +
          `Check the Developer Console (Help -> Toggle Developer Tools) for detailed path resolution attempts.`;
        
        vscode.window.showErrorMessage(errorMsg, 'Open Dev Console', 'Cancel')
          .then(selection => {
            if (selection === 'Open Dev Console') {
              vscode.commands.executeCommand('workbench.action.toggleDevTools');
            }
          });
        
        return null;
      }

      // Open the document
      const document = await vscode.workspace.openTextDocument(resolvedFilePath);
      const editor = await vscode.window.showTextDocument(document, {
        preview: false,
        preserveFocus: false
      });

      // Store the approval context
      const context: ApprovalEditorContext = {
        approval,
        document,
        editor,
        decorationType: this.decorationTypes.get(approval.status) || this.decorationTypes.get('pending')!
      };

      this.activeApprovalEditors.set(approval.id, context);

      // Apply decorations
      this.updateEditorDecorations(editor);

      // Show approval info
      this.showApprovalInfo(approval);

      return editor;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open approval file: ${error}`);
      return null;
    }
  }

  private async resolveApprovalFilePath(filePath: string, workspaceRoot: string): Promise<string | null> {
    const fs = require('fs').promises;

    // Normalize path separators for cross-platform compatibility
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    const candidates: string[] = [];

    console.log(`Resolving approval file path: "${filePath}" in workspace: ${workspaceRoot}`);

    // 1) If path is already absolute, try it directly first
    if (path.isAbsolute(filePath)) {
      candidates.push(filePath);
    }

    // 2) As provided relative to project root (most common case for paths like ".spec-workflow/test/tasks.md")
    candidates.push(path.join(workspaceRoot, normalizedFilePath));

    // 3) Handle paths that start with ".spec-workflow/" - these are already correctly rooted
    if (normalizedFilePath.startsWith('.spec-workflow/')) {
      // Path is already relative to project root, don't double-add .spec-workflow
      candidates.push(path.join(workspaceRoot, normalizedFilePath));
      
      // CRITICAL FIX: Handle the specs directory structure
      // If path is like ".spec-workflow/test/tasks.md", also try ".spec-workflow/specs/test/tasks.md"
      const pathAfterSpecWorkflow = normalizedFilePath.substring('.spec-workflow/'.length);
      if (pathAfterSpecWorkflow && !pathAfterSpecWorkflow.startsWith('specs/')) {
        candidates.push(path.join(workspaceRoot, '.spec-workflow', 'specs', pathAfterSpecWorkflow));
      }
      
      // Also try without the leading dot for legacy compatibility
      const withoutDot = normalizedFilePath.substring(1); // Remove leading "."
      candidates.push(path.join(workspaceRoot, withoutDot));
      
      // And try the specs variant without the leading dot
      if (pathAfterSpecWorkflow && !pathAfterSpecWorkflow.startsWith('specs/')) {
        candidates.push(path.join(workspaceRoot, 'spec-workflow', 'specs', pathAfterSpecWorkflow));
      }
    } else if (normalizedFilePath.startsWith('spec-workflow/')) {
      // Handle case where path might not have leading dot
      candidates.push(path.join(workspaceRoot, '.' + normalizedFilePath));
      candidates.push(path.join(workspaceRoot, normalizedFilePath));
      
      // Also handle specs directory structure for this format
      const pathAfterSpecWorkflow = normalizedFilePath.substring('spec-workflow/'.length);
      if (pathAfterSpecWorkflow && !pathAfterSpecWorkflow.startsWith('specs/')) {
        candidates.push(path.join(workspaceRoot, '.spec-workflow', 'specs', pathAfterSpecWorkflow));
        candidates.push(path.join(workspaceRoot, 'spec-workflow', 'specs', pathAfterSpecWorkflow));
      }
    } else if (!normalizedFilePath.includes('spec-workflow')) {
      // If path doesn't contain spec-workflow at all, try adding it
      candidates.push(path.join(workspaceRoot, '.spec-workflow', normalizedFilePath));
      
      // Also try under specs directory
      candidates.push(path.join(workspaceRoot, '.spec-workflow', 'specs', normalizedFilePath));
    }

    // 4) Handle Windows-style paths with backslashes
    if (filePath.includes('\\') && filePath !== normalizedFilePath) {
      candidates.push(path.join(workspaceRoot, filePath));
    }

    // 5) Try common spec document locations as fallback
    const fileName = path.basename(normalizedFilePath);
    const specWorkflowRoot = path.join(workspaceRoot, '.spec-workflow');

    // Try in various common subdirectories
    const commonDirs = ['specs', 'test', 'tasks', 'requirements', 'design'];
    for (const dir of commonDirs) {
      candidates.push(path.join(specWorkflowRoot, dir, fileName));
    }

    // Try with spec document structure if filePath looks like a spec document
    if (fileName.match(/\.(md|txt)$/)) {
      const baseName = path.basename(fileName, path.extname(fileName));
      for (const dir of commonDirs) {
        candidates.push(path.join(specWorkflowRoot, dir, baseName, fileName));
      }
    }

    // Remove duplicates while preserving order
    const uniqueCandidates = [...new Set(candidates)];

    console.log(`Trying ${uniqueCandidates.length} candidate paths:`, uniqueCandidates);

    // Test each candidate path
    for (const candidate of uniqueCandidates) {
      try {
        await fs.access(candidate);
        console.log(`✅ Successfully resolved approval file path: "${filePath}" -> "${candidate}"`);
        return candidate;
      } catch {
        // File doesn't exist at this location, continue to next candidate
        console.log(`❌ File not found at: ${candidate}`);
      }
    }

    // Log detailed failure information
    console.error(`❌ Failed to resolve approval file path: "${filePath}"`);
    console.error(`Workspace root: ${workspaceRoot}`);
    console.error(`All attempted paths (${uniqueCandidates.length}):`, uniqueCandidates);
    
    return null;
  }

  private updateEditorDecorations(editor: vscode.TextEditor) {
    // Find approval context for this editor
    const approvalContext = Array.from(this.activeApprovalEditors.values())
      .find(context => context.document === editor.document);

    if (!approvalContext) {
      return;
    }

    const { approval } = approvalContext;

    // Clear existing decorations first
    this.clearEditorDecorations(editor);

    // Apply status-based decorations
    this.applyStatusDecorations(editor, approval);

    // Apply comment decorations
    this.applyCommentDecorations(editor, approval);

    // Apply annotation decorations
    this.applyAnnotationDecorations(editor, approval);
  }

  private clearEditorDecorations(editor: vscode.TextEditor) {
    this.decorationTypes.forEach(decorationType => {
      editor.setDecorations(decorationType, []);
    });
  }

  private applyStatusDecorations(editor: vscode.TextEditor, approval: ApprovalData) {
    const decorationType = this.decorationTypes.get(approval.status) || this.decorationTypes.get('pending')!;

    // Create a subtle header decoration to show approval status
    const headerDecoration: vscode.DecorationOptions = {
      range: new vscode.Range(0, 0, 0, 0),
      hoverMessage: this.createApprovalHoverMessage(approval),
      renderOptions: {
        before: {
          contentText: `📋 ${approval.title} (${approval.status.toUpperCase()})`,
          color: this.getStatusColor(approval.status),
          fontStyle: 'italic',
          margin: '0 0 10px 0',
          textDecoration: 'none; display: block; border-bottom: 1px solid rgba(128,128,128,0.3); padding-bottom: 5px;'
        }
      }
    };

    editor.setDecorations(decorationType, [headerDecoration]);
  }

  private applyCommentDecorations(editor: vscode.TextEditor, approval: ApprovalData) {
    if (!approval.comments || approval.comments.length === 0) {
      return;
    }

    const commentDecorationType = this.decorationTypes.get('commented')!;
    const commentDecorations: vscode.DecorationOptions[] = [];

    approval.comments.forEach(comment => {
      if (comment.lineNumber !== undefined && comment.lineNumber > 0) {
        const line = Math.max(0, Math.min(comment.lineNumber - 1, editor.document.lineCount - 1));
        const lineRange = editor.document.lineAt(line).range;

        commentDecorations.push({
          range: lineRange,
          hoverMessage: this.createCommentHoverMessage(comment),
          renderOptions: {
            after: {
              contentText: ` 💬 ${comment.resolved ? '✓' : ''}`,
              color: comment.resolved ? 'rgba(40, 167, 69, 0.8)' : 'rgba(0, 123, 255, 0.8)',
              margin: '0 0 0 10px'
            }
          }
        });
      }
    });

    if (commentDecorations.length > 0) {
      editor.setDecorations(commentDecorationType, commentDecorations);
    }
  }

  private applyAnnotationDecorations(editor: vscode.TextEditor, approval: ApprovalData) {
    if (!approval.annotations) {
      return;
    }

    // Create a decoration for annotations at the top of the file
    const annotationDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 235, 59, 0.1)',
      border: '1px solid rgba(255, 235, 59, 0.3)',
      borderRadius: '2px',
      isWholeLine: false
    });

    const annotationDecoration: vscode.DecorationOptions = {
      range: new vscode.Range(0, 0, 0, 0),
      hoverMessage: `📝 **Annotations**: ${approval.annotations}`,
      renderOptions: {
        before: {
          contentText: `📝 Annotations: ${approval.annotations.substring(0, 50)}${approval.annotations.length > 50 ? '...' : ''}`,
          color: 'rgba(255, 193, 7, 0.8)',
          fontStyle: 'italic',
          margin: '0 0 5px 0',
          textDecoration: 'none; display: block;'
        }
      }
    };

    editor.setDecorations(annotationDecorationType, [annotationDecoration]);
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'approved': return 'rgba(40, 167, 69, 0.8)';
      case 'rejected': return 'rgba(220, 53, 69, 0.8)';
      case 'needs-revision': return 'rgba(255, 87, 34, 0.8)';
      default: return 'rgba(255, 193, 7, 0.8)';
    }
  }

  private createCommentHoverMessage(comment: ApprovalComment): vscode.MarkdownString {
    const message = new vscode.MarkdownString();
    message.isTrusted = true;

    message.appendMarkdown(`## 💬 Comment\n\n`);
    message.appendMarkdown(`${comment.text}\n\n`);
    message.appendMarkdown(`**Created**: ${new Date(comment.timestamp).toLocaleString()}\n\n`);

    if (comment.resolved) {
      message.appendMarkdown(`**Status**: ✅ Resolved\n\n`);
    } else {
      message.appendMarkdown(`**Status**: ⏳ Pending\n\n`);
    }

    return message;
  }

  private createApprovalHoverMessage(approval: ApprovalData): vscode.MarkdownString {
    const message = new vscode.MarkdownString();
    message.isTrusted = true;

    message.appendMarkdown(`## 📋 Approval: ${approval.title}\n\n`);
    message.appendMarkdown(`**Status**: ${approval.status.toUpperCase()}\n\n`);
    message.appendMarkdown(`**Created**: ${new Date(approval.createdAt).toLocaleString()}\n\n`);

    if (approval.response) {
      message.appendMarkdown(`**Response**: ${approval.response}\n\n`);
    }

    if (approval.annotations) {
      message.appendMarkdown(`**Annotations**: ${approval.annotations}\n\n`);
    }

    if (approval.comments && approval.comments.length > 0) {
      message.appendMarkdown(`**Comments**: ${approval.comments.length} comment(s)\n\n`);
    }

    // Add action buttons
    message.appendMarkdown(`---\n\n`);
    message.appendMarkdown(`[Approve](command:spec-workflow.approveFromEditor?${encodeURIComponent(JSON.stringify({id: approval.id}))}) | `);
    message.appendMarkdown(`[Reject](command:spec-workflow.rejectFromEditor?${encodeURIComponent(JSON.stringify({id: approval.id}))}) | `);
    message.appendMarkdown(`[Request Revision](command:spec-workflow.requestRevisionFromEditor?${encodeURIComponent(JSON.stringify({id: approval.id}))})`);

    return message;
  }

  private showApprovalInfo(approval: ApprovalData) {
    const message = `📋 Approval: ${approval.title} (${approval.status})`;
    vscode.window.showInformationMessage(message, 'View Details', 'Close')
      .then(selection => {
        if (selection === 'View Details') {
          // Could open a detailed view or sidebar
        }
      });
  }

  async addCommentToSelection(editor: vscode.TextEditor, commentText: string): Promise<boolean> {
    const approval = this.getActiveApprovalForEditor(editor);
    if (!approval) {
      return false;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showWarningMessage('Please select text to add a comment');
      return false;
    }

    const lineNumber = selection.start.line + 1; // Convert to 1-based
    const newComment: ApprovalComment = {
      id: this.generateCommentId(),
      text: commentText,
      lineNumber: lineNumber,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    // Add comment to approval data
    if (!approval.comments) {
      approval.comments = [];
    }
    approval.comments.push(newComment);

    // Save updated approval
    await this.saveApprovalData(approval);

    // Update decorations
    this.updateEditorDecorations(editor);

    return true;
  }

  async resolveComment(approval: ApprovalData, commentId: string): Promise<boolean> {
    if (!approval.comments) {
      return false;
    }

    const comment = approval.comments.find(c => c.id === commentId);
    if (!comment) {
      return false;
    }

    comment.resolved = true;

    // Save updated approval
    await this.saveApprovalData(approval);

    // Update decorations for all editors showing this approval
    this.activeApprovalEditors.forEach(context => {
      if (context.approval.id === approval.id) {
        this.updateEditorDecorations(context.editor);
      }
    });

    return true;
  }

  private generateCommentId(): string {
    return 'comment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private async saveApprovalData(approval: ApprovalData): Promise<void> {
    try {
      await this.specWorkflowService.saveApprovalData(approval);

      // Notify other editors about the change
      this.notifyApprovalDataChanged(approval);
    } catch (error) {
      console.error('Failed to save approval data:', error);
      throw error;
    }
  }

  private notifyApprovalDataChanged(approval: ApprovalData) {
    // Update all editors showing this approval
    this.activeApprovalEditors.forEach(context => {
      if (context.approval.id === approval.id) {
        // Update the context with new data
        context.approval = approval;
        // Refresh decorations
        this.updateEditorDecorations(context.editor);
      }
    });
  }

  // Method to handle external approval data changes (from file system watcher)
  async handleExternalApprovalChange(approvalId: string): Promise<void> {
    const context = this.activeApprovalEditors.get(approvalId);
    if (!context) {
      return; // No active editor for this approval
    }

    try {
      // Reload approval data from file
      const approvalPath = await this.specWorkflowService.findApprovalPath(approvalId);
      if (!approvalPath) {
        // Approval was deleted, close the editor
        this.closeApprovalEditor(approvalId);
        vscode.window.showInformationMessage(`Approval "${context.approval.title}" was deleted`);
        return;
      }

      const fs = require('fs').promises;
      const content = await fs.readFile(approvalPath, 'utf-8');
      const updatedApproval = JSON.parse(content) as ApprovalData;

      // Verify the file still exists at the expected location
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (workspaceRoot && updatedApproval.filePath) {
        const resolvedPath = await this.resolveApprovalFilePath(updatedApproval.filePath, workspaceRoot);
        if (!resolvedPath) {
          vscode.window.showWarningMessage(
            `File for approval "${updatedApproval.title}" could not be found: ${updatedApproval.filePath}`
          );
        }
      }

      // Update the context
      context.approval = updatedApproval;

      // Refresh decorations
      this.updateEditorDecorations(context.editor);

      // Show notification about external changes
      vscode.window.showInformationMessage(
        `Approval "${updatedApproval.title}" was updated externally`,
        'Refresh'
      ).then(selection => {
        if (selection === 'Refresh') {
          this.updateEditorDecorations(context.editor);
        }
      });

    } catch (error) {
      console.error(`Failed to handle external approval change for ${approvalId}:`, error);
      vscode.window.showErrorMessage(`Failed to handle external approval change: ${error}`);
    }
  }

  getActiveApprovalForEditor(editor: vscode.TextEditor): ApprovalData | null {
    const context = Array.from(this.activeApprovalEditors.values())
      .find(ctx => ctx.editor === editor);
    return context?.approval || null;
  }

  closeApprovalEditor(approvalId: string) {
    const context = this.activeApprovalEditors.get(approvalId);
    if (context) {
      // Clear decorations
      Object.values(this.decorationTypes).forEach(decorationType => {
        context.editor.setDecorations(decorationType, []);
      });
      
      this.activeApprovalEditors.delete(approvalId);
    }
  }

  dispose() {
    // Clear all decorations and contexts
    this.activeApprovalEditors.clear();
    this.decorationTypes.forEach(decorationType => decorationType.dispose());
    this.decorationTypes.clear();
  }
}
