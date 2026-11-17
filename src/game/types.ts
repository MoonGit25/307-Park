export type PlayerColorId =
  | 'coral'
  | 'amber'
  | 'mint'
  | 'lavender'
  | 'sky'
  | 'pink'
  | 'lime'
  | 'peach';

export interface PlayerPalette {
  id: PlayerColorId;
  name: string;
  fill: string;
  shade: string;
}

export const PLAYER_PALETTES: PlayerPalette[] = [
  { id: 'coral', name: 'Coral', fill: '#F47272', shade: '#DC5353' },
  { id: 'amber', name: 'Amber', fill: '#FDE047', shade: '#EAB308' },
  { id: 'mint', name: 'Mint', fill: '#9EEAE6', shade: '#5CD0C9' },
  { id: 'lavender', name: 'Lavender', fill: '#B491F2', shade: '#9268E0' },
  { id: 'sky', name: 'Sky', fill: '#93C5FD', shade: '#60A5FA' },
  { id: 'pink', name: 'Pink', fill: '#F9A8D4', shade: '#EC70B3' },
  { id: 'lime', name: 'Lime', fill: '#BEF264', shade: '#93D233' },
  { id: 'peach', name: 'Peach', fill: '#FB923C', shade: '#EA6F14' },
];

export const PALETTE_BY_ID: Record<PlayerColorId, PlayerPalette> = Object.fromEntries(
  PLAYER_PALETTES.map((p) => [p.id, p]),
) as Record<PlayerColorId, PlayerPalette>;

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface PlayerSpec {
  id: string;
  name: string;
  color: PlayerColorId;
  deviceType: 'pc' | 'mobile';
}

export type LaserShieldDir = 'up' | 'left' | 'right';
export type LaserFireDir = 'down' | 'left' | 'right';

export interface PlayerState {
  id: string;
  slotIndex: number;
  name: string;
  color: PlayerColorId;
  deviceType: 'pc' | 'mobile';
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  onGround: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  prevJumpHeld: boolean;
  standingOnPlayerId: string | null;
  walkDist: number;
  squashX: number;
  squashY: number;
  inDoor: boolean;
  blinkTimer: number;
  pushingDir: -1 | 0 | 1;
  shieldDir: LaserShieldDir | null;
}

export interface PlatformDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: 'solid' | 'moving';
  moveAxis?: 'x' | 'y';
  moveRange?: number;
  moveSpeed?: number;
  requiresButtonId?: string;
}

export interface PlatformState extends PlatformDef {
  originX: number;
  originY: number;
  dx: number;
  dy: number;
  phase: number;
}

export interface PushBlockDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  requiredPlayers: number;
}

export interface PushBlockState extends PushBlockDef {
  vx: number;
  vy: number;
  onGround: boolean;
  activePushers: number;
  neededPushers: number;
}

export interface ButtonDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  latch?: boolean;
}

export interface ButtonState extends ButtonDef {
  pressed: boolean;
}

export interface GateDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  openOffsetX: number;
  openOffsetY: number;
  buttonId: string;
  altButtonId?: string;
  color: string;
  mode?: 'gate' | 'bridge';
}

export interface GateState extends GateDef {
  originX: number;
  originY: number;
  progress: number;
}

export interface SpikeDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LaserDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  dir: LaserFireDir;
  maxLength: number;
  thickness?: number;
}

export interface LaserState extends LaserDef {
  beamX: number;
  beamY: number;
  beamW: number;
  beamH: number;
  blockedByShield: boolean;
}

export interface SpringDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  launchVelY: number;
  buttonId?: string;
  color?: string;
}

export interface SpringState extends SpringDef {
  active: boolean;
  bounceTimer: number;
}

export type PlayerBracket = '2p' | '3p' | '4p' | '5p' | '6p';

export interface LevelDef {
  index: number;
  stageNumber: number;
  bracket: PlayerBracket;
  recommendedPlayers: number;
  name: string;
  hint: string;
  worldWidth: number;
  worldHeight: number;
  spawnStart: { x: number; y: number; spacing: number };
  tetheredRope: boolean;
  ropeMaxDist?: number;
  platforms: PlatformDef[];
  pushBlocks: PushBlockDef[];
  buttons: ButtonDef[];
  gates: GateDef[];
  spikes: SpikeDef[];
  lasers?: LaserDef[];
  springs?: SpringDef[];
  keyPos: { x: number; y: number };
  doorPos: { x: number; y: number };
}

export type SimEventType =
  | 'jump'
  | 'land'
  | 'spring'
  | 'key'
  | 'unlock'
  | 'enterDoor'
  | 'button'
  | 'death'
  | 'clear';

export interface SimEvent {
  type: SimEventType;
  x: number;
  y: number;
  color?: string;
}

export interface GameState {
  stageIndex: number;
  stageNumber: number;
  bracket: PlayerBracket;
  recommendedPlayers: number;
  stageName: string;
  stageHint: string;
  worldWidth: number;
  worldHeight: number;
  tetheredRope: boolean;
  ropeMaxDist: number;
  players: PlayerState[];
  platforms: PlatformState[];
  pushBlocks: PushBlockState[];
  buttons: ButtonState[];
  gates: GateState[];
  spikes: SpikeDef[];
  lasers: LaserState[];
  springs: SpringState[];
  key: {
    x: number;
    y: number;
    originX: number;
    originY: number;
    carrierId: string | null;
    collected: boolean;
  };
  door: {
    x: number;
    y: number;
    w: number;
    h: number;
    unlocked: boolean;
  };
  status: 'playing' | 'respawning' | 'cleared';
  respawnTimer: number;
  elapsedTime: number;
  deaths: number;
  events: SimEvent[];
}

export interface RoomMemberInfo {
  id: string;
  name: string;
  color: PlayerColorId;
  deviceType: 'pc' | 'mobile';
  isHost: boolean;
  connected: boolean;
}

export interface RoomStatePayload {
  code: string;
  hostId: string;
  stageIndex: number;
  phase: 'lobby' | 'playing' | 'cleared';
  members: RoomMemberInfo[];
  totalTime: number;
  totalDeaths: number;
}

export type ClientWsMessage =
  | {
      type: 'create_room';
      name: string;
      color: PlayerColorId;
      deviceType: 'pc' | 'mobile';
    }
  | {
      type: 'join_room';
      code: string;
      name: string;
      color: PlayerColorId;
      deviceType: 'pc' | 'mobile';
    }
  | {
      type: 'update_meta';
      name: string;
      color: PlayerColorId;
    }
  | {
      type: 'select_stage';
      stageIndex: number;
    }
  | {
      type: 'start_game';
      stageIndex?: number;
    }
  | {
      type: 'restart_stage';
    }
  | {
      type: 'next_stage';
    }
  | {
      type: 'return_lobby';
    }
  | {
      type: 'input';
      input: PlayerInput;
    };

export type ServerWsMessage =
  | {
      type: 'welcome';
      playerId: string;
      room: RoomStatePayload;
    }
  | {
      type: 'room_update';
      room: RoomStatePayload;
    }
  | {
      type: 'snapshot';
      state: GameState;
    }
  | {
      type: 'error';
      message: string;
    };
