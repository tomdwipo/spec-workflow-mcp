import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { translate } from '../core/i18n.js';

export const specWorkflowGuideTool: Tool = {
  name: 'spec-workflow-guide',
  description: translate('tools.specWorkflowGuide.description'),
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export async function specWorkflowGuideHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const lang = context.lang || 'en';

  // Get dashboard URL from context or session
  let dashboardUrl = context.dashboardUrl;
  if (!dashboardUrl && context.sessionManager) {
    dashboardUrl = await context.sessionManager.getDashboardUrl();
  }

  const dashboardMessage = dashboardUrl
    ? translate('tools.specWorkflowGuide.dashboardMessage', lang, { dashboardUrl })
    : translate('tools.specWorkflowGuide.dashboardUnavailable', lang);

  return {
    success: true,
    message: translate('tools.specWorkflowGuide.successMessage', lang),
    data: {
      guide: translate('tools.specWorkflowGuide.guide', lang),
      dashboardUrl: dashboardUrl,
      dashboardAvailable: !!dashboardUrl
    },
    nextSteps: [
      translate('tools.specWorkflowGuide.nextSteps.step1', lang),
      translate('tools.specWorkflowGuide.nextSteps.step2', lang),
      translate('tools.specWorkflowGuide.nextSteps.step3', lang),
      translate('tools.specWorkflowGuide.nextSteps.step4', lang),
      dashboardMessage
    ]
  };
}