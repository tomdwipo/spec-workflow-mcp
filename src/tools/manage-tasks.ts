import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse, TaskInfo } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export const manageTasksTool: Tool = {
  name: 'manage-tasks',
  description: 'Comprehensive task management tool for spec implementation. List, view, and update task status using markdown checkboxes: [] = pending, [-] = in-progress, [x] = completed',
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
    const tasks = parseTasksFromMarkdown(tasksContent);
    
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
        const summary = {
          total: tasks.length,
          completed: tasks.filter(t => t.status === 'completed').length,
          inProgress: tasks.filter(t => t.status === 'in-progress').length,
          pending: tasks.filter(t => t.status === 'pending').length
        };

        return {
          success: true,
          message: `Found ${tasks.length} tasks (${summary.completed} completed, ${summary.inProgress} in-progress, ${summary.pending} pending)`,
          data: { 
            tasks,
            summary
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
        
        const task = tasks.find(t => t.id === taskId);
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
        const nextTask = tasks.find(t => t.status === 'pending');
        if (!nextTask) {
          const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
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

        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (!taskToUpdate) {
          return {
            success: false,
            message: `Task ${taskId} not found`,
            nextSteps: ['Use action: "list" to see available task IDs']
          };
        }

        // Update the tasks.md file with new status
        let updatedContent = tasksContent;
        let statusMarker = '';
        
        switch (status) {
          case 'pending':
            statusMarker = ' ';
            break;
          case 'in-progress':
            statusMarker = '-';
            break;
          case 'completed':
            statusMarker = 'x';
            break;
        }
        
        // Update task status using flexible regex to match various formats
        updatedContent = tasksContent.replace(
          new RegExp(`^(\\s*-\\s*\\[)[\\sx-]*(\\]\\s*${taskId.replace(/\./g, '\\.')}\\s*\\.?\\s*.+)$`, 'm'),
          `$1${statusMarker}$2`
        );

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
        
        const task = tasks.find(t => t.id === taskId);
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

${task.requirements ? `**Requirements Reference:** ${task.requirements}\n` : ''}
${task.leverage ? `**Leverage Existing:** ${task.leverage}\n` : ''}
${task.details && task.details.length > 0 ? `**Implementation Notes:**\n${task.details.map(d => `- ${d}`).join('\n')}\n` : ''}

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

interface ParsedTaskInfo extends TaskInfo {
  status: 'pending' | 'in-progress' | 'completed';
}

/**
 * Parse tasks from a tasks.md markdown file with enhanced status detection
 * Supports: [] = pending, [-] = in-progress, [x] = completed
 */
function parseTasksFromMarkdown(content: string): ParsedTaskInfo[] {
  const tasks: ParsedTaskInfo[] = [];
  const lines = content.split('\n');
  
  let currentTask: ParsedTaskInfo | null = null;
  let isCollectingTaskContent = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Match task lines with flexible format for all statuses:
    // - [ ] 1.1 Task description (pending)
    // - [-] 1.1 Task description (in-progress)  
    // - [x] 1.1 Task description (completed)
    const taskMatch = trimmedLine.match(/^-\s*\[\s*([x\s-]*)\s*\]\s*([0-9]+(?:\.[0-9]+)*)\s*\.?\s*(.+)$/);
    
    if (taskMatch) {
      // If we have a previous task, save it
      if (currentTask) {
        tasks.push(currentTask);
      }
      
      // Determine task status based on checkbox content
      const checkboxContent = taskMatch[1].trim();
      let status: 'pending' | 'in-progress' | 'completed' = 'pending';
      
      if (checkboxContent.toLowerCase() === 'x') {
        status = 'completed';
      } else if (checkboxContent === '-') {
        status = 'in-progress';
      } else {
        status = 'pending';
      }
      
      const taskId = taskMatch[2];
      const taskDescription = taskMatch[3].trim();
      
      currentTask = {
        id: taskId,
        description: taskDescription,
        completed: status === 'completed', // Keep for backwards compatibility
        status,
        details: []
      };
      isCollectingTaskContent = true;
    } 
    // If we're in a task, look for metadata anywhere in the task block
    else if (currentTask && isCollectingTaskContent) {
      // Check if this line starts a new task section (to stop collecting)
      if (trimmedLine.match(/^-\s*\[\s*[x\s-]*\s*\]\s*[0-9]/)) {
        // This is the start of a new task, process it in the next iteration
        i--;
        isCollectingTaskContent = false;
        continue;
      }
      
      // Check for _Requirements: anywhere in the line
      const requirementsMatch = line.match(/_Requirements:\s*(.+?)(?:_|$)/);
      if (requirementsMatch) {
        currentTask.requirements = requirementsMatch[1].trim();
      }
      
      // Check for _Leverage: anywhere in the line
      const leverageMatch = line.match(/_Leverage:\s*(.+?)(?:_|$)/);
      if (leverageMatch) {
        currentTask.leverage = leverageMatch[1].trim();
      }
      
      // Collect all detail lines (indented content that's not metadata)
      if (trimmedLine && 
          !requirementsMatch && 
          !leverageMatch && 
          (line.startsWith('  ') || line.startsWith('\t')) &&
          !trimmedLine.startsWith('_') &&
          currentTask.details) {
        currentTask.details.push(trimmedLine);
      }
      
      // Stop collecting if we hit an empty line followed by non-indented content
      if (trimmedLine === '' && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.length > 0 && nextLine[0] !== ' ' && nextLine[0] !== '\t' && !nextLine.startsWith('  -')) {
          isCollectingTaskContent = false;
        }
      }
    }
  }
  
  // Don't forget the last task
  if (currentTask) {
    tasks.push(currentTask);
  }
  
  return tasks;
}