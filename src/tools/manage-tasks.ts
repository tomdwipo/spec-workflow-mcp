import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse, TaskInfo } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { parseTasksFromMarkdown, updateTaskStatus, findNextPendingTask, getTaskById } from '../core/task-parser.js';

export const manageTasksTool: Tool = {
  name: 'manage-tasks',
  description: `Track and update task implementation progress.

# Instructions
Call during implementation phase only. CRITICAL SEQUENCE: Always set-status to "in-progress" BEFORE writing any code, then to "completed" AFTER implementation. Use "next-pending" to get next task, "context" for full implementation details. One task must be in-progress at all times during implementation.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: 'Absolute path to the project root'
      },
      specName: { 
        type: 'string',
        description: 'Name of the specification'
      },
      action: {
        type: 'string',
        enum: ['list', 'get', 'set-status', 'next-pending', 'context'],
        description: 'Action: list all tasks, get specific task, set task status, get next pending task, or get full implementation context',
        default: 'list'
      },
      taskId: { 
        type: 'string',
        description: 'Specific task ID (required for get, set-status, and context actions)'
      },
      status: {
        type: 'string',
        enum: ['pending', 'in-progress', 'completed'],
        description: 'New task status (required for set-status action)'
      }
    },
    required: ['projectPath', 'specName']
  }
};

export async function manageTasksHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, specName, action = 'list', taskId, status } = args;

  try {
    // Path to tasks.md
    const tasksPath = join(PathUtils.getSpecPath(projectPath, specName), 'tasks.md');
    
    // Read and parse tasks file
    const tasksContent = await readFile(tasksPath, 'utf-8');
    const parseResult = parseTasksFromMarkdown(tasksContent);
    const tasks = parseResult.tasks;
    
    if (tasks.length === 0) {
      return {
        success: true,
        message: 'No tasks found in tasks.md',
        data: { tasks: [] },
        nextSteps: ['Create tasks.md with create-spec-doc']
      };
    }
    
    // Handle different actions
    switch (action) {
      case 'list':
        return {
          success: true,
          message: `Found ${parseResult.summary.total} tasks (${parseResult.summary.completed} completed, ${parseResult.summary.inProgress} in-progress, ${parseResult.summary.pending} pending)`,
          data: { 
            tasks,
            summary: parseResult.summary
          },
          nextSteps: [
            'Use next-pending for next task',
            'Use get with taskId for details',
            'Use set-status to update progress'
          ]
        };
        
      case 'get': {
        if (!taskId) {
          return {
            success: false,
            message: 'Task ID required for get action',
            nextSteps: ['Provide taskId (e.g., "1.1")']
          };
        }
        
        const task = getTaskById(tasks, taskId);
        if (!task) {
          return {
            success: false,
            message: `Task ${taskId} not found`,
            nextSteps: ['Use list to see task IDs']
          };
        }
        
        return {
          success: true,
          message: `Task ${taskId}: ${task.description}`,
          data: { task },
          nextSteps: [
            task.status === 'completed' 
              ? 'Task is already completed' 
              : task.status === 'in-progress'
              ? 'Task in progress'
              : 'Use set-status to mark in-progress',
            'Use context for implementation details'
          ]
        };
      }
        
      case 'next-pending': {
        const nextTask = findNextPendingTask(tasks);
        if (!nextTask) {
          const inProgressTasks = tasks.filter(t => t.status === 'in-progress' && !t.isHeader);
          if (inProgressTasks.length > 0) {
            return {
              success: true,
              message: `No pending tasks. ${inProgressTasks.length} task(s) in progress.`,
              data: { 
                nextTask: null,
                inProgressTasks 
              },
              nextSteps: [
                `Continue: ${inProgressTasks.map(t => t.id).join(', ')}`,
                'Mark completed when done'
              ]
            };
          }
          return {
            success: true,
            message: 'All tasks completed',
            data: { nextTask: null },
            nextSteps: ['Implementation complete', 'Run tests']
          };
        }
        
        return {
          success: true,
          message: `Next pending task: ${nextTask.id} - ${nextTask.description}`,
          data: { nextTask },
          nextSteps: [
            `Set status in-progress for task ${nextTask.id}`,
            `Use context for implementation details`
          ]
        };
      }

      case 'set-status': {
        if (!taskId) {
          return {
            success: false,
            message: 'Task ID required for set-status action',
            nextSteps: ['Provide taskId']
          };
        }

        if (!status) {
          return {
            success: false,
            message: 'Status required for set-status action',
            nextSteps: ['Provide status: pending, in-progress, or completed']
          };
        }

        const taskToUpdate = getTaskById(tasks, taskId);
        if (!taskToUpdate) {
          return {
            success: false,
            message: `Task ${taskId} not found`,
            nextSteps: ['Use list to see task IDs']
          };
        }

        // Update the tasks.md file with new status using unified parser
        const updatedContent = updateTaskStatus(tasksContent, taskId, status);

        if (updatedContent === tasksContent) {
          return {
            success: false,
            message: `Could not find task ${taskId} to update status`,
            nextSteps: [
              'Check task ID in tasks.md',
              'Format: - [ ] 1.1 Task description'
            ]
          };
        }

        await writeFile(tasksPath, updatedContent, 'utf-8');

        
        return {
          success: true,
          message: `Task ${taskId} updated to ${status}`,
          data: { 
            taskId,
            previousStatus: taskToUpdate.status,
            newStatus: status,
            updatedTask: { ...taskToUpdate, status }
          },
          nextSteps: [
            `Status saved`,
            status === 'in-progress' ? 'Begin implementation' : 
            status === 'completed' ? 'Use next-pending for next task' :
            'Task marked pending',
            'Check progress with spec-status'
          ],
          projectContext: {
            projectPath,
            workflowRoot: PathUtils.getWorkflowRoot(projectPath),
            specName,
            currentPhase: 'implementation',
            dashboardUrl: context.dashboardUrl
          }
        };
      }

      case 'context': {
        if (!taskId) {
          return {
            success: false,
            message: 'Task ID required for context action',
            nextSteps: ['Provide taskId for context']
          };
        }
        
        const task = getTaskById(tasks, taskId);
        if (!task) {
          return {
            success: false,
            message: `Task ${taskId} not found`,
            nextSteps: ['Use list to see task IDs']
          };
        }
        
        // Load full spec context
        const specDir = PathUtils.getSpecPath(projectPath, specName);
        let requirementsContext = '';
        let designContext = '';
        
        try {
          const requirementsContent = await readFile(join(specDir, 'requirements.md'), 'utf-8');
          requirementsContext = `## Requirements Context\n${requirementsContent}`;
        } catch {
          // Requirements file doesn't exist or can't be read
        }
        
        try {
          const designContent = await readFile(join(specDir, 'design.md'), 'utf-8');
          designContext = `## Design Context\n${designContent}`;
        } catch {
          // Design file doesn't exist or can't be read
        }

        const fullContext = `# Implementation Context for Task ${taskId}

## Task Details
**ID:** ${task.id}
**Status:** ${task.status}
**Description:** ${task.description}

${task.requirements && task.requirements.length > 0 ? `**Requirements Reference:** ${task.requirements.join(', ')}\n` : ''}
${task.leverage ? `**Leverage Existing:** ${task.leverage}\n` : ''}
${task.implementationDetails && task.implementationDetails.length > 0 ? `**Implementation Notes:**\n${task.implementationDetails.map(d => `- ${d}`).join('\n')}\n` : ''}

---

${requirementsContext}

${requirementsContext && designContext ? '---\n' : ''}

${designContext}

## Next Steps
1. Review the task requirements and design context above
2. ${task.status === 'pending' ? `Mark task as in-progress: manage-tasks with action: "set-status", taskId: "${taskId}", status: "in-progress"` : task.status === 'in-progress' ? 'Continue implementation work' : 'Task is already completed'}
3. Implement the specific functionality described in the task
4. ${task.leverage ? `Leverage the existing code mentioned: ${task.leverage}` : 'Build according to the design patterns'}
5. ${task.status !== 'completed' ? `Mark as completed when finished: manage-tasks with action: "set-status", taskId: "${taskId}", status: "completed"` : ''}
`;
        
        return {
          success: true,
          message: `Implementation context loaded for task ${taskId}`,
          data: { 
            task,
            context: fullContext,
            hasRequirements: requirementsContext !== '',
            hasDesign: designContext !== ''
          },
          nextSteps: [
            'Review context above',
            task.status === 'pending' ? 'Set status to in-progress' : 
            task.status === 'in-progress' ? 'Continue implementation' : 
            'Task completed',
            'Use requirements and design for guidance'
          ]
        };
      }
        
      default:
        return {
          success: false,
          message: `Unknown action: ${action}`,
          nextSteps: ['Use action: list, get, set-status, next-pending, or context']
        };
    }
    
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        success: false,
        message: `tasks.md not found for specification '${specName}'`,
        nextSteps: [
          'Create the tasks document first using create-spec-doc tool',
          'Ensure the specification exists and has completed the tasks phase'
        ]
      };
    }
    
    return {
      success: false,
      message: `Failed to manage tasks: ${error.message}`,
      nextSteps: [
        'Check if the specification exists',
        'Verify file permissions',
        'Ensure tasks.md is properly formatted'
      ]
    };
  }
}

