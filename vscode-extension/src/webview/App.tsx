import React, { useState, useEffect, useRef } from 'react';
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
  Settings,
  Copy,
  ChevronUp
} from 'lucide-react';
import { vscodeApi, type SpecData, type TaskProgressData, type ApprovalData, type SteeringStatus, type DocumentInfo, type SoundNotificationConfig } from '@/lib/vscode-api';
import { cn, formatDistanceToNow } from '@/lib/utils';
import { useVSCodeTheme } from '@/hooks/useVSCodeTheme';
import { useSoundNotifications } from '@/hooks/useSoundNotifications';

function App() {
  console.log('=== WEBVIEW APP.TSX STARTING ===');
  const theme = useVSCodeTheme();
  console.log('Current VS Code theme:', theme);
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
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [soundConfig, setSoundConfig] = useState<SoundNotificationConfig>({
    enabled: true,
    volume: 0.3,
    approvalSound: true,
    taskCompletionSound: true
  });
  const [soundUris, setSoundUris] = useState<{ [key: string]: string } | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Sound notifications - use config from VS Code settings
  const soundNotifications = useSoundNotifications({ 
    enabled: soundConfig.enabled, 
    volume: soundConfig.volume,
    soundUris: soundUris
  });
  
  // Previous state tracking for notifications (use refs to avoid triggering effects)
  const previousApprovals = useRef<ApprovalData[]>([]);
  const previousTaskData = useRef<TaskProgressData | null>(null);


  // Copy prompt function
  const copyTaskPrompt = (taskId: string) => {
    if (!selectedSpec) {
      return;
    }
    
    const command = `Please work on task ${taskId} for spec "${selectedSpec}"`;
    
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(command).then(() => {
        setCopiedTaskId(taskId);
        setTimeout(() => setCopiedTaskId(null), 2000);
      }).catch(() => {
        // Fallback to legacy method
        fallbackCopy(command, taskId);
      });
    } else {
      // Clipboard API not available
      fallbackCopy(command, taskId);
    }
  };

  const fallbackCopy = (text: string, taskId: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopiedTaskId(taskId);
        setTimeout(() => setCopiedTaskId(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    
    document.body.removeChild(textArea);
  };

  // Scroll to top function
  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    // Subscribe to messages from extension
    const unsubscribes = [
      vscodeApi.onMessage('specs-updated', (message: any) => {
        setSpecs(message.data || []);
        setLoading(false);
      }),
      vscodeApi.onMessage('tasks-updated', (message: any) => {
        console.log('=== App.tsx tasks-updated message ===');
        console.log('Message data:', message.data);
        console.log('Selected spec:', selectedSpec);
        console.log('Message spec:', message.data?.specName);
        
        // Update task data if we have data
        if (message.data) {
          console.log('Setting taskData with taskList count:', message.data.taskList?.length);
          console.log('Sample task (2.2) from message:', message.data.taskList?.find((t: any) => t.id === '2.2'));
          console.log('Tasks with metadata:', message.data.taskList?.filter((t: any) => 
            t.requirements?.length || t.implementationDetails?.length || t.files?.length || t.purposes?.length || t.leverage
          ).map((t: any) => ({ id: t.id, requirements: t.requirements, implementationDetails: t.implementationDetails })));
          
          setTaskData(message.data);
          
          // If we don't have a selected spec yet, but we got task data, update the selected spec
          if (!selectedSpec && message.data.specName) {
            console.log('Setting selected spec from task data:', message.data.specName);
            setSelectedSpec(message.data.specName);
          }
        }
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
      vscodeApi.onMessage('config-updated', (message: any) => {
        setSoundConfig(message.data || {
          enabled: true,
          volume: 0.3,
          approvalSound: true,
          taskCompletionSound: true
        });
      }),
      vscodeApi.onMessage('sound-uris-updated', (message: any) => {
        console.log('Received sound URIs from extension:', message.data);
        setSoundUris(message.data || null);
      }),
      vscodeApi.onMessage('navigate-to-approvals', (message: any) => {
        console.log('Navigating to approvals from native notification:', message.data);
        const { specName, approvalId: _approvalId } = message.data;
        
        // Switch to approvals tab
        setActiveTab('approvals');
        
        // Set the selected spec
        setSelectedSpec(specName);
        
        console.log('Switched to approvals tab, selected spec:', specName);
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

  // Scroll event listener for FAB visibility
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 200);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Sound notification: Detect new pending approvals
  useEffect(() => {
    if (approvals.length === 0) {
      // No approvals yet, just update the ref
      previousApprovals.current = approvals;
      return;
    }

    const currentPendingCount = approvals.filter(approval => approval.status === 'pending').length;
    const previousPendingCount = previousApprovals.current.filter(approval => approval.status === 'pending').length;

    // Check if we have new pending approvals
    if (currentPendingCount > previousPendingCount && previousApprovals.current.length > 0 && soundConfig.approvalSound) {
      console.log(`New pending approval detected: ${currentPendingCount} vs ${previousPendingCount}`);
      soundNotifications.playApprovalPending();
    }

    // Update the ref for next comparison
    previousApprovals.current = approvals;
  }, [approvals, soundNotifications, soundConfig.approvalSound]);

  // Sound notification: Detect task completion
  useEffect(() => {
    if (!taskData || !taskData.taskList) {
      // No task data yet, just update the ref
      previousTaskData.current = taskData;
      return;
    }

    // Check if we have previous data to compare against
    if (!previousTaskData.current || !previousTaskData.current.taskList) {
      previousTaskData.current = taskData;
      return;
    }

    // Compare completed task count
    const currentCompletedCount = taskData.taskList.filter(task => task.status === 'completed').length;
    const previousCompletedCount = previousTaskData.current.taskList.filter(task => task.status === 'completed').length;

    // If completed count increased, play completion sound
    if (currentCompletedCount > previousCompletedCount && soundConfig.taskCompletionSound) {
      console.log(`Task completion detected: ${currentCompletedCount} vs ${previousCompletedCount}`);
      soundNotifications.playTaskCompleted();
    }

    // Update the ref for next comparison
    previousTaskData.current = taskData;
  }, [taskData, soundNotifications, soundConfig.taskCompletionSound]);

  const handleRefresh = () => {
    setLoading(true);
    vscodeApi.refreshAll();
    vscodeApi.getSelectedSpec();
    vscodeApi.getConfig();
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
    <div className={cn("sidebar-root", `vscode-${theme}`)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
        {/* Sticky Header Section */}
        <div className="sidebar-sticky-header space-y-3">
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

          {/* Navigation Tabs */}
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
        </div>

        {/* Scrollable Content Section */}
        <div className="sidebar-scrollable-content" ref={scrollContainerRef}>

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
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="font-medium text-lg">{taskData.total}</div>
                      <div className="text-muted-foreground text-xs">Total</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="font-medium text-lg text-green-600">{taskData.completed}</div>
                      <div className="text-muted-foreground text-xs">Done</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="font-medium text-lg text-amber-600">{taskData.total - taskData.completed}</div>
                      <div className="text-muted-foreground text-xs">Left</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="font-medium text-lg text-blue-600">{Math.round(taskData.progress)}%</div>
                      <div className="text-muted-foreground text-xs">Progress</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Bar */}
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm">{Math.round(taskData.progress)}%</span>
                    </div>
                    <Progress value={taskData.progress} className="h-2" />
                  </CardContent>
                </Card>

                {/* Task List */}
                <div className="space-y-2">
                  {taskData.taskList?.map(task => {
                    // DEBUG: Log actual task properties
                    console.log(`🔍 TASK DEBUG [${task.id}]:`, {
                      id: task.id,
                      status: task.status,
                      completed: task.completed,
                      inProgress: task.inProgress,
                      hasInProgress: 'inProgress' in task,
                      allProps: Object.keys(task)
                    });
                    
                    return (
                    <Card key={task.id} className={cn(
                      "transition-colors",
                      task.isHeader && "border-purple-200 dark:border-slate-600 bg-purple-50 dark:bg-slate-800/60",
                      task.status === 'in-progress' && "border-orange-500",
                      task.completed && "border-green-500"
                    )}>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-sm flex-1",
                              task.isHeader 
                                ? "font-semibold text-purple-900 dark:text-purple-100" 
                                : "font-medium"
                            )}>
                              {task.isHeader ? 'Section' : 'Task'} {task.id}
                            </span>
                            {!task.isHeader && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-6 w-6 p-0",
                                    copiedTaskId === task.id && "text-green-600"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyTaskPrompt(task.id);
                                  }}
                                  title={copiedTaskId === task.id ? "Copied!" : "Copy prompt for AI agent"}
                                  disabled={copiedTaskId === task.id}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Select 
                                  value={task.completed ? 'completed' : (task.status || 'pending')} 
                                  onValueChange={(status: 'pending' | 'in-progress' | 'completed') => 
                                    handleTaskStatusUpdate(task.id, status)
                                  }
                                >
                                  <SelectTrigger className={cn(
                                    "w-auto h-6 px-2 text-xs border-0 focus:ring-0 focus:ring-offset-0",
                                    task.completed 
                                      ? "bg-primary text-primary-foreground" 
                                      : task.status === 'in-progress'
                                        ? "bg-secondary text-secondary-foreground" 
                                        : "bg-transparent border border-border text-foreground"
                                  )}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                            {task.isHeader && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs bg-purple-100 dark:bg-slate-700 text-purple-700 dark:text-slate-200 border-purple-300 dark:border-slate-500"
                              >
                                Task Group
                              </Badge>
                            )}
                          </div>
                          
                          <p className={cn(
                            "text-xs",
                            task.isHeader 
                              ? "text-slate-600 dark:text-slate-300" 
                              : "text-muted-foreground"
                          )}>{task.description}</p>

                          {/* Task Metadata */}
                          <div className="space-y-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                            {/* Files */}
                            {task.files && task.files.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                  Files:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {task.files.map((file, index) => (
                                    <span key={index} className="px-2 py-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-xs rounded border border-purple-200 dark:border-purple-800 font-mono">
                                      {file}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Implementation Details */}
                            {task.implementationDetails && task.implementationDetails.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                  Implementation:
                                </div>
                                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 ml-2">
                                  {task.implementationDetails.map((detail, index) => (
                                    <li key={index} className="leading-relaxed">{detail}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Purposes */}
                            {task.purposes && task.purposes.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                                  Purposes:
                                </div>
                                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 ml-2">
                                  {task.purposes.map((purpose, index) => (
                                    <li key={index} className="leading-relaxed">{purpose}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Requirements */}
                            {task.requirements && task.requirements.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                  Requirements:
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {task.requirements.join(', ')}
                                </div>
                              </div>
                            )}

                            {/* Leverage */}
                            {task.leverage && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                                  Leverage:
                                </div>
                                <div className="text-xs text-muted-foreground bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded px-2 py-1 font-mono">
                                  {task.leverage}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
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
            (() => {
              // Filter approvals to only show pending ones for the selected spec
              const pendingApprovals = approvals.filter(approval => 
                approval.status === 'pending' && approval.categoryName === selectedSpec
              );
              
              return pendingApprovals.length > 0 ? (
                <div className="space-y-2">
                  {pendingApprovals.map(approval => (
                    <Card key={approval.id}>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm">{approval.title}</h3>
                            <Badge variant="secondary" className="text-xs">
                              Pending
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
                          </div>
                          
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
                            {approval.filePath && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => vscodeApi.getApprovalContent(approval.id)}
                              >
                                Open in Editor
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No pending approvals for this specification
                </div>
              );
            })()
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">
              {specs.length === 0 ? 'No specifications found' : 'Select a specification above to view pending approvals'}
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
        </div>

        {/* Scroll to Top FAB */}
        {showScrollTop && (
          <Button
            className="fixed bottom-4 right-4 z-20 rounded-full w-10 h-10 p-0 shadow-lg"
            onClick={scrollToTop}
            title="Scroll to top"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        )}
      </Tabs>
    </div>
  );
}

export default App;