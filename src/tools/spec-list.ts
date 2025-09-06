import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { SpecParser } from '../core/parser.js';
import { translate } from '../core/i18n.js';

export const specListTool: Tool = {
  name: 'spec-list',
  description: translate('tools.specList.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: translate('tools.specList.projectPathDescription')
      }
    },
    required: ['projectPath']
  }
};

export async function specListHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath } = args;
  const lang = context.lang || 'en';

  try {
    const parser = new SpecParser(projectPath);
    const specs = await parser.getAllSpecs();

    if (specs.length === 0) {
      return {
        success: true,
        message: translate('tools.specList.messages.noSpecs', lang),
        data: {
          specs: [],
          total: 0
        },
        nextSteps: [
          translate('tools.specList.nextSteps.noSpecs.create', lang),
          translate('tools.specList.nextSteps.noSpecs.example', lang)
        ],
        projectContext: {
          projectPath,
          workflowRoot: PathUtils.getWorkflowRoot(projectPath),
          dashboardUrl: context.dashboardUrl
        }
      };
    }

    // Format specs for display
    const formattedSpecs = specs.map(spec => {
      const phaseCount = Object.values(spec.phases).filter(p => p.exists).length;
      const completedPhases = Object.entries(spec.phases)
        .filter(([_, phase]) => phase.exists && phase.approved)
        .map(([name]) => name);
      
      let status = 'not-started';
      if (phaseCount === 0) {
        status = 'not-started';
      } else if (phaseCount < 3) {
        status = 'in-progress';
      } else if (completedPhases.length === 3) {
        status = 'ready-for-implementation';
      } else if (spec.taskProgress && spec.taskProgress.completed > 0) {
        status = 'implementing';
      } else {
        status = 'ready-for-implementation';
      }

      if (spec.taskProgress && spec.taskProgress.completed === spec.taskProgress.total && spec.taskProgress.total > 0) {
        status = 'completed';
      }

      return {
        name: spec.name,
        description: spec.description,
        status,
        phases: {
          requirements: spec.phases.requirements.exists,
          design: spec.phases.design.exists,
          tasks: spec.phases.tasks.exists,
          implementation: spec.phases.implementation.exists
        },
        taskProgress: spec.taskProgress,
        lastModified: spec.lastModified,
        createdAt: spec.createdAt
      };
    });

    // Summary statistics
    const statusCounts = formattedSpecs.reduce((acc, spec) => {
      acc[spec.status] = (acc[spec.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      message: translate('tools.specList.successMessage', lang, { count: specs.length }),
      data: {
        specs: formattedSpecs,
        total: specs.length,
        summary: {
          byStatus: statusCounts,
          totalTasks: formattedSpecs.reduce((sum, spec) => sum + (spec.taskProgress?.total || 0), 0),
          completedTasks: formattedSpecs.reduce((sum, spec) => sum + (spec.taskProgress?.completed || 0), 0)
        }
      },
      nextSteps: [
        translate('tools.specList.nextSteps.success.viewStatus', lang),
        translate('tools.specList.nextSteps.success.continue', lang),
        translate('tools.specList.nextSteps.success.create', lang)
      ],
      projectContext: {
        projectPath,
        workflowRoot: PathUtils.getWorkflowRoot(projectPath),
        dashboardUrl: context.dashboardUrl
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: translate('tools.specList.errors.failed', lang, { message: error.message }),
      nextSteps: [
        translate('tools.specList.errors.nextSteps.checkPath', lang),
        translate('tools.specList.errors.nextSteps.verifyDir', lang),
        translate('tools.specList.errors.nextSteps.create', lang)
      ]
    };
  }
}