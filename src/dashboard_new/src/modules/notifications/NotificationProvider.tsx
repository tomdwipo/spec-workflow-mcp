import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useApi } from '../api/api';

type NotificationContextType = {
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  notifications: Array<{ id: string; message: string; type: 'info' | 'success' | 'warning' | 'error'; timestamp: number }>;
  removeNotification: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { approvals } = useApi();
  const prevApprovalsRef = useRef<typeof approvals>([]);
  const isInitialLoadRef = useRef(true);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: 'info' | 'success' | 'warning' | 'error'; timestamp: number }>>([]);

  // Play notification sound
  const playNotificationSound = useCallback(async () => {
    try {
      // Create audio context (may need user interaction)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if it's suspended (required by browser autoplay policies)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Could not play notification sound:', error);
    }
  }, []);


  // Show toast notification
  const showNotification = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    console.log('Showing notification:', message, type);
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const notification = { id, message, type, timestamp: Date.now() };
    
    setNotifications(prev => {
      const newNotifications = [...prev, notification];
      console.log('Current notifications:', newNotifications);
      return newNotifications;
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      console.log('Removing notification:', id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Remove notification manually
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Detect new approvals
  useEffect(() => {
    console.log('[NotificationProvider] Approval detection triggered');
    console.log('[NotificationProvider] Current approvals:', approvals.length, approvals.map(a => ({ id: a.id, title: a.title })));
    console.log('[NotificationProvider] Previous approvals:', prevApprovalsRef.current.length, prevApprovalsRef.current.map(a => ({ id: a.id, title: a.title })));
    console.log('[NotificationProvider] Initial load ref:', isInitialLoadRef.current);
    
    if (isInitialLoadRef.current) {
      // Skip notification on initial load
      console.log('[NotificationProvider] Initial load, skipping notifications');
      prevApprovalsRef.current = approvals;
      isInitialLoadRef.current = false;
      return;
    }

    // Find new approvals by comparing IDs (not just array length)
    const prevIds = new Set(prevApprovalsRef.current.map(a => a.id));
    const newApprovals = approvals.filter(a => !prevIds.has(a.id));
    
    console.log('[NotificationProvider] Previous IDs:', Array.from(prevIds));
    console.log('[NotificationProvider] Current IDs:', approvals.map(a => a.id));
    console.log('[NotificationProvider] New approvals found:', newApprovals.map(a => ({ id: a.id, title: a.title })));
    
    if (newApprovals.length > 0) {
      console.log('[NotificationProvider] Processing', newApprovals.length, 'new approvals');
      
      // Play sound
      console.log('[NotificationProvider] Calling playNotificationSound');
      playNotificationSound();
      
      // Show notifications for each new approval
      newApprovals.forEach(approval => {
        const message = `New approval request: ${approval.title}`;
        console.log('[NotificationProvider] Creating notification for:', approval.title);
        showNotification(message, 'info');
      });
    } else {
      console.log('[NotificationProvider] No new approvals detected');
    }

    console.log('[NotificationProvider] Updating previous approvals ref');
    prevApprovalsRef.current = approvals;
  }, [approvals, playNotificationSound, showNotification]);

  const value = {
    showNotification,
    notifications,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToasts />
    </NotificationContext.Provider>
  );
}

// Toast notifications component
function NotificationToasts() {
  const { notifications, removeNotification } = useNotifications();
  
  console.log('NotificationToasts rendering with:', notifications.length, 'notifications');

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.length > 0 && console.log('Rendering', notifications.length, 'toast notifications')}
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`rounded-lg p-4 shadow-lg border transition-all duration-300 ease-in-out ${
            notification.type === 'error' 
              ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
              : notification.type === 'warning'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200'  
              : notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
              : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <svg 
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  notification.type === 'error' ? 'text-red-500' :
                  notification.type === 'warning' ? 'text-yellow-500' :
                  notification.type === 'success' ? 'text-green-500' :
                  'text-blue-500'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {notification.type === 'error' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : notification.type === 'warning' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                ) : notification.type === 'success' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <p className="text-sm font-medium break-words">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function useNotifications(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}