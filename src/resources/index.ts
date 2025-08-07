import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

export function registerResources(projectPath: string): Resource[] {
  const workflowRoot = PathUtils.getWorkflowRoot(projectPath);
  
  return [
    {
      uri: `file://${workflowRoot}/templates/requirements-template.md`,
      name: 'Requirements Template',
      description: 'Template for creating feature requirements documents',
      mimeType: 'text/markdown'
    },
    {
      uri: `file://${workflowRoot}/templates/design-template.md`,
      name: 'Design Template',
      description: 'Template for creating technical design documents',
      mimeType: 'text/markdown'
    },
    {
      uri: `file://${workflowRoot}/templates/tasks-template.md`,
      name: 'Tasks Template',
      description: 'Template for creating task breakdown documents',
      mimeType: 'text/markdown'
    },
    {
      uri: `file://${workflowRoot}/steering/product.md`,
      name: 'Product Steering Document',
      description: 'Product vision and goals for the project',
      mimeType: 'text/markdown'
    },
    {
      uri: `file://${workflowRoot}/steering/tech.md`,
      name: 'Tech Steering Document',
      description: 'Technical standards and conventions',
      mimeType: 'text/markdown'
    },
    {
      uri: `file://${workflowRoot}/steering/structure.md`,
      name: 'Structure Steering Document',
      description: 'Project structure and organization guidelines',
      mimeType: 'text/markdown'
    }
  ];
}

export async function handleResourceOperation(uri: string, projectPath: string): Promise<any> {
  try {
    // Extract file path from URI
    const filePath = uri.replace('file://', '');
    const content = await readFile(filePath, 'utf-8');
    
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: content
        }
      ]
    };
  } catch (error: any) {
    throw new Error(`Failed to read resource: ${error.message}`);
  }
}