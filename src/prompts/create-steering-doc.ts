import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';

const prompt: Prompt = {
  name: 'create-steering-doc',
  title: 'Create Steering Document',
  description: 'Create steering documents that provide high-level guidance and constraints for AI agents working on spec implementation. These documents help maintain consistency and quality.',
  arguments: [
    {
      name: 'specName',
      description: 'Feature name in kebab-case that this steering doc applies to',
      required: true
    },
    {
      name: 'docType',
      description: 'Type of steering document: implementation-guide, review-checklist, or constraints',
      required: true
    },
    {
      name: 'scope',
      description: 'Scope of the steering document (e.g., frontend, backend, full-stack)',
      required: false
    }
  ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
  const { specName, docType, scope } = args;
  
  if (!specName || !docType) {
    throw new Error('specName and docType are required arguments');
  }

  const validDocTypes = ['implementation-guide', 'review-checklist', 'constraints'];
  if (!validDocTypes.includes(docType)) {
    throw new Error(`docType must be one of: ${validDocTypes.join(', ')}`);
  }

  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Create a ${docType} steering document for the "${specName}" feature.

**Context:**
- Project: ${context.projectPath}
- Feature: ${specName}
- Steering document type: ${docType}
${scope ? `- Scope: ${scope}` : ''}
${context.dashboardUrl ? `- Dashboard: ${context.dashboardUrl}` : ''}

**Instructions:**
1. First, use the get-steering-context tool to understand existing steering documents and patterns
2. Use the create-steering-doc tool to create the appropriate steering document
3. Ensure the document provides clear, actionable guidance for AI agents

**Steering Document Types:**
- **implementation-guide**: Provides step-by-step guidance for implementing the spec
- **review-checklist**: Lists quality gates and review criteria  
- **constraints**: Defines technical and business constraints that must be respected

**Key Principles:**
- Be specific and actionable
- Include examples where helpful
- Reference relevant spec sections
- Consider both technical and business requirements
- Provide clear success criteria

Please create a comprehensive ${docType} document that will help ensure high-quality implementation of this feature.`
      }
    }
  ];

  return messages;
}

export const createSteeringDocPrompt: PromptDefinition = {
  prompt,
  handler
};