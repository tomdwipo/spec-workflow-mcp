import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import { PathUtils } from '../core/path-utils.js';
import { SpecParser, ParsedSpec } from './parser.js';

export interface SpecChangeEvent {
  type: 'spec' | 'steering';
  action: 'created' | 'updated' | 'deleted';
  name: string;
  data?: ParsedSpec | any;
}

export class SpecWatcher extends EventEmitter {
  private projectPath: string;
  private parser: SpecParser;
  private watcher?: chokidar.FSWatcher;

  constructor(projectPath: string, parser: SpecParser) {
    super();
    this.projectPath = projectPath;
    this.parser = parser;
  }

  async start(): Promise<void> {
    const workflowRoot = PathUtils.getWorkflowRoot(this.projectPath);
    const specsPath = PathUtils.getSpecPath(this.projectPath, '');
    const steeringPath = PathUtils.getSteeringPath(this.projectPath);

    // Watch for changes in specs and steering directories
    this.watcher = chokidar.watch([
      `${specsPath}/**/*.md`,
      `${steeringPath}/*.md`
    ], {
      ignoreInitial: true,
      persistent: true,
      ignorePermissionErrors: true
    });

    this.watcher.on('add', (filePath) => this.handleFileChange('created', filePath));
    this.watcher.on('change', (filePath) => this.handleFileChange('updated', filePath));
    this.watcher.on('unlink', (filePath) => this.handleFileChange('deleted', filePath));

    console.log('File watcher started for workflow directories');
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      console.log('File watcher stopped');
    }
  }

  private async handleFileChange(action: 'created' | 'updated' | 'deleted', filePath: string): Promise<void> {
    try {
      const normalizedPath = filePath.replace(/\\/g, '/');
      
      // Determine if this is a spec or steering change
      if (normalizedPath.includes('/specs/')) {
        await this.handleSpecChange(action, normalizedPath);
      } else if (normalizedPath.includes('/steering/')) {
        await this.handleSteeringChange(action, normalizedPath);
      }
    } catch (error) {
      console.error('Error handling file change:', error);
    }
  }

  private async handleSpecChange(action: 'created' | 'updated' | 'deleted', filePath: string): Promise<void> {
    // Extract spec name from path like: /path/to/.spec-workflow/specs/user-auth/requirements.md
    const pathParts = filePath.split('/');
    const specsIndex = pathParts.findIndex(part => part === 'specs');
    
    if (specsIndex === -1 || specsIndex + 1 >= pathParts.length) return;
    
    const specName = pathParts[specsIndex + 1];
    const document = pathParts[specsIndex + 2]?.replace('.md', '');

    let specData: ParsedSpec | null = null;
    if (action !== 'deleted') {
      specData = await this.parser.getSpec(specName);
    }

    const event: SpecChangeEvent = {
      type: 'spec',
      action,
      name: specName,
      data: specData
    };

    console.log(`Spec change detected: ${specName}/${document} was ${action}`);
    this.emit('change', event);
  }


  private async handleSteeringChange(action: 'created' | 'updated' | 'deleted', filePath: string): Promise<void> {
    // Extract document name from path like: /path/to/.spec-workflow/steering/tech.md
    const pathParts = filePath.split('/');
    const document = pathParts[pathParts.length - 1]?.replace('.md', '');

    const steeringStatus = await this.parser.getProjectSteeringStatus();

    const event = {
      type: 'steering' as const,
      action,
      name: document,
      steeringStatus
    };

    console.log(`Steering change detected: ${document} was ${action}`);
    this.emit('steering-change', event);
  }
}