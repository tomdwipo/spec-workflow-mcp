# Spec Workflow MCP Extension

A VSCode extension that provides an integrated dashboard for managing Spec-Workflow projects directly in your workspace.

## Features

- **Integrated Sidebar Dashboard**: Access all your spec workflow data without leaving VSCode
- **Real-time Updates**: File system watchers automatically update the dashboard when .spec-workflow files change
- **Project Overview**: Quick statistics and progress tracking for all specifications
- **Task Management**: View and update task statuses directly from the sidebar
- **Approval Workflow**: Handle pending approvals from within VSCode
- **React + Tailwind UI**: Modern, responsive interface built with React 19 and Tailwind CSS v4

## Requirements

- VSCode 1.103.0 or higher
- A workspace containing a `.spec-workflow` directory structure

## Usage

1. Open a workspace that contains a `.spec-workflow` directory
2. The Spec Workflow icon will appear in the Activity Bar
3. Click the icon to open the dashboard sidebar
4. Use the tabbed interface to navigate between:
   - **Overview**: Project statistics and recent activity
   - **Specs**: Browse and select specifications
   - **Tasks**: View and manage task progress
   - **Approvals**: Handle pending approval requests

## Commands

- `Spec Workflow: Open Dashboard` - Opens the sidebar dashboard
- `Spec Workflow: Refresh Data` - Manually refresh all data
- `Spec Workflow: Open Spec` - Quick pick to open specific specifications

## Extension Settings

This extension contributes the following commands and views but does not add any configurable settings.

## Development

This extension is built with:
- React 19 with TypeScript
- Vite for webview bundling
- Tailwind CSS v4 for styling
- ShadCN UI components
- VSCode Extension API

## Release Notes

### 0.0.1

Initial release of Spec Workflow MCP Extension:
- Dashboard sidebar integration
- File system watching
- Task management interface
- Approval workflow support