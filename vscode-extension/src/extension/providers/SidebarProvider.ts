import * as vscode from 'vscode';
import * as path from 'path';
import { SpecWorkflowService } from '../services/SpecWorkflowService';
import { Logger } from '../utils/logger';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'spec-workflow.sidebar';
  private _view?: vscode.WebviewView;
  private _currentSelectedSpec: string | null = null;
  private logger: Logger;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _specWorkflowService: SpecWorkflowService,
    private readonly _context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.logger = new Logger(outputChannel);
    // Set up automatic approval updates when files change
    this._specWorkflowService.setOnApprovalsChanged(() => {
      this.sendApprovals();
    });

    // Set up automatic task updates when files change
    this._specWorkflowService.setOnTasksChanged((specName: string) => {
      this.sendTasksForSpec(specName);
    });

    // Set up automatic spec documents updates when files change
    this._specWorkflowService.setOnSpecDocumentsChanged((specName: string) => {
      this.sendSpecDocumentsForSpec(specName);
      // Also refresh specs list to update the overall spec lastModified time in Overview tab
      this.sendSpecs();
    });

    // Set up automatic steering documents updates when files change
    this._specWorkflowService.setOnSteeringDocumentsChanged(() => {
      this.sendSteeringDocuments();
    });

    // Set up automatic specs list updates when directory changes
    this._specWorkflowService.setOnSpecsChanged(() => {
      this.sendSpecs();
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri,
        vscode.Uri.joinPath(this._extensionUri, 'webview-dist')
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'refresh-all':
          await this.refreshAllData();
          break;
        case 'get-specs':
          await this.sendSpecs();
          break;
        case 'get-tasks':
          await this.sendTasks(message.specName);
          break;
        case 'get-approvals':
          await this.sendApprovals();
          break;
        case 'get-steering':
          await this.sendSteering();
          break;
        case 'update-task-status':
          await this.updateTaskStatus(message.specName, message.taskId, message.status);
          break;
        case 'save-document':
          await this.saveDocument(message.specName, message.docType, message.content);
          break;
        case 'approve-request':
          await this.approveRequest(message.id, message.response);
          break;
        case 'reject-request':
          await this.rejectRequest(message.id, message.response);
          break;
        case 'request-revision-request':
          await this.requestRevisionRequest(message.id, message.response, message.annotations, message.comments);
          break;
        case 'get-approval-content':
          await this.sendApprovalContent(message.id);
          break;
        case 'get-spec-documents':
          await this.sendSpecDocuments(message.specName);
          break;
        case 'get-steering-documents':
          await this.sendSteeringDocuments();
          break;
        case 'open-document':
          await this.openDocument(message.specName, message.docType);
          break;
        case 'open-steering-document':
          await this.openSteeringDocument(message.docType);
          break;
        case 'refresh-all':
          await this.refreshAllData();
          break;
        case 'get-selected-spec':
          await this.sendSelectedSpec();
          break;
        case 'set-selected-spec':
          await this.setSelectedSpec(message.specName);
          break;
      }
    });

    // Initialize data
    this.refreshAllData();
  }

  private async refreshAllData() {
    console.log('SidebarProvider: Refreshing all data');
    await this._specWorkflowService.refreshData();
    await this.sendSpecs();
    await this.sendApprovals();
    await this.sendSteering();
    await this.sendSteeringDocuments();
    await this.sendSelectedSpec();
  }

  private async sendSpecs() {
    if (!this._view) {return;}
    
    try {
      console.log('SidebarProvider: Loading specs...');
      const specs = await this._specWorkflowService.getAllSpecs();
      console.log(`SidebarProvider: Sending ${specs.length} specs to webview`);
      this._view.webview.postMessage({
        type: 'specs-updated',
        data: specs
      });
    } catch (error) {
      console.error('SidebarProvider: Failed to load specs:', error);
      this.sendError('Failed to load specs: ' + (error as Error).message);
    }
  }

  private async sendTasks(specName: string) {
    if (!this._view) {return;}

    try {
      this.logger.log(`SidebarProvider: Getting tasks for spec: ${specName}`);
      const taskData = await this._specWorkflowService.getTaskProgress(specName);
      this.logger.log('SidebarProvider: Task data received from service:', {
        specName: taskData?.specName,
        total: taskData?.total,
        taskListCount: taskData?.taskList?.length,
        sampleTask2_2: taskData?.taskList?.find(t => t.id === '2.2'),
        allTasksWithMetadata: taskData?.taskList?.filter(t => 
          t.requirements?.length || t.implementationDetails?.length || t.files?.length || t.purposes?.length || t.leverage
        ).map(t => ({ id: t.id, requirements: t.requirements, implementationDetails: t.implementationDetails }))
      });
      
      this._view.webview.postMessage({
        type: 'tasks-updated',
        data: taskData
      });
      this.logger.log('SidebarProvider: Sent tasks-updated message to webview');
    } catch (error) {
      console.error('SidebarProvider: Failed to load tasks:', error);
      this.sendError('Failed to load tasks: ' + (error as Error).message);
    }
  }

  private async sendTasksForSpec(specName: string) {
    // Send tasks update for a specific spec in real-time
    // Only send if this spec is currently selected to avoid unnecessary updates
    console.log(`sendTasksForSpec: Called for spec ${specName}, currentSelected: ${this._currentSelectedSpec}`);
    if (!this._view || this._currentSelectedSpec !== specName) {
      console.log(`sendTasksForSpec: Skipping - no view or spec not selected`);
      return;
    }

    try {
      const taskData = await this._specWorkflowService.getTaskProgress(specName);
      console.log('sendTasksForSpec: Task data received from service:', JSON.stringify({
        specName: taskData?.specName,
        total: taskData?.total,
        taskListCount: taskData?.taskList?.length,
        sampleTask2_2: taskData?.taskList?.find(t => t.id === '2.2')
      }, null, 2));
      
      this._view.webview.postMessage({
        type: 'tasks-updated',
        data: taskData
      });
      console.log(`sendTasksForSpec: Sent real-time task update for spec: ${specName}`);
    } catch (error) {
      console.error(`Failed to send real-time task update for spec ${specName}:`, error);
      // Don't show error notification for real-time updates to avoid spam
    }
  }

  private async sendSpecDocumentsForSpec(specName: string) {
    // Send spec documents update for a specific spec in real-time
    // Only send if this spec is currently selected to avoid unnecessary updates
    console.log(`sendSpecDocumentsForSpec: Called for spec ${specName}, currentSelected: ${this._currentSelectedSpec}`);
    if (!this._view || this._currentSelectedSpec !== specName) {
      console.log(`sendSpecDocumentsForSpec: Skipping - no view or spec not selected`);
      return;
    }

    try {
      const documents = await this._specWorkflowService.getSpecDocuments(specName);
      console.log(`sendSpecDocumentsForSpec: Found ${documents.length} documents for ${specName}`);
      
      this._view.webview.postMessage({
        type: 'spec-documents-updated',
        data: documents
      });
      console.log(`sendSpecDocumentsForSpec: Sent real-time spec documents update for spec: ${specName}`);
    } catch (error) {
      console.error(`Failed to send real-time spec documents update for spec ${specName}:`, error);
      // Don't show error notification for real-time updates to avoid spam
    }
  }

  private async sendApprovals() {
    if (!this._view) {return;}

    try {
      const approvals = await this._specWorkflowService.getApprovals();
      this._view.webview.postMessage({
        type: 'approvals-updated',
        data: approvals
      });
    } catch (error) {
      this.sendError('Failed to load approvals: ' + (error as Error).message);
    }
  }

  private async sendSteering() {
    if (!this._view) {return;}

    try {
      const steering = await this._specWorkflowService.getSteeringStatus();
      this._view.webview.postMessage({
        type: 'steering-updated',
        data: steering
      });
    } catch (error) {
      this.sendError('Failed to load steering: ' + (error as Error).message);
    }
  }

  private async updateTaskStatus(specName: string, taskId: string, status: string) {
    try {
      await this._specWorkflowService.updateTaskStatus(specName, taskId, status);
      // Refresh task data
      await this.sendTasks(specName);
      this.sendNotification('Task status updated', 'success');
    } catch (error) {
      this.sendError('Failed to update task status: ' + (error as Error).message);
    }
  }

  private async saveDocument(specName: string, docType: string, content: string) {
    try {
      await this._specWorkflowService.saveDocument(specName, docType, content);
      this.sendNotification('Document saved successfully', 'success');
    } catch (error) {
      this.sendError('Failed to save document: ' + (error as Error).message);
    }
  }

  private async approveRequest(id: string, response: string) {
    try {
      await this._specWorkflowService.approveRequest(id, response);
      await this.sendApprovals();
      this.sendNotification('Request approved', 'success');
    } catch (error) {
      this.sendError('Failed to approve request: ' + (error as Error).message);
    }
  }

  private async rejectRequest(id: string, response: string) {
    try {
      await this._specWorkflowService.rejectRequest(id, response);
      await this.sendApprovals();
      this.sendNotification('Request rejected', 'success');
    } catch (error) {
      this.sendError('Failed to reject request: ' + (error as Error).message);
    }
  }

  private async requestRevisionRequest(id: string, response: string, annotations?: string, comments?: any[]) {
    try {
      await this._specWorkflowService.requestRevisionRequest(id, response, annotations, comments);
      await this.sendApprovals();
      this.sendNotification('Revision requested', 'success');
    } catch (error) {
      this.sendError('Failed to request revision: ' + (error as Error).message);
    }
  }

  private async sendApprovalContent(id: string) {
    try {
      // Open approval in editor instead of sending content to webview
      const success = await this._specWorkflowService.openApprovalInEditor(id);
      if (success) {
        this.sendNotification('Approval opened in editor', 'success');
      } else {
        this.sendError('Failed to open approval in editor');
      }
    } catch (error) {
      this.sendError('Failed to open approval content: ' + (error as Error).message);
    }
  }

  private sendError(message: string) {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'error',
        message
      });
    }
  }

  private sendNotification(message: string, level: 'info' | 'warning' | 'error' | 'success') {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'notification',
        message,
        level
      });
    }
  }

  private async sendSpecDocuments(specName: string) {
    if (!this._view) {return;}

    try {
      console.log(`SidebarProvider: Loading documents for spec ${specName}`);
      const documents = await this._specWorkflowService.getSpecDocuments(specName);
      console.log(`SidebarProvider: Found ${documents.length} documents for ${specName}:`, documents.map(d => `${d.name} (${d.exists ? 'exists' : 'missing'})`));
      this._view.webview.postMessage({
        type: 'spec-documents-updated',
        data: documents
      });
    } catch (error) {
      console.error('SidebarProvider: Failed to load spec documents:', error);
      this.sendError('Failed to load spec documents: ' + (error as Error).message);
    }
  }

  private async sendSteeringDocuments() {
    if (!this._view) {return;}

    try {
      const documents = await this._specWorkflowService.getSteeringDocuments();
      this._view.webview.postMessage({
        type: 'steering-documents-updated',
        data: documents
      });
    } catch (error) {
      this.sendError('Failed to load steering documents: ' + (error as Error).message);
    }
  }

  private async openDocument(specName: string, docType: string) {
    try {
      console.log(`SidebarProvider: Opening document ${docType} for spec ${specName}`);
      const docPath = await this._specWorkflowService.getDocumentPath(specName, docType);
      if (!docPath) {
        this.sendError('Document not found or invalid document type');
        return;
      }

      const uri = vscode.Uri.file(docPath);
      await vscode.window.showTextDocument(uri);
      console.log(`SidebarProvider: Successfully opened ${docPath}`);
    } catch (error) {
      console.error('SidebarProvider: Failed to open document:', error);
      this.sendError('Failed to open document: ' + (error as Error).message);
    }
  }

  private async openSteeringDocument(docType: string) {
    try {
      const docPath = this._specWorkflowService.getSteeringDocumentPath(docType);
      if (!docPath) {
        this.sendError('Invalid steering document type');
        return;
      }

      const uri = vscode.Uri.file(docPath);
      await vscode.window.showTextDocument(uri);
    } catch (error) {
      this.sendError('Failed to open steering document: ' + (error as Error).message);
    }
  }

  private async sendSelectedSpec() {
    if (!this._view) {return;}

    try {
      const selectedSpec = this._context.globalState.get<string>('selectedSpec', '');
      
      // Track the currently selected spec for real-time updates
      this._currentSelectedSpec = selectedSpec || null;
      
      console.log('SidebarProvider: Sending selected spec:', selectedSpec);
      this._view.webview.postMessage({
        type: 'selected-spec-updated',
        data: selectedSpec
      });
    } catch (error) {
      console.error('SidebarProvider: Failed to send selected spec:', error);
    }
  }

  private async setSelectedSpec(specName: string) {
    try {
      this.logger.log('SidebarProvider: Setting selected spec to:', specName);
      
      // Track the currently selected spec for real-time updates
      this._currentSelectedSpec = specName;
      
      await this._context.globalState.update('selectedSpec', specName);
      
      // Send confirmation back to webview
      await this.sendSelectedSpec();
      
      // Auto-load data for the selected spec
      if (specName) {
        await this.sendTasks(specName);
        await this.sendSpecDocuments(specName);
      }
    } catch (error) {
      console.error('SidebarProvider: Failed to set selected spec:', error);
      this.sendError('Failed to save selected specification: ' + (error as Error).message);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview
    const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'webview-dist', 'main.js');
    const stylePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'webview-dist', 'globals.css');

    // And get the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
    const styleUri = webview.asWebviewUri(stylePathOnDisk);

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <!--
          Use a content security policy to only allow loading images from https or from our extension directory,
          and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>Spec Workflow Dashboard</title>
        <style>
          /* Prevent FOUC */
          body {
            visibility: hidden;
          }
          body.loaded {
            visibility: visible;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}