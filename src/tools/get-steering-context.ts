import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import { translate } from '../core/i18n.js';

export const getSteeringContextTool: Tool = {
  name: 'get-steering-context',
  description: translate('tools.getSteeringContext.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: translate('tools.getSteeringContext.projectPathDescription')
      }
    },
    required: ['projectPath']
  }
};

export async function getSteeringContextHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath } = args;
  const lang = context.lang || 'en';

  try {
    const steeringPath = PathUtils.getSteeringPath(projectPath);
    
    // Check if steering directory exists
    try {
      await access(steeringPath, constants.F_OK);
    } catch {
      return {
        success: true,
        message: translate('tools.getSteeringContext.messages.notFound', lang),
        data: {
          context: translate('tools.getSteeringContext.messages.notFoundContext', lang),
          documents: {
            product: false,
            tech: false,
            structure: false
          }
        },
        nextSteps: [
          translate('tools.getSteeringContext.nextSteps.notFound.useBestPractices', lang),
          translate('tools.getSteeringContext.nextSteps.notFound.askToCreate', lang),
          translate('tools.getSteeringContext.nextSteps.notFound.newProjectNote', lang)
        ]
      };
    }

    const steeringFiles = [
      { name: 'product.md', title: translate('tools.getSteeringContext.docTitles.product', lang) },
      { name: 'tech.md', title: translate('tools.getSteeringContext.docTitles.tech', lang) },
      { name: 'structure.md', title: translate('tools.getSteeringContext.docTitles.structure', lang) }
    ];

    const sections: string[] = [];
    const documentStatus = { product: false, tech: false, structure: false };
    let hasContent = false;

    for (const file of steeringFiles) {
      const filePath = join(steeringPath, file.name);
      
      try {
        await access(filePath, constants.F_OK);
        const content = await readFile(filePath, 'utf-8');
        
        if (content && content.trim()) {
          sections.push(`### ${file.title}\n${content.trim()}`);
          hasContent = true;
          
          // Update status
          const docName = file.name.replace('.md', '') as keyof typeof documentStatus;
          documentStatus[docName] = true;
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    if (!hasContent) {
      return {
        success: true,
        message: translate('tools.getSteeringContext.messages.emptyDocs', lang),
        data: {
          context: translate('tools.getSteeringContext.messages.emptyContext', lang),
          documents: documentStatus
        },
        nextSteps: [
          translate('tools.getSteeringContext.nextSteps.empty.useBestPractices', lang),
          translate('tools.getSteeringContext.nextSteps.empty.askToPopulate', lang),
          translate('tools.getSteeringContext.nextSteps.empty.newProjectNote', lang)
        ]
      };
    }

    // Format the complete steering context
    const formattedContext = translate('tools.getSteeringContext.messages.fullContext', lang, { sections: sections.join('\n\n---\n\n') });

    return {
      success: true,
      message: translate('tools.getSteeringContext.successMessage', lang),
      data: {
        context: formattedContext,
        documents: documentStatus,
        sections: sections.length
      },
      nextSteps: [
        translate('tools.getSteeringContext.nextSteps.success.doNotCallAgain', lang),
        translate('tools.getSteeringContext.nextSteps.success.reference', lang),
        translate('tools.getSteeringContext.nextSteps.success.align', lang)
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
      message: translate('tools.getSteeringContext.errors.genericFail', lang, { message: error.message }),
      nextSteps: [
        translate('tools.getSteeringContext.errors.nextSteps.checkPath', lang),
        translate('tools.getSteeringContext.errors.nextSteps.checkPermissions', lang),
        translate('tools.getSteeringContext.errors.nextSteps.runSetup', lang)
      ]
    };
  }
}