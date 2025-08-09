import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

type InitialPayload = {
  specs: any[];
  approvals: any[];
};

type WsContextType = {
  connected: boolean;
  initial?: InitialPayload;
  version: number;
};

const WsContext = createContext<WsContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [initial, setInitial] = useState<InitialPayload | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let retryTimer: any;
    const connect = () => {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        retryTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => {
        // noop; close will handle retry
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'initial') {
            setInitial({ specs: msg.data?.specs || [], approvals: msg.data?.approvals || [] });
          } else if (msg.type === 'update' || msg.type === 'task-update' || msg.type === 'steering-update' || msg.type === 'approval-update') {
            // Debug task updates to see what data we get
            if (msg.type === 'task-update') {
              console.log('[WebSocket] Task update data:', msg.data);
            }
            setTimeout(() => setVersion((v) => v + 1), 200);
          }
        } catch {
          // ignore
        }
      };
    };
    connect();
    return () => {
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, []);

  const value = useMemo(() => ({ connected, initial, version }), [connected, initial, version]);
  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}

export function useWs(): WsContextType {
  const ctx = useContext(WsContext);
  if (!ctx) throw new Error('useWs must be used within WebSocketProvider');
  return ctx;
}


