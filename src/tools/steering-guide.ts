import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { translate } from '../core/i18n.js';

export const steeringGuideTool: Tool = {
  name: 'steering-guide',
  description: translate('tools.steeringGuide.description'),
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export async function steeringGuideHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const lang = context.lang || 'en';
  const dashboardMessage = context.dashboardUrl
    ? translate('tools.steeringGuide.dashboardMessage', lang, { dashboardUrl: context.dashboardUrl })
    : translate('tools.steeringGuide.dashboardUnavailable', lang);

  return {
    success: true,
    message: translate('tools.steeringGuide.successMessage', lang),
    data: {
      guide: translate('tools.steeringGuide.guide', lang),
      dashboardUrl: context.dashboardUrl
    },
    nextSteps: [
      translate('tools.steeringGuide.nextSteps.proceedIfRequested', lang),
      translate('tools.steeringGuide.nextSteps.createProduct', lang),
      translate('tools.steeringGuide.nextSteps.createTechAndStructure', lang),
      translate('tools.steeringGuide.nextSteps.reference', lang),
      dashboardMessage
    ]
  };
}