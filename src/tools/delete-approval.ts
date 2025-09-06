import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';
import { validateProjectPath } from '../core/path-utils.js';
import { join } from 'path';
import { translate } from '../core/i18n.js';

export const deleteApprovalTool: Tool = {
  name: 'delete-approval',
  description: translate('tools.deleteApproval.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: translate('tools.deleteApproval.projectPathDescription')
      },
      approvalId: {
        type: 'string',
        description: translate('tools.deleteApproval.approvalIdDescription')
      }
    },
    required: ['approvalId']
  }
};

export async function deleteApprovalHandler(
  args: { projectPath?: string; approvalId: string },
  context: ToolContext
): Promise<ToolResponse> {
  const lang = context.lang || 'en';
  try {
    // Use provided projectPath or fall back to context
    const projectPath = args.projectPath || context.projectPath;
    if (!projectPath) {
      return {
        success: false,
        message: translate('tools.deleteApproval.errors.projectPathRequired', lang)
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
        message: translate('tools.deleteApproval.errors.notFound', lang, { approvalId: args.approvalId }),
        nextSteps: [
          translate('tools.deleteApproval.errors.nextSteps.verifyId', lang),
          translate('tools.deleteApproval.errors.nextSteps.checkStatus', lang)
        ]
      };
    }

    // Only allow deletion of approved requests
    if (approval.status !== 'approved') {
      return {
        success: false,
        message: translate('tools.deleteApproval.errors.notApproved', lang, { status: approval.status }),
        data: {
          approvalId: args.approvalId,
          currentStatus: approval.status,
          title: approval.title,
          blockProgress: true,
          canProceed: false
        },
        nextSteps: [
          translate('tools.deleteApproval.errors.nextSteps.stop', lang),
          translate('tools.deleteApproval.errors.nextSteps.wait', lang),
          translate('tools.deleteApproval.errors.nextSteps.poll', lang)
        ]
      };
    }

    // Delete the approval
    const deleted = await approvalStorage.deleteApproval(args.approvalId);
    await approvalStorage.stop();

    if (deleted) {
      return {
        success: true,
        message: translate('tools.deleteApproval.successMessage', lang, { approvalId: args.approvalId }),
        data: {
          deletedApprovalId: args.approvalId,
          title: approval.title,
          category: approval.category,
          categoryName: approval.categoryName
        },
        nextSteps: [
          translate('tools.deleteApproval.nextSteps.cleanupComplete', lang),
          translate('tools.deleteApproval.nextSteps.continue', lang)
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
        message: translate('tools.deleteApproval.errors.deleteFailed', lang, { approvalId: args.approvalId }),
        nextSteps: [
          translate('tools.deleteApproval.errors.nextSteps.checkPermissions', lang),
          translate('tools.deleteApproval.errors.nextSteps.verifyExists', lang),
          translate('tools.deleteApproval.errors.nextSteps.retry', lang)
        ]
      };
    }

  } catch (error: any) {
    return {
      success: false,
      message: translate('tools.deleteApproval.errors.genericFail', lang, { message: error.message }),
      nextSteps: [
        translate('tools.deleteApproval.errors.nextSteps.checkPath', lang),
        translate('tools.deleteApproval.errors.nextSteps.checkPermissions', lang),
        translate('tools.deleteApproval.errors.nextSteps.checkSystem', lang)
      ]
    };
  }
}