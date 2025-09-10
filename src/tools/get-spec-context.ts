import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile, access, readdir } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

export const getSpecContextTool: Tool = {
  name: 'get-spec-context',
  description: `Load existing spec documents for resumed work.

# Instructions
Call ONLY when returning to work on existing specs after a break or starting fresh on a spec you didn't create. Never use during active spec creation if you just created the documents. Loads requirements.md, design.md, and tasks.md for implementation context.`,
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
              `Available specs: ${specNames.join(', ')}`,
              'Use an existing spec name',
              'Or create new with create-spec-doc'
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
          'Create spec with create-spec-doc',
          'Check spec name spelling',
          'Verify project setup'
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
          `Add content to .spec-workflow/specs/${specName}/`,
          'Create missing documents',
          'Ensure all three docs have content'
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
        'Context loaded - proceed with implementation',
        'Reference requirements and design for each task',
        'Update task status with manage-tasks'
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
        'Check project path',
        'Verify spec name',
        'Check file permissions',
        'Create spec if missing'
      ]
    };
  }
}