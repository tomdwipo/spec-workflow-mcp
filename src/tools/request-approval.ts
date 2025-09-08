import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';
import { join } from 'path';
import { validateProjectPath } from '../core/path-utils.js';
import { translate } from '../core/i18n.js';

export const requestApprovalTool: Tool = {
  name: 'request-approval',
  description: translate('tools.requestApproval.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: translate('tools.requestApproval.projectPathDescription')
      },
      title: {
        type: 'string',
        description: translate('tools.requestApproval.titleDescription')
      },
      filePath: {
        type: 'string', 
        description: translate('tools.requestApproval.filePathDescription')
      },
      type: {
        type: 'string',
        enum: ['document', 'action'],
        description: translate('tools.requestApproval.typeDescription')
      },
      category: {
        type: 'string',
        enum: ['spec', 'steering'],
        description: translate('tools.requestApproval.categoryDescription')
      },
      categoryName: {
        type: 'string',
        description: translate('tools.requestApproval.categoryNameDescription')
      }
    },
    required: ['projectPath', 'title', 'filePath', 'type', 'category', 'categoryName']
  }
};

export async function requestApprovalHandler(
  args: { projectPath: string; title: string; filePath: string; type: 'document' | 'action'; category: 'spec' | 'steering'; categoryName: string },
  context: ToolContext
): Promise<ToolResponse> {
  const lang = context.lang || 'en';
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

    const dashboardMessage = context.dashboardUrl
      ? translate('tools.requestApproval.nextSteps.useDashboard', lang, { dashboardUrl: context.dashboardUrl })
      : translate('tools.requestApproval.nextSteps.useVscode', lang);

    return {
      success: true,
      message: translate('tools.requestApproval.successMessage', lang, { dashboardUrl: context.dashboardUrl || translate('tools.requestApproval.dashboardUnavailable', lang) }),
      data: {
        approvalId,
        title: args.title,
        filePath: args.filePath,
        type: args.type,
        status: 'pending',
        dashboardUrl: context.dashboardUrl
      },
      nextSteps: [
        translate('tools.requestApproval.nextSteps.blocking', lang),
        translate('tools.requestApproval.nextSteps.noVerbal', lang),
        translate('tools.requestApproval.nextSteps.noVerbalConfirm', lang),
        dashboardMessage,
        translate('tools.requestApproval.nextSteps.poll', lang, { approvalId })
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
      message: translate('tools.requestApproval.errors.failed', lang, { message: error.message })
    };
  }
}