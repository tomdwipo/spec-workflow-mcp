import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PathUtils } from '../core/path-utils.js';
import { translate } from '../core/i18n.js';

export const createSpecDocTool: Tool = {
  name: 'create-spec-doc',
  description: translate('tools.createSpecDoc.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: translate('tools.createSpecDoc.projectPathDescription')
      },
      specName: {
        type: 'string',
        pattern: '^[a-z][a-z0-9-]*$',
        description: translate('tools.createSpecDoc.specNameDescription')
      },
      document: {
        type: 'string',
        enum: ['requirements', 'design', 'tasks'],
        description: translate('tools.createSpecDoc.documentDescription')
      },
      content: {
        type: 'string',
        description: translate('tools.createSpecDoc.contentDescription')
      }
    },
    required: ['projectPath', 'specName', 'document', 'content']
  }
};

export async function createSpecDocHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, specName, document, content } = args;
  const lang = context.lang || 'en';

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
          message: translate('tools.createSpecDoc.errors.designBeforeReq', lang)
        };
      }
    }
    
    if (document === 'tasks') {
      try {
        await fs.access(designPath);
      } catch {
        return {
          success: false,
          message: translate('tools.createSpecDoc.errors.tasksBeforeDesign', lang)
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
      message: translate('tools.createSpecDoc.successMessage', lang, { filename, filePath: PathUtils.toUnixPath(filePath) }),
      data: {
        specName,
        document,
        filePath: PathUtils.toUnixPath(filePath)
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: translate('tools.createSpecDoc.errors.failed', lang, { message: error.message })
    };
  }
}