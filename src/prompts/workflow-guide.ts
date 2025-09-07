import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';

const prompt: Prompt = {
  name: 'workflow-guide',
  title: 'Spec Workflow Interactive Guide',
  description: 'Interactive guide for the spec-driven development workflow. Provides contextual guidance, best practices, and next steps based on current project state.',
  arguments: [
    {
      name: 'step',
      description: 'Specific workflow step to get guidance for: planning, design, implementation, review, or overview',
      required: false
    },
    {
      name: 'interactive',
      description: 'Enable interactive mode for step-by-step guidance',
      required: false
    }
  ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
  const { step, interactive } = args;

  const validSteps = ['planning', 'design', 'implementation', 'review', 'overview'];
  if (step && !validSteps.includes(step)) {
    throw new Error(`step must be one of: ${validSteps.join(', ')}`);
  }

  const targetStep = step || 'overview';
  const isInteractive = interactive === true || interactive === 'true';

  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Get ${isInteractive ? 'interactive' : 'informational'} guidance for the ${targetStep} phase of spec-driven development.

**Context:**
- Project: ${context.projectPath}
- Focus: ${targetStep} phase
- Mode: ${isInteractive ? 'Interactive guidance' : 'Information only'}
${context.dashboardUrl ? `- Dashboard: ${context.dashboardUrl}` : ''}

**Instructions:**
1. Use the spec-workflow-guide tool to get comprehensive workflow guidance
2. Review current project state to provide contextual recommendations
${isInteractive ? '3. Provide step-by-step actionable guidance for the current phase' : ''}

**Spec-Driven Development Workflow:**

**1. Planning Phase**
- Define requirements clearly and completely
- Identify stakeholders and success criteria
- Create requirements document using templates
- Request approval before proceeding to design

**2. Design Phase** 
- Create technical design based on approved requirements
- Define architecture, interfaces, and implementation approach
- Address non-functional requirements and constraints
- Request approval before creating implementation tasks

**3. Implementation Phase**
- Break down design into specific, actionable tasks
- Create task document with clear acceptance criteria
- Use steering documents to guide implementation quality
- Track progress and mark tasks complete as work is done

**4. Review Phase**
- Request approval for completed implementation
- Conduct quality review against requirements and design
- Address any feedback or requested changes
- Ensure all tasks are complete and tested

**Tools Available:**
- create-spec: Create requirements, design, or task documents
- create-steering-doc: Create implementation guidance documents
- manage-tasks: Track and update task completion
- request-approval: Submit work for stakeholder review
- spec-status: Check progress and current state

${isInteractive ? `**Interactive Mode:**
I'll provide step-by-step guidance tailored to your project's current state, including:
- What to do next based on existing documents
- Which tools to use for each step
- Best practices and quality checks
- Common pitfalls to avoid` : ''}

Please provide guidance for the ${targetStep} phase and help me understand the next steps.`
      }
    }
  ];

  return messages;
}

export const workflowGuidePrompt: PromptDefinition = {
  prompt,
  handler
};