import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PathUtils } from '../core/path-utils.js';

export const createSteeringDocTool: Tool = {
  name: 'create-steering-doc',
  description: 'Create a specific steering document (product.md, tech.md, or structure.md) with the provided content. Use ONLY when user explicitly requests steering document creation. NOT automatically required.',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Absolute path to the project root'
      },
      document: {
        type: 'string',
        enum: ['product', 'tech', 'structure'],
        description: 'Which steering document to create: product, tech, or structure'
      },
      content: {
        type: 'string',
        description: 'The complete markdown content for the steering document'
      }
    },
    required: ['projectPath', 'document', 'content']
  }
};

export async function createSteeringDocHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, document, content } = args;

  try {
    // Ensure steering directory exists
    const steeringDir = join(PathUtils.getWorkflowRoot(projectPath), 'steering');
    await fs.mkdir(steeringDir, { recursive: true });

    // Create the specific document
    const filename = `${document}.md`;
    const filePath = join(steeringDir, filename);
    
    await fs.writeFile(filePath, content, 'utf-8');

    const documentNames = {
      product: 'Product Steering',
      tech: 'Technical Steering', 
      structure: 'Structure Steering'
    };

    return {
      success: true,
      message: `${documentNames[document as keyof typeof documentNames]} document created successfully`,
      data: {
        document,
        filename,
        filePath,
        contentLength: content.length,
        dashboardUrl: context.dashboardUrl
      },
      nextSteps: [
        `${documentNames[document as keyof typeof documentNames]} document saved to ${filename}`,
        document === 'product' ? 'Next: Create tech.md with technical architecture and standards' : 
        document === 'tech' ? 'Next: Create structure.md with project organization and workflow' :
        'All steering documents complete! Request approval with request-approval tool',
        `Monitor progress on dashboard: ${context.dashboardUrl}`
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
      message: `Failed to create ${document} steering document: ${error.message}`,
      nextSteps: [
        'Check that the project path exists and is writable',
        'Ensure the content is valid markdown',
        'Try the request again with correct parameters'
      ]
    };
  }
}