import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile, access, readdir } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import { translate } from '../core/i18n.js';

export const getSpecContextTool: Tool = {
  name: 'get-spec-context',
  description: translate('tools.getSpecContext.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: translate('tools.getSpecContext.projectPathDescription')
      },
      specName: {
        type: 'string',
        description: translate('tools.getSpecContext.specNameDescription')
      }
    },
    required: ['projectPath', 'specName']
  }
};

export async function getSpecContextHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, specName } = args;
  const lang = context.lang || 'en';

  try {
    const specPath = PathUtils.getSpecPath(projectPath, specName);
    
    // Check if spec directory exists
    try {
      await access(specPath, constants.F_OK);
    } catch {
      // Check if there are any specs at all to suggest alternatives
      const specsRoot = PathUtils.getSpecPath(projectPath, '');
      try {
        await access(specsRoot, constants.F_OK);
        const availableSpecs = await readdir(specsRoot, { withFileTypes: true });
        const specNames = availableSpecs
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        if (specNames.length > 0) {
          return {
            success: false,
            message: translate('tools.getSpecContext.errors.notFound', lang, { specName }),
            data: {
              availableSpecs: specNames,
              suggestedSpecs: specNames.slice(0, 3) // Show first 3 as suggestions
            },
            nextSteps: [
              translate('tools.getSpecContext.errors.availableSpecs', lang, { specs: specNames.join(', ') }),
              translate('tools.getSpecContext.errors.nextSteps.useExisting', lang),
              translate('tools.getSpecContext.errors.nextSteps.createNew', lang)
            ]
          };
        }
      } catch {
        // Specs directory doesn't exist
      }

      return {
        success: false,
        message: translate('tools.getSpecContext.errors.notFound', lang, { specName }),
        nextSteps: [
          translate('tools.getSpecContext.errors.nextSteps.create', lang),
          translate('tools.getSpecContext.errors.nextSteps.checkSpelling', lang),
          translate('tools.getSpecContext.errors.nextSteps.verifySetup', lang)
        ]
      };
    }

    const specFiles = [
      { name: 'requirements.md', title: translate('tools.getSpecContext.docTitles.requirements', lang) },
      { name: 'design.md', title: translate('tools.getSpecContext.docTitles.design', lang) },
      { name: 'tasks.md', title: translate('tools.getSpecContext.docTitles.tasks', lang) }
    ];

    const sections: string[] = [];
    const documentStatus = { requirements: false, design: false, tasks: false };
    let hasContent = false;

    for (const file of specFiles) {
      const filePath = join(specPath, file.name);
      
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
        message: translate('tools.getSpecContext.messages.emptyDocs', lang, { specName }),
        data: {
          context: translate('tools.getSpecContext.messages.emptyContext', lang, { specName }),
          specName,
          documents: documentStatus
        },
        nextSteps: [
          translate('tools.getSpecContext.nextSteps.empty.addContent', lang, { specName }),
          translate('tools.getSpecContext.nextSteps.empty.createMissing', lang),
          translate('tools.getSpecContext.nextSteps.empty.ensureContent', lang)
        ]
      };
    }

    // Format the complete specification context
    const formattedContext = translate('tools.getSpecContext.messages.fullContext', lang, { specName, sections: sections.join('\n\n---\n\n') });

    return {
      success: true,
      message: translate('tools.getSpecContext.successMessage', lang, { specName }),
      data: {
        context: formattedContext,
        specName,
        documents: documentStatus,
        sections: sections.length,
        specPath
      },
      nextSteps: [
        translate('tools.getSpecContext.nextSteps.success.proceed', lang),
        translate('tools.getSpecContext.nextSteps.success.reference', lang),
        translate('tools.getSpecContext.nextSteps.success.updateStatus', lang)
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
      message: translate('tools.getSpecContext.errors.genericFail', lang, { message: error.message }),
      nextSteps: [
        translate('tools.getSpecContext.errors.nextSteps.checkPath', lang),
        translate('tools.getSpecContext.errors.nextSteps.verifyName', lang),
        translate('tools.getSpecContext.errors.nextSteps.checkPermissions', lang),
        translate('tools.getSpecContext.errors.nextSteps.createIfMissing', lang)
      ]
    };
  }
}