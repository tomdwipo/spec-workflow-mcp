import * as vscode from 'vscode';
import { ApprovalEditorService } from './ApprovalEditorService';
import { SpecWorkflowService } from './SpecWorkflowService';
import { CommentModalService } from './CommentModalService';
import { HighlightColor } from '../types';

export class ApprovalCommandService {
  private static instance: ApprovalCommandService;
  private approvalEditorService: ApprovalEditorService;
  private specWorkflowService: SpecWorkflowService;
  private commentModalService: CommentModalService;

  constructor(
    approvalEditorService: ApprovalEditorService,
    specWorkflowService: SpecWorkflowService,
    extensionUri: vscode.Uri
  ) {
    this.approvalEditorService = approvalEditorService;
    this.specWorkflowService = specWorkflowService;
    this.commentModalService = CommentModalService.getInstance(extensionUri);
  }

  static getInstance(
    approvalEditorService: ApprovalEditorService,
    specWorkflowService: SpecWorkflowService,
    extensionUri: vscode.Uri
  ): ApprovalCommandService {
    if (!ApprovalCommandService.instance) {
      ApprovalCommandService.instance = new ApprovalCommandService(
        approvalEditorService,
        specWorkflowService,
        extensionUri
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
      vscode.commands.registerCommand('spec-workflow.addCommentToActiveSelection', this.addCommentToActiveSelection.bind(this)),
      vscode.commands.registerCommand('spec-workflow.resolveComment', this.resolveComment.bind(this)),
      vscode.commands.registerCommand('spec-workflow.editComment', this.editComment.bind(this)),
      vscode.commands.registerCommand('spec-workflow.deleteComment', this.deleteComment.bind(this)),
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

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showWarningMessage('Please select text to add a comment');
      return;
    }

    const selectedText = editor.document.getText(selection);

    // Open the iro.js color picker modal in split view
    await this.commentModalService.showCommentModal({
      selectedText,
      editor,
      selection,
      onSave: async (comment: string, color: HighlightColor) => {
        // For approval documents, save via approval system
        const approval = this.approvalEditorService.getActiveApprovalForEditor(editor);
        if (approval) {
          const success = await this.approvalEditorService.addCommentToSelection(editor, comment, color);
          if (!success) {
            vscode.window.showErrorMessage('Failed to add comment to approval document');
          }
        } else {
          // For regular documents, show success message (could extend with file annotations later)
          vscode.window.showInformationMessage('💬 Comment created with selected color');
        }
      }
    });
  }

  private async addCommentToActiveSelection(args?: { range: vscode.Range; selectedText: string }) {
    await this.approvalEditorService.handleAddCommentToActiveSelection(args);
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

  private async editComment(args?: { commentId: string }) {
    if (!args) {
      vscode.window.showErrorMessage('Invalid edit comment request');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const approval = this.approvalEditorService.getActiveApprovalForEditor(editor);
    if (!approval || !approval.comments) {
      vscode.window.showErrorMessage('No approval or comments found');
      return;
    }

    const comment = approval.comments.find(c => c.id === args.commentId);
    if (!comment) {
      vscode.window.showErrorMessage('Comment not found');
      return;
    }

    // Create a range from the comment's line information
    let range: vscode.Range;
    if (comment.startLine !== undefined && comment.endLine !== undefined) {
      range = new vscode.Range(
        Math.max(0, comment.startLine - 1),
        0,
        Math.max(0, comment.endLine - 1),
        editor.document.lineAt(Math.max(0, comment.endLine - 1)).text.length
      );
    } else if (comment.lineNumber !== undefined) {
      const line = Math.max(0, comment.lineNumber - 1);
      range = editor.document.lineAt(line).range;
    } else {
      vscode.window.showErrorMessage('Invalid comment line information');
      return;
    }

    const selectedText = comment.selectedText || editor.document.getText(range);
    const selection = new vscode.Selection(range.start, range.end);

    // Open the comment modal in edit mode
    await this.commentModalService.showCommentModal({
      selectedText,
      editor,
      selection,
      existingComment: comment,
      onSave: async (commentText: string, color: HighlightColor) => {
        // Update the existing comment
        comment.text = commentText;
        comment.highlightColor = color;
        comment.timestamp = new Date().toISOString(); // Update timestamp

        // Save the updated approval using proper state management
        await this.approvalEditorService.saveApprovalData(approval);
        
        vscode.window.showInformationMessage('💬 Comment updated successfully');
      }
    });
  }

  private async deleteComment(args?: { commentId: string }) {
    if (!args) {
      vscode.window.showErrorMessage('Invalid delete comment request');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const approval = this.approvalEditorService.getActiveApprovalForEditor(editor);
    if (!approval || !approval.comments) {
      vscode.window.showErrorMessage('No approval or comments found');
      return;
    }

    const commentIndex = approval.comments.findIndex(c => c.id === args.commentId);
    if (commentIndex === -1) {
      vscode.window.showErrorMessage('Comment not found');
      return;
    }

    const comment = approval.comments[commentIndex];

    // Show confirmation dialog
    const deleteConfirm = await vscode.window.showWarningMessage(
      `Are you sure you want to delete this comment?\n\n"${comment.text.substring(0, 100)}${comment.text.length > 100 ? '...' : ''}"`,
      { modal: true },
      'Delete Comment',
      'Cancel'
    );

    if (deleteConfirm !== 'Delete Comment') {
      return; // User cancelled
    }

    try {
      // Remove the comment from the array
      approval.comments.splice(commentIndex, 1);

      // Save the updated approval using proper state management
      await this.approvalEditorService.saveApprovalData(approval);
      
      vscode.window.showInformationMessage('🗑️ Comment deleted successfully');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete comment: ${error}`);
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
