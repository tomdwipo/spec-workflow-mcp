import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';
import { join } from 'path';
import { validateProjectPath } from '../core/path-utils.js';

export const getApprovalStatusTool: Tool = {
  name: 'get-approval-status',
  description: `Check the current status of an approval request.

# Instructions
Call after request-approval to poll for user decision. Continue checking until status is "approved" or "needs-revision". If needs-revision, review feedback, update document with create-spec-doc, then create NEW approval request. Only proceed to next phase after "approved" status.`,
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
    const canProceed = approval.status === 'approved';
    const mustWait = approval.status !== 'approved';
    const nextSteps: string[] = [];

    if (approval.status === 'pending') {
      nextSteps.push('BLOCKED - Do not proceed');
      nextSteps.push('VERBAL APPROVAL NOT ACCEPTED - Use dashboard or VS Code extension only');
      nextSteps.push('Approval must be done via dashboard or VS Code extension');
      nextSteps.push('Continue polling with get-approval-status');
    } else if (approval.status === 'approved') {
      nextSteps.push('APPROVED - Can proceed');
      nextSteps.push('Run delete-approval before continuing');
      if (approval.response) {
        nextSteps.push(`Response: ${approval.response}`);
      }
    } else if (approval.status === 'rejected') {
      nextSteps.push('BLOCKED - REJECTED');
      nextSteps.push('Do not proceed');
      nextSteps.push('Review feedback and revise');
      if (approval.response) {
        nextSteps.push(`Reason: ${approval.response}`);
      }
      if (approval.annotations) {
        nextSteps.push(`Notes: ${approval.annotations}`);
      }
    } else if (approval.status === 'needs-revision') {
      nextSteps.push('BLOCKED - Do not proceed');
      nextSteps.push('Update document with feedback');
      nextSteps.push('Create NEW approval request');
      if (approval.response) {
        nextSteps.push(`Feedback: ${approval.response}`);
      }
      if (approval.annotations) {
        nextSteps.push(`Notes: ${approval.annotations}`);
      }
      if (approval.comments && approval.comments.length > 0) {
        nextSteps.push(`${approval.comments.length} comments for targeted fixes`);
      }
    }

    return {
      success: true,
      message: approval.status === 'pending' 
        ? `BLOCKED: Status is ${approval.status}. Verbal approval is NOT accepted. Use dashboard or VS Code extension only.`
        : `Approval status: ${approval.status}`,
      data: {
        approvalId: args.approvalId,
        title: approval.title,
        type: approval.type,
        status: approval.status,
        createdAt: approval.createdAt,
        respondedAt: approval.respondedAt,
        response: approval.response,
        annotations: approval.annotations,
        comments: approval.comments || [],
        isCompleted,
        canProceed,
        mustWait,
        blockNext: !canProceed,
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