import { LEVELS } from './levels.ts';
import type {
  ButtonState,
  GameState,
  GateState,
  LaserDef,
  LaserShieldDir,
  LaserState,
  LevelDef,
  PlatformState,
  PlayerInput,
  PlayerSpec,
  PlayerState,
  PushBlockState,
  SpringState,
} from './types.ts';

export const PLAYER_W = 28;
export const PLAYER_H = 32;
export const MOVE_SPEED = 230;
export const GRAVITY = 1480;
export const JUMP_VEL = -560;
export const MAX_FALL = 820;
export const COYOTE_TIME = 0.1;
export const JUMP_BUFFER = 0.12;
export const DOOR_W = 46;
export const DOOR_H = 56;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function getLevelCount(): number {
  return LEVELS.length;
}

export function getLevelDef(stageIndex: number): LevelDef {
  const safeIndex = Math.max(0, Math.min(LEVELS.length - 1, stageIndex));
  return LEVELS[safeIndex];
}

function computeEffectiveRopeDist(level: LevelDef, playerCount: number): number {
  const base = level.ropeMaxDist ?? 96;
  if (playerCount <= 2) return Math.round(base * 1.8);
  if (playerCount === 3) return Math.round(base * 1.32);
  return base;
}

const ALL_SHIELD_DIRS: LaserShieldDir[] = ['up', 'left', 'right'];

export function getRequiredShieldDirs(lasers: LaserDef[]): LaserShieldDir[] {
  const req = new Set<LaserShieldDir>();
  for (const l of lasers) {
    if (l.dir === 'down') req.add('up');
    else if (l.dir === 'left') req.add('right');
    else if (l.dir === 'right') req.add('left');
  }
  return Array.from(req);
}

export function assignRandomLaserShields(
  players: PlayerState[],
  lasers: LaserDef[],
  rng: () => number = Math.random,
): void {
  if (lasers.length === 0) {
    for (const p of players) p.shieldDir = null;
    return;
  }

  const required = getRequiredShieldDirs(lasers);
  const pool: LaserShieldDir[] = [...required];
  if (players.length >= 4 && required.includes('up') && pool.length < players.length) {
    pool.push('up');
  }
  while (pool.length < players.length) {
    pool.push(ALL_SHIELD_DIRS[Math.floor(rng() * ALL_SHIELD_DIRS.length)]);
  }
  pool.length = players.length;

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < players.length; i++) {
    players[i].shieldDir = pool[i];
  }
}

export function getPlayerShieldRect(player: PlayerState): Rect | null {
  if (player.inDoor || !player.shieldDir) return null;
  switch (player.shieldDir) {
    case 'up':
      return { x: player.x - 10, y: player.y - 10, w: player.w + 20, h: 6 };
    case 'left':
      return { x: player.x - 10, y: player.y - 4, w: 6, h: player.h + 6 };
    case 'right':
      return { x: player.x + player.w + 4, y: player.y - 4, w: 6, h: player.h + 6 };
  }
}

function updateLasers(state: GameState, solids: Rect[]): void {
  if (state.lasers.length === 0) return;

  const beamSolids: Rect[] = [...solids];
  for (const b of state.pushBlocks) {
    beamSolids.push({ x: b.x, y: b.y, w: b.w, h: b.h });
  }
  const activePlayers = state.players.filter((p) => !p.inDoor);

  for (const L of state.lasers) {
    const thick = L.thickness ?? 10;
    let blockedByShield = false;

    if (L.dir === 'down') {
      const beamX = L.x + (L.w - thick) * 0.5;
      const beamY = L.y + L.h;
      let endY = beamY + L.maxLength;

      for (const s of beamSolids) {
        if (s.x < beamX + thick && s.x + s.w > beamX && s.y >= beamY - 2) {
          if (s.y < endY) endY = s.y;
        }
      }
      for (const p of activePlayers) {
        if (p.shieldDir !== 'up') continue;
        const sr = getPlayerShieldRect(p);
        if (sr && sr.x < beamX + thick && sr.x + sr.w > beamX && sr.y + sr.h >= beamY) {
          if (sr.y < endY) {
            endY = Math.max(beamY, sr.y);
            blockedByShield = true;
          }
        }
      }

      L.beamX = beamX;
      L.beamY = beamY;
      L.beamW = thick;
      L.beamH = Math.max(0, endY - beamY);
      L.blockedByShield = blockedByShield;
    } else if (L.dir === 'right') {
      const beamX = L.x + L.w;
      const beamY = L.y + (L.h - thick) * 0.5;
      let endX = beamX + L.maxLength;

      for (const s of beamSolids) {
        if (s.y < beamY + thick && s.y + s.h > beamY && s.x >= beamX - 2) {
          if (s.x < endX) endX = s.x;
        }
      }
      for (const p of activePlayers) {
        if (p.shieldDir !== 'left') continue;
        const sr = getPlayerShieldRect(p);
        if (sr && sr.y < beamY + thick && sr.y + sr.h > beamY && sr.x + sr.w >= beamX) {
          if (sr.x < endX) {
            endX = Math.max(beamX, sr.x);
            blockedByShield = true;
          }
        }
      }

      L.beamX = beamX;
      L.beamY = beamY;
      L.beamW = Math.max(0, endX - beamX);
      L.beamH = thick;
      L.blockedByShield = blockedByShield;
    } else {
      // dir === 'left'
      const endX = L.x;
      const beamY = L.y + (L.h - thick) * 0.5;
      let startX = endX - L.maxLength;

      for (const s of beamSolids) {
        if (s.y < beamY + thick && s.y + s.h > beamY && s.x + s.w <= endX + 2) {
          if (s.x + s.w > startX) startX = s.x + s.w;
        }
      }
      for (const p of activePlayers) {
        if (p.shieldDir !== 'right') continue;
        const sr = getPlayerShieldRect(p);
        if (sr && sr.y < beamY + thick && sr.y + sr.h > beamY && sr.x <= endX) {
          if (sr.x + sr.w > startX) {
            startX = Math.min(endX, sr.x + sr.w);
            blockedByShield = true;
          }
        }
      }

      L.beamX = startX;
      L.beamY = beamY;
      L.beamW = Math.max(0, endX - startX);
      L.beamH = thick;
      L.blockedByShield = blockedByShield;
    }
  }
}

export function createStageState(
  stageIndex: number,
  specs: PlayerSpec[],
  carryTotals?: { deaths?: number; elapsedTime?: number },
): GameState {
  const level = getLevelDef(stageIndex);
  const safeSpecs: PlayerSpec[] =
    specs.length > 0
      ? specs
      : [{ id: 'p1', name: 'P1', color: 'coral', deviceType: 'pc' }];

  const players: PlayerState[] = safeSpecs.map((spec, idx) => ({
    id: spec.id,
    slotIndex: idx,
    name: spec.name,
    color: spec.color,
    deviceType: spec.deviceType,
    x: level.spawnStart.x + idx * level.spawnStart.spacing,
    y: level.spawnStart.y,
    vx: 0,
    vy: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    facing: 1,
    onGround: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    prevJumpHeld: false,
    standingOnPlayerId: null,
    walkDist: 0,
    squashX: 1,
    squashY: 1,
    inDoor: false,
    blinkTimer: 1.5 + idx * 0.7,
    pushingDir: 0,
    shieldDir: null,
  }));

  const levelLasers = level.lasers ?? [];
  assignRandomLaserShields(players, levelLasers);

  const platforms: PlatformState[] = level.platforms.map((p) => ({
    ...p,
    originX: p.x,
    originY: p.y,
    dx: 0,
    dy: 0,
    phase: 0,
  }));

  const pushBlocks: PushBlockState[] = level.pushBlocks.map((b) => ({
    ...b,
    vx: 0,
    vy: 0,
    onGround: false,
    activePushers: 0,
    neededPushers: Math.min(b.requiredPlayers, players.length),
  }));

  const buttons: ButtonState[] = level.buttons.map((b) => ({
    ...b,
    pressed: false,
  }));

  const gates: GateState[] = level.gates.map((g) => ({
    ...g,
    originX: g.x,
    originY: g.y,
    progress: 0,
  }));

  const lasers: LaserState[] = levelLasers.map((l) => ({
    ...l,
    beamX: l.x,
    beamY: l.y,
    beamW: 0,
    beamH: 0,
    blockedByShield: false,
  }));

  const springs: SpringState[] = (level.springs ?? []).map((sp) => ({
    ...sp,
    active: !sp.buttonId,
    bounceTimer: 0,
  }));

  const state: GameState = {
    stageIndex: level.index,
    stageNumber: level.stageNumber,
    bracket: level.bracket,
    recommendedPlayers: level.recommendedPlayers,
    stageName: level.name,
    stageHint: level.hint,
    worldWidth: level.worldWidth,
    worldHeight: level.worldHeight,
    tetheredRope: level.tetheredRope,
    ropeMaxDist: computeEffectiveRopeDist(level, players.length),
    players,
    platforms,
    pushBlocks,
    buttons,
    gates,
    spikes: level.spikes.map((s) => ({ ...s })),
    lasers,
    springs,
    key: {
      x: level.keyPos.x,
      y: level.keyPos.y,
      originX: level.keyPos.x,
      originY: level.keyPos.y,
      carrierId: null,
      collected: false,
    },
    door: {
      x: level.doorPos.x,
      y: level.doorPos.y,
      w: DOOR_W,
      h: DOOR_H,
      unlocked: false,
    },
    status: 'playing',
    respawnTimer: 0,
    elapsedTime: carryTotals?.elapsedTime ?? 0,
    deaths: carryTotals?.deaths ?? 0,
    events: [],
  };

  updateLasers(state, getSolidObstacles(state));
  return state;
}

function resetStagePositions(state: GameState): void {
  const level = getLevelDef(state.stageIndex);
  state.players.forEach((p, idx) => {
    p.x = level.spawnStart.x + idx * level.spawnStart.spacing;
    p.y = level.spawnStart.y;
    p.vx = 0;
    p.vy = 0;
    p.facing = 1;
    p.onGround = false;
    p.coyoteTimer = 0;
    p.jumpBufferTimer = 0;
    p.prevJumpHeld = false;
    p.standingOnPlayerId = null;
    p.squashX = 1;
    p.squashY = 1;
    p.inDoor = false;
    p.pushingDir = 0;
  });

  state.platforms.forEach((plat) => {
    plat.x = plat.originX;
    plat.y = plat.originY;
    plat.dx = 0;
    plat.dy = 0;
    plat.phase = 0;
  });

  state.pushBlocks.forEach((b, idx) => {
    const def = level.pushBlocks[idx];
    b.x = def.x;
    b.y = def.y;
    b.vx = 0;
    b.vy = 0;
    b.onGround = false;
    b.activePushers = 0;
  });

  state.buttons.forEach((btn) => {
    btn.pressed = false;
  });

  state.gates.forEach((g) => {
    g.x = g.originX;
    g.y = g.originY;
    g.progress = 0;
  });

  state.springs.forEach((sp) => {
    sp.active = !sp.buttonId;
    sp.bounceTimer = 0;
  });

  state.key.x = state.key.originX;
  state.key.y = state.key.originY;
  state.key.carrierId = null;
  state.key.collected = false;
  state.door.unlocked = false;
  state.status = 'playing';
  state.respawnTimer = 0;

  assignRandomLaserShields(state.players, level.lasers ?? []);
  updateLasers(state, getSolidObstacles(state));
}

function getSolidObstacles(state: GameState): Rect[] {
  const rects: Rect[] = [];
  for (const plat of state.platforms) {
    rects.push({ x: plat.x, y: plat.y, w: plat.w, h: plat.h });
  }
  for (const gate of state.gates) {
    if (gate.mode === 'bridge') {
      if (gate.progress > 0.5) {
        rects.push({ x: gate.x, y: gate.y, w: gate.w, h: gate.h });
      }
    } else {
      rects.push({ x: gate.x, y: gate.y, w: gate.w, h: gate.h });
    }
  }
  for (const sp of state.springs) {
    rects.push({ x: sp.x, y: sp.y, w: sp.w, h: sp.h });
  }
  return rects;
}

function resolveAxisX(entity: { x: number; y: number; w: number; h: number; vx: number }, solids: Rect[]): void {
  for (const s of solids) {
    if (overlaps(entity, s)) {
      if (entity.vx > 0) {
        entity.x = s.x - entity.w;
        entity.vx = 0;
      } else if (entity.vx < 0) {
        entity.x = s.x + s.w;
        entity.vx = 0;
      }
    }
  }
}

function resolvePushBlocksAxisX(
  entity: { x: number; y: number; w: number; h: number; vx: number },
  blocks: PushBlockState[],
  pushIntentDir: -1 | 0 | 1,
): { touchedBlockId: string | null; dir: -1 | 0 | 1 } {
  let touchedBlockId: string | null = null;
  let dir: -1 | 0 | 1 = 0;
  for (const b of blocks) {
    if (overlaps(entity, b)) {
      if (entity.x + entity.w * 0.5 < b.x + b.w * 0.5) {
        entity.x = b.x - entity.w;
        if (pushIntentDir > 0) {
          touchedBlockId = b.id;
          dir = 1;
        }
        if (entity.vx > 0) entity.vx = 0;
      } else {
        entity.x = b.x + b.w;
        if (pushIntentDir < 0) {
          touchedBlockId = b.id;
          dir = -1;
        }
        if (entity.vx < 0) entity.vx = 0;
      }
    }
  }
  return { touchedBlockId, dir };
}

export function stepSimulation(
  state: GameState,
  inputsByPlayerId: Record<string, PlayerInput>,
  rawDt: number,
): void {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  state.events = [];

  if (state.status === 'cleared') {
    return;
  }

  if (state.status === 'respawning') {
    state.respawnTimer -= dt;
    if (state.respawnTimer <= 0) {
      resetStagePositions(state);
    }
    return;
  }

  state.elapsedTime += dt;

  // 1. Update moving platforms & compute dx/dy
  for (const plat of state.platforms) {
    if (plat.kind === 'moving') {
      const prevX = plat.x;
      const prevY = plat.y;
      plat.phase += dt * (plat.moveSpeed ?? 1.2);
      const wave = (1 - Math.cos(plat.phase)) * 0.5;
      if (plat.moveAxis === 'x') {
        plat.x = plat.originX + (plat.moveRange ?? 100) * wave;
      } else {
        plat.y = plat.originY - (plat.moveRange ?? 100) * wave;
      }
      plat.dx = plat.x - prevX;
      plat.dy = plat.y - prevY;
    } else {
      plat.dx = 0;
      plat.dy = 0;
    }
  }

  // Carry players standing on moving platforms AND propagate deltas up through head-stacked towers!
  const carriedByPlat = new Map<string, { dx: number; dy: number }>();
  for (const p of state.players) {
    if (p.inDoor || !p.onGround) continue;
    for (const plat of state.platforms) {
      if (plat.kind !== 'moving') continue;
      const feetBox: Rect = { x: p.x + 2, y: p.y + p.h - 2, w: p.w - 4, h: 8 };
      const platTop: Rect = { x: plat.x - plat.dx, y: plat.y - plat.dy, w: plat.w, h: 10 };
      if (overlaps(feetBox, platTop)) {
        p.x = Math.max(0, Math.min(state.worldWidth - p.w, p.x + plat.dx));
        p.y += plat.dy;
        carriedByPlat.set(p.id, { dx: plat.dx, dy: plat.dy });
        break;
      }
    }
  }
  if (carriedByPlat.size > 0) {
    let propagated = true;
    while (propagated) {
      propagated = false;
      for (const rider of state.players) {
        if (rider.inDoor || carriedByPlat.has(rider.id) || !rider.standingOnPlayerId) continue;
        const baseDelta = carriedByPlat.get(rider.standingOnPlayerId);
        if (baseDelta) {
          rider.x = Math.max(0, Math.min(state.worldWidth - rider.w, rider.x + baseDelta.dx));
          rider.y += baseDelta.dy;
          carriedByPlat.set(rider.id, baseDelta);
          propagated = true;
        }
      }
    }
  }

  // 2. Update gates based on button state from previous frame
  for (const gate of state.gates) {
    const btn = state.buttons.find((b) => b.id === gate.buttonId);
    const altBtn = gate.altButtonId
      ? state.buttons.find((b) => b.id === gate.altButtonId)
      : undefined;
    const target = (btn && btn.pressed) || (altBtn && altBtn.pressed) ? 1 : 0;
    const speed = 3.6;
    if (gate.progress < target) {
      gate.progress = Math.min(target, gate.progress + dt * speed);
    } else if (gate.progress > target) {
      gate.progress = Math.max(target, gate.progress - dt * speed);
    }
    if (gate.mode !== 'bridge') {
      gate.x = gate.originX + gate.openOffsetX * gate.progress;
      gate.y = gate.originY + gate.openOffsetY * gate.progress;
    }
  }

  const solids = getSolidObstacles(state);
  const activePlayers = state.players.filter((p) => !p.inDoor);
  const prevXById = new Map<string, number>();
  const prevYById = new Map<string, number>();
  const prevVyById = new Map<string, number>();
  const prevCarrierIdById = new Map<string, string | null>();
  const jumpedThisFrame = new Set<string>();

  for (const p of activePlayers) {
    prevXById.set(p.id, p.x);
    prevYById.set(p.id, p.y);
    prevVyById.set(p.id, p.vy);
    prevCarrierIdById.set(p.id, p.standingOnPlayerId);
  }

  // 3. Process player inputs & vertical/horizontal movement
  const directBlockPushers = new Map<string, Set<string>>();
  for (const b of state.pushBlocks) {
    directBlockPushers.set(b.id, new Set());
    b.neededPushers = Math.min(b.requiredPlayers, Math.max(1, activePlayers.length));
  }

  for (const p of activePlayers) {
    const input = inputsByPlayerId[p.id] ?? { left: false, right: false, jump: false };
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    if (moveDir !== 0) {
      p.facing = moveDir > 0 ? 1 : -1;
    }
    p.pushingDir = moveDir as -1 | 0 | 1;

    // Horizontal velocity (smooth snappy acceleration)
    const targetVx = moveDir * MOVE_SPEED;
    p.vx = targetVx;

    // Timers: coyote & jump buffer
    if (p.onGround) {
      p.coyoteTimer = COYOTE_TIME;
    } else {
      p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
    }

    const justPressedJump = input.jump && !p.prevJumpHeld;
    const justReleasedJump = !input.jump && p.prevJumpHeld;
    p.prevJumpHeld = input.jump;

    if (justPressedJump) {
      p.jumpBufferTimer = JUMP_BUFFER;
    } else {
      p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
    }

    if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
      p.vy = JUMP_VEL;
      p.onGround = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      p.standingOnPlayerId = null;
      jumpedThisFrame.add(p.id);
      p.squashX = 0.82;
      p.squashY = 1.22;
      state.events.push({ type: 'jump', x: p.x + p.w * 0.5, y: p.y + p.h });
    }

    if (justReleasedJump && p.vy < -120) {
      p.vy *= 0.48;
    }

    // Gravity
    p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);

    // Move X
    const beforeX = p.x;
    p.x += p.vx * dt;
    p.x = Math.max(0, Math.min(state.worldWidth - p.w, p.x));
    resolveAxisX(p, solids);

    const pushCheck = resolvePushBlocksAxisX(p, state.pushBlocks, p.pushingDir);
    if (pushCheck.touchedBlockId && pushCheck.dir !== 0) {
      directBlockPushers.get(pushCheck.touchedBlockId)?.add(p.id);
    }

    if (p.onGround) {
      p.walkDist += Math.abs(p.x - beforeX);
    }

    // Move Y
    p.y += p.vy * dt;
    const wasOnGround = p.onGround;
    p.onGround = false;
    p.standingOnPlayerId = null;

    for (const s of solids) {
      if (overlaps(p, s)) {
        if (p.vy >= 0) {
          p.y = s.y - p.h;
          if (!wasOnGround && p.vy > 180) {
            p.squashX = 1.24;
            p.squashY = 0.78;
            state.events.push({ type: 'land', x: p.x + p.w * 0.5, y: p.y + p.h });
          }
          p.vy = 0;
          p.onGround = true;
        } else if (p.vy < 0) {
          p.y = s.y + s.h;
          p.vy = 0;
        }
      }
    }

    // Vertical collision with pushBlocks
    for (const b of state.pushBlocks) {
      if (overlaps(p, b)) {
        if (p.vy >= 0 && prevYById.get(p.id)! + p.h <= b.y + 10) {
          p.y = b.y - p.h;
          if (!wasOnGround && p.vy > 180) {
            p.squashX = 1.2;
            p.squashY = 0.8;
            state.events.push({ type: 'land', x: p.x + p.w * 0.5, y: p.y + p.h });
          }
          p.vy = 0;
          p.onGround = true;
        } else if (p.vy < 0) {
          p.y = b.y + b.h;
          p.vy = 0;
        }
      }
    }

    // Decay squash & stretch back to (1, 1)
    const decay = Math.min(1, dt * 14);
    p.squashX += (1 - p.squashX) * decay;
    p.squashY += (1 - p.squashY) * decay;

    // Blink timer
    p.blinkTimer -= dt;
    if (p.blinkTimer <= -0.14) {
      p.blinkTimer = 2.4 + ((p.slotIndex * 1.1) % 1.8);
    }
  }

  // 4. Player-on-Player Solid Collision & Head-Stacking
  // Also propagate pushing chain for pushBlocks (if P2 pushes P1 who pushes a block)
  for (const b of state.pushBlocks) {
    const pushers = directBlockPushers.get(b.id)!;
    const rightChain = new Set<string>();
    const leftChain = new Set<string>();

    for (const pid of pushers) {
      const pusher = activePlayers.find((ap) => ap.id === pid);
      if (!pusher) continue;
      if (pusher.x + pusher.w * 0.5 < b.x + b.w * 0.5 && pusher.pushingDir > 0) {
        rightChain.add(pid);
      } else if (pusher.x + pusher.w * 0.5 > b.x + b.w * 0.5 && pusher.pushingDir < 0) {
        leftChain.add(pid);
      }
    }

    // Propagate chain behind direct pushers so 3, 4, or 8 players lined up all count!
    let added = true;
    while (added) {
      added = false;
      for (const other of activePlayers) {
        if (other.pushingDir === 0) continue;
        const targetChain = other.pushingDir > 0 ? rightChain : leftChain;
        if (targetChain.has(other.id)) continue;
        for (const cid of targetChain) {
          const mate = activePlayers.find((ap) => ap.id === cid);
          if (!mate || mate.pushingDir !== other.pushingDir) continue;
          const nearY = Math.abs(other.y - mate.y) < PLAYER_H * 0.85;
          const mateCenter = mate.x + mate.w * 0.5;
          const otherCenter = other.x + other.w * 0.5;
          const touchingBehind =
            other.pushingDir > 0
              ? otherCenter < mateCenter && other.x + other.w >= mate.x - 8
              : otherCenter > mateCenter && other.x <= mate.x + mate.w + 8;
          if (nearY && touchingBehind) {
            targetChain.add(other.id);
            added = true;
            break;
          }
        }
      }
    }

    const leftPushCount = leftChain.size;
    const rightPushCount = rightChain.size;

    b.activePushers = Math.max(leftPushCount, rightPushCount);
    const pushDir =
      rightPushCount >= b.neededPushers && rightPushCount > leftPushCount
        ? 1
        : leftPushCount >= b.neededPushers && leftPushCount > rightPushCount
          ? -1
          : 0;

    b.vx = pushDir * 118;
    const prevBx = b.x;
    b.x += b.vx * dt;
    b.x = Math.max(0, Math.min(state.worldWidth - b.w, b.x));
    resolveAxisX(b, solids);
    const blockDx = b.x - prevBx;

    b.vy = Math.min(MAX_FALL, b.vy + GRAVITY * dt);
    b.y += b.vy * dt;
    b.onGround = false;
    for (const s of solids) {
      if (overlaps(b, s)) {
        if (b.vy >= 0) {
          b.y = s.y - b.h;
          b.vy = 0;
          b.onGround = true;
        } else {
          b.y = s.y + s.h;
          b.vy = 0;
        }
      }
    }

    // Carry players standing on top of the push block
    if (blockDx !== 0) {
      for (const p of activePlayers) {
        if (
          p.onGround &&
          Math.abs(p.y + p.h - b.y) <= 2 &&
          p.x + p.w > b.x &&
          p.x < b.x + b.w
        ) {
          p.x = Math.max(0, Math.min(state.worldWidth - p.w, p.x + blockDx));
        }
      }
    }
  }

  // 3b. Cohesive Stack Carry: carry head-stacked riders vertically & horizontally with their carrier
  // Processed bottom-to-top by previous Y so a 5-6 cat tower jumps, lands, and rides platforms together!
  const stackOrder = [...activePlayers].sort(
    (a, b) => (prevYById.get(b.id) ?? b.y) - (prevYById.get(a.id) ?? a.y),
  );
  for (const rider of stackOrder) {
    const carrierId = prevCarrierIdById.get(rider.id);
    if (!carrierId || jumpedThisFrame.has(rider.id)) continue;
    const carrier = activePlayers.find((p) => p.id === carrierId);
    if (!carrier) continue;

    const carrierDx = carrier.x - (prevXById.get(carrier.id) ?? carrier.x);
    if (carrierDx !== 0) {
      rider.x = Math.max(0, Math.min(state.worldWidth - rider.w, rider.x + carrierDx));
      resolveAxisX(rider, solids);
      resolvePushBlocksAxisX(rider, state.pushBlocks, 0);
    }

    const horizOverlap = Math.min(rider.x + rider.w, carrier.x + carrier.w) - Math.max(rider.x, carrier.x);
    if (horizOverlap < 6) continue;

    const carrierDy = carrier.y - (prevYById.get(carrier.id) ?? carrier.y);
    const riderFootGap = Math.abs(rider.y + rider.h - carrier.y);
    if (carrierDy !== 0 || carrier.vy !== 0 || riderFootGap <= 18) {
      rider.y = carrier.y - rider.h;
      let blockedBySolid = false;
      for (const s of solids) {
        if (overlaps(rider, s)) {
          if (carrierDy <= 0) {
            rider.y = s.y + s.h;
            rider.vy = Math.max(0, rider.vy);
          } else {
            rider.y = s.y - rider.h;
            rider.vy = 0;
            rider.onGround = true;
          }
          blockedBySolid = true;
          break;
        }
      }
      if (!blockedBySolid) {
        rider.vy = carrier.vy;
        rider.onGround = true;
        rider.standingOnPlayerId = carrier.id;
      }
    }
  }

  // Player-to-player vertical stacking & horizontal solid nudge (enough passes for 5-8 cat towers)
  const stackPasses = Math.max(6, activePlayers.length + 1);
  for (let pass = 0; pass < stackPasses; pass++) {
    for (let i = 0; i < activePlayers.length; i++) {
      for (let j = i + 1; j < activePlayers.length; j++) {
        const a = activePlayers[i];
        const b = activePlayers[j];
        if (!overlaps(a, b)) continue;

        const aPrevBottom = (prevYById.get(a.id) ?? a.y) + a.h;
        const bPrevBottom = (prevYById.get(b.id) ?? b.y) + b.h;
        const aTopBound = Math.max(a.y, prevYById.get(a.id) ?? a.y) + 14;
        const bTopBound = Math.max(b.y, prevYById.get(b.id) ?? b.y) + 14;
        const horizOverlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);

        // Check vertical landing only if meaningfully overlapping horizontally (>= 8px)
        if (horizOverlap >= 8 && aPrevBottom <= bTopBound && a.vy >= 0) {
          a.y = b.y - a.h;
          if ((prevVyById.get(a.id) ?? 0) > 180 && !a.onGround) {
            a.squashX = 1.2;
            a.squashY = 0.82;
            state.events.push({ type: 'land', x: a.x + a.w * 0.5, y: a.y + a.h });
          }
          a.vy = Math.min(0, b.vy);
          a.onGround = true;
          a.standingOnPlayerId = b.id;
        } else if (horizOverlap >= 8 && bPrevBottom <= aTopBound && b.vy >= 0) {
          b.y = a.y - b.h;
          if ((prevVyById.get(b.id) ?? 0) > 180 && !b.onGround) {
            b.squashX = 1.2;
            b.squashY = 0.82;
            state.events.push({ type: 'land', x: b.x + b.w * 0.5, y: b.y + b.h });
          }
          b.vy = Math.min(0, a.vy);
          b.onGround = true;
          b.standingOnPlayerId = a.id;
        } else {
          // Horizontal separation
          const overlapLeft = a.x + a.w - b.x;
          const overlapRight = b.x + b.w - a.x;
          if (overlapLeft < overlapRight) {
            const shift = overlapLeft * 0.5;
            a.x -= shift;
            b.x += shift;
          } else {
            const shift = overlapRight * 0.5;
            a.x += shift;
            b.x -= shift;
          }
          a.x = Math.max(0, Math.min(state.worldWidth - a.w, a.x));
          b.x = Math.max(0, Math.min(state.worldWidth - b.w, b.x));
          for (const blk of state.pushBlocks) {
            if (overlaps(a, blk)) {
              if (a.x + a.w * 0.5 < blk.x + blk.w * 0.5) a.x = blk.x - a.w;
              else a.x = blk.x + blk.w;
            }
            if (overlaps(b, blk)) {
              if (b.x + b.w * 0.5 < blk.x + blk.w * 0.5) b.x = blk.x - b.w;
              else b.x = blk.x + blk.w;
            }
          }
        }
      }
    }
  }

  // 5. Rope Tether Constraint Solver (for Rope stages like Cliff Rope Rescue!)
  if (state.tetheredRope && activePlayers.length > 1) {
    const maxDist = state.ropeMaxDist;
    for (let iter = 0; iter < 4; iter++) {
      for (let i = 0; i < activePlayers.length - 1; i++) {
        const a = activePlayers[i];
        const b = activePlayers[i + 1];
        const ax = a.x + a.w * 0.5;
        const ay = a.y + a.h * 0.5;
        const bx = b.x + b.w * 0.5;
        const by = b.y + b.h * 0.5;
        const dx = bx - ax;
        const dy = by - ay;
        const dist = Math.hypot(dx, dy);
        if (dist > maxDist && dist > 0.0001) {
          const excess = dist - maxDist;
          const nx = dx / dist;
          const ny = dy / dist;
          // Grounded players anchor much heavier than dangling players
          const invMassA = a.onGround ? 0.22 : 1.0;
          const invMassB = b.onGround ? 0.22 : 1.0;
          const totalInv = invMassA + invMassB;
          const ratioA = invMassA / totalInv;
          const ratioB = invMassB / totalInv;

          a.x += nx * excess * ratioA;
          a.y += ny * excess * ratioA;
          b.x -= nx * excess * ratioB;
          b.y -= ny * excess * ratioB;

          if (!a.onGround && ny > 0.25 && a.vy > 0) a.vy *= 0.88;
          if (!b.onGround && -ny > 0.25 && b.vy > 0) b.vy *= 0.88;
        }
      }
    }

    // Re-clamp & smooth ledge haul-up for tethered players
    for (const p of activePlayers) {
      p.x = Math.max(0, Math.min(state.worldWidth - p.w, p.x));
      for (const s of solids) {
        if (overlaps(p, s)) {
          const topPen = p.y + p.h - s.y;
          const botPen = s.y + s.h - p.y;
          const leftPen = p.x + p.w - s.x;
          const rightPen = s.x + s.w - p.x;
          const minHoriz = Math.min(leftPen, rightPen);
          if (topPen > 0 && topPen <= 18 && topPen <= minHoriz + 8) {
            p.y = s.y - p.h;
            p.vy = Math.min(p.vy, 0);
            p.onGround = true;
          } else if (minHoriz < Math.min(topPen, botPen)) {
            if (leftPen < rightPen) p.x = s.x - p.w;
            else p.x = s.x + s.w;
          } else if (topPen < botPen) {
            p.y = s.y - p.h;
            p.vy = Math.min(p.vy, 0);
            p.onGround = true;
          } else {
            p.y = s.y + s.h;
            p.vy = Math.max(p.vy, 0);
          }
        }
      }
    }
  }

  // 6. Update pressure buttons
  for (const btn of state.buttons) {
    const wasPressed = btn.pressed;
    const triggerZone: Rect = { x: btn.x, y: btn.y - 4, w: btn.w, h: btn.h + 4 };
    let isPressedNow = false;
    for (const p of activePlayers) {
      if (overlaps(p, triggerZone)) {
        isPressedNow = true;
        break;
      }
    }
    if (!isPressedNow) {
      for (const b of state.pushBlocks) {
        if (overlaps(b, triggerZone)) {
          isPressedNow = true;
          break;
        }
      }
    }
    btn.pressed = btn.latch ? wasPressed || isPressedNow : isPressedNow;
    if (!wasPressed && btn.pressed) {
      state.events.push({ type: 'button', x: btn.x + btn.w * 0.5, y: btn.y, color: btn.color });
    }
  }

  // 6b. Raycast stationary lasers against solids & directional player shields
  updateLasers(state, solids);

  // 6c. Spring Jump-Pads (Per Lompat) — unlockable by pressure button & bounce whole stacks together
  for (const sp of state.springs) {
    if (sp.buttonId) {
      const btn = state.buttons.find((b) => b.id === sp.buttonId);
      sp.active = Boolean(btn?.pressed);
    } else {
      sp.active = true;
    }
    sp.bounceTimer = Math.max(0, sp.bounceTimer - dt);

    if (!sp.active) continue;

    const launchZone: Rect = { x: sp.x + 2, y: sp.y - 6, w: sp.w - 4, h: 12 };
    const launchedIds = new Set<string>();
    for (const p of activePlayers) {
      if (p.vy >= -40 && overlaps(p, launchZone)) {
        p.vy = sp.launchVelY;
        p.y = sp.y - p.h - 2;
        p.onGround = false;
        p.standingOnPlayerId = null;
        p.squashX = 0.76;
        p.squashY = 1.28;
        launchedIds.add(p.id);
      }
    }

    if (launchedIds.size > 0) {
      // Propagate launch upward through any head-stacked riders above the launched player(s)
      let added = true;
      while (added) {
        added = false;
        for (const rider of activePlayers) {
          if (launchedIds.has(rider.id) || !rider.standingOnPlayerId) continue;
          if (launchedIds.has(rider.standingOnPlayerId)) {
            const carrier = activePlayers.find((ap) => ap.id === rider.standingOnPlayerId);
            rider.vy = sp.launchVelY;
            if (carrier) rider.y = carrier.y - rider.h;
            rider.onGround = false;
            rider.squashX = 0.76;
            rider.squashY = 1.28;
            launchedIds.add(rider.id);
            added = true;
          }
        }
      }
      sp.bounceTimer = 0.28;
      state.events.push({
        type: 'spring',
        x: sp.x + sp.w * 0.5,
        y: sp.y,
        color: sp.color ?? '#22C55E',
      });
    }
  }

  // 7. Hazards (spikes, lasers & pitfall)
  for (const p of activePlayers) {
    if (p.y > state.worldHeight + 80) {
      state.status = 'respawning';
      state.respawnTimer = 0.45;
      state.deaths += 1;
      state.events.push({ type: 'death', x: p.x + p.w * 0.5, y: state.worldHeight - 10 });
      return;
    }
    for (const spk of state.spikes) {
      const hitBox: Rect = { x: spk.x + 4, y: spk.y + 3, w: spk.w - 8, h: spk.h - 3 };
      if (overlaps(p, hitBox)) {
        state.status = 'respawning';
        state.respawnTimer = 0.45;
        state.deaths += 1;
        state.events.push({ type: 'death', x: p.x + p.w * 0.5, y: p.y + p.h * 0.5 });
        return;
      }
    }
    const laserBodyBox: Rect = { x: p.x + 5, y: p.y + 4, w: p.w - 10, h: p.h - 6 };
    for (const L of state.lasers) {
      if (L.beamW <= 0 || L.beamH <= 0) continue;
      const beamBox: Rect = { x: L.beamX, y: L.beamY, w: L.beamW, h: L.beamH };
      if (overlaps(laserBodyBox, beamBox)) {
        state.status = 'respawning';
        state.respawnTimer = 0.45;
        state.deaths += 1;
        state.events.push({ type: 'death', x: p.x + p.w * 0.5, y: p.y + p.h * 0.5, color: '#F48C42' });
        return;
      }
    }
  }

  // 8. Key pickup & carry
  if (!state.key.collected) {
    const keyBox: Rect = { x: state.key.x - 12, y: state.key.y - 12, w: 24, h: 24 };
    for (const p of activePlayers) {
      if (overlaps(p, keyBox)) {
        state.key.collected = true;
        state.key.carrierId = p.id;
        state.events.push({ type: 'key', x: state.key.x, y: state.key.y, color: '#FACC15' });
        break;
      }
    }
  } else if (state.key.carrierId && !state.door.unlocked) {
    const carrier = state.players.find((p) => p.id === state.key.carrierId);
    if (carrier) {
      const targetX = carrier.facing === 1 ? carrier.x - 10 : carrier.x + carrier.w + 10;
      const targetY = carrier.y - 10;
      state.key.x += (targetX - state.key.x) * Math.min(1, dt * 16);
      state.key.y += (targetY - state.key.y) * Math.min(1, dt * 16);
    }
  }

  // 9. Door unlock & all-players enter door
  const doorBox: Rect = state.door;
  if (state.key.collected && !state.door.unlocked) {
    const carrier = activePlayers.find((p) => p.id === state.key.carrierId);
    if (carrier && overlaps(carrier, doorBox)) {
      state.door.unlocked = true;
      state.events.push({
        type: 'unlock',
        x: state.door.x + state.door.w * 0.5,
        y: state.door.y + state.door.h * 0.5,
        color: '#FACC15',
      });
    }
  }

  if (state.door.unlocked) {
    for (const p of activePlayers) {
      if (overlaps(p, doorBox)) {
        p.inDoor = true;
        p.vx = 0;
        p.vy = 0;
        state.events.push({
          type: 'enterDoor',
          x: state.door.x + state.door.w * 0.5,
          y: state.door.y + state.door.h * 0.5,
        });
      }
    }

    if (state.players.length > 0 && state.players.every((p) => p.inDoor)) {
      state.status = 'cleared';
      state.events.push({
        type: 'clear',
        x: state.door.x + state.door.w * 0.5,
        y: state.door.y + state.door.h * 0.5,
      });
    }
  }
}
