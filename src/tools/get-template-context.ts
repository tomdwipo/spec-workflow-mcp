import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const getTemplateContextTool: Tool = {
  name: 'get-template-context',
  description: 'Load document templates for context optimization',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: 'Absolute path to the project root'
      },
      category: { 
        type: 'string',
        enum: ['spec', 'bug', 'steering', 'all'],
        description: 'Template category to load',
        default: 'all'
      }
    },
    required: ['projectPath']
  }
};

export async function getTemplateContextHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, category = 'all' } = args;

  try {
    const templatesPath = join(__dirname, '..', 'markdown', 'templates');
    
    const templateCategories = {
      spec: [
        { name: 'requirements-template.md', title: 'Requirements Template' },
        { name: 'design-template.md', title: 'Design Template' },
        { name: 'tasks-template.md', title: 'Tasks Template' }
      ],
      bug: [
        { name: 'bug-analysis-template.md', title: 'Bug Analysis Template' },
        { name: 'bug-report-template.md', title: 'Bug Report Template' },
        { name: 'bug-verification-template.md', title: 'Bug Verification Template' }
      ],
      steering: [
        { name: 'product-template.md', title: 'Product Template' },
        { name: 'tech-template.md', title: 'Tech Template' },
        { name: 'structure-template.md', title: 'Structure Template' }
      ]
    };

    let templatesToLoad: Array<{name: string, title: string}> = [];
    
    if (category === 'all') {
      templatesToLoad = [
        ...templateCategories.spec,
        ...templateCategories.bug,
        ...templateCategories.steering
      ];
    } else if (templateCategories[category as keyof typeof templateCategories]) {
      templatesToLoad = templateCategories[category as keyof typeof templateCategories];
    } else {
      return {
        success: false,
        message: `Unknown template category: ${category}`,
        nextSteps: ['Use category: spec, bug, steering, or all']
      };
    }

    const sections: string[] = [];
    const loadedTemplates: string[] = [];

    for (const template of templatesToLoad) {
      try {
        const templatePath = join(templatesPath, template.name);
        const content = await readFile(templatePath, 'utf-8');
        
        if (content && content.trim()) {
          sections.push(`### ${template.title}\n\n${content.trim()}`);
          loadedTemplates.push(template.name);
        }
      } catch (error) {
        // Template doesn't exist, skip
        // Template not found
      }
    }

    if (sections.length === 0) {
      return {
        success: true,
        message: `No templates found for category: ${category}`,
        data: {
          context: `## Templates Context\n\nNo templates found for category: ${category}`,
          category,
          loaded: []
        },
        nextSteps: [
          'Check if the templates directory exists',
          'Verify template files are present'
        ]
      };
    }

    const formattedContext = `## Templates Context (${category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)})

${sections.join('\n\n---\n\n')}

**Note**: Templates have been pre-loaded. Use these structures when creating documents.`;

    return {
      success: true,
      message: `Loaded ${sections.length} template${sections.length !== 1 ? 's' : ''} from ${category} category`,
      data: {
        context: formattedContext,
        category,
        loaded: loadedTemplates,
        count: sections.length
      },
      nextSteps: [
        'Use these templates as structure guides when creating documents',
        'Follow the exact format and sections from the templates',
        'Reference template sections in your document creation'
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
      message: `Failed to load template context: ${error.message}`,
      nextSteps: [
        'Check if the templates directory exists',
        'Verify file permissions',
        'Ensure template files are present'
      ]
    };
  }
}