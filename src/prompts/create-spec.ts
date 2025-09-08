import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';

const prompt: Prompt = {
  name: 'create-spec',
  title: 'Create Specification Document',
  description: 'Interactive workflow for creating spec documents (requirements, design, or tasks). Guides you through the spec-driven development process with contextual templates and best practices.',
  arguments: [
    {
      name: 'specName',
      description: 'Feature name in kebab-case (e.g., user-authentication, data-export)',
      required: true
    },
    {
      name: 'documentType', 
      description: 'Type of document to create: requirements, design, or tasks',
      required: true
    },
    {
      name: 'description',
      description: 'Brief description of what this spec should accomplish',
      required: false
    }
  ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
  const { specName, documentType, description } = args;
  
  if (!specName || !documentType) {
    throw new Error('specName and documentType are required arguments');
  }

  const validDocTypes = ['requirements', 'design', 'tasks'];
  if (!validDocTypes.includes(documentType)) {
    throw new Error(`documentType must be one of: ${validDocTypes.join(', ')}`);
  }

  // Build context-aware messages
  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Create a ${documentType} document for the "${specName}" feature using the spec-workflow methodology.

**Context:**
- Project: ${context.projectPath}
- Feature: ${specName}
- Document type: ${documentType}
${description ? `- Description: ${description}` : ''}
${context.dashboardUrl ? `- Dashboard: ${context.dashboardUrl}` : ''}

**Instructions:**
1. First, use the get-template-context tool to load the ${documentType} template
2. Follow the template structure exactly - this ensures consistency across the project
3. Create comprehensive content that follows spec-driven development best practices
4. Include all required sections from the template
5. Use clear, actionable language
6. After creating the document, use the create-spec-doc tool to save it

**Workflow Guidelines:**
- Requirements documents define WHAT needs to be built
- Design documents define HOW it will be built  
- Tasks documents break down implementation into actionable steps
- Each document builds upon the previous one in sequence

Please start by loading the ${documentType} template and then create the comprehensive document.`
      }
    }
  ];

  return messages;
}

export const createSpecPrompt: PromptDefinition = {
  prompt,
  handler
};