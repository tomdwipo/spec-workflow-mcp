import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';

export const steeringGuideTool: Tool = {
  name: 'steering-guide',
  description: `Load guide for creating project steering documents.

# Instructions
Call ONLY when user explicitly requests steering document creation or asks about project architecture docs. Not part of standard spec workflow. Provides templates and guidance for product.md, tech.md, and structure.md creation.`,
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export async function steeringGuideHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  return {
    success: true,
    message: 'Steering workflow guide loaded - follow this workflow exactly',
    data: {
      guide: getSteeringGuide(),
      dashboardUrl: context.dashboardUrl
    },
    nextSteps: [
      'Only proceed if user requested steering docs',
      'Create product.md first',
      'Then tech.md and structure.md',
      'Reference in future specs',
      context.dashboardUrl ? `Dashboard: ${context.dashboardUrl}` : 'Dashboard not available'
    ]
  };
}

function getSteeringGuide(): string {
  return `# Steering Workflow

## Overview

Create project-level guidance documents when explicitly requested. Steering docs establish vision, architecture, and conventions for established codebases.

## Workflow Diagram

\`\`\`mermaid
flowchart TD
    Start([Start: Setup steering docs]) --> Guide[steering-guide<br/>Load workflow instructions]
    
    %% Phase 1: Product
    Guide --> P1_Template[get-template-context<br/>templateType: steering<br/>template: product]
    P1_Template --> P1_Generate[Generate vision & goals]
    P1_Generate --> P1_Create[create-steering-doc<br/>document: product]
    P1_Create --> P1_Approve[request-approval<br/>filePath only]
    P1_Approve --> P1_Status[get-approval-status<br/>poll status]
    P1_Status --> P1_Check{Status?}
    P1_Check -->|needs-revision| P1_Update[Update document using user comments for guidance]
    P1_Update --> P1_Create
    P1_Check -->|approved| P1_Clean[delete-approval]
    P1_Clean -->|failed| P1_Status
    
    %% Phase 2: Tech
    P1_Clean -->|success| P2_Template[get-template-context<br/>templateType: steering<br/>template: tech]
    P2_Template --> P2_Analyze[Analyze tech stack]
    P2_Analyze --> P2_Create[create-steering-doc<br/>document: tech]
    P2_Create --> P2_Approve[request-approval<br/>filePath only]
    P2_Approve --> P2_Status[get-approval-status<br/>poll status]
    P2_Status --> P2_Check{Status?}
    P2_Check -->|needs-revision| P2_Update[Update document using user comments for guidance]
    P2_Update --> P2_Create
    P2_Check -->|approved| P2_Clean[delete-approval]
    P2_Clean -->|failed| P2_Status
    
    %% Phase 3: Structure
    P2_Clean -->|success| P3_Template[get-template-context<br/>templateType: steering<br/>template: structure]
    P3_Template --> P3_Analyze[Analyze codebase structure]
    P3_Analyze --> P3_Create[create-steering-doc<br/>document: structure]
    P3_Create --> P3_Approve[request-approval<br/>filePath only]
    P3_Approve --> P3_Status[get-approval-status<br/>poll status]
    P3_Status --> P3_Check{Status?}
    P3_Check -->|needs-revision| P3_Update[Update document using user comments for guidance]
    P3_Update --> P3_Create
    P3_Check -->|approved| P3_Clean[delete-approval]
    P3_Clean -->|failed| P3_Status
    
    P3_Clean -->|success| Complete([Steering docs complete])
    
    style Start fill:#e6f3ff
    style Complete fill:#e6f3ff
    style P1_Check fill:#ffe6e6
    style P2_Check fill:#ffe6e6
    style P3_Check fill:#ffe6e6
\`\`\`

## Steering Workflow Phases

### Phase 1: Product Document
**Purpose**: Define vision, goals, and user outcomes.

**Tools**:
- steering-guide: Load workflow instructions
- get-template-context: Load product template (templateType: "steering", template: "product")
- create-steering-doc: Create product.md
- request-approval: Get user approval
- get-approval-status: Check approval status
- delete-approval: Clean up after approval

**Process**:
1. Load steering guide for workflow overview
2. Load product template
3. Generate product vision and goals
4. Create document with create-steering-doc
5. Request approval (filePath only)
6. Poll status until approved/needs-revision (NEVER accept verbal approval)
7. If needs-revision: update document, create NEW approval, do NOT proceed
8. Once approved: delete-approval (must succeed) before proceeding
9. If delete-approval fails: STOP - return to polling

### Phase 2: Tech Document
**Purpose**: Document technology decisions and architecture.

**Tools**:
- get-template-context: Load tech template (templateType: "steering", template: "tech")
- create-steering-doc: Create tech.md
- request-approval: Get user approval
- get-approval-status: Check status
- delete-approval: Clean up

**Process**:
1. Load tech template
2. Analyze existing technology stack
3. Document architectural decisions and patterns
4. Create document and request approval
5. Poll status until approved/needs-revision
6. If needs-revision: update document, create NEW approval, do NOT proceed
7. Once approved: delete-approval (must succeed) before proceeding
8. If delete-approval fails: STOP - return to polling

### Phase 3: Structure Document
**Purpose**: Map codebase organization and patterns.

**Tools**:
- get-template-context: Load structure template (templateType: "steering", template: "structure")
- create-steering-doc: Create structure.md
- request-approval: Get user approval
- get-approval-status: Check status
- delete-approval: Clean up

**Process**:
1. Load structure template
2. Analyze directory structure and file organization
3. Document coding patterns and conventions
4. Create document and request approval
5. Poll status until approved/needs-revision
6. If needs-revision: update document, create NEW approval, do NOT proceed
7. Once approved: delete-approval (must succeed) before proceeding
8. If delete-approval fails: STOP - return to polling
9. After successful cleanup: "Steering docs complete. Ready for spec creation?"

## Workflow Rules

- Always use MCP tools, never create documents manually
- Follow exact template structures
- Get explicit user approval between phases
- Complete phases in sequence (no skipping)
- Approval requests: provide filePath only, never content
- BLOCKING: Never proceed if delete-approval fails
- CRITICAL: Must have approved status AND successful cleanup before next phase
- CRITICAL: Verbal approval is NEVER accepted - dashboard or VS Code extension only
- NEVER proceed on user saying "approved" - check system status only`;
}