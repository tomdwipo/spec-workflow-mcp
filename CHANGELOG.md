# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-08-10

### Fixed
- Clipboard API wasnt working in HTTP contexts over LAN. Added fallback method using `document.execCommand('copy')` for browsers without clipboard API access.

### Changed
- Updated copy prompt to only include task id and spec name.
- Improved copy button feedback with visual success/error states and colored indicators.
- Updated viewport to 80% screen width in desktop and 90% on mobile devices.

### Added
- Spec document editor directly in the dashboard.
- Spec archiving and unarchiving in the dashboard.


## [0.0.8] - 2025-08-09

### Updated
- Rebuilt the web dashboard with a mobile first responsive design bringing you the following improvements:
    - Responsive Design
    - Improved UI / UX
    - Improved Performance
    - Disconnected from MCP server - must be started manually
    - Can now run multiple MCP server instances for the same project on a single dashboard instance


**NOTE: This is a breaking change. The dashboard will no longer auto start and must be manually run. Please review the README for updated instructions.**

## [0.0.7] - 2025-08-08

### Fixed
- Fixed a bug with the task parser / manage-tasks tool refusing to find tasks.

### Updated
- Improved the task parser and created a task parser utility function to be shared across tools and UI.

## [0.0.6] - 2025-08-08

### Updated
- Refined the spec workflow guide to remove any ambiguity, made it more concise.
- Refined manage-tasks tool description.
- Refined request-approval tool description and next steps output.
- Refined create-spec-doc tool next steps output.

### Added
- Imporoved dashboard task parser and task counter to support Parent/Child task relationships otherwise known as subtasks.
    - Parent tasks if only including a name will be parsed as a Task Section Heading in the dashboard.
    - The parser should now be more flexible to handle tasks in various formats as long as they still follow the same checklist, task name, and status format at the very least.

## [0.0.5] - 2025-08-07

### Updated
- Refined spec workflow to include conditional web search for the design phase to ensure the agent is providing the best possible for all phases.

### Fixed
- Improved task progress cards to display all task information in the card.

## [0.0.4] - 2025-08-07

### Fixed
- Fixed clipboard copying functionality in dashboard for HTTP contexts (non-HTTPS environments)
- Added fallback clipboard method using `document.execCommand('copy')` for browsers without clipboard API access
- Improved copy button feedback with visual success/error states and colored indicators
- Enhanced mobile device compatibility for clipboard operations
- Removed development obsolete bug tracking functionality from dashboard frontend

## [0.0.3] - 2025-08-07

### Updated
- Updated README.md with example natural language prompts that will trigger the various tools.
- task-template.md updated to remove atomic task requirements and format guidelines and moved them to the spec workflow guide tool.
- Refined instructions for the agent to output the dashboard URL to the user.
- Removed the Steering Document Compliance section from tasks-template.md for simplification.

### Added
- I have added a session.json in the .spec-workflow directory that stores the dashboard URL and the process ID of the dashboard server. This allows the agent to retrieve the dashboard URL as well as the user if required. Note: This should help users one headless systems where the dashboard us unable to auto load, you can retrieve the session information from the json file.

### Fixed
- Misc fixes cause HEAP out of memory issues on the server causing the server to crash when running more than one instance.

### Added

## [0.0.2] - 2025-08-07

### Updated
- Updated README.md with showcase videos on youtube.
- Removed testing mcp.json file that was left over from initial development.

## [0.0.1] - 2025-08-07

### Added
- MCP server implementation with 13 tools for spec-driven development
- Sequential workflow enforcement (Requirements → Design → Tasks)
- Real-time web dashboard with WebSocket updates
- Document creation and validation tools
- Human-in-the-loop approval system
- Template system for consistent documentation
- Context optimization tools for efficient AI workflows
- Task management and progress tracking
- Cross-platform support (Windows, macOS, Linux)
- Support for major AI development tools (Claude Desktop, Cursor, etc.)
- Automatic project structure generation
- Dark mode dashboard interface
- GitHub issue templates