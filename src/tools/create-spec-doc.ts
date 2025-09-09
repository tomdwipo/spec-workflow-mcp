import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PathUtils } from '../core/path-utils.js';

export const createSpecDocTool: Tool = {
  name: 'create-spec-doc',
  description: `Create or update spec documents following the workflow sequence.

# Instructions
Call AFTER loading templates and generating content for each phase. Creates one document at a time: first requirements, then design, then tasks. Never create multiple documents without user approval between each. Always follow template structure from get-template-context.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Absolute path to the project root'
      },
      specName: {
        type: 'string',
        pattern: '^[a-z][a-z0-9-]*$',
        description: 'Feature name in kebab-case (e.g., user-authentication)'
      },
      document: {
        type: 'string',
        enum: ['requirements', 'design', 'tasks'],
        description: 'Which spec document to create/update: requirements, design, or tasks'
      },
      content: {
        type: 'string',
        description: 'The complete markdown content for the spec document'
      }
    },
    required: ['projectPath', 'specName', 'document', 'content']
  }
};

export async function createSpecDocHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, specName, document, content } = args;

  try {
    const specDir = PathUtils.getSpecPath(projectPath, specName);
    await fs.mkdir(specDir, { recursive: true });

    // Check workflow order - prevent creating documents out of sequence
    const requirementsPath = join(specDir, 'requirements.md');
    const designPath = join(specDir, 'design.md');
    
    // Enforce workflow order
    if (document === 'design') {
      try {
        await fs.access(requirementsPath);
      } catch {
        return {
          success: false,
          message: `WORKFLOW VIOLATION: Cannot create design.md before requirements.md exists!
Create requirements.md first, get user review, then create design.md.`
        };
      }
    }
    
    if (document === 'tasks') {
      try {
        await fs.access(designPath);
      } catch {
        return {
          success: false,
          message: `WORKFLOW VIOLATION: Cannot create tasks.md before design.md exists!
Create design.md first, get user review, then create tasks.md.`
        };
      }
    }

    // Create/update the document
    const filename = `${document}.md`;
    const filePath = join(specDir, filename);
    await fs.writeFile(filePath, content, 'utf-8');

    // Return concise, directive message
    return {
      success: true,
      message: `Created ${filename} at: ${PathUtils.toUnixPath(filePath)}

BLOCKING: Must request approval via dashboard or VS Code extension.
VERBAL APPROVAL NOT ACCEPTED.
Do NOT proceed until system shows approved status.`,
      data: {
        specName,
        document,
        filePath: PathUtils.toUnixPath(filePath)
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Failed: ${error.message}`
    };
  }
}