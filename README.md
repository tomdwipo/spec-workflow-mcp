# Spec Workflow MCP

A Model Context Protocol (MCP) server that provides structured spec-driven development workflow tools for AI-assisted software development, featuring a real-time web dashboard for monitoring and managing your project's progress.

## 📺 Showcase

### 🔄 Approval System in Action
[![Approval System Demo](https://img.youtube.com/vi/C-uEa3mfxd0/maxresdefault.jpg)](https://www.youtube.com/watch?v=C-uEa3mfxd0)

*See how the approval system works: create documents, request approval through the dashboard, provide feedback, and track revisions.*

### 📊 Dashboard & Spec Management  
[![Dashboard Demo](https://img.youtube.com/vi/g9qfvjLUWf8/maxresdefault.jpg)](https://www.youtube.com/watch?v=g9qfvjLUWf8)

*Explore the real-time dashboard: view specs, track progress, navigate documents, and monitor your development workflow.*

---

## ☕ Support This Project

<a href="https://buymeacoffee.com/Pimzino" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

---

## Features

- **Structured Development Workflow** - Sequential spec creation (Requirements → Design → Tasks)
- **Real-Time Web Dashboard** - Monitor specs, tasks, and progress with live updates
- **Document Management** - View and manage all spec documents from the dashboard
- **Task Progress Tracking** - Visual progress bars and detailed task status
- **Steering Documents** - Project vision, technical decisions, and structure guidance
- **Bug Workflow** - Complete bug reporting and resolution tracking
- **Template System** - Pre-built templates for all document types
- **Cross-Platform** - Works on Windows, macOS, and Linux

## Quick Start

1. **Add to your AI tool configuration** (see MCP Client Setup below):
   ```json
   {
     "mcpServers": {
       "spec-workflow": {
         "command": "npx",
         "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
       }
     }
   }
   ```

2. **Start using the workflow:**
   - Use `spec-workflow-guide` tool first to understand the complete process
   - Use `steering-guide` tool to create project steering documents (optional)
   - Monitor progress via the automatic web dashboard (opens automatically for each project)

## MCP Client Setup

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "spec-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
    }
  }
}
```

### Cursor IDE
Add to your Cursor settings (`settings.json`):
```json
{
  "mcp.servers": {
    "spec-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
    }
  }
}
```

### Claude Code CLI
Add to your MCP configuration:
```json
{
  "mcpServers": {
    "spec-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
    }
  }
}
```

### Augment Code
Configure in your Augment settings:
```json
{
  "mcpServers": {
    "spec-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
    }
  }
}
```

### Continue IDE Extension
Add to your Continue configuration:
```json
{
  "mcpServers": {
    "spec-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
    }
  }
}
```

### Cline/Claude Dev
Add to your MCP server configuration:
```json
{
  "mcpServers": {
    "spec-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
    }
  }
}
```

> **Note:** Replace `/path/to/your/project` with the actual path to your project directory where you want the spec workflow to operate.

## Available Tools

### Workflow Guides
- `spec-workflow-guide` - Complete guide for the spec-driven workflow process
- `steering-guide` - Guide for creating project steering documents

### Spec Management  
- `create-spec-doc` - Create/update spec documents (requirements, design, tasks)
- `spec-list` - List all specs with status information
- `spec-status` - Get detailed status of a specific spec
- `manage-tasks` - Comprehensive task management for spec implementation

### Context & Templates
- `get-template-context` - Get markdown templates for all document types
- `get-steering-context` - Get project steering context and guidance
- `get-spec-context` - Get context for a specific spec

### Steering Documents
- `create-steering-doc` - Create project steering documents (product, tech, structure)

### Approval System
- `request-approval` - Request user approval for documents
- `get-approval-status` - Check approval status
- `delete-approval` - Clean up completed approvals

## Web Dashboard

The server includes a real-time web dashboard that automatically opens in your browser when you start the MCP server. Each project gets its own dedicated dashboard running on an ephemeral port. The dashboard provides:

- **Live Project Overview** - Real-time updates of specs and progress
- **Document Viewer** - Read requirements, design, and tasks documents
- **Task Progress Tracking** - Visual progress bars and task status
- **Steering Documents** - Quick access to project guidance
- **Dark Mode** - Automatically enabled for better readability

### Dashboard Features
- **Spec Cards** - Overview of each spec with status indicators
- **Document Navigation** - Switch between requirements, design, and tasks
- **Task Management** - View task progress and copy implementation prompts
- **Real-Time Updates** - WebSocket connection for live project status

## Workflow Process

### 1. Project Setup (Recommended)
```
steering-guide → create-steering-doc (product, tech, structure)
```
Creates foundational documents to guide your project development.

### 2. Feature Development
```
spec-workflow-guide → create-spec-doc → [review] → implementation
```
Sequential process: Requirements → Design → Tasks → Implementation

### 3. Implementation Support
- Use `get-spec-context` for detailed implementation context
- Use `manage-tasks` to track task completion
- Monitor progress via the web dashboard

## File Structure

```
your-project/
  .spec-workflow/
    steering/
      product.md        # Product vision and goals
      tech.md          # Technical decisions
      structure.md     # Project structure guide
    specs/
      {spec-name}/
        requirements.md # What needs to be built
        design.md      # How it will be built
        tasks.md       # Implementation breakdown
    approval/
      {spec-name}/
        {document-id}.json # Approval status tracking
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode (with auto-reload)
npm run dev

# Start the production server
npm start

# Clean build artifacts
npm run clean
```

## Troubleshooting

### Common Issues

1. **Dashboard not opening automatically**
   - The dashboard uses ephemeral ports and opens automatically when the MCP server starts
   - Check console output for the dashboard URL if it doesn't open in your browser

2. **MCP server not connecting**
   - Verify the file paths in your configuration are correct
   - Ensure the project has been built with `npm run build`
   - Check that Node.js is available in your system PATH

3. **Dashboard not updating**
   - The dashboard uses WebSockets for real-time updates
   - Refresh the browser if connection is lost
   - Check console for any JavaScript errors

### Getting Help

- Check the [Issues](../../issues) page for known problems
- Create a new issue using the provided templates
- Use the workflow guides within the tools for step-by-step instructions

## License

GPL-3.0