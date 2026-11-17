import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ClientWsMessage,
  GameState,
  PlayerColorId,
  PlayerInput,
  RoomStatePayload,
  ServerWsMessage,
  SimEvent,
} from '../game/types';

export interface UseLanSocketResult {
  connected: boolean;
  playerId: string | null;
  room: RoomStatePayload | null;
  error: string | null;
  clearError: () => void;
  snapshotRef: React.MutableRefObject<GameState | null>;
  eventQueueRef: React.MutableRefObject<SimEvent[]>;
  connectAndSend: (msg: ClientWsMessage) => void;
  sendMessage: (msg: ClientWsMessage) => void;
  sendInput: (input: PlayerInput) => void;
  leaveRoom: () => void;
}

export function useLanSocket(): UseLanSocketResult {
  const wsRef = useRef<WebSocket | null>(null);
  const pendingMsgRef = useRef<ClientWsMessage | null>(null);
  const snapshotRef = useRef<GameState | null>(null);
  const eventQueueRef = useRef<SimEvent[]>([]);
  const lastInputRef = useRef<PlayerInput>({ left: false, right: false, jump: false });

  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openSocket = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return wsRef.current;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      if (pendingMsgRef.current) {
        ws.send(JSON.stringify(pendingMsgRef.current));
        pendingMsgRef.current = null;
      }
    };

    ws.onmessage = (ev) => {
      let msg: ServerWsMessage;
      try {
        msg = JSON.parse(ev.data as string) as ServerWsMessage;
      } catch {
        return;
      }

      if (msg.type === 'welcome') {
        setPlayerId(msg.playerId);
        setRoom(msg.room);
        setError(null);
      } else if (msg.type === 'room_update') {
        setRoom(msg.room);
      } else if (msg.type === 'snapshot') {
        snapshotRef.current = msg.state;
        if (msg.state.events && msg.state.events.length > 0) {
          eventQueueRef.current.push(...msg.state.events);
        }
      } else if (msg.type === 'error') {
        setError(msg.message);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };

    ws.onerror = () => {
      setError('Cannot connect to Node.js WebSocket server.');
    };

    return ws;
  }, []);

  const sendMessage = useCallback((msg: ClientWsMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const connectAndSend = useCallback(
    (msg: ClientWsMessage) => {
      setError(null);
      const ws = openSocket();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      } else {
        pendingMsgRef.current = msg;
      }
    },
    [openSocket],
  );

  const sendInput = useCallback((input: PlayerInput) => {
    const prev = lastInputRef.current;
    if (
      prev.left === input.left &&
      prev.right === input.right &&
      prev.jump === input.jump
    ) {
      return;
    }
    lastInputRef.current = { ...input };
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', input }));
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    snapshotRef.current = null;
    eventQueueRef.current = [];
    setRoom(null);
    setPlayerId(null);
    setConnected(false);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    connected,
    playerId,
    room,
    error,
    clearError: () => setError(null),
    snapshotRef,
    eventQueueRef,
    connectAndSend,
    sendMessage,
    sendInput,
    leaveRoom,
  };
}

export function detectDeviceType(): 'pc' | 'mobile' {
  if (typeof window === 'undefined') return 'pc';
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return coarse || uaMobile ? 'mobile' : 'pc';
}

export function saveLocalPlayerMeta(name: string, color: PlayerColorId): void {
  try {
    localStorage.setItem('pico_name', name);
    localStorage.setItem('pico_color', color);
  } catch {
    // ignore storage errors
  }
}

export function loadLocalPlayerMeta(): { name: string; color: PlayerColorId } {
  try {
    const name = localStorage.getItem('pico_name') || '';
    const color = (localStorage.getItem('pico_color') as PlayerColorId) || 'coral';
    return { name, color };
  } catch {
    return { name: '', color: 'coral' };
  }
}
