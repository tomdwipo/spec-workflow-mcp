#!/usr/bin/env node

import { SpecWorkflowMCPServer } from './server.js';

async function main() {
  try {
    // Get project path from arguments or current directory
    const projectPath = process.argv[2] || process.cwd();
    
    // Create and initialize server
    const server = new SpecWorkflowMCPServer();
    await server.initialize(projectPath);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    process.exit(1);
  }
}

main().catch(() => process.exit(1));