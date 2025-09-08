import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { SpecParser } from '../core/parser.js';
import { translate } from '../core/i18n.js';

export const specStatusTool: Tool = {
  name: 'spec-status',
  description: translate('tools.specStatus.description'),
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: translate('tools.specStatus.projectPathDescription')
      },
      specName: { 
        type: 'string',
        description: translate('tools.specStatus.specNameDescription')
      }
    },
    required: ['projectPath', 'specName']
  }
};

export async function specStatusHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, specName } = args;
  const lang = context.lang || 'en';

  try {
    const parser = new SpecParser(projectPath);
    const spec = await parser.getSpec(specName);
    
    if (!spec) {
      return {
        success: false,
        message: translate('tools.specStatus.errors.notFound', lang, { specName }),
        nextSteps: [
          translate('tools.specStatus.errors.nextSteps.checkName', lang),
          translate('tools.specStatus.errors.nextSteps.useList', lang),
          translate('tools.specStatus.errors.nextSteps.create', lang)
        ]
      };
    }

    // Determine current phase and overall status
    let currentPhase = 'not-started';
    let overallStatus = 'not-started';
    
    if (!spec.phases.requirements.exists) {
      currentPhase = 'requirements';
      overallStatus = 'requirements-needed';
    } else if (!spec.phases.design.exists) {
      currentPhase = 'design';
      overallStatus = 'design-needed';
    } else if (!spec.phases.tasks.exists) {
      currentPhase = 'tasks';
      overallStatus = 'tasks-needed';
    } else if (spec.taskProgress && spec.taskProgress.pending > 0) {
      currentPhase = 'implementation';
      overallStatus = 'implementing';
    } else if (spec.taskProgress && spec.taskProgress.total > 0 && spec.taskProgress.completed === spec.taskProgress.total) {
      currentPhase = 'completed';
      overallStatus = 'completed';
    } else {
      currentPhase = 'implementation';
      overallStatus = 'ready-for-implementation';
    }

    // Phase details
    const phaseDetails = [
      {
        name: translate('tools.specStatus.phases.requirements', lang),
        status: spec.phases.requirements.exists ? (spec.phases.requirements.approved ? 'approved' : 'created') : 'missing',
        lastModified: spec.phases.requirements.lastModified
      },
      {
        name: translate('tools.specStatus.phases.design', lang),
        status: spec.phases.design.exists ? (spec.phases.design.approved ? 'approved' : 'created') : 'missing',
        lastModified: spec.phases.design.lastModified
      },
      {
        name: translate('tools.specStatus.phases.tasks', lang),
        status: spec.phases.tasks.exists ? (spec.phases.tasks.approved ? 'approved' : 'created') : 'missing',
        lastModified: spec.phases.tasks.lastModified
      },
      {
        name: translate('tools.specStatus.phases.implementation', lang),
        status: spec.phases.implementation.exists ? 'in-progress' : 'not-started',
        progress: spec.taskProgress
      }
    ];

    // Next steps based on current phase
    const nextSteps = [];
    switch (currentPhase) {
      case 'requirements':
        nextSteps.push(translate('tools.specStatus.nextSteps.requirements.create', lang));
        nextSteps.push(translate('tools.specStatus.nextSteps.requirements.loadContext', lang));
        nextSteps.push(translate('tools.specStatus.nextSteps.requirements.requestApproval', lang));
        break;
      case 'design':
        nextSteps.push(translate('tools.specStatus.nextSteps.design.create', lang));
        nextSteps.push(translate('tools.specStatus.nextSteps.design.reference', lang));
        nextSteps.push(translate('tools.specStatus.nextSteps.design.requestApproval', lang));
        break;
      case 'tasks':
        nextSteps.push(translate('tools.specStatus.nextSteps.tasks.create', lang));
        nextSteps.push(translate('tools.specStatus.nextSteps.tasks.breakdown', lang));
        nextSteps.push(translate('tools.specStatus.nextSteps.tasks.requestApproval', lang));
        break;
      case 'implementation':
        if (spec.taskProgress && spec.taskProgress.pending > 0) {
          nextSteps.push(translate('tools.specStatus.nextSteps.implementation.nextPending', lang));
          nextSteps.push(translate('tools.specStatus.nextSteps.implementation.implement', lang));
          nextSteps.push(translate('tools.specStatus.nextSteps.implementation.updateStatus', lang));
        } else {
          nextSteps.push(translate('tools.specStatus.nextSteps.implementation.begin', lang));
        }
        break;
      case 'completed':
        nextSteps.push(translate('tools.specStatus.nextSteps.completed.complete', lang));
        nextSteps.push(translate('tools.specStatus.nextSteps.completed.runTests', lang));
        break;
    }

    return {
      success: true,
      message: translate('tools.specStatus.successMessage', lang, { specName, overallStatus }),
      data: {
        name: specName,
        description: spec.description,
        currentPhase,
        overallStatus,
        createdAt: spec.createdAt,
        lastModified: spec.lastModified,
        phases: phaseDetails,
        taskProgress: spec.taskProgress || {
          total: 0,
          completed: 0,
          pending: 0
        }
      },
      nextSteps,
      projectContext: {
        projectPath,
        workflowRoot: PathUtils.getWorkflowRoot(projectPath),
        currentPhase,
        dashboardUrl: context.dashboardUrl
      }
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: translate('tools.specStatus.errors.genericFail', lang, { message: error.message }),
      nextSteps: [
        translate('tools.specStatus.errors.nextSteps.checkExists', lang),
        translate('tools.specStatus.errors.nextSteps.verifyPath', lang),
        translate('tools.specStatus.errors.nextSteps.useList', lang)
      ]
    };
  }
}