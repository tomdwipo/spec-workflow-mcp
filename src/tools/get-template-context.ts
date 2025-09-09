import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const getTemplateContextTool: Tool = {
  name: 'get-template-context',
  description: `Load a specific document template for spec or steering documents.

# Instructions
Call with the exact template needed for your current phase. For spec workflow, request requirements, design, or tasks templates. For steering documents, request product, tech, or structure templates. Each template provides the exact format expected by create-spec-doc or create-steering-doc tools.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: 'Absolute path to the project root'
      },
      templateType: { 
        type: 'string',
        enum: ['spec', 'steering'],
        description: 'Type of template: spec for workflow templates, steering for project docs'
      },
      template: {
        type: 'string',
        enum: ['requirements', 'design', 'tasks', 'product', 'tech', 'structure'],
        description: 'Specific template to load'
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

  try {
    const templatesPath = join(__dirname, '..', 'markdown', 'templates');
    
    // Define template mappings
    const templateMap = {
      spec: {
        requirements: { file: 'requirements-template.md', title: 'Requirements Template' },
        design: { file: 'design-template.md', title: 'Design Template' },
        tasks: { file: 'tasks-template.md', title: 'Tasks Template' }
      },
      steering: {
        product: { file: 'product-template.md', title: 'Product Template' },
        tech: { file: 'tech-template.md', title: 'Tech Template' },
        structure: { file: 'structure-template.md', title: 'Structure Template' }
      }
    };

    // Validate template/type combination
    if (!templateMap[templateType]) {
      return {
        success: false,
        message: `Invalid template type: ${templateType}`,
        nextSteps: ['Use: spec or steering']
      };
    }

    const templateGroup = templateMap[templateType] as any;
    if (!templateGroup[template]) {
      const validTemplates = Object.keys(templateGroup).join(', ');
      return {
        success: false,
        message: `Invalid template "${template}" for type "${templateType}"`,
        nextSteps: [
          `Valid templates: ${validTemplates}`,
          templateType === 'spec' 
            ? 'Use: requirements, design, or tasks'
            : 'Use: product, tech, or structure'
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
          message: `Template file exists but is empty: ${templateInfo.file}`,
          data: {
            templateType,
            template,
            loaded: false
          },
          nextSteps: [
            'Check template file content',
            'Verify file integrity'
          ]
        };
      }

      const formattedContext = `## ${templateInfo.title}

${content.trim()}

**Note**: Template loaded. Use this structure when creating your ${template} document.`;

      return {
        success: true,
        message: `Loaded ${template} template for ${templateType}`,
        data: {
          context: formattedContext,
          templateType,
          template,
          loaded: templateInfo.file
        },
        nextSteps: [
          `Use template for ${template} document`,
          'Follow template structure exactly',
          templateType === 'spec'
            ? `Next: create-spec-doc with document: "${template}"`
            : `Next: create-steering-doc with document: "${template}"`
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
        message: `Template file not found: ${templateInfo.file}`,
        data: {
          templateType,
          template,
          loaded: false
        },
        nextSteps: [
          'Check templates directory',
          'Verify template file exists',
          `Location: ${join(templatesPath, templateInfo.file)}`
        ]
      };
    }
    
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to load template context: ${error.message}`,
      nextSteps: [
        'Check templates directory',
        'Verify file permissions',
        'Check template files'
      ]
    };
  }
}