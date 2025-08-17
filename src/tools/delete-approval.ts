import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';
import { validateProjectPath } from '../core/path-utils.js';
import { join } from 'path';

export const deleteApprovalTool: Tool = {
  name: 'delete-approval',
  description: 'Delete an approval request after it has been fully approved. Use this to clean up completed approvals and prevent codebase pollution.',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Absolute path to the project root (optional - will use context if not provided)'
      },
      approvalId: {
        type: 'string',
        description: 'ID of the approval request to delete'
      }
    },
    required: ['approvalId']
  }
};

export async function deleteApprovalHandler(
  args: { projectPath?: string; approvalId: string },
  context: ToolContext
): Promise<ToolResponse> {
  try {
    // Use provided projectPath or fall back to context
    const projectPath = args.projectPath || context.projectPath;
    if (!projectPath) {
      return {
        success: false,
        message: 'Project path is required. Please provide projectPath parameter.'
      };
    }
    
    // Validate and resolve project path
    const validatedProjectPath = await validateProjectPath(projectPath);
    
    const approvalStorage = new ApprovalStorage(validatedProjectPath);
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
          projectPath: validatedProjectPath,
          workflowRoot: join(validatedProjectPath, '.spec-workflow'),
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