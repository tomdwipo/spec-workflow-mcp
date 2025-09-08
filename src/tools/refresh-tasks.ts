import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseTasksFromMarkdown } from '../core/task-parser.js';
import { translate } from '../core/i18n.js';

export const refreshTasksTool: Tool = {
  name: 'refresh-tasks',
  description: translate('tools.refreshTasks.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: translate('tools.refreshTasks.projectPathDescription')
      },
      specName: { 
        type: 'string',
        description: translate('tools.refreshTasks.specNameDescription')
      }
    },
    required: ['projectPath', 'specName']
  }
};

export async function refreshTasksHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, specName } = args;
  const lang = context.lang || 'en';

  try {
    const specDir = PathUtils.getSpecPath(projectPath, specName);
    
    // Load all spec documents
    let requirementsContent = '';
    let designContent = '';
    let tasksContent = '';
    let hasRequirements = false;
    let hasDesign = false;
    let hasTasks = false;

    // Load requirements.md
    try {
      requirementsContent = await readFile(join(specDir, 'requirements.md'), 'utf-8');
      hasRequirements = requirementsContent.trim().length > 0;
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Load design.md
    try {
      designContent = await readFile(join(specDir, 'design.md'), 'utf-8');
      hasDesign = designContent.trim().length > 0;
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Load tasks.md
    try {
      tasksContent = await readFile(join(specDir, 'tasks.md'), 'utf-8');
      hasTasks = tasksContent.trim().length > 0;
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Check if we have minimum required documents
    if (!hasRequirements && !hasDesign) {
      return {
        success: false,
        message: translate('tools.refreshTasks.errors.noContext', lang),
        nextSteps: [
          translate('tools.refreshTasks.errors.nextSteps.createReq', lang),
          translate('tools.refreshTasks.errors.nextSteps.createDesign', lang),
          translate('tools.refreshTasks.errors.nextSteps.thenRefresh', lang)
        ]
      };
    }

    // Analyze existing tasks if they exist
    let taskAnalysis = '';
    if (hasTasks) {
      const parseResult = parseTasksFromMarkdown(tasksContent);
      const tasks = parseResult.tasks;
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
      const pendingTasks = tasks.filter(t => t.status === 'pending');

      taskAnalysis = translate('tools.refreshTasks.analysis.hasTasks', lang, {
        total: tasks.length,
        completed: completedTasks.length,
        inProgress: inProgressTasks.length,
        pending: pendingTasks.length,
        completedList: completedTasks.length > 0 ? completedTasks.map(t => `- [x] ${t.id} ${t.description}`).join('\n') : translate('tools.refreshTasks.analysis.none', lang),
        inProgressList: inProgressTasks.length > 0 ? inProgressTasks.map(t => `- [-] ${t.id} ${t.description}`).join('\n') : '',
        pendingList: pendingTasks.length > 0 ? pendingTasks.map(t => `- [ ] ${t.id} ${t.description} -- ${translate('tools.refreshTasks.analysis.checkPrompt', lang)}`).join('\n') : translate('tools.refreshTasks.analysis.none', lang)
      });
    } else {
      taskAnalysis = translate('tools.refreshTasks.analysis.noTasks', lang);
    }

    // Generate comprehensive instructions for the AI agent
    const instructions = translate('tools.refreshTasks.instructions.main', lang, { specName, projectPath });
    const fullContext = translate('tools.refreshTasks.fullContext', lang, {
      instructions,
      taskAnalysis,
      requirementsContent: hasRequirements ? requirementsContent : `**${translate('tools.refreshTasks.messages.noRequirements', lang)}**`,
      designContent: hasDesign ? designContent : `**${translate('tools.refreshTasks.messages.noDesign', lang)}**`,
      tasksContent: hasTasks ? tasksContent : `**${translate('tools.refreshTasks.messages.noTasks', lang)}**`
    });

    return {
      success: true,
      message: translate('tools.refreshTasks.successMessage', lang, { specName }),
      data: {
        context: fullContext,
        specName,
        hasRequirements,
        hasDesign,
        hasTasks,
        refreshInstructions: instructions
      },
      nextSteps: [
        translate('tools.refreshTasks.nextSteps.pass1', lang),
        translate('tools.refreshTasks.nextSteps.pass2', lang),
        translate('tools.refreshTasks.nextSteps.decision', lang),
        translate('tools.refreshTasks.nextSteps.pass3', lang)
      ],
      projectContext: {
        projectPath,
        workflowRoot: PathUtils.getWorkflowRoot(projectPath),
        specName,
        currentPhase: 'task-refresh',
        dashboardUrl: context.dashboardUrl
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: translate('tools.refreshTasks.errors.genericFail', lang, { message: error.message }),
      nextSteps: [
        translate('tools.refreshTasks.errors.nextSteps.checkDir', lang),
        translate('tools.refreshTasks.errors.nextSteps.checkPerms', lang),
        translate('tools.refreshTasks.errors.nextSteps.checkName', lang)
      ]
    };
  }
}

