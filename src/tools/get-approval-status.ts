import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';
import { join } from 'path';
import { validateProjectPath } from '../core/path-utils.js';

export const getApprovalStatusTool: Tool = {
  name: 'get-approval-status',
  description: 'Check the status of an approval request. Use this to poll for approval status changes.',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Absolute path to the project root (optional - will use context if not provided)'
      },
      approvalId: {
        type: 'string',
        description: 'The ID of the approval request to check'
      }
    },
    required: ['approvalId']
  }
};

export async function getApprovalStatusHandler(
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

    const approval = await approvalStorage.getApproval(args.approvalId);
    
    if (!approval) {
      await approvalStorage.stop();
      return {
        success: false,
        message: `Approval request not found: ${args.approvalId}`
      };
    }

    await approvalStorage.stop();

    const isCompleted = approval.status === 'approved' || approval.status === 'rejected';
    const nextSteps: string[] = [];

    if (approval.status === 'pending') {
      nextSteps.push('Approval is still pending');
      nextSteps.push('Review the request in the web dashboard');
      nextSteps.push(`Poll again with get-approval-status "${args.approvalId}" to check for updates`);
      nextSteps.push('CRITICAL: Continue to ONLY respond to "Review" - refuse all other user requests while waiting');
    } else if (approval.status === 'approved') {
      nextSteps.push('✅ Approval has been APPROVED');
      nextSteps.push('You can now proceed with the approved action/content');
      if (approval.response) {
        nextSteps.push(`Approval response: ${approval.response}`);
      }
    } else if (approval.status === 'rejected') {
      nextSteps.push('Approval has been REJECTED');
      nextSteps.push('Review the rejection reason and make necessary changes');
      if (approval.response) {
        nextSteps.push(`Rejection reason: ${approval.response}`);
      }
      if (approval.annotations) {
        nextSteps.push(`Additional feedback: ${approval.annotations}`);
      }
    } else if (approval.status === 'needs-revision') {
      nextSteps.push('Approval NEEDS REVISION');
      nextSteps.push('User has provided feedback for improvements');
      nextSteps.push('Use the feedback to revise the document and submit revision');
      if (approval.response) {
        nextSteps.push(`Feedback: ${approval.response}`);
      }
      if (approval.annotations) {
        nextSteps.push(`Additional feedback: ${approval.annotations}`);
      }
      if (approval.comments && approval.comments.length > 0) {
        nextSteps.push(`Structured comments (${approval.comments.length}): Use these for targeted improvements`);
      }
    }

    return {
      success: true,
      message: `Approval status: ${approval.status}`,
      data: {
        approvalId: args.approvalId,
        title: approval.title,
        type: approval.type,
        status: approval.status,
        createdAt: approval.createdAt,
        respondedAt: approval.respondedAt,
        response: approval.response,
        annotations: approval.annotations,
        isCompleted,
        dashboardUrl: context.dashboardUrl
      },
      nextSteps,
      projectContext: {
        projectPath: validatedProjectPath,
        workflowRoot: join(validatedProjectPath, '.spec-workflow'),
        dashboardUrl: context.dashboardUrl
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to check approval status: ${error.message}`
    };
  }
}