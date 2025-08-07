import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';
import { registerTools, handleToolCall } from './tools/index.js';
import { registerResources, handleResourceOperation } from './resources/index.js';
import { validateProjectPath } from './core/path-utils.js';
import { DashboardServer } from './dashboard/server.js';
import { SessionManager } from './core/session-manager.js';

export class SpecWorkflowMCPServer {
  private server: Server;
  private projectPath!: string;
  private dashboardServer?: DashboardServer;
  private dashboardUrl?: string;
  private sessionManager?: SessionManager;

  constructor() {
    this.server = new Server({
      name: 'spec-workflow',
      version: '1.0.0',
      instructions: `You are an AI assistant specialized in spec-driven development using MCP tools.

## CRITICAL FIRST STEP
**ALWAYS call the spec-workflow-guide tool FIRST** when users request:
- Spec creation or feature development
- Any mention of specifications, requirements, design, or tasks
- Working on new features or project planning

The spec-workflow-guide tool contains the complete workflow instructions that MUST be followed exactly.

## Key Principles
- Use ONLY the provided MCP tools - never create documents manually
- Follow the exact workflow sequence: Requirements → Design → Tasks → Implementation
- Request user approval after EACH document before proceeding
- Never skip steps or phases

## Available Tools Overview
- **spec-workflow-guide**: Get complete workflow instructions (call this FIRST)
- **get-template-context**: Load specification templates
- **get-steering-context**: Load project steering documents (optional)
- **create-spec-doc**: Create requirements, design, or tasks documents
- **request-approval**: Request user approval for documents
- **get-approval-status**: Check approval status
- **delete-approval**: Clean up completed approvals
- **manage-tasks**: Track implementation progress

Remember: The spec-workflow-guide tool contains all the detailed instructions you need to follow. Call it first, then execute the workflow it describes exactly.`
    }, {
      capabilities: {
        tools: {},
        resources: { subscribe: false }
      }
    });
  }

  async initialize(projectPath: string, startDashboard: boolean = true) {
    this.projectPath = projectPath;
    try {
      // Validate project path
      await validateProjectPath(this.projectPath);
      
      // Initialize session manager
      this.sessionManager = new SessionManager(this.projectPath);
      
      // Start dashboard if requested
      if (startDashboard) {
        this.dashboardServer = new DashboardServer({
          projectPath: this.projectPath,
          autoOpen: true
        });
        this.dashboardUrl = await this.dashboardServer.start();
        
        // Create session tracking (overwrites any existing session.json)
        await this.sessionManager.createSession(this.dashboardUrl);
      }
      
      // Create context for tools
      const context = {
        projectPath: this.projectPath,
        dashboardUrl: this.dashboardUrl,
        sessionManager: this.sessionManager
      };
      
      // Register handlers
      this.setupHandlers(context);
      
      // Connect to stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      // MCP server initialized successfully
      
    } catch (error) {
      throw error;
    }
  }

  private setupHandlers(context: any) {
    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: registerTools()
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        return await handleToolCall(request.params.name, request.params.arguments || {}, context);
      } catch (error: any) {
        throw new McpError(ErrorCode.InternalError, error.message);
      }
    });

    // Resource handlers  
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: registerResources(this.projectPath)
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        return await handleResourceOperation(request.params.uri, this.projectPath);
      } catch (error: any) {
        throw new McpError(ErrorCode.InternalError, error.message);
      }
    });
  }

  async stop() {
    // Stop dashboard
    if (this.dashboardServer) {
      await this.dashboardServer.stop();
    }
    
    // Stop MCP server
    await this.server.close();
  }
  
  getDashboardUrl(): string | undefined {
    return this.dashboardUrl;
  }
}