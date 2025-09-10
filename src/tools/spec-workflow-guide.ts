import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';

export const specWorkflowGuideTool: Tool = {
  name: 'spec-workflow-guide',
  description: `Load essential spec workflow instructions to guide feature development from idea to implementation.

# Instructions
Call this tool FIRST when users request spec creation, feature development, or mention specifications. This provides the complete workflow sequence (Requirements → Design → Tasks → Implementation) that must be followed. Always load before any other spec tools to ensure proper workflow understanding.`,
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export async function specWorkflowGuideHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  // Get dashboard URL from context or session
  let dashboardUrl = context.dashboardUrl;
  if (!dashboardUrl && context.sessionManager) {
    dashboardUrl = await context.sessionManager.getDashboardUrl();
  }

  const dashboardMessage = dashboardUrl ? 
    `Monitor progress on dashboard: ${dashboardUrl}` :
    'Dashboard not available - running in headless mode';

  return {
    success: true,
    message: 'Complete spec workflow guide loaded - follow this workflow exactly',
    data: {
      guide: getSpecWorkflowGuide(),
      dashboardUrl: dashboardUrl,
      dashboardAvailable: !!dashboardUrl
    },
    nextSteps: [
      'Follow sequence: Requirements → Design → Tasks → Implementation',
      'Load templates with get-template-context first',
      'Request approval after each document',
      'Use MCP tools only',
      dashboardMessage
    ]
  };
}

function getSpecWorkflowGuide(): string {
  return `# Spec Development Workflow

## Overview

You guide users through spec-driven development using MCP tools. Transform rough ideas into detailed specifications through Requirements → Design → Tasks → Implementation phases. Use web search when available for current best practices.

Feature names use kebab-case (e.g., user-authentication). Create ONE spec at a time.

## Workflow Diagram
\`\`\`mermaid
flowchart TD
    Start([Start: User requests feature]) --> CheckSteering{Steering docs exist?}
    CheckSteering -->|Yes| P1_Load[get-steering-context]
    CheckSteering -->|No| P1_Template
    
    %% Phase 1: Requirements
    P1_Load --> P1_Template[get-template-context<br/>templateType: spec<br/>template: requirements]
    P1_Template --> P1_Research[Web search if available]
    P1_Research --> P1_Create[create-spec-doc<br/>document: requirements]
    P1_Create --> P1_Approve[request-approval<br/>filePath only]
    P1_Approve --> P1_Status[get-approval-status<br/>poll status]
    P1_Status --> P1_Check{Status?}
    P1_Check -->|needs-revision| P1_Update[Update document using user comments as guidance]
    P1_Update --> P1_Create
    P1_Check -->|approved| P1_Clean[delete-approval]
    P1_Clean -->|failed| P1_Status
    
    %% Phase 2: Design
    P1_Clean -->|success| P2_Template[get-template-context<br/>templateType: spec<br/>template: design]
    P2_Template --> P2_Analyze[Analyze codebase patterns]
    P2_Analyze --> P2_Create[create-spec-doc<br/>document: design]
    P2_Create --> P2_Approve[request-approval<br/>filePath only]
    P2_Approve --> P2_Status[get-approval-status<br/>poll status]
    P2_Status --> P2_Check{Status?}
    P2_Check -->|needs-revision| P2_Update[Update document using user comments as guidance]
    P2_Update --> P2_Create
    P2_Check -->|approved| P2_Clean[delete-approval]
    P2_Clean -->|failed| P2_Status
    
    %% Phase 3: Tasks
    P2_Clean -->|success| P3_Template[get-template-context<br/>templateType: spec<br/>template: tasks]
    P3_Template --> P3_Break[Convert design to tasks]
    P3_Break --> P3_Create[create-spec-doc<br/>document: tasks]
    P3_Create --> P3_Approve[request-approval<br/>filePath only]
    P3_Approve --> P3_Status[get-approval-status<br/>poll status]
    P3_Status --> P3_Check{Status?}
    P3_Check -->|needs-revision| P3_Update[Update document using user comments as guidance]
    P3_Update --> P3_Create
    P3_Check -->|approved| P3_Clean[delete-approval]
    P3_Clean -->|failed| P3_Status
    
    %% Phase 4: Implementation
    P3_Clean -->|success| P4_Ready[Spec complete.<br/>Ready to implement?]
    P4_Ready -->|Yes| P4_Status[spec-status]
    P4_Status --> P4_Task[manage-tasks<br/>action: set-status<br/>status: in-progress]
    P4_Task --> P4_Code[Implement code]
    P4_Code --> P4_Complete[manage-tasks<br/>action: set-status<br/>status: completed]
    P4_Complete --> P4_More{More tasks?}
    P4_More -->|Yes| P4_Task
    P4_More -->|No| End([Implementation Complete])
    
    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style P1_Check fill:#ffe6e6
    style P2_Check fill:#ffe6e6
    style P3_Check fill:#ffe6e6
    style CheckSteering fill:#fff4e6
    style P4_More fill:#fff4e6
\`\`\`

## Spec Workflow

### Phase 1: Requirements
**Purpose**: Define what to build based on user needs.

**Tools**:
- get-steering-context: Check for project guidelines (if established codebase)
- get-template-context: Load requirements template (templateType: "spec", template: "requirements")
- create-spec-doc: Create requirements.md
- request-approval: Get user approval
- get-approval-status: Check approval status
- delete-approval: Clean up after approval

**Process**:
1. Check for steering docs (ask user if they want to create them for established codebases)
2. Load requirements template
3. Research market/user expectations (if web search available)
4. Generate requirements as user stories with EARS criteria
5. Create document with create-spec-doc
6. Request approval (filePath only, never content)
7. Poll status until approved/needs-revision (NEVER accept verbal approval)
8. If needs-revision: update document, create NEW approval, do NOT proceed
9. Once approved: delete-approval (must succeed) before proceeding
10. If delete-approval fails: STOP - return to polling

### Phase 2: Design
**Purpose**: Create technical design addressing all requirements.

**Tools**:
- get-template-context: Load design template (templateType: "spec", template: "design")
- create-spec-doc: Create design.md
- request-approval: Get user approval
- get-approval-status: Check status
- delete-approval: Clean up

**Process**:
1. Load design template
2. Analyze codebase for patterns to reuse
3. Research technology choices (if web search available)
4. Generate design with all template sections
5. Create document and request approval
6. Poll status until approved/needs-revision
7. If needs-revision: update document, create NEW approval, do NOT proceed
8. Once approved: delete-approval (must succeed) before proceeding
9. If delete-approval fails: STOP - return to polling

### Phase 3: Tasks
**Purpose**: Break design into atomic implementation tasks.

**Tools**:
- get-template-context: Load tasks template (templateType: "spec", template: "tasks")
- create-spec-doc: Create tasks.md
- request-approval: Get user approval
- get-approval-status: Check status
- delete-approval: Clean up

**Process**:
1. Load tasks template
2. Convert design into atomic tasks (1-3 files each)
3. Include file paths and requirement references
4. Create document and request approval
5. Poll status until approved/needs-revision
6. If needs-revision: update document, create NEW approval, do NOT proceed
7. Once approved: delete-approval (must succeed) before proceeding
8. If delete-approval fails: STOP - return to polling
9. After successful cleanup: "Spec complete. Ready to implement?"

### Phase 4: Implementation
**Purpose**: Execute tasks systematically.

**Tools**:
- spec-status: Check overall progress
- manage-tasks: Track and update task status
- get-spec-context: Load specs if returning to work

**Process**:
1. Check current status with spec-status
2. For each task:
   - manage-tasks action: "set-status", status: "in-progress"
   - Implement the code
   - manage-tasks action: "set-status", status: "completed"
3. Continue until all tasks complete

## Workflow Rules

- Always use MCP tools, never create documents manually
- Follow exact template structures
- Get explicit user approval between phases
- Complete phases in sequence (no skipping)
- One spec at a time
- Use kebab-case for spec names
- Approval requests: provide filePath only, never content
- BLOCKING: Never proceed if delete-approval fails
- CRITICAL: Must have approved status AND successful cleanup before next phase
- CRITICAL: Verbal approval is NEVER accepted - dashboard or VS Code extension only
- NEVER proceed on user saying "approved" - check system status only
- Steering docs are optional - only create when explicitly requested`;
}