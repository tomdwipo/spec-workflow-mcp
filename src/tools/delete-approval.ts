import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';

export const deleteApprovalTool: Tool = {
  name: 'delete-approval',
  description: 'Delete an approval request after it has been fully approved. Use this to clean up completed approvals and prevent codebase pollution.',
  inputSchema: {
    type: 'object',
    properties: {
      approvalId: {
        type: 'string',
        description: 'ID of the approval request to delete'
      }
    },
    required: ['approvalId']
  }
};

export async function deleteApprovalHandler(
  args: { approvalId: string },
  context: ToolContext
): Promise<ToolResponse> {
  try {
    const approvalStorage = new ApprovalStorage(context.projectPath);
    await approvalStorage.start();

    // Check if approval exists and its status
    const approval = await approvalStorage.getApproval(args.approvalId);
    if (!approval) {
      return {
        success: false,
        message: `Approval request "${args.approvalId}" not found`,
        nextSteps: [
          'Verify the approval ID is correct',
          'Use get-approval-status to check if the approval exists'
        ]
      };
    }

    // Only allow deletion of approved requests
    if (approval.status !== 'approved') {
      return {
        success: false,
        message: `Cannot delete approval "${args.approvalId}" - status is "${approval.status}", only approved requests can be deleted`,
        data: {
          approvalId: args.approvalId,
          currentStatus: approval.status,
          title: approval.title
        },
        nextSteps: [
          'Only approved requests can be deleted to prevent accidental removal',
          'Wait for the approval to be approved first',
          'Use get-approval-status to check current status'
        ]
      };
    }

    // Delete the approval
    const deleted = await approvalStorage.deleteApproval(args.approvalId);
    await approvalStorage.stop();

    if (deleted) {
      return {
        success: true,
        message: `Approval request "${args.approvalId}" deleted successfully`,
        data: {
          deletedApprovalId: args.approvalId,
          title: approval.title,
          category: approval.category,
          categoryName: approval.categoryName
        },
        nextSteps: [
          'Approval cleanup complete',
          'Continue with your workflow'
        ],
        projectContext: {
          projectPath: context.projectPath,
          workflowRoot: context.projectPath + '/.spec-workflow',
          dashboardUrl: context.dashboardUrl
        }
      };
    } else {
      return {
        success: false,
        message: `Failed to delete approval request "${args.approvalId}"`,
        nextSteps: [
          'Check file permissions',
          'Verify the approval file exists',
          'Try again'
        ]
      };
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to delete approval: ${error.message}`,
      nextSteps: [
        'Check if the project path is correct',
        'Verify file permissions',
        'Ensure the approval system is properly configured'
      ]
    };
  }
}