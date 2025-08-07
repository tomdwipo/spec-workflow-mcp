import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';
import { join } from 'path';

export const submitRevisionTool: Tool = {
  name: 'submit-revision',
  description: 'Submit a revised version of a document based on user feedback. Use this when you have updated content based on approval comments.',
  inputSchema: {
    type: 'object',
    properties: {
      approvalId: {
        type: 'string',
        description: 'The ID of the approval request that needs revision'
      },
      revisedContent: {
        type: 'string', 
        description: 'The updated content addressing the user feedback'
      },
      revisionSummary: {
        type: 'string',
        description: 'Brief summary of what changes were made based on feedback'
      }
    },
    required: ['approvalId', 'revisedContent', 'revisionSummary']
  }
};

export async function submitRevisionHandler(
  args: { approvalId: string; revisedContent: string; revisionSummary: string },
  context: ToolContext
): Promise<ToolResponse> {
  try {
    const approvalStorage = new ApprovalStorage(context.projectPath);
    await approvalStorage.start();

    // Check if the approval exists and has feedback
    const approval = await approvalStorage.getApproval(args.approvalId);
    if (!approval) {
      await approvalStorage.stop();
      return {
        success: false,
        message: `Approval request not found: ${args.approvalId}`
      };
    }

    if (approval.status !== 'needs-revision') {
      await approvalStorage.stop();
      return {
        success: false,
        message: `Approval ${args.approvalId} is not in needs-revision status (current: ${approval.status})`
      };
    }

    // Create the revision
    await approvalStorage.createRevision(
      args.approvalId,
      args.revisedContent,
      args.revisionSummary
    );

    await approvalStorage.stop();

    return {
      success: true,
      message: `Revision submitted successfully for approval request ${args.approvalId}`,
      data: {
        approvalId: args.approvalId,
        status: 'pending',
        revisionSummary: args.revisionSummary,
        dashboardUrl: context.dashboardUrl
      },
      nextSteps: [
        `Revision submitted for "${approval.title}"`,
        'The updated content has been sent for review',
        'User can now review the changes in the dashboard',
        `Use get-approval-status with ID "${args.approvalId}" to check approval status`,
        'Wait for user approval before proceeding'
      ],
      projectContext: {
        projectPath: context.projectPath,
        workflowRoot: join(context.projectPath, '.spec-workflow'),
        dashboardUrl: context.dashboardUrl
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to submit revision: ${error.message}`
    };
  }
}