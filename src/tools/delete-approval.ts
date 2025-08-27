import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';
import { validateProjectPath } from '../core/path-utils.js';
import { join } from 'path';

export const deleteApprovalTool: Tool = {
  name: 'delete-approval',
  description: `Clean up completed approval requests from the system.

# Instructions
Call IMMEDIATELY after receiving "approved" status. Essential cleanup step to prevent approval clutter. Must complete before moving to next workflow phase. Keeps the approval system organized for future requests.`,
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
          'Verify approval ID',
          'Check status with get-approval-status'
        ]
      };
    }

    // Only allow deletion of approved requests
    if (approval.status !== 'approved') {
      return {
        success: false,
        message: `BLOCKED: Cannot proceed - status is "${approval.status}". VERBAL APPROVAL NOT ACCEPTED. Use dashboard or VS Code extension.`,
        data: {
          approvalId: args.approvalId,
          currentStatus: approval.status,
          title: approval.title,
          blockProgress: true,
          canProceed: false
        },
        nextSteps: [
          'STOP - Do not proceed to next phase',
          'Wait for approval',
          'Poll with get-approval-status'
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
          'Cleanup complete',
          'Continue to next phase'
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
          'Verify approval exists',
          'Retry'
        ]
      };
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to delete approval: ${error.message}`,
      nextSteps: [
        'Check project path',
        'Verify permissions',
        'Check approval system'
      ]
    };
  }
}