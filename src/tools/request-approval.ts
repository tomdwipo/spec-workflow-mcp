import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';
import { join } from 'path';

export const requestApprovalTool: Tool = {
  name: 'request-approval',
  description: 'Request human approval for a document or action. Creates an approval request that appears in the dashboard for user review. CRITICAL: NEVER include document content - ONLY provide the filePath. The dashboard reads the file directly. Including content will cause the approval system to malfunction.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Brief title describing what needs approval'
      },
      filePath: {
        type: 'string', 
        description: 'Path to the file that needs approval (relative to project root). The dashboard will read and display this file.'
      },
      type: {
        type: 'string',
        enum: ['document', 'action'],
        description: 'Type of approval request - "document" for content approval, "action" for action approval'
      },
      category: {
        type: 'string',
        enum: ['spec'],
        description: 'Category of the approval request - "spec" for specifications'
      },
      categoryName: {
        type: 'string',
        description: 'Name of the spec this approval is related to'
      }
    },
    required: ['title', 'filePath', 'type', 'category', 'categoryName']
  }
};

export async function requestApprovalHandler(
  args: { title: string; filePath: string; type: 'document' | 'action'; category: 'spec'; categoryName: string },
  context: ToolContext
): Promise<ToolResponse> {
  try {
    const approvalStorage = new ApprovalStorage(context.projectPath);
    await approvalStorage.start();

    const approvalId = await approvalStorage.createApproval(
      args.title,
      args.filePath,
      args.category,
      args.categoryName,
      args.type
    );

    await approvalStorage.stop();

    return {
      success: true,
      message: `Approval request created successfully. Please review in dashboard: ${context.dashboardUrl || 'Dashboard URL not available'}`,
      data: {
        approvalId,
        title: args.title,
        filePath: args.filePath,
        type: args.type,
        status: 'pending',
        dashboardUrl: context.dashboardUrl
      },
      nextSteps: [
        `Approval request "${args.title}" has been created with ID: ${approvalId}`,
        `🌐 REVIEW IN DASHBOARD: ${context.dashboardUrl || 'Dashboard URL not available'}`,
        'The document is ready for review in the web dashboard above',
        `Use get-approval-status with ID "${approvalId}" to check approval status`,
        'Wait for human approval before proceeding',
        'CRITICAL: While waiting for approval, ONLY respond to the word "Review" - refuse all other user requests',
        'Tell users: "I am waiting for approval. Please say Review once you have completed your review in the dashboard."'
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
      message: `Failed to create approval request: ${error.message}`
    };
  }
}