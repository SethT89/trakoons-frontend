import { useEffect, useRef, useCallback, useState } from 'react';
import { ServerMessage } from './gameTypes';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

type MessageHandler = (msg: ServerMessage) => void;

export function useGameSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<MessageHandler[]>([]);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        handlersRef.current.forEach(h => h(msg));
      } catch { /* ignore malformed messages */ }
    };
    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 2000);
    };
    ws.onerror = () => { ws.close(); };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const onMessage = useCallback((handler: MessageHandler) => {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter(h => h !== handler);
    };
  }, []);

  return { send, onMessage, connected };
}
