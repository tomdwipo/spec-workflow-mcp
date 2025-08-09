import React, { useEffect, useState } from 'react';
import { ApiProvider, useApi } from '../api/api';
import { useWs } from '../ws/WebSocketProvider';

function copyCommand(command: string) {
  navigator.clipboard.writeText(command);
}

function Content() {
  const { initial, version } = useWs();
  const { specs, approvals, reloadAll } = useApi();
  const { info } = useApi();
  const [steeringNoticeCollapsed, setSteeringNoticeCollapsed] = useState(false);

  useEffect(() => {
    reloadAll();
  }, [reloadAll, version]);
  useEffect(() => {
    if (!initial) reloadAll();
  }, [initial, reloadAll]);

  const totalSpecs = specs.length;
  const totalTasks = specs.reduce((acc, s) => acc + (s.taskProgress?.total || 0), 0);
  const completedTasks = specs.reduce((acc, s) => acc + (s.taskProgress?.completed || 0), 0);
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const taskSummary = totalSpecs > 0 
    ? `${totalTasks} tasks across ${totalSpecs} spec${totalSpecs === 1 ? '' : 's'}`
    : 'No active specs';

  const steering = info?.steering;
  const steeringIncomplete = !!steering && (!steering.exists || !steering.documents?.product || !steering.documents?.tech || !steering.documents?.structure);

  return (
    <div className="space-y-8">
      {/* Project Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              {info?.projectName || 'Spec Workflow'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Development workflow dashboard
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>System Active</span>
          </div>
        </div>
      </div>

      {/* Steering Documents Warning */}
      {steeringIncomplete && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                    Steering System Incomplete
                  </h3>
                  <button
                    onClick={() => setSteeringNoticeCollapsed(!steeringNoticeCollapsed)}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800/20"
                  >
                    <svg className={`w-4 h-4 transform transition-transform ${steeringNoticeCollapsed ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                {!steeringNoticeCollapsed && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <strong>Note:</strong> This is most helpful for existing codebases. For new projects, you may want to create these documents as you go.
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-amber-800 dark:text-amber-200 mb-3">
                        Initialize your project's steering documents for AI-assisted development:
                      </p>
                      <button
                        onClick={() => copyCommand('Setup steering documents for my project')}
                        className="w-full px-4 py-3 bg-amber-100 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-700 transition-all duration-200 text-left font-mono text-sm flex items-center gap-3 group"
                      >
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Setup steering documents for my project
                      </button>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">Missing Components:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {!steering.documents?.product && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-sm text-red-800 dark:text-red-200">Product Vision</span>
                          </div>
                        )}
                        {!steering.documents?.tech && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-sm text-red-800 dark:text-red-200">Tech Stack</span>
                          </div>
                        )}
                        {!steering.documents?.structure && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-sm text-red-800 dark:text-red-200">Project Structure</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Specs Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Specifications</div>
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{totalSpecs}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Active specs</div>
        </div>

        {/* Tasks Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Task Progress</div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">{completedTasks}</div>
            <div className="text-lg text-gray-600 dark:text-gray-400">/ {totalTasks}</div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{taskSummary}</div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${taskCompletionRate}%` }}
            />
          </div>
        </div>

        {/* Approvals Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center ${approvals.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
              <svg className={`w-4 h-4 ${approvals.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {approvals.length > 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Approvals</div>
          </div>
          <div className={`text-2xl font-semibold mb-1 ${approvals.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
            {approvals.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {approvals.length > 0 ? 'Awaiting review' : 'All clear'}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Dashboard</div>
              <div className="text-xs text-green-600 dark:text-green-400">Online</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Specifications</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">{totalSpecs} active</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Workflow</div>
              <div className="text-xs text-purple-600 dark:text-purple-400">Synchronized</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardStatistics() {
  const { initial } = useWs();
  return (
    <ApiProvider initial={initial}>
      <Content />
    </ApiProvider>
  );
}


