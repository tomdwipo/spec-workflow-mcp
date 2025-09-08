import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { translate } from '../core/i18n.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const getTemplateContextTool: Tool = {
  name: 'get-template-context',
  description: translate('tools.getTemplateContext.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: translate('tools.getTemplateContext.projectPathDescription')
      },
      templateType: { 
        type: 'string',
        enum: ['spec', 'steering'],
        description: translate('tools.getTemplateContext.templateTypeDescription')
      },
      template: {
        type: 'string',
        enum: ['requirements', 'design', 'tasks', 'product', 'tech', 'structure'],
        description: translate('tools.getTemplateContext.templateDescription')
      }
    },
    required: ['projectPath', 'templateType', 'template']
  }
};

export async function getTemplateContextHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, templateType, template } = args as {
    projectPath: string;
    templateType: 'spec' | 'steering';
    template: 'requirements' | 'design' | 'tasks' | 'product' | 'tech' | 'structure';
  };
  const lang = context.lang || 'en';

  try {
    const templatesPath = join(__dirname, '..', 'markdown', 'templates');
    
    // Define template mappings
    const templateMap = {
      spec: {
        requirements: { file: 'requirements-template.md', title: translate('tools.getTemplateContext.docTitles.requirements', lang) },
        design: { file: 'design-template.md', title: translate('tools.getTemplateContext.docTitles.design', lang) },
        tasks: { file: 'tasks-template.md', title: translate('tools.getTemplateContext.docTitles.tasks', lang) }
      },
      steering: {
        product: { file: 'product-template.md', title: translate('tools.getTemplateContext.docTitles.product', lang) },
        tech: { file: 'tech-template.md', title: translate('tools.getTemplateContext.docTitles.tech', lang) },
        structure: { file: 'structure-template.md', title: translate('tools.getTemplateContext.docTitles.structure', lang) }
      }
    };

    // Validate template/type combination
    if (!templateMap[templateType]) {
      return {
        success: false,
        message: translate('tools.getTemplateContext.errors.invalidType', lang, { templateType }),
        nextSteps: [translate('tools.getTemplateContext.errors.validTypes', lang)]
      };
    }

    const templateGroup = templateMap[templateType] as any;
    if (!templateGroup[template]) {
      const validTemplates = Object.keys(templateGroup).join(', ');
      const validTemplatesForType = templateType === 'spec'
        ? translate('tools.getTemplateContext.errors.validSpecTemplates', lang)
        : translate('tools.getTemplateContext.errors.validSteeringTemplates', lang);
      return {
        success: false,
        message: translate('tools.getTemplateContext.errors.invalidTemplateForType', lang, { template, templateType }),
        nextSteps: [
          translate('tools.getTemplateContext.errors.validTemplates', lang, { validTemplates }),
          validTemplatesForType
        ]
      };
    }

    const templateInfo = templateGroup[template];

    // Load the specific template
    try {
      const templatePath = join(templatesPath, templateInfo.file);
      const content = await readFile(templatePath, 'utf-8');
      
      if (!content || !content.trim()) {
        return {
          success: false,
          message: translate('tools.getTemplateContext.errors.templateEmpty', lang, { file: templateInfo.file }),
          data: {
            templateType,
            template,
            loaded: false
          },
          nextSteps: [
            translate('tools.getTemplateContext.errors.nextSteps.checkContent', lang),
            translate('tools.getTemplateContext.errors.nextSteps.verifyIntegrity', lang)
          ]
        };
      }

      const formattedContext = translate('tools.getTemplateContext.messages.fullContext', lang, { title: templateInfo.title, content: content.trim(), template });

      return {
        success: true,
        message: translate('tools.getTemplateContext.successMessage', lang, { template, templateType }),
        data: {
          context: formattedContext,
          templateType,
          template,
          loaded: templateInfo.file
        },
        nextSteps: [
          translate('tools.getTemplateContext.nextSteps.success.useTemplate', lang, { template }),
          translate('tools.getTemplateContext.nextSteps.success.followStructure', lang),
          templateType === 'spec'
            ? translate('tools.getTemplateContext.nextSteps.success.nextSpec', lang, { template })
            : translate('tools.getTemplateContext.nextSteps.success.nextSteering', lang, { template })
        ],
        projectContext: {
          projectPath,
          workflowRoot: PathUtils.getWorkflowRoot(projectPath),
          dashboardUrl: context.dashboardUrl
        }
      };
    } catch (error) {
      return {
        success: false,
        message: translate('tools.getTemplateContext.errors.fileNotFound', lang, { file: templateInfo.file }),
        data: {
          templateType,
          template,
          loaded: false
        },
        nextSteps: [
          translate('tools.getTemplateContext.errors.nextSteps.checkDirectory', lang),
          translate('tools.getTemplateContext.errors.nextSteps.verifyExists', lang),
          translate('tools.getTemplateContext.errors.nextSteps.location', lang, { location: join(templatesPath, templateInfo.file) })
        ]
      };
    }
    
  } catch (error: any) {
    return {
      success: false,
      message: translate('tools.getTemplateContext.errors.genericFail', lang, { message: error.message }),
      nextSteps: [
        translate('tools.getTemplateContext.errors.nextSteps.checkDirectory', lang),
        translate('tools.getTemplateContext.errors.nextSteps.checkPermissions', lang),
        translate('tools.getTemplateContext.errors.nextSteps.checkFiles', lang)
      ]
    };
  }
}