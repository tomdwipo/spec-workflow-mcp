import fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { join, dirname, basename } from 'path';
import { readFile } from 'fs/promises';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { SpecWatcher } from './watcher.js';
import { SpecParser } from './parser.js';
import open from 'open';
import { WebSocket } from 'ws';
import { findAvailablePort } from './utils.js';
import { ApprovalStorage } from './approval-storage.js';
import { parseTasksFromMarkdown } from '../core/task-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface WebSocketConnection {
  socket: WebSocket;
}

export interface DashboardOptions {
  projectPath: string;
  autoOpen?: boolean;
}

export class DashboardServer {
  private app: FastifyInstance;
  private watcher: SpecWatcher;
  private parser: SpecParser;
  private approvalStorage: ApprovalStorage;
  private options: DashboardOptions;
  private actualPort: number = 0;
  private clients: Set<WebSocket> = new Set();

  constructor(options: DashboardOptions) {
    this.options = options;
    this.parser = new SpecParser(options.projectPath);
    this.watcher = new SpecWatcher(options.projectPath, this.parser);
    this.approvalStorage = new ApprovalStorage(options.projectPath);

    this.app = fastify({ logger: false });
  }

  async start() {
    // Register plugins
    await this.app.register(fastifyStatic, {
      root: join(__dirname, 'public'),
      prefix: '/',
    });

    await this.app.register(fastifyWebsocket);

    // WebSocket endpoint for real-time updates
    const self = this;
    this.app.register(async function (fastify) {
      fastify.get('/ws', { websocket: true }, (connection: WebSocketConnection) => {
        const socket = connection.socket;
        // WebSocket client connected

        // Add client to set
        self.clients.add(socket);

        // Send initial state
        Promise.all([
          self.parser.getAllSpecs(),
          self.approvalStorage.getAllPendingApprovals()
        ])
          .then(([specs, approvals]) => {
            socket.send(
              JSON.stringify({
                type: 'initial',
                data: { specs, approvals },
              })
            );
          })
          .catch((error) => {
            // Error getting initial data
          });

        // Handle client disconnect - ensure all scenarios are covered
        const cleanup = () => {
          self.clients.delete(socket);
          // Remove all listeners to prevent memory leaks
          socket.removeAllListeners();
        };

        socket.on('close', cleanup);
        socket.on('error', cleanup);
        
        // Additional safety for abnormal terminations
        socket.on('disconnect', cleanup);
        socket.on('end', cleanup);
      });
    });

    // Serve Claude icon as favicon
    this.app.get('/favicon.ico', async (request, reply) => {
      return reply.sendFile('claude-icon.svg');
    });

    // API endpoints
    this.app.get('/api/test', async () => {
      return { message: 'MCP Workflow Dashboard Online!' };
    });

    this.app.get('/api/specs', async () => {
      const specs = await this.parser.getAllSpecs();
      return specs;
    });


    this.app.get('/api/approvals', async () => {
      const approvals = await this.approvalStorage.getAllPendingApprovals();
      return approvals;
    });

    // Get file content for an approval request
    this.app.get('/api/approvals/:id/content', async (request, reply) => {
      const { id } = request.params as { id: string };
      
      try {
        const approval = await this.approvalStorage.getApproval(id);
        if (!approval || !approval.filePath) {
          return reply.code(404).send({ error: 'Approval not found or no file path' });
        }

        // Read the file content
        const fullPath = join(this.approvalStorage.projectPath, approval.filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        
        return { content, filePath: approval.filePath };
      } catch (error: any) {
        reply.code(500).send({ error: `Failed to read file: ${error.message}` });
      }
    });

    this.app.get('/api/info', async () => {
      const projectName = basename(this.options.projectPath) || 'Project';
      const steeringStatus = await this.parser.getProjectSteeringStatus();
      return { 
        projectName,
        steering: steeringStatus,
        dashboardUrl: `http://localhost:${this.actualPort}`
      };
    });

    this.app.get('/api/specs/:name', async (request, reply) => {
      const { name } = request.params as { name: string };
      const spec = await this.parser.getSpec(name);
      if (!spec) {
        reply.code(404).send({ error: 'Spec not found' });
      }
      return spec;
    });


    // Get raw markdown content for specs
    this.app.get('/api/specs/:name/:document', async (request, reply) => {
      const { name, document } = request.params as { name: string; document: string };
      const allowedDocs = ['requirements', 'design', 'tasks'];
      
      if (!allowedDocs.includes(document)) {
        reply.code(400).send({ error: 'Invalid document type' });
        return;
      }
      
      const docPath = join(this.options.projectPath, '.spec-workflow', 'specs', name, `${document}.md`);
      
      try {
        const content = await readFile(docPath, 'utf-8');
        return { content };
      } catch {
        reply.code(404).send({ error: 'Document not found' });
      }
    });

    // Get all spec documents for real-time viewing
    this.app.get('/api/specs/:name/all', async (request, reply) => {
      const { name } = request.params as { name: string };
      const specDir = join(this.options.projectPath, '.spec-workflow', 'specs', name);
      const documents = ['requirements', 'design', 'tasks'];
      const result: Record<string, { content: string; lastModified: string } | null> = {};
      
      for (const doc of documents) {
        const docPath = join(specDir, `${doc}.md`);
        try {
          const content = await readFile(docPath, 'utf-8');
          const stats = await fs.stat(docPath);
          result[doc] = {
            content,
            lastModified: stats.mtime.toISOString()
          };
        } catch {
          result[doc] = null;
        }
      }
      
      return result;
    });

    // Get task progress for a specific spec
    this.app.get('/api/specs/:name/tasks/progress', async (request, reply) => {
      const { name } = request.params as { name: string };
      
      try {
        const spec = await this.parser.getSpec(name);
        if (!spec || !spec.phases.tasks.exists) {
          return reply.code(404).send({ error: 'Spec or tasks not found' });
        }
        
        // Parse tasks.md file for detailed task information
        const tasksPath = join(this.options.projectPath, '.spec-workflow', 'specs', name, 'tasks.md');
        const tasksContent = await readFile(tasksPath, 'utf-8');
        const parseResult = parseTasksFromMarkdown(tasksContent);
        
        // Count tasks from our detailed parsing (includes all subtasks)
        const totalTasks = parseResult.summary.total;
        const completedTasks = parseResult.summary.completed;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        return {
          total: totalTasks,
          completed: completedTasks,
          inProgress: parseResult.inProgressTask,
          progress: progress,
          taskList: parseResult.tasks,
          lastModified: spec.phases.tasks.lastModified || spec.lastModified
        };
      } catch (error: any) {
        reply.code(500).send({ error: `Failed to get task progress: ${error.message}` });
      }
    });


    // Approval endpoints
    this.app.post('/api/approvals/:id/approve', async (request, reply) => {
      const { id } = request.params as { id: string };
      const { response, annotations, comments } = request.body as { 
        response: string; 
        annotations?: string;
        comments?: any[];
      };
      
      try {
        await this.approvalStorage.updateApproval(id, 'approved', response, annotations, comments);
        this.broadcastApprovalUpdate();
        return { success: true };
      } catch (error: any) {
        reply.code(404).send({ error: error.message });
      }
    });

    this.app.post('/api/approvals/:id/reject', async (request, reply) => {
      const { id } = request.params as { id: string };
      const { response, annotations, comments } = request.body as { 
        response: string; 
        annotations?: string;
        comments?: any[];
      };
      
      try {
        await this.approvalStorage.updateApproval(id, 'rejected', response, annotations, comments);
        this.broadcastApprovalUpdate();
        return { success: true };
      } catch (error: any) {
        reply.code(404).send({ error: error.message });
      }
    });

    this.app.post('/api/approvals/:id/needs-revision', async (request, reply) => {
      const { id } = request.params as { id: string };
      const { response, annotations, comments } = request.body as { 
        response: string; 
        annotations?: string;
        comments?: any[];
      };
      
      try {
        await this.approvalStorage.updateApproval(id, 'needs-revision', response, annotations, comments);
        this.broadcastApprovalUpdate();
        return { success: true };
      } catch (error: any) {
        reply.code(404).send({ error: error.message });
      }
    });

    // Set up file watcher for specs
    this.watcher.on('change', (event) => {
      // Broadcast to all connected clients
      const message = JSON.stringify({
        type: 'update',
        data: event,
      });

      this.clients.forEach((client) => {
        if (client.readyState === 1) {
          // WebSocket.OPEN
          client.send(message);
        }
      });
    });

    // Set up task update watcher
    this.watcher.on('task-update', (event) => {
      // Broadcast task updates to all connected clients
      const message = JSON.stringify({
        type: 'task-update',
        data: event,
      });

      this.clients.forEach((client) => {
        if (client.readyState === 1) {
          // WebSocket.OPEN
          client.send(message);
        }
      });
    });


    // Set up steering change watcher
    this.watcher.on('steering-change', (event) => {
      // Broadcast steering updates to all connected clients
      const message = JSON.stringify({
        type: 'steering-update',
        data: event.steeringStatus,
      });

      this.clients.forEach((client) => {
        if (client.readyState === 1) {
          // WebSocket.OPEN
          client.send(message);
        }
      });
    });

    // Set up approval file watcher
    this.approvalStorage.on('approval-change', () => {
      this.broadcastApprovalUpdate();
    });

    // Start watcher
    await this.watcher.start();
    await this.approvalStorage.start();

    // Allocate ephemeral port
    this.actualPort = await findAvailablePort();

    // Start server
    await this.app.listen({ port: this.actualPort, host: '0.0.0.0' });

    // Open browser if requested
    if (this.options.autoOpen) {
      await open(`http://localhost:${this.actualPort}`);
    }

    return `http://localhost:${this.actualPort}`;
  }

  private async broadcastApprovalUpdate() {
    try {
      const approvals = await this.approvalStorage.getAllPendingApprovals();
      const message = JSON.stringify({
        type: 'approval-update',
        data: approvals,
      });

      this.clients.forEach((client) => {
        if (client.readyState === 1) {
          // WebSocket.OPEN
          client.send(message);
        }
      });
    } catch (error) {
      // Error broadcasting approval update
    }
  }

  async stop() {
    // Close all WebSocket connections with proper cleanup
    this.clients.forEach((client) => {
      try {
        client.removeAllListeners();
        if (client.readyState === 1) {
          // WebSocket.OPEN
          client.close();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });
    this.clients.clear();

    // Remove all event listeners from watchers to prevent memory leaks
    this.watcher.removeAllListeners();
    this.approvalStorage.removeAllListeners();

    // Stop the watchers
    await this.watcher.stop();
    await this.approvalStorage.stop();

    // Close the Fastify server
    await this.app.close();
  }

  getUrl(): string {
    return `http://localhost:${this.actualPort}`;
  }

}