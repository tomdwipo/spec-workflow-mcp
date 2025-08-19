import * as vscode from 'vscode';
import { ApprovalEditorService } from './ApprovalEditorService';
import { SpecWorkflowService } from './SpecWorkflowService';

export class ApprovalCommandService {
  private static instance: ApprovalCommandService;
  private approvalEditorService: ApprovalEditorService;
  private specWorkflowService: SpecWorkflowService;

  constructor(
    approvalEditorService: ApprovalEditorService,
    specWorkflowService: SpecWorkflowService
  ) {
    this.approvalEditorService = approvalEditorService;
    this.specWorkflowService = specWorkflowService;
  }

  static getInstance(
    approvalEditorService: ApprovalEditorService,
    specWorkflowService: SpecWorkflowService
  ): ApprovalCommandService {
    if (!ApprovalCommandService.instance) {
      ApprovalCommandService.instance = new ApprovalCommandService(
        approvalEditorService,
        specWorkflowService
      );
    }
    return ApprovalCommandService.instance;
  }

  registerCommands(context: vscode.ExtensionContext) {
    // Register approval action commands
    const commands = [
      vscode.commands.registerCommand('spec-workflow.approveFromEditor', this.approveFromEditor.bind(this)),
      vscode.commands.registerCommand('spec-workflow.rejectFromEditor', this.rejectFromEditor.bind(this)),
      vscode.commands.registerCommand('spec-workflow.requestRevisionFromEditor', this.requestRevisionFromEditor.bind(this)),
      vscode.commands.registerCommand('spec-workflow.addCommentToSelection', this.addCommentToSelection.bind(this)),
      vscode.commands.registerCommand('spec-workflow.resolveComment', this.resolveComment.bind(this)),
      vscode.commands.registerCommand('spec-workflow.showApprovalActions', this.showApprovalActions.bind(this))
    ];

    commands.forEach(command => context.subscriptions.push(command));
  }

  private async approveFromEditor(args?: { id: string }) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    let approvalId = args?.id;
    if (!approvalId) {
      const approval = this.approvalEditorService.getActiveApprovalForEditor(editor);
      approvalId = approval?.id;
    }

    if (!approvalId) {
      vscode.window.showErrorMessage('No active approval found');
      return;
    }

    try {
      await this.specWorkflowService.approveRequest(approvalId, 'Approved from editor');
      vscode.window.showInformationMessage('✅ Approval approved successfully');
      
      // Close the approval editor
      this.approvalEditorService.closeApprovalEditor(approvalId);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to approve: ${error}`);
    }
  }

  private async rejectFromEditor(args?: { id: string }) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    let approvalId = args?.id;
    if (!approvalId) {
      const approval = this.approvalEditorService.getActiveApprovalForEditor(editor);
      approvalId = approval?.id;
    }

    if (!approvalId) {
      vscode.window.showErrorMessage('No active approval found');
      return;
    }

    // Prompt for rejection reason
    const reason = await vscode.window.showInputBox({
      prompt: 'Please provide a reason for rejection',
      placeHolder: 'Enter rejection reason...'
    });

    if (!reason) {
      return; // User cancelled
    }

    try {
      await this.specWorkflowService.rejectRequest(approvalId, reason);
      vscode.window.showInformationMessage('❌ Approval rejected successfully');
      
      // Close the approval editor
      this.approvalEditorService.closeApprovalEditor(approvalId);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to reject: ${error}`);
    }
  }

  private async requestRevisionFromEditor(args?: { id: string }) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    let approvalId = args?.id;
    if (!approvalId) {
      const approval = this.approvalEditorService.getActiveApprovalForEditor(editor);
      approvalId = approval?.id;
    }

    if (!approvalId) {
      vscode.window.showErrorMessage('No active approval found');
      return;
    }

    // Prompt for revision feedback
    const feedback = await vscode.window.showInputBox({
      prompt: 'Please provide feedback for revision',
      placeHolder: 'Enter revision feedback...'
    });

    if (!feedback) {
      return; // User cancelled
    }

    try {
      await this.specWorkflowService.requestRevisionRequest(approvalId, feedback);
      vscode.window.showInformationMessage('🔄 Revision requested successfully');
      
      // Keep the editor open for further review
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to request revision: ${error}`);
    }
  }

  private async addCommentToSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const approval = this.approvalEditorService.getActiveApprovalForEditor(editor);
    if (!approval) {
      vscode.window.showErrorMessage('No active approval found');
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showWarningMessage('Please select text to add a comment');
      return;
    }

    const commentText = await vscode.window.showInputBox({
      prompt: 'Enter your comment',
      placeHolder: 'Type your comment here...'
    });

    if (!commentText) {
      return; // User cancelled
    }

    try {
      const success = await this.approvalEditorService.addCommentToSelection(editor, commentText);
      if (success) {
        vscode.window.showInformationMessage('💬 Comment added successfully');
      } else {
        vscode.window.showErrorMessage('Failed to add comment');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add comment: ${error}`);
    }
  }

  private async resolveComment(args?: { approvalId: string; commentId: string }) {
    if (!args) {
      vscode.window.showErrorMessage('Invalid comment resolution request');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const approval = this.approvalEditorService.getActiveApprovalForEditor(editor);
    if (!approval || approval.id !== args.approvalId) {
      vscode.window.showErrorMessage('Approval not found');
      return;
    }

    try {
      const success = await this.approvalEditorService.resolveComment(approval, args.commentId);
      if (success) {
        vscode.window.showInformationMessage('✅ Comment resolved');
      } else {
        vscode.window.showErrorMessage('Failed to resolve comment');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to resolve comment: ${error}`);
    }
  }

  private async showApprovalActions() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const approval = this.approvalEditorService.getActiveApprovalForEditor(editor);
    if (!approval) {
      vscode.window.showErrorMessage('No active approval found');
      return;
    }

    const actions = [
      '✅ Approve',
      '❌ Reject',
      '🔄 Request Revision',
      '💬 Add Comment to Selection',
      '📋 View Approval Details'
    ];

    const selectedAction = await vscode.window.showQuickPick(actions, {
      placeHolder: `Select action for approval: ${approval.title}`
    });

    switch (selectedAction) {
      case '✅ Approve':
        await this.approveFromEditor({ id: approval.id });
        break;
      case '❌ Reject':
        await this.rejectFromEditor({ id: approval.id });
        break;
      case '🔄 Request Revision':
        await this.requestRevisionFromEditor({ id: approval.id });
        break;
      case '💬 Add Comment to Selection':
        await this.addCommentToSelection();
        break;
      case '📋 View Approval Details':
        await this.showApprovalDetails(approval);
        break;
    }
  }

  private async showApprovalDetails(approval: any) {
    const details = [
      `**Title**: ${approval.title}`,
      `**Status**: ${approval.status.toUpperCase()}`,
      `**Created**: ${new Date(approval.createdAt).toLocaleString()}`,
      approval.response ? `**Response**: ${approval.response}` : '',
      approval.annotations ? `**Annotations**: ${approval.annotations}` : '',
      approval.comments ? `**Comments**: ${approval.comments.length} comment(s)` : ''
    ].filter(Boolean).join('\n\n');

    const document = await vscode.workspace.openTextDocument({
      content: details,
      language: 'markdown'
    });

    await vscode.window.showTextDocument(document, { preview: true });
  }
}
