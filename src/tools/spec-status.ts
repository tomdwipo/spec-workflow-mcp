import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { SpecParser } from '../core/parser.js';

export const specStatusTool: Tool = {
  name: 'spec-status',
  description: 'Show detailed status of a specification including phase completion and task progress',
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
      }
    },
    required: ['projectPath', 'specName']
  }
};

export async function specStatusHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, specName } = args;

  try {
    const parser = new SpecParser(projectPath);
    const spec = await parser.getSpec(specName);
    
    if (!spec) {
      return {
        success: false,
        message: `Specification '${specName}' not found`,
        nextSteps: [
          'Check the specification name',
          'Use spec-list to see available specifications',
          'Create the specification using spec-create'
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
        name: 'Requirements',
        status: spec.phases.requirements.exists ? (spec.phases.requirements.approved ? 'approved' : 'created') : 'missing',
        lastModified: spec.phases.requirements.lastModified
      },
      {
        name: 'Design',
        status: spec.phases.design.exists ? (spec.phases.design.approved ? 'approved' : 'created') : 'missing',
        lastModified: spec.phases.design.lastModified
      },
      {
        name: 'Tasks',
        status: spec.phases.tasks.exists ? (spec.phases.tasks.approved ? 'approved' : 'created') : 'missing',
        lastModified: spec.phases.tasks.lastModified
      },
      {
        name: 'Implementation',
        status: spec.phases.implementation.exists ? 'in-progress' : 'not-started',
        progress: spec.taskProgress
      }
    ];

    // Next steps based on current phase
    const nextSteps = [];
    switch (currentPhase) {
      case 'requirements':
        nextSteps.push('Create requirements.md using the requirements template');
        nextSteps.push('Use get-steering-context to load project context');
        nextSteps.push('Use request-approval to get user approval for requirements');
        break;
      case 'design':
        nextSteps.push('Create design.md using the design template');
        nextSteps.push('Reference the approved requirements');
        nextSteps.push('Use request-approval to get user approval for design');
        break;
      case 'tasks':
        nextSteps.push('Create tasks.md using the tasks template');
        nextSteps.push('Break down design into atomic tasks');
        nextSteps.push('Use request-approval to get user approval for tasks');
        break;
      case 'implementation':
        if (spec.taskProgress && spec.taskProgress.pending > 0) {
          nextSteps.push(`Execute next task using get-tasks with mode=next-pending`);
          nextSteps.push('Use spec-execute to implement tasks');
          nextSteps.push('Mark completed tasks using get-tasks with mode=complete');
        } else {
          nextSteps.push('Begin task implementation using spec-execute');
        }
        break;
      case 'completed':
        nextSteps.push('Specification is complete');
        nextSteps.push('Run final testing and validation');
        break;
    }

    return {
      success: true,
      message: `Specification '${specName}' status: ${overallStatus}`,
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
      message: `Failed to get specification status: ${error.message}`,
      nextSteps: [
        'Check if the specification exists',
        'Verify the project path',
        'Use spec-list to see available specifications'
      ]
    };
  }
}