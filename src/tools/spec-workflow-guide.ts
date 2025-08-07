import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';

export const specWorkflowGuideTool: Tool = {
  name: 'spec-workflow-guide',
  description: 'Get the complete spec-driven development workflow guide. ALWAYS call this tool FIRST when user requests spec creation, feature development, or mentions working on specifications. This tool provides the essential workflow instructions and must be loaded before any spec work begins.',
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
      'CRITICAL: Follow the workflow sequence exactly - Requirements → Design → Tasks → Implementation',
      'FIRST: Load templates with get-template-context tool before creating any documents',
      'MANDATORY: Request approval after EACH document creation before proceeding',
      'Use only the specified MCP tools - never create documents manually',
      dashboardMessage
    ]
  };
}

function getSpecWorkflowGuide(): string {
  return `# Complete Spec-Driven Development Workflow

## Workflow Philosophy

You are an AI assistant that specializes in spec-driven development. Your role is to guide users through a systematic approach to feature development using MCP tools that ensures quality, maintainability, and completeness.

**CRITICAL**: You MUST use the MCP tools provided. Do NOT write specifications directly. Use the tools mentioned in this guide.

**APPROVAL REQUIREMENT**: After creating EACH document (requirements.md, design.md, tasks.md), you MUST immediately use the request-approval TOOL and wait for approval before proceeding. DO NOT skip this step!

### Core Principles
- **Use MCP Tools**: Always use the provided MCP tools - never create documents manually
- **Structured Development**: Follow the sequential phases without skipping steps
- **MANDATORY USER APPROVAL**: Each phase must be explicitly approved using request-approval TOOL before proceeding - NO EXCEPTIONS
- **Atomic Implementation**: Execute one task at a time during implementation
- **Requirement Traceability**: All tasks must reference specific requirements
- **Test-Driven Focus**: Prioritize testing and validation throughout

## Complete Workflow Sequence

**CRITICAL**: Follow this exact sequence using the MCP tools - do NOT skip steps:

1. **Requirements Phase** (Phase 1)
   - Use the create-spec-doc TOOL to create requirements.md
   - **IMMEDIATELY** use request-approval TOOL
   - **WAIT** for approval before proceeding to design phase

2. **Design Phase** (Phase 2)
   - Use the create-spec-doc TOOL to create design.md
   - **IMMEDIATELY** use request-approval TOOL
   - **WAIT** for approval before proceeding to tasks phase

3. **Tasks Phase** (Phase 3)
   - Use the create-spec-doc TOOL to create tasks.md
   - **IMMEDIATELY** use request-approval TOOL
   - **WAIT** for approval before proceeding to implementation

4. **Implementation Phase** (Phase 4)
   - Use the manage-tasks TOOL to track and update task progress

## Instructions

You are helping create a new feature specification through the complete workflow using MCP tools. Follow these phases sequentially:

**WORKFLOW SEQUENCE**: Requirements → Design → Tasks → Implementation
**TOOL USAGE**: You MUST use the MCP tools listed below. Do NOT create documents manually.

### Initial Setup

1. **Load Required Context Using MCP Tools**
   - Call the get-template-context TOOL with category "spec" to load specification templates
   - Call the get-steering-context TOOL to check for steering documents
   - **If no steering documents exist**: Ask the user:
     - "No steering documents found. For established codebases, steering documents provide helpful project context."
     - "Would you like to create steering documents first, or proceed directly with the spec?"
     - "To create steering documents later, you can say: 'Create steering docs for my codebase'"
     - **For new projects**: Skip steering documents and proceed with spec creation

   **Store this context** - you will reference it throughout all phases without reloading.

2. **Analyze Existing Codebase** (BEFORE starting any phase)
   - Search for similar features: Look for existing patterns relevant to the new feature
   - Identify reusable components: Find utilities, services, hooks, or modules that can be leveraged
   - Review architecture patterns: Understand current project structure, naming conventions, and design patterns
   - Find integration points: Locate where new feature will connect with existing systems
   - Document findings: Note what can be reused vs. what needs to be built from scratch

## PHASE 1: Requirements Creation

### Requirements Process
1. **First call the get-template-context TOOL** if not already loaded
   - This TOOL provides the requirements template structure

2. **Generate requirements content**
   - Use the requirements template structure from the get-template-context TOOL output
   - Create user stories in "As a [role], I want [feature], so that [benefit]" format
   - Write acceptance criteria in WHEN/IF/THEN statements
   - Consider edge cases and technical constraints
   - Reference steering documents where applicable

3. **Create the document using the create-spec-doc TOOL**
   Call the create-spec-doc TOOL with:
   - projectPath: The project root path
   - specName: The feature name in kebab-case
   - document: "requirements"
   - content: Your requirements following the template

4. **MANDATORY: Request User Approval Using MCP Tools (DO NOT SKIP)**
   - Use the request-approval TOOL to create an approval request:
     - title: "Requirements Phase: [spec-name] - Ready for Review"
     - filePath: ".spec-workflow/specs/[spec-name]/requirements.md"
     - type: "document"
     - category: "spec"
     - categoryName: "[spec-name]"
   - **IMPORTANT**: Do NOT include document content in the approval request - only provide the filePath
   - The request-approval TOOL will return an approvalId
   - Use the get-approval-status TOOL to poll for approval status
   - **CRITICAL**: Wait until get-approval-status returns status "approved" before proceeding to Phase 2
   - If status is "needs-revision": 
     a) Review the detailed feedback carefully
     b) Call create-spec-doc TOOL again with the FULL revised document content
     c) Create a NEW approval request using request-approval TOOL (only filePath, NO content)
     d) Continue polling with get-approval-status until approved
   - **CLEANUP**: Once approved, use the delete-approval TOOL with the approvalId to remove the approval request

## PHASE 2: Design Creation

### Design Process
1. **Context Assessment**
   - If you JUST created the requirements.md in this conversation, you already have the context - DO NOT call get-spec-context
   - Only call get-spec-context TOOL if you're starting fresh on an existing spec or returning to work after a break

2. **Codebase Research** (MANDATORY)
   - Map existing patterns: Identify data models, API patterns, component structures
   - Catalog reusable utilities: Find validation functions, helpers, middleware, hooks
   - Document architectural decisions: Note existing tech stack, state management, routing patterns
   - Identify integration points: Map how new feature connects to existing auth, database, APIs

3. **Generate design content**
   - Use the design template structure from initial get-template-context TOOL output
   - Build on existing patterns rather than creating new ones
   - Include architecture diagrams where helpful
   - Define clear interfaces that integrate with existing systems

4. **Create the document using the create-spec-doc TOOL**
   Call the create-spec-doc TOOL with:
   - projectPath: The project root path
   - specName: The same feature name used for requirements
   - document: "design"
   - content: Your design following the template

5. **MANDATORY: Request User Approval Using MCP Tools (DO NOT SKIP)**
   - Use the request-approval TOOL to create an approval request:
     - title: "Design Phase: [spec-name] - Ready for Review"
     - filePath: ".spec-workflow/specs/[spec-name]/design.md"
     - type: "document"
     - category: "spec"
     - categoryName: "[spec-name]"
   - **IMPORTANT**: Do NOT include document content in the approval request - only provide the filePath
   - The request-approval TOOL will return an approvalId
   - Use the get-approval-status TOOL to poll for approval status
   - **CRITICAL**: Wait until get-approval-status returns status "approved" before proceeding to Phase 3
   - If status is "needs-revision": 
     a) Review the detailed feedback carefully
     b) Call create-spec-doc TOOL again with the FULL revised document content
     c) Create a NEW approval request using request-approval TOOL (only filePath, NO content)
     d) Continue polling with get-approval-status until approved
   - **CLEANUP**: Once approved, use the delete-approval TOOL with the approvalId to remove the approval request

## PHASE 3: Tasks Creation

### Task Planning Process
1. **Context Assessment**
   - If you JUST created the requirements.md and design.md in this conversation, you already have the context - DO NOT call get-spec-context
   - Only call get-spec-context TOOL if you're starting fresh on an existing spec or returning to work after a break

2. **Generate Atomic Task List**
   Break design into atomic, executable coding tasks following these criteria:

   **Atomic Task Requirements (CRITICAL FOR AGENT EXECUTION)**:
   - **File Scope**: Touches 1-3 related files maximum
   - **Time Boxing**: Completable in 15-30 minutes by an experienced developer
   - **Single Purpose**: One testable outcome per task
   - **Specific Files**: Must specify exact files to create/modify
   - **Agent-Friendly**: Clear input/output with minimal context switching

   **Task Format Guidelines**:
   - Use checkbox format: \`- [ ] Task number. Task description\`
   - **Specify files**: Always include exact file paths to create/modify
   - **Include implementation details** as bullet points
   - Reference requirements using: \`_Requirements: X.Y, Z.A_\`
   - Reference existing code to leverage using: \`_Leverage: path/to/file.ts, path/to/component.tsx_\`
   - Focus only on coding tasks (no deployment, user testing, etc.)
   - **Avoid broad terms**: No "system", "integration", "complete" in task titles

   **Good vs Bad Task Examples**:
   ❌ **Bad Examples (Too Broad)**:
   - "Implement authentication system" (affects many files, multiple purposes)
   - "Add user management features" (vague scope, no file specification)
   - "Build complete dashboard" (too large, multiple components)

   ✅ **Good Examples (Atomic)**:
   - "Create User model in models/user.py with email/password fields"
   - "Add password hashing utility in utils/auth.py using bcrypt"
   - "Create LoginForm component in components/LoginForm.tsx with email/password inputs"

3. **Create the document using the create-spec-doc TOOL**
   Call the create-spec-doc TOOL with:
   - projectPath: The project root path
   - specName: The same feature name used previously
   - document: "tasks"
   - content: Your task list following the template

4. **MANDATORY: Request User Approval Using MCP Tools (DO NOT SKIP)**
   - Use the request-approval TOOL to create an approval request:
     - title: "Tasks Phase: [spec-name] - Ready for Review"
     - filePath: ".spec-workflow/specs/[spec-name]/tasks.md"
     - type: "document"
     - category: "spec"
     - categoryName: "[spec-name]"
   - **IMPORTANT**: Do NOT include document content in the approval request - only provide the filePath
   - The request-approval TOOL will return an approvalId
   - Use the get-approval-status TOOL to poll for approval status
   - **CRITICAL**: Wait until get-approval-status returns status "approved" before proceeding to implementation
   - If status is "needs-revision": 
     a) Review the detailed feedback carefully
     b) Call create-spec-doc TOOL again with the FULL revised document content
     c) Create a NEW approval request using request-approval TOOL (only filePath, NO content)
     d) Continue polling with get-approval-status until approved
   - **CLEANUP**: Once approved, use the delete-approval TOOL with the approvalId to remove the approval request

## Critical Workflow Rules

### MCP Tool Usage (MANDATORY)
- **ALWAYS use the MCP tools** - Never create documents manually
- **create-spec-doc TOOL**: Use this to create all documents (requirements, design, tasks)
- **get-template-context TOOL**: Use this to get templates at the beginning
- **get-steering-context TOOL**: Use this to check for existing steering documents (optional context)
- **get-spec-context TOOL**: Use this to load existing spec documents
- **request-approval TOOL**: Use this to request user approval for each phase
- **get-approval-status TOOL**: Use this to poll for approval status
- **delete-approval TOOL**: Use this to clean up approved requests after successful approval
- **manage-tasks TOOL**: Use this for comprehensive task management during implementation

### Universal Rules
- Only create ONE spec at a time
- Always use kebab-case for feature names (e.g., user-authentication)
- MANDATORY: Always analyze existing codebase before starting any phase
- Use the MCP tools exactly as specified - do not create documents manually
- Follow exact template structures from the get-template-context TOOL
- Do not proceed without explicit user approval between phases
- Do not skip phases - complete Requirements → Design → Tasks sequence

### Approval Requirements
- NEVER proceed to the next phase without approval through the MCP approval system
- Use request-approval TOOL to create approval requests for each phase (include category and categoryName)
- **CRITICAL**: Only provide filePath in request-approval TOOL - NEVER include document content
- Use get-approval-status TOOL to poll until status is "approved"
- If status is "needs-revision": 
  a) Review feedback, b) Revise using create-spec-doc TOOL, c) Create NEW approval request (filePath only, NO content)
- Continue revision cycle until approval status is "approved"
- **MANDATORY CLEANUP**: Once approved, immediately use delete-approval TOOL to remove the approval request
- The approval system provides structured feedback through the dashboard interface

### Template Usage
- Use the pre-loaded template context from the get-template-context TOOL
- Requirements: Must follow requirements template structure exactly
- Design: Must follow design template structure exactly
- Tasks: Must follow tasks template structure exactly
- Include all template sections - do not omit any required sections

## Error Handling

If issues arise during the workflow:
- Requirements unclear: Ask targeted questions to clarify
- Design too complex: Suggest breaking into smaller components
- Tasks too broad: Break into smaller, more atomic tasks
- Implementation blocked: Document the blocker and suggest alternatives
- Tool errors: Report the error and retry with corrected parameters

## Success Criteria

A successful spec workflow completion includes:
- Complete requirements created with create-spec-doc TOOL
- Comprehensive design created with create-spec-doc TOOL
- Detailed task breakdown created with create-spec-doc TOOL
- All phases explicitly approved by user before proceeding
- Ready for implementation phase using spec-execute TOOL

## Implementation Phase

After completing all phases with user approval, the implementation phase can be resumed at any time. When starting implementation (or returning to it after a break):

### Implementation Startup Process
1. **Check Current Status**
   - Use the spec-status TOOL to see overall progress
   - Use the manage-tasks TOOL with action: "list" to see all tasks and their current status

2. **Understand Implementation Context**
   - Ask the user: "Are you ready to start/continue implementation?" 
   - Ask: "Do you want to work on a specific task, or should I suggest the next pending task?"
   - Use the manage-tasks TOOL with action: "next-pending" to get the next task to work on

3. **Task Management Workflow**
   - **Start Task**: Use manage-tasks with action: "set-status", taskId: "X.X", status: "in-progress" 
   - **Get Context**: Use manage-tasks with action: "context", taskId: "X.X" to load full implementation context
   - **Complete Task**: Use manage-tasks with action: "set-status", taskId: "X.X", status: "completed"
   - **Track Progress**: Use spec-status TOOL to monitor overall completion

### Task Status System
Tasks use markdown checkboxes with these statuses:
- **[ ]** = pending (not started)
- **[-]** = in-progress (currently being worked on)
- **[x]** = completed (finished and tested)

### Implementation Guidelines
- Work on ONE task at a time
- Mark tasks as in-progress when starting work
- Use the full context provided by manage-tasks action: "context" 
- Reference requirements and design documents for implementation guidance
- Mark tasks as completed only when fully implemented and tested
- The implementation phase is flexible - users can pause and resume anytime

Remember: You MUST use the MCP tools. Each document MUST be created using the create-spec-doc TOOL and reviewed by the user before proceeding. This ensures quality and alignment with user expectations.`;
}