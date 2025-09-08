import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PathUtils } from '../core/path-utils.js';
import { translate } from '../core/i18n.js';

export const createSteeringDocTool: Tool = {
  name: 'create-steering-doc',
  description: translate('tools.createSteeringDoc.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: translate('tools.createSteeringDoc.projectPathDescription')
      },
      document: {
        type: 'string',
        enum: ['product', 'tech', 'structure'],
        description: translate('tools.createSteeringDoc.documentDescription')
      },
      content: {
        type: 'string',
        description: translate('tools.createSteeringDoc.contentDescription')
      }
    },
    required: ['projectPath', 'document', 'content']
  }
};

export async function createSteeringDocHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, document, content } = args;
  const lang = context.lang || 'en';

  try {
    // Ensure steering directory exists
    const steeringDir = join(PathUtils.getWorkflowRoot(projectPath), 'steering');
    await fs.mkdir(steeringDir, { recursive: true });

    // Create the specific document
    const filename = `${document}.md`;
    const filePath = join(steeringDir, filename);
    
    await fs.writeFile(filePath, content, 'utf-8');

    const documentNames: { [key: string]: string } = {
      product: translate('tools.createSteeringDoc.docNames.product', lang),
      tech: translate('tools.createSteeringDoc.docNames.tech', lang),
      structure: translate('tools.createSteeringDoc.docNames.structure', lang)
    };

    const nextStep = document === 'product' ? translate('tools.createSteeringDoc.nextSteps.product', lang) :
                     document === 'tech' ? translate('tools.createSteeringDoc.nextSteps.tech', lang) :
                     translate('tools.createSteeringDoc.nextSteps.structure', lang);

    return {
      success: true,
      message: translate('tools.createSteeringDoc.successMessage', lang, { docName: documentNames[document] }),
      data: {
        document,
        filename,
        filePath,
        contentLength: content.length,
        dashboardUrl: context.dashboardUrl
      },
      nextSteps: [
        translate('tools.createSteeringDoc.nextSteps.saved', lang, { filename }),
        nextStep,
        context.dashboardUrl ? translate('tools.createSteeringDoc.nextSteps.dashboard', lang, { dashboardUrl: context.dashboardUrl }) : translate('tools.createSteeringDoc.nextSteps.dashboardUnavailable', lang)
      ],
      projectContext: {
        projectPath,
        workflowRoot: PathUtils.getWorkflowRoot(projectPath),
        dashboardUrl: context.dashboardUrl
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: translate('tools.createSteeringDoc.errors.failed', lang, { document, message: error.message }),
      nextSteps: [
        translate('tools.createSteeringDoc.errors.nextSteps.checkPath', lang),
        translate('tools.createSteeringDoc.errors.nextSteps.verifyContent', lang),
        translate('tools.createSteeringDoc.errors.nextSteps.retry', lang)
      ]
    };
  }
}