import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';

const prompt: Prompt = {
  name: 'request-approval',
  title: 'Request Approval',
  description: 'Initiate approval workflow for spec documents or implementation milestones. Creates formal approval requests that can be tracked and managed.',
  arguments: [
    {
      name: 'specName',
      description: 'Feature name in kebab-case to request approval for',
      required: true
    },
    {
      name: 'documentType',
      description: 'Type of document requesting approval: requirements, design, tasks, or implementation',
      required: true
    },
    {
      name: 'message',
      description: 'Custom message explaining what needs approval and why',
      required: false
    },
    {
      name: 'priority',
      description: 'Priority level: low, medium, or high',
      required: false
    }
  ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
  const { specName, documentType, message, priority } = args;
  
  if (!specName || !documentType) {
    throw new Error('specName and documentType are required arguments');
  }

  const validDocTypes = ['requirements', 'design', 'tasks', 'implementation'];
  if (!validDocTypes.includes(documentType)) {
    throw new Error(`documentType must be one of: ${validDocTypes.join(', ')}`);
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (priority && !validPriorities.includes(priority)) {
    throw new Error(`priority must be one of: ${validPriorities.join(', ')}`);
  }

  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Request approval for the ${documentType} of the "${specName}" feature.

**Context:**
- Project: ${context.projectPath}
- Feature: ${specName}
- Document type: ${documentType}
${message ? `- Message: ${message}` : ''}
${priority ? `- Priority: ${priority}` : ''}
${context.dashboardUrl ? `- Dashboard: ${context.dashboardUrl}` : ''}

**Instructions:**
1. Use the request-approval tool to create a formal approval request
2. The system will generate a unique approval ID for tracking
3. Reviewers can view the request through the dashboard
4. Check approval status using get-approval-status tool

**Approval Workflow:**
- **requirements**: Approval needed before proceeding to design phase
- **design**: Approval needed before creating implementation tasks  
- **tasks**: Approval needed before starting implementation
- **implementation**: Approval needed for completed feature before deployment

**What Gets Reviewed:**
- Document completeness and quality
- Alignment with project goals and constraints
- Technical feasibility and approach
- Resource requirements and timeline
- Risk assessment and mitigation plans

**Best Practices:**
- Provide clear rationale for the approach taken
- Include any assumptions or dependencies
- Highlight any risks or concerns
- Reference relevant steering documents or constraints
- Ensure all template sections are complete

Please create the approval request. Once submitted, stakeholders will be able to review and approve through the dashboard interface.`
      }
    }
  ];

  return messages;
}

export const requestApprovalPrompt: PromptDefinition = {
  prompt,
  handler
};