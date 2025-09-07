import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';

const prompt: Prompt = {
  name: 'manage-tasks',
  title: 'Manage Specification Tasks',
  description: 'Interactive task management for spec-driven development. List, complete, or reset tasks with context about progress and dependencies.',
  arguments: [
    {
      name: 'specName',
      description: 'Feature name in kebab-case to manage tasks for',
      required: true
    },
    {
      name: 'action',
      description: 'Action to perform: list, complete, reset, or status',
      required: true
    },
    {
      name: 'taskId',
      description: 'Specific task ID when completing a task (use with action=complete)',
      required: false
    }
  ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
  const { specName, action, taskId } = args;
  
  if (!specName || !action) {
    throw new Error('specName and action are required arguments');
  }

  const validActions = ['list', 'complete', 'reset', 'status'];
  if (!validActions.includes(action)) {
    throw new Error(`action must be one of: ${validActions.join(', ')}`);
  }

  let actionText = '';
  let instructions = '';

  switch (action) {
    case 'list':
      actionText = 'review and list all tasks';
      instructions = 'Use the manage-tasks tool with action "list" to see all tasks and their current status.';
      break;
    case 'complete':
      actionText = 'mark a task as complete';
      instructions = `Use the manage-tasks tool with action "complete"${taskId ? ` and taskId "${taskId}"` : ' and the specific task ID'} to mark the task as done.`;
      break;
    case 'reset':
      actionText = 'reset task status';
      instructions = 'Use the manage-tasks tool with action "reset" to reset all task statuses back to pending.';
      break;
    case 'status':
      actionText = 'check overall task status';
      instructions = 'Use the manage-tasks tool with action "status" to get a summary of task completion progress.';
      break;
  }

  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} for the "${specName}" feature.

**Context:**
- Project: ${context.projectPath}
- Feature: ${specName}
- Action: ${action}
${taskId ? `- Task ID: ${taskId}` : ''}
${context.dashboardUrl ? `- Dashboard: ${context.dashboardUrl}` : ''}

**Instructions:**
${instructions}

**Task Management Guidelines:**
- Tasks should be completed in logical order based on dependencies
- Mark tasks as complete only when they are fully implemented and tested
- Use the dashboard to track progress visually
- Consider requesting approval for major milestones

**Available Actions:**
- **list**: Show all tasks with their current completion status
- **complete**: Mark a specific task as complete (requires taskId)
- **reset**: Reset all tasks back to pending status  
- **status**: Get overall progress summary

Please ${actionText} and provide a summary of the current state.`
      }
    }
  ];

  return messages;
}

export const manageTasksPrompt: PromptDefinition = {
  prompt,
  handler
};