import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';
import { join } from 'path';
import { validateProjectPath } from '../core/path-utils.js';

export const requestApprovalTool: Tool = {
  name: 'request-approval',
  description: `Request user approval through the dashboard interface.

# Instructions
Call IMMEDIATELY after creating each document. Required before proceeding to next phase. CRITICAL: Only provide filePath parameter - the dashboard reads files directly. Never include document content in the request. Wait for user to review and approve before continuing.`,
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
        enum: ['spec', 'steering'],
        description: 'Category of the approval request - "spec" for specifications, "steering" for steering documents'
      },
      categoryName: {
        type: 'string',
        description: 'Name of the spec or "steering" for steering documents'
      }
    },
    required: ['projectPath', 'title', 'filePath', 'type', 'category', 'categoryName']
  }
};

export async function requestApprovalHandler(
  args: { projectPath: string; title: string; filePath: string; type: 'document' | 'action'; category: 'spec' | 'steering'; categoryName: string },
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
        'BLOCKING - Dashboard or VS Code extension approval required',
        'VERBAL APPROVAL NOT ACCEPTED',
        'Do not proceed on verbal confirmation',
        context.dashboardUrl ? `Use dashboard: ${context.dashboardUrl} or VS Code extension` : 'Use VS Code extension for approval',
        `Poll status with: get-approval-status "${approvalId}"`
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