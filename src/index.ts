#!/usr/bin/env node

import { SpecWorkflowMCPServer } from './server.js';
import { DashboardServer } from './dashboard/server.js';

function parseArguments(args: string[]): { projectPath: string; isDashboardMode: boolean; port?: number } {
  const isDashboardMode = args.includes('--dashboard');
  let customPort: number | undefined;
  
  // Parse --port parameter (supports --port 3000 and --port=3000 formats)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--port=')) {
      // Handle --port=3000 format
      const portStr = arg.split('=')[1];
      if (portStr) {
        const parsed = parseInt(portStr, 10);
        if (isNaN(parsed)) {
          throw new Error(`Invalid port number: ${portStr}. Port must be a number.`);
        }
        if (parsed < 1024 || parsed > 65535) {
          throw new Error(`Port ${parsed} is out of range. Port must be between 1024 and 65535.`);
        }
        customPort = parsed;
      } else {
        throw new Error('--port parameter requires a value (e.g., --port=3000)');
      }
    } else if (arg === '--port' && i + 1 < args.length) {
      // Handle --port 3000 format
      const portStr = args[i + 1];
      const parsed = parseInt(portStr, 10);
      if (isNaN(parsed)) {
        throw new Error(`Invalid port number: ${portStr}. Port must be a number.`);
      }
      if (parsed < 1024 || parsed > 65535) {
        throw new Error(`Port ${parsed} is out of range. Port must be between 1024 and 65535.`);
      }
      customPort = parsed;
      i++; // Skip the next argument as it's the port value
    } else if (arg === '--port') {
      throw new Error('--port parameter requires a value (e.g., --port 3000)');
    }
  }
  
  // Get project path (filter out flags and their values)
  const filteredArgs = args.filter((arg, index) => {
    if (arg === '--dashboard') return false;
    if (arg.startsWith('--port=')) return false;
    if (arg === '--port') return false;
    // Check if this arg is a port value following --port
    if (index > 0 && args[index - 1] === '--port') return false;
    return true;
  });
  
  const projectPath = filteredArgs[0] || process.cwd();
  
  return { projectPath, isDashboardMode, port: customPort };
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const { projectPath, isDashboardMode, port } = parseArguments(args);
    
    if (isDashboardMode) {
      // Dashboard only mode
      console.log(`Starting Spec Workflow Dashboard for project: ${projectPath}`);
      if (port) {
        console.log(`Using custom port: ${port}`);
      }
      
      const dashboardServer = new DashboardServer({
        projectPath,
        autoOpen: true,
        port
      });
      
      const dashboardUrl = await dashboardServer.start();
      console.log(`Dashboard started at: ${dashboardUrl}`);
      console.log('Press Ctrl+C to stop the dashboard');
      
      // Handle graceful shutdown
      const shutdown = async () => {
        console.log('\nShutting down dashboard...');
        await dashboardServer.stop();
        process.exit(0);
      };
      
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
      
      // Keep the process running
      process.stdin.resume();
      
    } else {
      // MCP server only mode
      const server = new SpecWorkflowMCPServer();
      await server.initialize(projectPath, false);
      
      // Start monitoring for dashboard session
      server.startDashboardMonitoring();
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        await server.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        await server.stop();
        process.exit(0);
      });
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main().catch(() => process.exit(1));