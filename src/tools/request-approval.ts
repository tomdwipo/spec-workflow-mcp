import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';
import { join } from 'path';
import { validateProjectPath } from '../core/path-utils.js';

export const requestApprovalTool: Tool = {
  name: 'request-approval',
  description: 'Request human approval for a document or action. Creates an approval request that appears in the dashboard for user review. CRITICAL: Provide only the filePath parameter (the dashboard reads files directly). Including content in the request will cause approval system errors.',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Absolute path to the project root'
      },
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
    required: ['projectPath', 'title', 'filePath', 'type', 'category', 'categoryName']
  }
};

export async function requestApprovalHandler(
  args: { projectPath: string; title: string; filePath: string; type: 'document' | 'action'; category: 'spec'; categoryName: string },
  context: ToolContext
): Promise<ToolResponse> {
  try {
    // Validate and resolve project path
    const validatedProjectPath = await validateProjectPath(args.projectPath);
    
    const approvalStorage = new ApprovalStorage(validatedProjectPath);
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
        'CRITICAL: While waiting for approval, respond only to the word "Review"',
        'Tell users: "I am waiting for approval. Please say Review once you have completed your review in the dashboard."'
      ],
      projectContext: {
        projectPath: validatedProjectPath,
        workflowRoot: join(validatedProjectPath, '.spec-workflow'),
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