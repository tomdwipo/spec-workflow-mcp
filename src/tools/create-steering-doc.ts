import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PathUtils } from '../core/path-utils.js';

export const createSteeringDocTool: Tool = {
  name: 'create-steering-doc',
  description: `Create project steering documents with architectural guidance.

# Instructions
Call ONLY after user explicitly approves steering document creation. Not required for spec workflow. Creates one of: product.md (vision/goals), tech.md (technical decisions), or structure.md (codebase organization). Use steering-guide first for templates.`,
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
        `Saved ${filename}`,
        document === 'product' ? 'Next: Create tech.md' : 
        document === 'tech' ? 'Next: Create structure.md' :
        'Steering complete. Use request-approval with category:"steering" and categoryName:"steering"',
        context.dashboardUrl ? `Dashboard: ${context.dashboardUrl}` : 'Dashboard not available'
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
        'Check project path exists',
        'Verify markdown content',
        'Retry with correct parameters'
      ]
    };
  }
}