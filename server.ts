import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { WebSocket, WebSocketServer } from 'ws';
import {
  createStageState,
  getLevelCount,
  getLevelDef,
  stepSimulation,
} from './src/game/engine.ts';
import { getLevelsByBracket } from './src/game/levels.ts';
import {
  PLAYER_PALETTES,
  type ClientWsMessage,
  type GameState,
  type PlayerColorId,
  type PlayerInput,
  type PlayerSpec,
  type RoomMemberInfo,
  type RoomStatePayload,
  type ServerWsMessage,
  type SimEvent,
} from './src/game/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getArgFlag(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

const PORT = Number(getArgFlag('--port') || process.env.PORT || 3000);
const HOST = getArgFlag('--host') || process.env.HOST || '0.0.0.0';
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface ConnectedMember extends RoomMemberInfo {
  ws: WebSocket;
  input: PlayerInput;
}

interface RoomInstance {
  code: string;
  hostId: string;
  stageIndex: number;
  phase: 'lobby' | 'playing' | 'cleared';
  members: ConnectedMember[];
  gameState: GameState | null;
  pendingEvents: SimEvent[];
  totalTime: number;
  totalDeaths: number;
  tickCounter: number;
  timer: ReturnType<typeof setInterval> | null;
}

const rooms = new Map<string, RoomInstance>();
const clientToRoom = new Map<WebSocket, { roomCode: string; playerId: string }>();

function getLanAddresses(): string[] {
  const nets = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  addresses.sort((a, b) => {
    const score = (ip: string) =>
      ip.startsWith('192.168.')
        ? 0
        : ip.startsWith('10.')
          ? 1
          : ip.startsWith('172.')
            ? 2
            : ip.startsWith('169.254.')
              ? 9
              : 3;
    return score(a) - score(b);
  });
  return addresses;
}

function generateRoomCode(): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

function pickAvailableColor(room: RoomInstance, preferred?: PlayerColorId): PlayerColorId {
  const used = new Set(room.members.map((m) => m.color));
  if (preferred && !used.has(preferred)) return preferred;
  const free = PLAYER_PALETTES.find((p) => !used.has(p.id));
  return free ? free.id : preferred ?? PLAYER_PALETTES[room.members.length % PLAYER_PALETTES.length].id;
}

function toRoomPayload(room: RoomInstance): RoomStatePayload {
  return {
    code: room.code,
    hostId: room.hostId,
    stageIndex: room.stageIndex,
    phase: room.phase,
    totalTime: room.totalTime,
    totalDeaths: room.totalDeaths,
    members: room.members.map((m) => ({
      id: m.id,
      name: m.name,
      color: m.color,
      deviceType: m.deviceType,
      isHost: m.id === room.hostId,
      connected: m.connected,
    })),
  };
}

function sendMsg(ws: WebSocket, msg: ServerWsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastRoom(room: RoomInstance, msg: ServerWsMessage): void {
  const raw = JSON.stringify(msg);
  for (const m of room.members) {
    if (m.ws.readyState === WebSocket.OPEN) {
      m.ws.send(raw);
    }
  }
}

function stopRoomLoop(room: RoomInstance): void {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
}

function startStageInRoom(room: RoomInstance, stageIndex: number): void {
  stopRoomLoop(room);
  room.stageIndex = Math.max(0, Math.min(getLevelCount() - 1, stageIndex));
  room.phase = 'playing';
  room.pendingEvents = [];
  room.tickCounter = 0;

  const specs: PlayerSpec[] = room.members.map((m) => ({
    id: m.id,
    name: m.name,
    color: m.color,
    deviceType: m.deviceType,
  }));

  room.gameState = createStageState(room.stageIndex, specs);
  broadcastRoom(room, { type: 'room_update', room: toRoomPayload(room) });
  broadcastRoom(room, { type: 'snapshot', state: room.gameState });

  const FIXED_DT = 1 / 60;
  let lastTickMs = performance.now();
  let accumulatorSec = 0;

  room.timer = setInterval(() => {
    if (!room.gameState || room.phase !== 'playing') {
      stopRoomLoop(room);
      return;
    }

    const nowMs = performance.now();
    const frameSec = Math.min(0.05, Math.max(0, (nowMs - lastTickMs) / 1000));
    lastTickMs = nowMs;
    accumulatorSec += frameSec;

    const inputs: Record<string, PlayerInput> = {};
    for (const m of room.members) {
      inputs[m.id] = m.input;
    }

    let steps = 0;
    while (accumulatorSec >= FIXED_DT && steps < 3) {
      stepSimulation(room.gameState, inputs, FIXED_DT);
      if (room.gameState.events.length > 0) {
        room.pendingEvents.push(...room.gameState.events);
      }
      accumulatorSec -= FIXED_DT;
      steps++;
      if (room.gameState.status === 'cleared') break;
    }

    if (steps === 0) return;

    if (room.gameState.status === 'cleared') {
      room.phase = 'cleared';
      room.totalTime += room.gameState.elapsedTime;
      room.totalDeaths += room.gameState.deaths;
      const finalSnapshot: GameState = {
        ...room.gameState,
        events: room.pendingEvents.splice(0),
      };
      broadcastRoom(room, { type: 'snapshot', state: finalSnapshot });
      broadcastRoom(room, { type: 'room_update', room: toRoomPayload(room) });
      stopRoomLoop(room);
      return;
    }

    room.tickCounter += 1;
    // Broadcast snapshots consistently every ~22-30ms (every 2 substeps or on event)
    if (room.tickCounter % 2 === 0 || room.pendingEvents.length > 0) {
      const snapshot: GameState = {
        ...room.gameState,
        events: room.pendingEvents.splice(0),
      };
      broadcastRoom(room, { type: 'snapshot', state: snapshot });
    }
  }, 15);
}

function removeMemberFromCurrentRoom(ws: WebSocket): void {
  const link = clientToRoom.get(ws);
  if (!link) return;
  clientToRoom.delete(ws);

  const room = rooms.get(link.roomCode);
  if (!room) return;

  room.members = room.members.filter((m) => m.id !== link.playerId);
  if (room.members.length === 0) {
    stopRoomLoop(room);
    rooms.delete(room.code);
    return;
  }

  if (room.hostId === link.playerId) {
    room.hostId = room.members[0].id;
  }

  if (room.gameState && room.phase === 'playing') {
    room.gameState.players = room.gameState.players.filter((p) => p.id !== link.playerId);
    if (room.gameState.key.carrierId === link.playerId) {
      room.gameState.key.carrierId = null;
      room.gameState.key.collected = false;
      room.gameState.key.x = room.gameState.key.originX;
      room.gameState.key.y = room.gameState.key.originY;
    }
  }

  broadcastRoom(room, { type: 'room_update', room: toRoomPayload(room) });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  app.get('/api/lan-info', async (req, res) => {
    const ips = getLanAddresses();
    const roomCode = typeof req.query.room === 'string' ? req.query.room.toUpperCase() : '';
    const primaryIp = ips[0] || 'localhost';
    const baseUrl = `http://${primaryIp}:${PORT}`;
    const joinUrl = roomCode ? `${baseUrl}/?room=${encodeURIComponent(roomCode)}` : baseUrl;

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(joinUrl, {
        margin: 1,
        width: 220,
        color: { dark: '#1A1A1A', light: '#FFFFFF' },
      });
    } catch {
      qrDataUrl = '';
    }

    res.json({
      port: PORT,
      ips,
      primaryUrl: baseUrl,
      joinUrl,
      qrDataUrl,
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const urlPath = (req.url || '').split('?')[0];
    if (urlPath === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg: ClientWsMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientWsMessage;
      } catch {
        return;
      }

      if (msg.type === 'create_room') {
        removeMemberFromCurrentRoom(ws);
        const code = generateRoomCode();
        const playerId = generatePlayerId();
        const cleanName = (msg.name || 'Host').trim().slice(0, 14) || 'Host';
        const color = msg.color || 'coral';

        const member: ConnectedMember = {
          id: playerId,
          name: cleanName,
          color,
          deviceType: msg.deviceType === 'mobile' ? 'mobile' : 'pc',
          isHost: true,
          connected: true,
          ws,
          input: { left: false, right: false, jump: false },
        };

        const room: RoomInstance = {
          code,
          hostId: playerId,
          stageIndex: 0,
          phase: 'lobby',
          members: [member],
          gameState: null,
          pendingEvents: [],
          totalTime: 0,
          totalDeaths: 0,
          tickCounter: 0,
          timer: null,
        };

        rooms.set(code, room);
        clientToRoom.set(ws, { roomCode: code, playerId });
        sendMsg(ws, { type: 'welcome', playerId, room: toRoomPayload(room) });
        return;
      }

      if (msg.type === 'join_room') {
        const code = (msg.code || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          sendMsg(ws, { type: 'error', message: `Room "${code}" not found.` });
          return;
        }
        if (room.members.length >= 8) {
          sendMsg(ws, { type: 'error', message: 'Room is full (max 8 players).' });
          return;
        }

        removeMemberFromCurrentRoom(ws);
        const playerId = generatePlayerId();
        const cleanName =
          (msg.name || `Player ${room.members.length + 1}`).trim().slice(0, 14) ||
          `P${room.members.length + 1}`;
        const color = pickAvailableColor(room, msg.color);

        const member: ConnectedMember = {
          id: playerId,
          name: cleanName,
          color,
          deviceType: msg.deviceType === 'mobile' ? 'mobile' : 'pc',
          isHost: false,
          connected: true,
          ws,
          input: { left: false, right: false, jump: false },
        };

        room.members.push(member);
        clientToRoom.set(ws, { roomCode: code, playerId });

        sendMsg(ws, { type: 'welcome', playerId, room: toRoomPayload(room) });
        broadcastRoom(room, { type: 'room_update', room: toRoomPayload(room) });

        // If game already playing, add player cleanly and sync state
        if (room.phase === 'playing' && room.gameState) {
          const levelStage = room.gameState.stageIndex;
          startStageInRoom(room, levelStage);
        }
        return;
      }

      const link = clientToRoom.get(ws);
      if (!link) return;
      const room = rooms.get(link.roomCode);
      if (!room) return;
      const member = room.members.find((m) => m.id === link.playerId);
      if (!member) return;

      if (msg.type === 'update_meta') {
        member.name = (msg.name || member.name).trim().slice(0, 14) || member.name;
        if (msg.color) {
          member.color = msg.color;
        }
        broadcastRoom(room, { type: 'room_update', room: toRoomPayload(room) });
        return;
      }

      if (msg.type === 'input') {
        member.input = {
          left: Boolean(msg.input.left),
          right: Boolean(msg.input.right),
          jump: Boolean(msg.input.jump),
        };
        return;
      }

      // Host-only controls
      if (room.hostId !== link.playerId) return;

      if (msg.type === 'select_stage') {
        room.stageIndex = Math.max(0, Math.min(getLevelCount() - 1, msg.stageIndex));
        broadcastRoom(room, { type: 'room_update', room: toRoomPayload(room) });
        return;
      }

      if (msg.type === 'start_game') {
        room.totalTime = 0;
        room.totalDeaths = 0;
        const targetStage = typeof msg.stageIndex === 'number' ? msg.stageIndex : room.stageIndex;
        startStageInRoom(room, targetStage);
        return;
      }

      if (msg.type === 'restart_stage') {
        startStageInRoom(room, room.stageIndex);
        return;
      }

      if (msg.type === 'next_stage') {
        const currLevel = getLevelDef(room.stageIndex);
        const bracketLevels = getLevelsByBracket(currLevel.bracket);
        const posInBracket = bracketLevels.findIndex((l) => l.index === room.stageIndex);
        const nextLevel =
          bracketLevels[(posInBracket + 1) % bracketLevels.length] ??
          getLevelDef((room.stageIndex + 1) % getLevelCount());
        startStageInRoom(room, nextLevel.index);
        return;
      }

      if (msg.type === 'return_lobby') {
        stopRoomLoop(room);
        room.phase = 'lobby';
        room.gameState = null;
        broadcastRoom(room, { type: 'room_update', room: toRoomPayload(room) });
      }
    });

    ws.on('close', () => {
      removeMemberFromCurrentRoom(ws);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    let viteMiddlewares: express.RequestHandler | null = null;
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const viteReady = (async () => {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          ws: disableHmr ? false : undefined,
          hmr: disableHmr ? false : { server, path: '/__vite_hmr' },
        },
        appType: 'spa',
      });
      viteMiddlewares = vite.middlewares;
    })();

    app.use(async (req, res, next) => {
      try {
        await viteReady;
        if (viteMiddlewares) {
          viteMiddlewares(req, res, next);
        } else {
          next();
        }
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(PORT, HOST, () => {
    const ips = getLanAddresses();
    console.log(`\n  PICO PARK LAN Server running!`);
    console.log(`  Local:   http://localhost:${PORT}`);
    for (const ip of ips) {
      console.log(`  LAN:     http://${ip}:${PORT}`);
    }
    console.log(`  Socket:  ws://${HOST}:${PORT}/ws\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
