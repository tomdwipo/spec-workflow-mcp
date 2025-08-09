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
          console.log('[WebSocket] Received message:', msg);
          if (msg.type === 'initial') {
            console.log('[WebSocket] Setting initial data:', msg.data);
            setInitial({ specs: msg.data?.specs || [], approvals: msg.data?.approvals || [] });
          } else if (msg.type === 'update' || msg.type === 'task-update' || msg.type === 'steering-update' || msg.type === 'approval-update') {
            console.log('[WebSocket] Triggering version update for:', msg.type);
            setTimeout(() => {
              console.log('[WebSocket] Version increment triggered');
              setVersion((v) => {
                console.log('[WebSocket] Version changing from', v, 'to', v + 1);
                return v + 1;
              });
            }, 200);
          }
        } catch (e) {
          console.log('[WebSocket] Failed to parse message:', e);
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


