import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { SpecParser } from '../core/parser.js';

export const specListTool: Tool = {
  name: 'spec-list',
  description: 'List all specifications in the project with their status',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { 
        type: 'string',
        description: 'Absolute path to the project root'
      }
    },
    required: ['projectPath']
  }
};

export async function specListHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath } = args;

  try {
    const parser = new SpecParser(projectPath);
    const specs = await parser.getAllSpecs();

    if (specs.length === 0) {
      const response = {
        success: true,
        message: 'No specifications found',
        data: {
          specs: [],
          total: 0
        },
        nextSteps: [
          'Create a new specification using spec-create',
          'Example: spec-create user-authentication "User login and registration"'
        ],
        projectContext: {
          projectPath,
          workflowRoot: PathUtils.getWorkflowRoot(projectPath),
          dashboardUrl: context.dashboardUrl
        }
      };

      return response;
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

    const response = {
      success: true,
      message: `Found ${specs.length} specification${specs.length !== 1 ? 's' : ''}`,
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
        'Use spec-status <name> to view detailed status of a specific spec',
        'Use spec-execute <task-id> <name> to continue implementation',
        'Create new specifications with spec-create'
      ],
      projectContext: {
        projectPath,
        workflowRoot: PathUtils.getWorkflowRoot(projectPath),
        dashboardUrl: context.dashboardUrl
      }
    };

    return response;

  } catch (error: any) {
    const errorResponse = {
      success: false,
      message: `Failed to list specifications: ${error.message}`,
      nextSteps: [
        'Check if the project path exists',
        'Verify the .spec-workflow directory exists',
        'Create a specification using spec-create if none exist'
      ]
    };

    return errorResponse;
  }
}