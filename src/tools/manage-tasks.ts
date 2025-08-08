import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse, TaskInfo } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { parseTasksFromMarkdown, updateTaskStatus, findNextPendingTask, getTaskById } from '../core/task-parser.js';

export const manageTasksTool: Tool = {
  name: 'manage-tasks',
  description: 'Task management for spec implementation. REQUIRED SEQUENCE: First mark task as in-progress, then implement, finally mark as completed. ALWAYS update status to in-progress before starting work. Implementation workflow: set-status (in-progress) → code → set-status (completed). Status markers: [] = pending, [-] = in-progress, [x] = completed',
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
        nextSteps: ['Create tasks using the create-spec-doc tool with document: "tasks"']
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
            'Use action: "next-pending" to get the next task to work on',
            'Use action: "get" with taskId to view specific task details',
            'Use action: "set-status" to update task progress'
          ]
        };
        
      case 'get': {
        if (!taskId) {
          return {
            success: false,
            message: 'Task ID required for get action',
            nextSteps: ['Provide a taskId parameter (e.g., "1.1", "2.3")']
          };
        }
        
        const task = getTaskById(tasks, taskId);
        if (!task) {
          return {
            success: false,
            message: `Task ${taskId} not found`,
            nextSteps: ['Use action: "list" to see available task IDs']
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
              ? 'Task is currently in progress'
              : 'Use action: "set-status" to mark as in-progress when starting work',
            'Use action: "context" to get full implementation context for this task'
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
                `Continue working on in-progress tasks: ${inProgressTasks.map(t => t.id).join(', ')}`,
                'Mark in-progress tasks as completed when finished'
              ]
            };
          }
          return {
            success: true,
            message: 'All tasks are completed! 🎉',
            data: { nextTask: null },
            nextSteps: ['Implementation phase is complete', 'Run final testing and validation']
          };
        }
        
        return {
          success: true,
          message: `Next pending task: ${nextTask.id} - ${nextTask.description}`,
          data: { nextTask },
          nextSteps: [
            `Use action: "set-status" with taskId: "${nextTask.id}" and status: "in-progress" to start work`,
            `Use action: "context" with taskId: "${nextTask.id}" to get implementation details`
          ]
        };
      }

      case 'set-status': {
        if (!taskId) {
          return {
            success: false,
            message: 'Task ID required for set-status action',
            nextSteps: ['Provide a taskId parameter']
          };
        }

        if (!status) {
          return {
            success: false,
            message: 'Status required for set-status action',
            nextSteps: ['Provide status: "pending", "in-progress", or "completed"']
          };
        }

        const taskToUpdate = getTaskById(tasks, taskId);
        if (!taskToUpdate) {
          return {
            success: false,
            message: `Task ${taskId} not found`,
            nextSteps: ['Use action: "list" to see available task IDs']
          };
        }

        // Update the tasks.md file with new status using unified parser
        const updatedContent = updateTaskStatus(tasksContent, taskId, status);

        if (updatedContent === tasksContent) {
          return {
            success: false,
            message: `Could not find task ${taskId} to update status`,
            nextSteps: [
              'Check the task ID format in tasks.md',
              'Ensure task follows format: "- [ ] 1.1 Task description"'
            ]
          };
        }

        await writeFile(tasksPath, updatedContent, 'utf-8');

        const statusEmoji = status === 'completed' ? '✅' : status === 'in-progress' ? '⏳' : '⏸️';
        
        return {
          success: true,
          message: `${statusEmoji} Task ${taskId} status updated to ${status}`,
          data: { 
            taskId,
            previousStatus: taskToUpdate.status,
            newStatus: status,
            updatedTask: { ...taskToUpdate, status }
          },
          nextSteps: [
            `Task status saved to tasks.md`,
            status === 'in-progress' ? 'Begin implementation of this task' : 
            status === 'completed' ? 'Use action: "next-pending" to get the next task' :
            'Task marked as pending',
            'Use spec-status tool to check overall progress'
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
            nextSteps: ['Provide a taskId parameter to get implementation context']
          };
        }
        
        const task = getTaskById(tasks, taskId);
        if (!task) {
          return {
            success: false,
            message: `Task ${taskId} not found`,
            nextSteps: ['Use action: "list" to see available task IDs']
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
            'Review the full context above',
            task.status === 'pending' ? 'Mark task as in-progress when starting work' : 
            task.status === 'in-progress' ? 'Continue with implementation' : 
            'Task is already completed',
            'Reference the requirements and design sections for implementation guidance'
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

