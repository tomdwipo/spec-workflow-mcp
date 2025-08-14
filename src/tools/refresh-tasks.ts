import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseTasksFromMarkdown } from '../core/task-parser.js';

export const refreshTasksTool: Tool = {
  name: 'refresh-tasks',
  description: 'Provides requirements.md, design.md, and tasks.md content along with comprehensive instructions for an AI agent to refresh the task list. The agent should analyze the documents and use create-spec-doc to recreate tasks.md with updated tasks that bridge the gap between current implementation and requirements.',
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

export async function refreshTasksHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const { projectPath, specName } = args;

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
        message: 'No requirements.md or design.md found. Cannot refresh tasks without specification context.',
        nextSteps: [
          'Create requirements.md first using create-spec-doc tool',
          'Create design.md after requirements are approved',
          'Then use refresh-tasks to create aligned task list'
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

      taskAnalysis = `
## Current Task Analysis
**Total Tasks**: ${tasks.length}
**Completed**: ${completedTasks.length} (preserve as-is, even if feature removed)
**In Progress**: ${inProgressTasks.length} (preserve as-is, even if feature removed)
**Pending**: ${pendingTasks.length} (VALIDATE against requirements.md/design.md)

### Tasks to Preserve (DO NOT MODIFY):
${completedTasks.length > 0 ? completedTasks.map(t => `- [x] ${t.id} ${t.description}`).join('\n') : 'None'}
${inProgressTasks.length > 0 ? inProgressTasks.map(t => `- [-] ${t.id} ${t.description}`).join('\n') : ''}

### Pending Tasks (MUST VALIDATE):
${pendingTasks.length > 0 ? pendingTasks.map(t => `- [ ] ${t.id} ${t.description} -- CHECK: Is this feature in requirements.md?`).join('\n') : 'None'}

**VALIDATION REQUIRED**: For each pending task above, verify the feature is mentioned in requirements.md or design.md. If NOT mentioned, REMOVE the task.
`;
    } else {
      taskAnalysis = `
## Current Task Analysis
**No tasks.md exists** - You will need to create the complete task list from scratch.
`;
    }

    // Generate comprehensive instructions for the AI agent
    const instructions = `# Task Refresh Instructions

## Context
You are refreshing the task list for specification "${specName}" because requirements or design may have changed during implementation. Your goal is to ensure the task list accurately reflects what needs to be done to bridge the gap between current implementation and the updated requirements/design.

## CRITICAL: Source of Truth
- **Requirements come ONLY from requirements.md** - not from existing tasks
- **Design decisions come ONLY from design.md** - not from existing tasks  
- **Tasks are implementation steps** - they implement requirements, they don't define them
- If a feature exists in tasks but NOT in requirements.md/design.md, it has been REMOVED from the spec

## Three-Pass Validation Process

### PASS 1: Validate Existing Tasks Against Current Spec
For each existing task, ask: "Is the feature this task implements still in requirements.md or design.md?"

**Actions for PENDING tasks:**
- **KEEP**: If feature is still in requirements/design
- **REMOVE**: If feature is NOT in requirements/design (feature was cut from spec)

**Actions for COMPLETED/IN-PROGRESS tasks:**
- **PRESERVE**: Always keep completed [x] and in-progress [-] tasks
- **FLAG**: If feature was removed, add comment: "_Note: Feature removed from spec but task preserved_"

### PASS 2: Gap Analysis  
For each requirement in requirements.md, ask: "Is there a task that implements this?"
For each design decision in design.md, ask: "Are there tasks aligned with this architecture?"

**Actions:**
- **ADD**: New tasks for requirements/design elements without tasks
- **UPDATE**: Existing pending tasks that need alignment with updated requirements

### PASS 3: Create Updated Task List (Only if Changes Needed)
**DECISION POINT**: After Pass 1 and Pass 2, check:
- Are there pending tasks to remove?
- Are there new tasks to add? 
- Are there existing tasks to modify?

**If NO changes needed**: Report "Task list is already aligned with current requirements - no refresh needed" and STOP.

**If changes ARE needed**, build the new tasks.md with:
1. All completed [x] tasks (preserved as-is)
2. All in-progress [-] tasks (preserved as-is, with removal notes if applicable)
3. Only pending [ ] tasks that have backing in current requirements/design
4. New tasks for any missing requirements/design elements
5. Proper sequencing and requirement references

## Critical Rules
- **NEVER** modify completed tasks (marked with [x])
- **NEVER** modify in-progress tasks (marked with [-])  
- **REMOVE** pending tasks for features not in current requirements/design
- **ALWAYS** reference specific requirements (e.g., _Requirements: 1.1, 2.3_)
- **ENSURE** tasks build incrementally
- **MAKE** tasks atomic, specific, and actionable
- **PRESERVE** the original tasks.md structure - only update the task items themselves
- **NO** additional sections in tasks.md (no Dependencies, Metrics, Notes, Changes Made, etc.)
- **KEEP** tasks.md clean - any change summary goes in your chat response only

## Task Format Requirements
Each task must follow this format:
\`\`\`
- [ ] 1.1 Create user authentication interface
  - File: src/auth/UserAuth.ts
  - Implement login and registration forms
  - Add form validation and error handling
  - Purpose: Enable user account management
  - _Leverage: src/components/BaseForm.tsx, src/utils/validation.ts_
  - _Requirements: 1.1, 1.2_
\`\`\`

## Implementation Strategy
1. **Read** requirements.md and design.md carefully - these define what should exist
2. **Validate** existing tasks against current spec (Pass 1)
3. **Identify** gaps in task coverage (Pass 2)  
4. **Build** updated task list with proper validation (Pass 3)
5. **Use** create-spec-doc tool to save the updated tasks.md
6. **IMPORTANT**: Keep tasks.md in the same format as the original - only the task items should change

## Example: Handling Removed Features
If tasks exist for "kanban view" but "kanban view" is NOT mentioned in requirements.md:
- **REMOVE** any pending [ ] kanban tasks 
- **PRESERVE** any completed [x] or in-progress [-] kanban tasks
- **ADD NOTE**: "_Note: Kanban feature removed from spec but completed work preserved_"

## Next Steps
After analyzing the documents below:
1. Perform the three-pass validation process
2. **DECISION POINT**: If no changes are needed after validation, simply report "Tasks already aligned" and STOP
3. **ONLY if changes needed**: Use create-spec-doc tool with:
   - projectPath: "${projectPath}"
   - specName: "${specName}"
   - document: "tasks"
   - content: [your validated and updated tasks markdown - SAME FORMAT as original]
4. Ensure ONLY current requirements have tasks
5. Verify task dependencies and order make sense
6. **REMEMBER**: Tasks.md should contain ONLY the updated task list - no extra sections
`;

    // Format the complete context
    const fullContext = `${instructions}

${taskAnalysis}

---

## Requirements Document
${hasRequirements ? requirementsContent : '**No requirements.md found**'}

---

## Design Document  
${hasDesign ? designContent : '**No design.md found**'}

---

## Current Tasks Document
${hasTasks ? tasksContent : '**No tasks.md exists - create from scratch**'}

---

## Summary
You now have all the context needed to refresh the task list. Use the create-spec-doc tool to create an updated tasks.md that:
- Preserves all completed ([x]) and in-progress ([-]) tasks (even if feature was removed)
- REMOVES pending ([ ]) tasks for features NOT in current requirements.md/design.md  
- Adds new tasks for requirements/design elements missing tasks
- Ensures proper task sequencing and requirement references
- Only includes tasks that implement features actually specified in requirements.md/design.md

**REMEMBER**: If a feature exists in tasks but NOT in requirements.md/design.md, it has been CUT from the spec and pending tasks should be REMOVED.`;

    return {
      success: true,
      message: `Task refresh context loaded for "${specName}". Ready for AI agent to analyze and update tasks.`,
      data: {
        context: fullContext,
        specName,
        hasRequirements,
        hasDesign,
        hasTasks,
        refreshInstructions: instructions
      },
      nextSteps: [
        'PASS 1: Validate each existing task against requirements.md/design.md',
        'PASS 2: Identify gaps - find requirements/design elements without tasks',
        'DECISION: If no changes needed, report "Tasks already aligned" and stop',
        'PASS 3: Only if changes needed, create updated tasks.md using create-spec-doc tool'
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
      message: `Failed to load refresh context: ${error.message}`,
      nextSteps: [
        'Check if the specification directory exists',
        'Verify file permissions',
        'Ensure the spec name is correct'
      ]
    };
  }
}

