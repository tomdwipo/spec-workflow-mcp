import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

export const getSteeringContextTool: Tool = {
  name: 'get-steering-context',
  description: 'Load steering documents (product.md, tech.md, structure.md) for project context. Only use if steering context is not already loaded.',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: 'Absolute path to the project root'
      }
    },
    required: ['projectPath']
  }
};

export async function getSteeringContextHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath } = args;

  try {
    const steeringPath = PathUtils.getSteeringPath(projectPath);
    
    // Check if steering directory exists
    try {
      await access(steeringPath, constants.F_OK);
    } catch {
      return {
        success: true,
        message: 'No steering documents found',
        data: {
          context: '## Steering Documents Context\n\nNo steering documents found. Proceed using best practices for the detected technology stack.',
          documents: {
            product: false,
            tech: false,
            structure: false
          }
        },
        nextSteps: [
          'Use best practices and conventions for the detected technology stack',
          'For established codebases: Ask user if they want to create steering documents for project-specific guidance',
          'For new projects: Steering context is typically not needed - proceed with technology best practices'
        ]
      };
    }

    const steeringFiles = [
      { name: 'product.md', title: 'Product Context' },
      { name: 'tech.md', title: 'Technology Context' },
      { name: 'structure.md', title: 'Structure Context' }
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
        message: 'Steering documents exist but are empty',
        data: {
          context: '## Steering Documents Context\n\nSteering documents found but all are empty.',
          documents: documentStatus
        },
        nextSteps: [
          'Use best practices and conventions for the technology stack',
          'For established codebases: Ask user if they want to populate steering documents with project-specific context',
          'For new projects: Empty steering documents are fine - proceed with standard practices'
        ]
      };
    }

    // Format the complete steering context
    const formattedContext = `## Steering Documents Context (Pre-loaded)

${sections.join('\n\n---\n\n')}

**Note**: Steering documents have been pre-loaded. Do not use get-content to fetch them again.`;

    return {
      success: true,
      message: 'Steering context loaded successfully',
      data: {
        context: formattedContext,
        documents: documentStatus,
        sections: sections.length
      },
      nextSteps: [
        'Steering context loaded - do not call get-steering-context again',
        'Reference these standards in requirements, design, and tasks',
        'Ensure all decisions align with documented project vision'
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
      message: `Failed to load steering context: ${error.message}`,
      nextSteps: [
        'Check if the project path exists',
        'Verify file permissions',
        'Run spec-steering-setup if steering documents are missing'
      ]
    };
  }
}