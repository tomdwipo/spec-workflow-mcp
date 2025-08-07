import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';

export const steeringGuideTool: Tool = {
  name: 'steering-guide',
  description: 'Get the complete guide for creating and managing steering documents. Use this ONLY when user explicitly requests steering documents or asks to create project architecture docs. NOT required for spec creation.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export async function steeringGuideHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  return {
    success: true,
    message: 'Complete steering documents guide loaded',
    data: {
      guide: getSteeringGuide(),
      dashboardUrl: context.dashboardUrl
    },
    nextSteps: [
      'Only proceed with steering document creation if user explicitly requested it',
      'Create product.md first with create-steering-doc tool',
      'Then create tech.md and structure.md using the same tool',
      'Reference steering docs in future specs and bug fixes',
      `Monitor project structure on dashboard: ${context.dashboardUrl}`
    ]
  };
}

function getSteeringGuide(): string {
  return `# Complete Steering Documents Guide

## Overview
Steering documents provide essential project context that guides all development work. They ensure consistency, capture architectural decisions, and serve as the foundation for all specs and bug fixes.

## What Are Steering Documents?
Steering documents are foundational project files that contain:
- **Product Direction**: Vision, goals, and user experience principles
- **Technical Architecture**: System design, technology choices, and patterns
- **Project Structure**: File organization, naming conventions, and workflows

## The Three Core Steering Documents

### 1. Product Steering (product.md)
**Purpose**: Defines the product vision, user experience, and business goals

**Content Structure:**
\`\`\`markdown
# Product Steering

## Vision & Mission
- What problem does this project solve?
- Who are the target users?
- What is the long-term vision?

## User Experience Principles
- Core UX guidelines
- Design system principles
- Accessibility requirements
- Performance standards

## Feature Priorities
- Must-have features
- Nice-to-have features
- Future roadmap items

## Success Metrics
- Key performance indicators
- User satisfaction measures
- Business metrics
\`\`\`

### 2. Technical Steering (tech.md)
**Purpose**: Defines the technical architecture, patterns, and development standards

**Content Structure:**
\`\`\`markdown
# Technical Steering

## Architecture Overview
- System architecture diagram
- Technology stack choices
- Integration patterns
- Data flow design

## Development Standards
- Coding conventions
- Testing requirements
- Security guidelines
- Performance standards

## Technology Choices
- Programming languages and versions
- Frameworks and libraries
- Development tools
- Deployment infrastructure

## Patterns & Best Practices
- Recommended code patterns
- Error handling approaches
- Logging and monitoring
- Documentation standards
\`\`\`

### 3. Structure Steering (structure.md)
**Purpose**: Defines project organization, file structure, and workflow processes

**Content Structure:**
\`\`\`markdown
# Structure Steering

## Project Organization
- Directory structure
- File naming conventions
- Module organization
- Configuration management

## Development Workflow
- Git branching strategy
- Code review process
- Testing workflow
- Deployment process

## Documentation Structure
- Where to find what
- How to update docs
- Spec organization
- Bug tracking process

## Team Conventions
- Communication guidelines
- Meeting structures
- Decision-making process
- Knowledge sharing
\`\`\`

## Creating Steering Documents Workflow

### Step 1: Gather Project Information
Before creating documents, collect:
- **Product Requirements**: Business goals, user needs, success criteria
- **Technical Constraints**: Existing systems, technology requirements, performance needs
- **Team Context**: Team size, skills, workflow preferences
- **Project Timeline**: Milestones, deadlines, resource constraints

### Step 2: Create Product Steering Document
\`\`\`
Tool: create-steering-doc
Args: { 
  projectPath, 
  document: "product", 
  content: "# Product Steering\n\n## Vision & Mission\n..." 
}
Returns: Product steering document created successfully
\`\`\`

1. Define the product vision and mission
2. Identify target users and their needs
3. Establish UX principles and design standards
4. Prioritize features and define roadmap
5. Set success metrics and KPIs

### Step 3: Create Technical Steering Document
\`\`\`
Tool: create-steering-doc
Args: { 
  projectPath, 
  document: "tech", 
  content: "# Technical Steering\n\n## Architecture Overview\n..." 
}
Returns: Technical steering document created successfully
\`\`\`

1. Design system architecture
2. Choose technology stack
3. Define coding standards and patterns
4. Establish testing and security requirements
5. Document integration patterns

### Step 4: Create Structure Steering Document
\`\`\`
Tool: create-steering-doc
Args: { 
  projectPath, 
  document: "structure", 
  content: "# Structure Steering\n\n## Project Organization\n..." 
}
Returns: Structure steering document created successfully
\`\`\`

1. Organize project directory structure
2. Define file naming conventions
3. Establish development workflow
4. Document team processes
5. Set up knowledge management

### Step 5: Request Steering Approval
\`\`\`
Tool: request-approval
Args: { 
  projectPath, 
  title: "Steering Documents Review", 
  content: "All three steering documents",
  type: "document"
}
Returns: { approvalId, status: "pending" }

Tool: get-approval-status (poll until approved)
Args: { projectPath, approvalId }
Returns: User response with annotations/changes
\`\`\`

## Using Steering Documents in Development

### In Specifications
- **Requirements Phase**: Reference product steering for user needs and priorities
- **Design Phase**: Follow technical steering architecture and patterns
- **Tasks Phase**: Use structure steering for file organization

### In Bug Fixes
- **Analysis Phase**: Consider impact using product and technical steering
- **Fix Phase**: Follow technical patterns and standards
- **Verification Phase**: Ensure fixes align with product goals

### Example References
\`\`\`markdown
## Requirements
Following our product steering's focus on mobile-first design...

## Design  
Using the microservices pattern defined in our technical steering...

## Tasks
Files will be organized according to our structure steering...
\`\`\`

## Maintaining Steering Documents

### When to Update
- Major architectural changes
- New technology adoptions
- Product pivot or feature changes
- Team structure changes
- Performance requirement changes

### Update Process
1. Identify what needs updating
2. Make changes to relevant steering document(s)
3. Request approval for changes
4. Update all affected specs and bugs
5. Communicate changes to team

### Version Control
- Keep steering docs in version control
- Tag major changes
- Maintain changelog
- Archive old versions

## Common User Interaction Patterns

### Pattern 1: Setting Up New Project
**User**: "Set up steering documents for this project"
**Agent**: 
1. Call \`steering-guide\` to understand the process
2. Gather project information and requirements
3. Call \`create-steering-doc\` for product document
4. Call \`create-steering-doc\` for tech document
5. Call \`create-steering-doc\` for structure document
6. Request approval for all steering documents

### Pattern 2: Updating Architecture
**User**: "Update technical steering with new database choice"
**Agent**:
1. Load existing technical steering
2. Update architecture and technology sections
3. Request approval for changes
4. Update affected specs

### Pattern 3: Onboarding Context
**User**: "What's the project architecture and structure?"
**Agent**: Call \`get-steering-context\` to load all steering documents

## Key Principles for Steering Documents
- **Comprehensive but Concise**: Cover all essential context without overwhelming detail
- **Living Documents**: Update regularly as project evolves
- **Team Ownership**: Everyone contributes and follows the guidelines
- **Decision Record**: Document why choices were made, not just what was chosen
- **Consistent Reference**: Use in all specs, bugs, and development work
- **Clear Structure**: Follow standard templates for consistency

## Available Steering Tools Summary
- \`steering-guide\`: This comprehensive guide for creating steering documents
- \`create-steering-doc\`: Create individual steering documents (product.md, tech.md, structure.md)
- \`get-steering-context\`: Load existing steering documents for reference
- \`request-approval\`: Get approval for steering document changes
- \`get-approval-status\`: Check approval status

## Benefits of Good Steering Documents
✅ **Consistent Development**: Everyone follows same principles and patterns
✅ **Faster Onboarding**: New team members understand project quickly
✅ **Better Decisions**: Context helps make informed choices
✅ **Reduced Rework**: Clear guidelines prevent architectural mistakes
✅ **Improved Quality**: Standards ensure consistent code and UX
✅ **Easier Maintenance**: Well-documented structure simplifies updates

Steering documents are the foundation of successful spec-driven development!`;
}