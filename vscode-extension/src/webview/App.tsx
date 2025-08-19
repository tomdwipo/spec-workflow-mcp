import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  CheckSquare, 
  AlertCircle, 
  RefreshCw,
  BookOpen,
  Settings
} from 'lucide-react';
import { vscodeApi, type SpecData, type TaskProgressData, type ApprovalData, type SteeringStatus, type DocumentInfo } from '@/lib/vscode-api';
import { cn, formatDistanceToNow } from '@/lib/utils';

function App() {
  const [specs, setSpecs] = useState<SpecData[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  const [taskData, setTaskData] = useState<TaskProgressData | null>(null);
  const [approvals, setApprovals] = useState<ApprovalData[]>([]);
  const [specDocuments, setSpecDocuments] = useState<DocumentInfo[]>([]);
  const [steeringDocuments, setSteeringDocuments] = useState<DocumentInfo[]>([]);
  const [, setSteering] = useState<SteeringStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState<{message: string, level: 'info' | 'warning' | 'error' | 'success'} | null>(null);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to messages from extension
    const unsubscribes = [
      vscodeApi.onMessage('specs-updated', (message: any) => {
        setSpecs(message.data || []);
        setLoading(false);
      }),
      vscodeApi.onMessage('tasks-updated', (message: any) => {
        setTaskData(message.data);
      }),
      vscodeApi.onMessage('approvals-updated', (message: any) => {
        setApprovals(message.data || []);
      }),
      vscodeApi.onMessage('steering-updated', (message: any) => {
        setSteering(message.data);
      }),
      vscodeApi.onMessage('spec-documents-updated', (message: any) => {
        setSpecDocuments(message.data || []);
      }),
      vscodeApi.onMessage('steering-documents-updated', (message: any) => {
        setSteeringDocuments(message.data || []);
      }),
      vscodeApi.onMessage('selected-spec-updated', (message: any) => {
        setSelectedSpec(message.data || null);
      }),
      vscodeApi.onMessage('error', (message: any) => {
        console.error('Extension error:', message.message);
        setLoading(false);
      }),
      vscodeApi.onMessage('notification', (message: any) => {
        setNotification({ message: message.message, level: message.level });
        // Auto-hide notification after 3 seconds
        setTimeout(() => setNotification(null), 3000);
      }),
    ];

    // Initial data load
    handleRefresh();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    if (selectedSpec) {
      vscodeApi.getTasks(selectedSpec);
      vscodeApi.getSpecDocuments(selectedSpec);
    }
  }, [selectedSpec]);

  useEffect(() => {
    // Load steering documents on initial load
    vscodeApi.getSteeringDocuments();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    vscodeApi.refreshAll();
    vscodeApi.getSelectedSpec();
  };

  const handleSpecSelect = (specName: string) => {
    vscodeApi.setSelectedSpec(specName);
  };

  const handleTaskStatusUpdate = (taskId: string, status: 'pending' | 'in-progress' | 'completed') => {
    if (selectedSpec) {
      vscodeApi.updateTaskStatus(selectedSpec, taskId, status);
    }
  };

  // Calculate overall project statistics
  const projectStats = React.useMemo(() => {
    const totalSpecs = specs.length;
    const completedSpecs = specs.filter(spec => 
      spec.taskProgress && spec.taskProgress.completed === spec.taskProgress.total && spec.taskProgress.total > 0
    ).length;
    const totalTasks = specs.reduce((sum, spec) => sum + (spec.taskProgress?.total || 0), 0);
    const completedTasks = specs.reduce((sum, spec) => sum + (spec.taskProgress?.completed || 0), 0);
    
    return { totalSpecs, completedSpecs, totalTasks, completedTasks };
  }, [specs]);

  return (
    <div className="sidebar-root space-y-3">
      {/* Notification Banner */}
      {notification && (
        <div className={cn(
          "p-2 rounded text-xs font-medium",
          notification.level === 'success' && "bg-green-100 text-green-800 border border-green-200",
          notification.level === 'error' && "bg-red-100 text-red-800 border border-red-200",
          notification.level === 'warning' && "bg-yellow-100 text-yellow-800 border border-yellow-200",
          notification.level === 'info' && "bg-blue-100 text-blue-800 border border-blue-200"
        )}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="ml-2 hover:opacity-70"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Spec Workflow</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="text-xs">
            <Activity className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">
            <CheckSquare className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">
            <BookOpen className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="steering" className="text-xs">
            <Settings className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs">
            <AlertCircle className="h-3 w-3" />
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Project Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="text-muted-foreground">Specs</div>
                  <div className="font-medium">
                    {projectStats.completedSpecs} / {projectStats.totalSpecs}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Tasks</div>
                  <div className="font-medium">
                    {projectStats.completedTasks} / {projectStats.totalTasks}
                  </div>
                </div>
              </div>
              
              {projectStats.totalTasks > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Overall Progress</span>
                    <span>{Math.round((projectStats.completedTasks / projectStats.totalTasks) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(projectStats.completedTasks / projectStats.totalTasks) * 100} 
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {specs.slice(0, 3).map(spec => (
                  <div key={spec.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        spec.taskProgress && spec.taskProgress.completed === spec.taskProgress.total && spec.taskProgress.total > 0
                          ? "bg-green-500" : "bg-blue-500"
                      )} />
                      <span className="truncate">{spec.displayName}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(spec.lastModified)}
                    </span>
                  </div>
                ))}
                {specs.length === 0 && (
                  <div className="text-muted-foreground text-xs text-center py-2">
                    No specs found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Specification:</label>
              <Select value={selectedSpec || ''} onValueChange={handleSpecSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a specification" />
                </SelectTrigger>
                <SelectContent>
                  {specs.map(spec => (
                    <SelectItem key={spec.name} value={spec.name}>
                      {spec.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedSpec ? (
            taskData ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {selectedSpec.replace(/-/g, ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="text-center">
                        <div className="font-medium text-lg">{taskData.total}</div>
                        <div className="text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-lg text-green-600">{taskData.completed}</div>
                        <div className="text-muted-foreground">Done</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-lg text-blue-600">
                          {Math.round(taskData.progress)}%
                        </div>
                        <div className="text-muted-foreground">Progress</div>
                      </div>
                    </div>
                    <Progress value={taskData.progress} className="h-2" />
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {taskData.taskList?.slice(0, 20).map(task => task.isHeader ? (
                    <div key={task.id} className="py-2 border-b">
                      <h3 className="font-medium text-sm text-muted-foreground">{task.description}</h3>
                    </div>
                  ) : (
                    <Card key={task.id} className={cn(
                      "transition-colors",
                      task.completed && "opacity-60",
                      taskData.inProgress === task.id && "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                    )}>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Task {task.id}</span>
                            <Badge 
                              variant={task.completed ? "default" : task.status === 'in-progress' ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {task.completed ? 'Done' : task.status === 'in-progress' ? 'Active' : 'Pending'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                          
                          <div className="flex gap-1">
                            {(['pending', 'in-progress', 'completed'] as const).map(status => (
                              <Button
                                key={status}
                                variant={task.status === status ? "default" : "ghost"}
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTaskStatusUpdate(task.id, status);
                                }}
                              >
                                {status === 'in-progress' ? 'Active' : status.charAt(0).toUpperCase() + status.slice(1)}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">
                Loading tasks...
              </div>
            )
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">
              {specs.length === 0 ? 'No specifications found' : 'Select a specification above to view tasks'}
            </div>
          )}
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-3">
          {approvals.length > 0 ? (
            <div className="space-y-2">
              {approvals.map(approval => (
                <Card key={approval.id}>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm">{approval.title}</h3>
                        <Badge
                          variant={
                            approval.status === 'pending' ? "secondary" :
                            approval.status === 'approved' ? "default" :
                            approval.status === 'needs-revision' ? "destructive" :
                            "outline"
                          }
                          className="text-xs"
                        >
                          {approval.status === 'needs-revision' ? 'Needs Revision' :
                           approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                        </Badge>
                      </div>
                      {approval.description && (
                        <p className="text-xs text-muted-foreground">{approval.description}</p>
                      )}
                      {approval.filePath && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {approval.filePath}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Created: {formatDistanceToNow(approval.createdAt)}
                        {approval.respondedAt && (
                          <span> • Responded: {formatDistanceToNow(approval.respondedAt)}</span>
                        )}
                      </div>
                      {approval.response && (
                        <div className="text-xs bg-muted p-2 rounded mt-1">
                          <strong>Response:</strong> {approval.response}
                        </div>
                      )}
                      {approval.annotations && (
                        <div className="text-xs bg-muted p-2 rounded mt-1">
                          <strong>Annotations:</strong> {approval.annotations}
                        </div>
                      )}
                      {approval.comments && approval.comments.length > 0 && (
                        <div className="text-xs bg-muted p-2 rounded mt-1">
                          <strong>Comments:</strong> {approval.comments.length} comment(s)
                        </div>
                      )}
                      
                      {approval.status === 'pending' && (
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={processingApproval === approval.id}
                            onClick={() => {
                              setProcessingApproval(approval.id);
                              vscodeApi.approveRequest(approval.id, 'Approved');
                              setTimeout(() => setProcessingApproval(null), 2000);
                            }}
                          >
                            {processingApproval === approval.id ? 'Processing...' : 'Approve'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={processingApproval === approval.id}
                            onClick={() => {
                              setProcessingApproval(approval.id);
                              vscodeApi.rejectRequest(approval.id, 'Rejected');
                              setTimeout(() => setProcessingApproval(null), 2000);
                            }}
                          >
                            {processingApproval === approval.id ? 'Processing...' : 'Reject'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={processingApproval === approval.id}
                            onClick={() => {
                              setProcessingApproval(approval.id);
                              vscodeApi.requestRevisionRequest(approval.id, 'Needs revision');
                              setTimeout(() => setProcessingApproval(null), 2000);
                            }}
                          >
                            {processingApproval === approval.id ? 'Processing...' : 'Request Revision'}
                          </Button>
                        </div>
                      )}

                      {approval.filePath && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs mt-1"
                          onClick={() => vscodeApi.getApprovalContent(approval.id)}
                        >
                          📝 Open in Editor
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">
              No pending approvals
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Specification:</label>
              <Select value={selectedSpec || ''} onValueChange={handleSpecSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a specification" />
                </SelectTrigger>
                <SelectContent>
                  {specs.map(spec => (
                    <SelectItem key={spec.name} value={spec.name}>
                      {spec.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Specification Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSpec && (
                <div className="space-y-2">
                  {specDocuments.length > 0 ? (
                    specDocuments.map((doc) => (
                      <div key={doc.name} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1 space-y-1">
                          <div className="font-medium text-sm capitalize">{doc.name}.md</div>
                          {doc.exists && doc.lastModified && (
                            <div className="text-xs text-muted-foreground">
                              Modified {formatDistanceToNow(doc.lastModified)}
                            </div>
                          )}
                          {!doc.exists && (
                            <div className="text-xs text-muted-foreground">
                              File not found
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="h-6 px-2 text-xs"
                          disabled={!doc.exists}
                          onClick={() => vscodeApi.openDocument(selectedSpec, doc.name)}
                        >
                          Open
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No documents found for this specification
                    </div>
                  )}
                </div>
              )}
              {!selectedSpec && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {specs.length === 0 ? 'No specifications found' : 'Select a specification above to view documents'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steering Tab */}
        <TabsContent value="steering" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Steering Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {steeringDocuments.length > 0 ? (
                  steeringDocuments.map((doc) => (
                    <div key={doc.name} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-sm capitalize">{doc.name}.md</div>
                        {doc.exists && doc.lastModified && (
                          <div className="text-xs text-muted-foreground">
                            Modified {formatDistanceToNow(doc.lastModified)}
                          </div>
                        )}
                        {!doc.exists && (
                          <div className="text-xs text-muted-foreground">
                            File not found
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="h-6 px-2 text-xs"
                        disabled={!doc.exists}
                        onClick={() => vscodeApi.openSteeringDocument(doc.name)}
                      >
                        Open
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No steering documents found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;