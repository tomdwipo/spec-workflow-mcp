import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse, TaskInfo } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { parseTasksFromMarkdown, updateTaskStatus, findNextPendingTask, getTaskById } from '../core/task-parser.js';
import { translate } from '../core/i18n.js';

export const manageTasksTool: Tool = {
  name: 'manage-tasks',
  description: translate('tools.manageTasks.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: translate('tools.manageTasks.projectPathDescription')
      },
      specName: { 
        type: 'string',
        description: translate('tools.manageTasks.specNameDescription')
      },
      action: {
        type: 'string',
        enum: ['list', 'get', 'set-status', 'next-pending', 'context'],
        description: translate('tools.manageTasks.actionDescription'),
        default: 'list'
      },
      taskId: { 
        type: 'string',
        description: translate('tools.manageTasks.taskIdDescription')
      },
      status: {
        type: 'string',
        enum: ['pending', 'in-progress', 'completed'],
        description: translate('tools.manageTasks.statusDescription')
      }
    },
    required: ['projectPath', 'specName']
  }
};

export async function manageTasksHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, specName, action = 'list', taskId, status } = args;
  const lang = context.lang || 'en';

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
        message: translate('tools.manageTasks.messages.noTasksFound', lang),
        data: { tasks: [] },
        nextSteps: [translate('tools.manageTasks.nextSteps.createTasks', lang)]
      };
    }
    
    // Handle different actions
    switch (action) {
      case 'list':
        return {
          success: true,
          message: translate('tools.manageTasks.messages.listSummary', lang, { ...parseResult.summary }),
          data: { 
            tasks,
            summary: parseResult.summary
          },
          nextSteps: [
            translate('tools.manageTasks.nextSteps.list.nextPending', lang),
            translate('tools.manageTasks.nextSteps.list.getDetails', lang),
            translate('tools.manageTasks.nextSteps.list.updateStatus', lang)
          ]
        };
        
      case 'get': {
        if (!taskId) {
          return {
            success: false,
            message: translate('tools.manageTasks.errors.get.taskIdRequired', lang),
            nextSteps: [translate('tools.manageTasks.errors.get.provideTaskId', lang)]
          };
        }
        
        const task = getTaskById(tasks, taskId);
        if (!task) {
          return {
            success: false,
            message: translate('tools.manageTasks.errors.get.notFound', lang, { taskId }),
            nextSteps: [translate('tools.manageTasks.errors.get.useList', lang)]
          };
        }
        
        const nextStep = task.status === 'completed'
              ? translate('tools.manageTasks.nextSteps.get.completed', lang)
              : task.status === 'in-progress'
              ? translate('tools.manageTasks.nextSteps.get.inProgress', lang)
              : translate('tools.manageTasks.nextSteps.get.pending', lang);

        return {
          success: true,
          message: translate('tools.manageTasks.messages.get.success', lang, { taskId, description: task.description }),
          data: { task },
          nextSteps: [nextStep, translate('tools.manageTasks.nextSteps.get.useContext', lang)]
        };
      }
        
      case 'next-pending': {
        const nextTask = findNextPendingTask(tasks);
        if (!nextTask) {
          const inProgressTasks = tasks.filter(t => t.status === 'in-progress' && !t.isHeader);
          if (inProgressTasks.length > 0) {
            return {
              success: true,
              message: translate('tools.manageTasks.messages.nextPending.inProgress', lang, { count: inProgressTasks.length }),
              data: { 
                nextTask: null,
                inProgressTasks 
              },
              nextSteps: [
                translate('tools.manageTasks.nextSteps.nextPending.continue', lang, { ids: inProgressTasks.map(t => t.id).join(', ') }),
                translate('tools.manageTasks.nextSteps.nextPending.markComplete', lang)
              ]
            };
          }
          return {
            success: true,
            message: translate('tools.manageTasks.messages.nextPending.allCompleted', lang),
            data: { nextTask: null },
            nextSteps: [
              translate('tools.manageTasks.nextSteps.nextPending.implementationComplete', lang),
              translate('tools.manageTasks.nextSteps.nextPending.runTests', lang)
            ]
          };
        }
        
        return {
          success: true,
          message: translate('tools.manageTasks.messages.nextPending.success', lang, { id: nextTask.id, description: nextTask.description }),
          data: { nextTask },
          nextSteps: [
            translate('tools.manageTasks.nextSteps.nextPending.setStatus', lang, { taskId: nextTask.id }),
            translate('tools.manageTasks.nextSteps.nextPending.useContext', lang)
          ]
        };
      }

      case 'set-status': {
        if (!taskId) {
          return {
            success: false,
            message: translate('tools.manageTasks.errors.setStatus.taskIdRequired', lang),
            nextSteps: [translate('tools.manageTasks.errors.setStatus.provideTaskId', lang)]
          };
        }

        if (!status) {
          return {
            success: false,
            message: translate('tools.manageTasks.errors.setStatus.statusRequired', lang),
            nextSteps: [translate('tools.manageTasks.errors.setStatus.provideStatus', lang)]
          };
        }

        const taskToUpdate = getTaskById(tasks, taskId);
        if (!taskToUpdate) {
          return {
            success: false,
            message: translate('tools.manageTasks.errors.setStatus.notFound', lang, { taskId }),
            nextSteps: [translate('tools.manageTasks.errors.setStatus.useList', lang)]
          };
        }

        // Update the tasks.md file with new status using unified parser
        const updatedContent = updateTaskStatus(tasksContent, taskId, status);

        if (updatedContent === tasksContent) {
          return {
            success: false,
            message: translate('tools.manageTasks.errors.setStatus.updateFailed', lang, { taskId }),
            nextSteps: [
              translate('tools.manageTasks.errors.setStatus.checkId', lang),
              translate('tools.manageTasks.errors.setStatus.checkFormat', lang)
            ]
          };
        }

        await writeFile(tasksPath, updatedContent, 'utf-8');
        
        const nextStep = status === 'in-progress' ? translate('tools.manageTasks.nextSteps.setStatus.inProgress', lang) :
                         status === 'completed' ? translate('tools.manageTasks.nextSteps.setStatus.completed', lang) :
                         translate('tools.manageTasks.nextSteps.setStatus.pending', lang);

        return {
          success: true,
          message: translate('tools.manageTasks.messages.setStatus.success', lang, { taskId, status }),
          data: { 
            taskId,
            previousStatus: taskToUpdate.status,
            newStatus: status,
            updatedTask: { ...taskToUpdate, status }
          },
          nextSteps: [
            translate('tools.manageTasks.nextSteps.setStatus.saved', lang),
            nextStep,
            translate('tools.manageTasks.nextSteps.setStatus.checkProgress', lang)
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
            message: translate('tools.manageTasks.errors.context.taskIdRequired', lang),
            nextSteps: [translate('tools.manageTasks.errors.context.provideTaskId', lang)]
          };
        }
        
        const task = getTaskById(tasks, taskId);
        if (!task) {
          return {
            success: false,
            message: translate('tools.manageTasks.errors.context.notFound', lang, { taskId }),
            nextSteps: [translate('tools.manageTasks.errors.context.useList', lang)]
          };
        }
        
        // Load full spec context
        const specDir = PathUtils.getSpecPath(projectPath, specName);
        let requirementsContext = '';
        let designContext = '';
        
        try {
          const requirementsContent = await readFile(join(specDir, 'requirements.md'), 'utf-8');
          requirementsContext = translate('tools.manageTasks.messages.context.requirementsHeader', lang) + `\n${requirementsContent}`;
        } catch {
          // Requirements file doesn't exist or can't be read
        }
        
        try {
          const designContent = await readFile(join(specDir, 'design.md'), 'utf-8');
          designContext = translate('tools.manageTasks.messages.context.designHeader', lang) + `\n${designContent}`;
        } catch {
          // Design file doesn't exist or can't be read
        }

        const nextStep2 = task.status === 'pending' ? translate('tools.manageTasks.messages.context.nextSteps.pending', lang, { taskId }) :
                          task.status === 'in-progress' ? translate('tools.manageTasks.messages.context.nextSteps.inProgress', lang) :
                          translate('tools.manageTasks.messages.context.nextSteps.completed', lang);

        const nextStep4 = task.leverage ? translate('tools.manageTasks.messages.context.nextSteps.leverage', lang, { leverage: task.leverage }) :
                          translate('tools.manageTasks.messages.context.nextSteps.noLeverage', lang);

        const nextStep5 = task.status !== 'completed' ? translate('tools.manageTasks.messages.context.nextSteps.markComplete', lang, { taskId }) : '';

        const fullContext = translate('tools.manageTasks.messages.context.fullContext', lang, {
          taskId,
          id: task.id,
          status: task.status,
          description: task.description,
          requirements: task.requirements && task.requirements.length > 0 ? translate('tools.manageTasks.messages.context.requirementsRef', lang, { requirements: task.requirements.join(', ') }) : '',
          leverage: task.leverage ? translate('tools.manageTasks.messages.context.leverage', lang, { leverage: task.leverage }) : '',
          implementationNotes: task.implementationDetails && task.implementationDetails.length > 0 ? translate('tools.manageTasks.messages.context.implementationNotes', lang, { notes: task.implementationDetails.map(d => `- ${d}`).join('\n') }) : '',
          requirementsContext,
          designContext,
          separator: requirementsContext && designContext ? '---\n' : '',
          nextStep2,
          nextStep4,
          nextStep5
         });
        
        const nextStepContext = task.status === 'pending' ? translate('tools.manageTasks.nextSteps.context.pending', lang) :
                                task.status === 'in-progress' ? translate('tools.manageTasks.nextSteps.context.inProgress', lang) :
                                translate('tools.manageTasks.nextSteps.context.completed', lang);

        return {
          success: true,
          message: translate('tools.manageTasks.messages.context.success', lang, { taskId }),
          data: { 
            task,
            context: fullContext,
            hasRequirements: requirementsContext !== '',
            hasDesign: designContext !== ''
          },
          nextSteps: [
            translate('tools.manageTasks.nextSteps.context.review', lang),
            nextStepContext,
            translate('tools.manageTasks.nextSteps.context.useGuidance', lang)
          ]
        };
      }
        
      default:
        return {
          success: false,
          message: translate('tools.manageTasks.errors.unknownAction', lang, { action }),
          nextSteps: [translate('tools.manageTasks.errors.validActions', lang)]
        };
    }
    
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        success: false,
        message: translate('tools.manageTasks.errors.noTasksMd', lang, { specName }),
        nextSteps: [
          translate('tools.manageTasks.errors.nextSteps.createTasks', lang),
          translate('tools.manageTasks.errors.nextSteps.ensureSpecExists', lang)
        ]
      };
    }
    
    return {
      success: false,
      message: translate('tools.manageTasks.errors.genericFail', lang, { message: error.message }),
      nextSteps: [
        translate('tools.manageTasks.errors.nextSteps.checkSpecExists', lang),
        translate('tools.manageTasks.errors.nextSteps.checkPermissions', lang),
        translate('tools.manageTasks.errors.nextSteps.checkFormat', lang)
      ]
    };
  }
}

