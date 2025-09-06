import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ApprovalStorage } from '../dashboard/approval-storage.js';
import { join } from 'path';
import { validateProjectPath } from '../core/path-utils.js';
import { translate } from '../core/i18n.js';

export const getApprovalStatusTool: Tool = {
  name: 'get-approval-status',
  description: translate('tools.getApprovalStatus.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: translate('tools.getApprovalStatus.projectPathDescription')
      },
      approvalId: {
        type: 'string',
        description: translate('tools.getApprovalStatus.approvalIdDescription')
      }
    },
    required: ['approvalId']
  }
};

export async function getApprovalStatusHandler(
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
        message: translate('tools.getApprovalStatus.errors.projectPathRequired', lang)
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
        message: translate('tools.getApprovalStatus.errors.notFound', lang, { approvalId: args.approvalId })
      };
    }

    await approvalStorage.stop();

    const isCompleted = approval.status === 'approved' || approval.status === 'rejected';
    const canProceed = approval.status === 'approved';
    const mustWait = approval.status !== 'approved';
    const nextSteps: string[] = [];

    if (approval.status === 'pending') {
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.pending.blocked', lang));
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.pending.noVerbal', lang));
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.pending.useUI', lang));
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.pending.poll', lang));
    } else if (approval.status === 'approved') {
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.approved.canProceed', lang));
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.approved.delete', lang));
      if (approval.response) {
        nextSteps.push(translate('tools.getApprovalStatus.nextSteps.approved.response', lang, { response: approval.response }));
      }
    } else if (approval.status === 'rejected') {
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.rejected.blocked', lang));
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.rejected.doNotProceed', lang));
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.rejected.revise', lang));
      if (approval.response) {
        nextSteps.push(translate('tools.getApprovalStatus.nextSteps.rejected.reason', lang, { reason: approval.response }));
      }
      if (approval.annotations) {
        nextSteps.push(translate('tools.getApprovalStatus.nextSteps.rejected.notes', lang, { notes: approval.annotations }));
      }
    } else if (approval.status === 'needs-revision') {
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.needsRevision.blocked', lang));
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.needsRevision.update', lang));
      nextSteps.push(translate('tools.getApprovalStatus.nextSteps.needsRevision.newRequest', lang));
      if (approval.response) {
        nextSteps.push(translate('tools.getApprovalStatus.nextSteps.needsRevision.feedback', lang, { feedback: approval.response }));
      }
      if (approval.annotations) {
        nextSteps.push(translate('tools.getApprovalStatus.nextSteps.needsRevision.notes', lang, { notes: approval.annotations }));
      }
      if (approval.comments && approval.comments.length > 0) {
        nextSteps.push(translate('tools.getApprovalStatus.nextSteps.needsRevision.comments', lang, { count: approval.comments.length }));
      }
    }

    const message = approval.status === 'pending'
      ? translate('tools.getApprovalStatus.messages.pending', lang, { status: approval.status })
      : translate('tools.getApprovalStatus.messages.other', lang, { status: approval.status });

    return {
      success: true,
      message,
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
      message: translate('tools.getApprovalStatus.errors.genericFail', lang, { message: error.message })
    };
  }
}