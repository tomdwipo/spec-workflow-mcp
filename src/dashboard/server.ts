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
        const detailedTaskInfo = this.parseDetailedTasks(tasksContent);
        
        return {
          total: spec.taskProgress?.total || 0,
          completed: spec.taskProgress?.completed || 0,
          inProgress: detailedTaskInfo.inProgressTask,
          progress: spec.taskProgress ? (spec.taskProgress.completed / spec.taskProgress.total) * 100 : 0,
          taskList: detailedTaskInfo.tasks,
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

  // Private method to parse detailed task information
  private parseDetailedTasks(tasksContent: string): { tasks: any[], inProgressTask: string | null } {
    const lines = tasksContent.split('\n');
    const tasks: any[] = [];
    let inProgressTask: string | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const checkboxMatch = line.match(/^-\s+\[([ x\-])\]\s+(.+)/);
      
      if (checkboxMatch) {
        const status = checkboxMatch[1];
        const taskText = checkboxMatch[2];
        
        // Extract task number and description
        const taskMatch = taskText.match(/^(\d+(?:\.\d+)*)\.\s+(.+)/);
        const taskId = taskMatch ? taskMatch[1] : tasks.length + 1;
        const description = taskMatch ? taskMatch[2] : taskText;
        
        // Parse additional details from following lines
        const requirements: string[] = [];
        const leverage: string[] = [];
        const files: string[] = [];
        const purposes: string[] = [];
        const implementationDetails: string[] = [];
        
        // Look ahead for requirements, leverage, files, purpose, and implementation details
        let j = i + 1;
        while (j < lines.length) {
          const detailLine = lines[j].trim();
          
          // Stop if we hit another task (checkbox line) or empty line followed by task
          if (detailLine.match(/^-\s+\[([ x\-])\]\s+(.+)/)) {
            break;
          }
          
          // Stop if we hit a section header or non-detail line
          if (detailLine && !detailLine.startsWith('-') && !detailLine.startsWith(' ')) {
            break;
          }
          
          // Skip empty lines
          if (!detailLine) {
            j++;
            continue;
          }
          
          // Only process lines that start with '-' (bullet points for this task)
          if (detailLine.startsWith('-')) {
            if (detailLine.includes('_Requirements:')) {
              // Handle both formats: _Requirements: 1.0, 2.1_ and _Requirements: 1.0, 2.1
              const reqMatch = detailLine.match(/_Requirements:\s*(.+?)_?$/);
              if (reqMatch) {
                const reqText = reqMatch[1].replace(/_$/, ''); // Remove trailing underscore if present
                requirements.push(...reqText.split(',').map(r => r.trim()));
              }
            } else if (detailLine.includes('_Leverage:')) {
              // Handle both formats: _Leverage: file.ts_ and _Leverage: file.ts
              const levMatch = detailLine.match(/_Leverage:\s*(.+?)_?$/);
              if (levMatch) {
                const levText = levMatch[1].replace(/_$/, ''); // Remove trailing underscore if present
                leverage.push(...levText.split(',').map(l => l.trim()));
              }
            } else if (detailLine.startsWith('- File:') || detailLine.startsWith('- Files:')) {
              const fileMatch = detailLine.match(/^-\s+Files?:\s*(.+)$/);
              if (fileMatch) {
                files.push(fileMatch[1].trim());
              }
            } else if (detailLine.startsWith('- Purpose:')) {
              const purposeMatch = detailLine.match(/^-\s+Purpose:\s*(.+)$/);
              if (purposeMatch) {
                purposes.push(purposeMatch[1].trim());
              }
            } else if (!detailLine.includes('_Requirements:') && 
                       !detailLine.includes('_Leverage:') && 
                       !detailLine.startsWith('- File:') && 
                       !detailLine.startsWith('- Files:') && 
                       !detailLine.startsWith('- Purpose:')) {
              // This is an implementation detail bullet point
              implementationDetails.push(detailLine.substring(1).trim());
            }
          }
          j++;
        }
        
        const task = {
          id: taskId,
          description,
          completed: status === 'x',
          inProgress: status === '-',
          requirements,
          leverage: leverage.join(', ') || undefined,
          files,
          purposes,
          implementationDetails
        };
        
        tasks.push(task);
        
        if (status === '-') {
          inProgressTask = taskId.toString();
        }
        
        // Advance the main loop index to skip the lines we already processed
        i = j - 1;
      }
    }
    
    return { tasks, inProgressTask };
  }
}