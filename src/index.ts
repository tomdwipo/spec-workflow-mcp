#!/usr/bin/env node

import { SpecWorkflowMCPServer } from './server.js';
import { DashboardServer } from './dashboard/server.js';

async function main() {
  try {
    const args = process.argv.slice(2);
    const isDashboardMode = args.includes('--dashboard');
    
    // Get project path (filter out --dashboard flag)
    const projectPath = args.filter(arg => arg !== '--dashboard')[0] || process.cwd();
    
    if (isDashboardMode) {
      // Dashboard only mode
      console.log(`Starting Spec Workflow Dashboard for project: ${projectPath}`);
      
      const dashboardServer = new DashboardServer({
        projectPath,
        autoOpen: true
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