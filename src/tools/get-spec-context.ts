import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile, access, readdir } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

export const getSpecContextTool: Tool = {
  name: 'get-spec-context',
  description: 'Load specification context documents (requirements.md, design.md, tasks.md) for a specific spec. CRITICAL: DO NOT use during active spec creation workflow if you just created the documents in this conversation. Only use when: 1) Starting fresh on existing spec, 2) Returning to work after conversation break, 3) Implementation phase on existing specs.',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: 'Absolute path to the project root'
      },
      specName: {
        type: 'string',
        description: 'Name of the specification to load context for'
      }
    },
    required: ['projectPath', 'specName']
  }
};

export async function getSpecContextHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, specName } = args;

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
            message: `No specification found for: ${specName}`,
            data: {
              availableSpecs: specNames,
              suggestedSpecs: specNames.slice(0, 3) // Show first 3 as suggestions
            },
            nextSteps: [
              `Available specifications: ${specNames.join(', ')}`,
              'Use one of the available spec names',
              'Or create a new spec using spec-create'
            ]
          };
        }
      } catch {
        // Specs directory doesn't exist
      }

      return {
        success: false,
        message: `No specification found for: ${specName}`,
        nextSteps: [
          'Create a new specification using spec-create command',
          'Check if the spec name is spelled correctly',
          'Verify the project has been set up with spec-steering-setup'
        ]
      };
    }

    const specFiles = [
      { name: 'requirements.md', title: 'Requirements' },
      { name: 'design.md', title: 'Design' },
      { name: 'tasks.md', title: 'Tasks' }
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
        message: `Specification documents for "${specName}" exist but are empty`,
        data: {
          context: `## Specification Context\n\nNo specification documents found for: ${specName}`,
          specName,
          documents: documentStatus
        },
        nextSteps: [
          `Edit the specification documents in .spec-workflow/specs/${specName}/`,
          'Use spec-create to regenerate the specification',
          'Ensure requirements.md, design.md, and tasks.md have content'
        ]
      };
    }

    // Format the complete specification context
    const formattedContext = `## Specification Context (Pre-loaded): ${specName}

${sections.join('\n\n---\n\n')}

**Note**: Specification documents have been pre-loaded. Do not use get-content to fetch them again.`;

    return {
      success: true,
      message: `Specification context loaded successfully for: ${specName}`,
      data: {
        context: formattedContext,
        specName,
        documents: documentStatus,
        sections: sections.length,
        specPath
      },
      nextSteps: [
        'Context loaded - do not call get-spec-context again for this spec',
        'Reference requirements and design when implementing tasks',
        'Follow the task breakdown for systematic implementation'
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
      message: `Failed to load specification context: ${error.message}`,
      nextSteps: [
        'Check if the project path exists',
        'Verify the spec name is correct',
        'Ensure file permissions allow reading',
        'Run spec-create to create the specification if missing'
      ]
    };
  }
}