import type {
  ButtonDef,
  GateDef,
  LaserDef,
  LevelDef,
  PlatformDef,
  PlayerBracket,
  PushBlockDef,
  SpikeDef,
  SpringDef,
} from './types.ts';

/**
 * 200 Balanced 307 Park Stages:
 * 40 escalating stages for EACH Player-Count Mode:
 * - 2P Mode  (Stages 01..40, index 0..39)
 * - 3P Mode  (Stages 01..40, index 40..79)
 * - 4P Mode  (Stages 01..40, index 80..119)
 * - 5P Mode  (Stages 01..40, index 120..159)
 * - 6P+ Mode (Stages 01..40, index 160..199)
 *
 * Physics reach reference (JUMP_VEL=-560, GRAVITY=1480, PLAYER_H=32):
 * - 1 cat jump:  ~106 px (use <= 85 px steps)
 * - 2-cat stack: ~138 px (use 120 px)
 * - 3-cat stack: ~170 px (use 152 px)
 * - 4-cat stack: ~202 px (use 184 px)
 * - 5-cat stack: ~234 px (use 216 px)
 * - 6-cat stack: ~266 px (use 248 px)
 */

function calibratedStackGap(cats: number): number {
  const c = Math.max(1, Math.min(6, cats));
  if (c === 1) return 82;
  return 56 + c * 32; // 2->120, 3->152, 4->184, 5->216, 6->248
}

const VAULT_COLORS = ['#EF6B6B', '#F59E0B', '#38BDF8', '#A78BFA', '#EC4899'];

interface BracketConfig {
  bracket: PlayerBracket;
  players: number;
  tag: string;
  stackLabel: string;
}

const BRACKET_CONFIGS: BracketConfig[] = [
  { bracket: '2p', players: 2, tag: '2P', stackLabel: 'Duo' },
  { bracket: '3p', players: 3, tag: '3P', stackLabel: 'Triple' },
  { bracket: '4p', players: 4, tag: '4P', stackLabel: 'Quad' },
  { bracket: '5p', players: 5, tag: '5P', stackLabel: 'Penta' },
  { bracket: '6p', players: 6, tag: '6P+', stackLabel: 'Hexa' },
];

function buildStageForBracket(
  globalIndex: number,
  stageNum: number,
  cfg: BracketConfig,
): LevelDef {
  const P = cfg.players;
  const tag = cfg.tag;
  const fullStack = calibratedStackGap(P);
  const subStack2 = calibratedStackGap(Math.min(P, 2));
  const subStack3 = calibratedStackGap(Math.min(P, 3));
  const subStack4 = calibratedStackGap(Math.min(P, 4));
  const runway = P * 30; // Extra horizontal margin scaled for player lineup
  const spawnSpacing = P >= 5 ? 32 : 36;

  switch (stageNum) {
    // ==========================================
    // TIER 1: BASICS & CORE TEAMWORK (Stages 1..4)
    // ==========================================
    case 1: {
      const floorY = 560;
      const daisY = 470;
      const keyShelfY = daisY - fullStack;
      return {
        index: globalIndex,
        stageNumber: 1,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: `${cfg.stackLabel} Tower Stack`,
        hint: `${tag}: Stack all ${P} cats on the stone step to grab the ${fullStack}px high key!`,
        worldWidth: 1100 + P * 30,
        worldHeight: 680,
        spawnStart: { x: 45, y: 470, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's1-floor-l', x: 0, y: floorY, w: 540, h: 140 },
          { id: 's1-floor-r', x: 615, y: floorY, w: 485 + P * 30, h: 140 },
          { id: 's1-dais', x: 320, y: daisY, w: 200 + P * 10, h: 24 },
          { id: 's1-key-shelf', x: 445, y: keyShelfY, w: 140, h: 26 },
          { id: 's1-door-step', x: 880 + P * 24, y: 495, w: 220, h: 65 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [],
        keyPos: { x: 515, y: keyShelfY - 42 },
        doorPos: { x: 980 + P * 24, y: 439 },
      };
    }

    case 2: {
      const floorY = 500;
      const crateX = 240 + runway;
      const btnX = crateX + 185;
      const gateX = btnX + 125;
      return {
        index: globalIndex,
        stageNumber: 2,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: `${cfg.stackLabel} Push & Gate`,
        hint: `${tag}: Push the ${P}/${P} crate onto the red switch together, then claim the key!`,
        worldWidth: gateX + 490,
        worldHeight: 620,
        spawnStart: { x: 40, y: 410, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's2-floor', x: 0, y: floorY, w: gateX + 490, h: 140 },
          { id: 's2-wall', x: gateX, y: 120, w: 30, h: 225 },
          { id: 's2-shelf', x: gateX + 75, y: floorY - subStack2, w: 150, h: 24 },
        ],
        pushBlocks: [
          { id: 's2-crate', x: crateX, y: floorY - (56 + P * 4), w: 56 + P * 4, h: 56 + P * 4, requiredPlayers: P },
        ],
        buttons: [
          { id: 's2-btn', x: btnX, y: floorY - 10, w: 54, h: 10, color: '#EF6B6B', latch: false },
        ],
        gates: [
          {
            id: 's2-gate',
            x: gateX,
            y: 345,
            w: 30,
            h: 155,
            openOffsetX: 0,
            openOffsetY: -160,
            buttonId: 's2-btn',
            color: '#EF6B6B',
            mode: 'gate',
          },
        ],
        spikes: [{ id: 's2-spk', x: gateX + 225, y: floorY - 12, w: 54, h: 12 }],
        keyPos: { x: gateX + 150, y: floorY - subStack2 - 42 },
        doorPos: { x: gateX + 375, y: floorY - 56 },
      };
    }

    case 3: {
      const cliffY = 240;
      const dropDepth = Math.min(285, 115 + P * 34);
      const stepY = cliffY + dropDepth;
      return {
        index: globalIndex,
        stageNumber: 3,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: `${cfg.stackLabel} Rope Rescue`,
        hint: `${tag}: ${P - 1} cats anchor on the cliff while 1 cat lowers on the rope to snag the key!`,
        worldWidth: 1120 + P * 36,
        worldHeight: 650,
        spawnStart: { x: 420, y: 170, spacing: spawnSpacing },
        tetheredRope: true,
        ropeMaxDist: P <= 2 ? 96 : 88,
        platforms: [
          { id: 's3-cliff', x: 375, y: cliffY, w: 745 + P * 36, h: 420 },
          { id: 's3-rescue', x: 155, y: stepY, w: 120, h: 24 },
          { id: 's3-arch', x: 745 + P * 18, y: cliffY - 65, w: 130, h: 22 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [],
        keyPos: { x: 215, y: stepY - 44 },
        doorPos: { x: 980 + P * 30, y: cliffY - 56 },
      };
    }

    case 4: {
      const floorY = 480;
      return {
        index: globalIndex,
        stageNumber: 4,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Bridge Keepers',
        hint: `${tag}: Hold the amber bridge button, push the light crate onto it, then cross together!`,
        worldWidth: 1200,
        worldHeight: 620,
        spawnStart: { x: 40, y: 400, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's4-p1', x: 0, y: floorY, w: 365, h: 150 },
          { id: 's4-p2', x: 560, y: floorY, w: 185, h: 150 },
          { id: 's4-p3', x: 920, y: floorY, w: 280, h: 150 },
          { id: 's4-key-top', x: 590, y: floorY - subStack2, w: 125, h: 24 },
        ],
        pushBlocks: [
          { id: 's4-crate', x: 290, y: floorY - 56, w: 56, h: 56, requiredPlayers: 1 },
        ],
        buttons: [
          { id: 's4-b1', x: 185, y: floorY - 10, w: 54, h: 10, color: '#F59E0B', latch: false },
          { id: 's4-b2', x: 630, y: floorY - 10, w: 50, h: 10, color: '#38BDF8', latch: true },
        ],
        gates: [
          {
            id: 's4-g1',
            x: 365,
            y: floorY,
            w: 195,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's4-b1',
            color: '#F59E0B',
            mode: 'bridge',
          },
          {
            id: 's4-g2',
            x: 745,
            y: floorY,
            w: 175,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's4-b2',
            color: '#38BDF8',
            mode: 'bridge',
          },
        ],
        spikes: [],
        keyPos: { x: 652, y: floorY - subStack2 - 42 },
        doorPos: { x: 1060, y: floorY - 56 },
      };
    }

    // ==========================================
    // TIER 2: MOVING LIFTS & GAPS (Stages 5..8)
    // ==========================================
    case 5: {
      const floorY = 500;
      const ceilY = 72;
      const laserCount = P >= 5 ? 6 : 5;
      const firstLaserX = 340 + P * 14;
      const spacing = 108;
      const corridorEnd = firstLaserX + (laserCount - 1) * spacing + 70;
      const worldW = corridorEnd + 330;
      const lasers: LaserDef[] = [];
      for (let i = 0; i < laserCount; i++) {
        lasers.push({
          id: `s5-las-${i}`,
          x: firstLaserX + i * spacing,
          y: ceilY + 28,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: floorY - (ceilY + 28) + 4,
          thickness: 10,
        });
      }
      const keyShelfY = floorY - subStack2;
      return {
        index: globalIndex,
        stageNumber: 5,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Laser Shield Corridor',
        hint: `${tag}: Random Up/Left/Right shields spawn on cats! Hop the Up-Shield cat onto teammates' heads to block ceiling lasers!`,
        worldWidth: worldW,
        worldHeight: 620,
        spawnStart: { x: 40, y: 410, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's5-floor', x: 0, y: floorY, w: worldW, h: 140 },
          {
            id: 's5-ceiling',
            x: firstLaserX - 30,
            y: ceilY,
            w: (laserCount - 1) * spacing + 88,
            h: 28,
          },
          { id: 's5-key-ledge', x: corridorEnd + 35, y: keyShelfY, w: 135, h: 24 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [],
        lasers,
        keyPos: { x: corridorEnd + 102, y: keyShelfY - 42 },
        doorPos: { x: worldW - 105, y: floorY - 56 },
      };
    }

    case 6: {
      return {
        index: globalIndex,
        stageNumber: 6,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Sky Elevator Switch',
        hint: `${tag}: Ride the vertical lift, flip the upper pink switch, then stack for the high key!`,
        worldWidth: 1220,
        worldHeight: 640,
        spawnStart: { x: 45, y: 440, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's6-base', x: 0, y: 530, w: 450, h: 120 },
          {
            id: 's6-lift',
            x: 468,
            y: 465,
            w: 135,
            h: 24,
            kind: 'moving',
            moveAxis: 'y',
            moveRange: 155,
            moveSpeed: 1.25,
          },
          { id: 's6-tier2', x: 625, y: 350, w: 595, h: 42 },
          { id: 's6-wall', x: 955, y: 120, w: 28, h: 110 },
          { id: 's6-key-perch', x: 745, y: 350 - subStack3, w: 135, h: 24 },
          { id: 's6-left-sw', x: 220, y: 265, w: 190, h: 24 },
          {
            id: 's6-shuttle',
            x: 430,
            y: 270,
            w: 120,
            h: 24,
            kind: 'moving',
            moveAxis: 'x',
            moveRange: 55,
            moveSpeed: 1.4,
          },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's6-btn', x: 280, y: 255, w: 50, h: 10, color: '#EC4899', latch: true },
        ],
        gates: [
          {
            id: 's6-gate',
            x: 955,
            y: 230,
            w: 28,
            h: 120,
            openOffsetX: 0,
            openOffsetY: -125,
            buttonId: 's6-btn',
            color: '#EC4899',
            mode: 'gate',
          },
        ],
        spikes: [{ id: 's6-spk', x: 655, y: 338, w: 46, h: 12 }],
        keyPos: { x: 812, y: 350 - subStack3 - 42 },
        doorPos: { x: 1095, y: 294 },
      };
    }

    case 7: {
      const floorY = 500;
      const crateX = 225 + runway;
      const wallX = crateX + 125;
      const gateX = wallX + 490;
      return {
        index: globalIndex,
        stageNumber: 7,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Tunnel Push & Spike',
        hint: `${tag}: Push the ${P}/${P} crate through the low tunnel onto the green latch, then hop the spikes!`,
        worldWidth: gateX + 260,
        worldHeight: 620,
        spawnStart: { x: 40, y: 410, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's7-floor', x: 0, y: floorY, w: gateX + 260, h: 130 },
          { id: 's7-tunnel', x: wallX, y: 160, w: 80, h: 270 },
          { id: 's7-key-plat', x: wallX + 230, y: floorY - subStack2, w: 135, h: 24 },
          { id: 's7-exit-top', x: gateX, y: 120, w: 28, h: 235 },
        ],
        pushBlocks: [
          { id: 's7-crate', x: crateX, y: floorY - 60, w: 60, h: 60, requiredPlayers: P },
        ],
        buttons: [
          { id: 's7-btn', x: wallX + 120, y: floorY - 10, w: 52, h: 10, color: '#10B981', latch: true },
        ],
        gates: [
          {
            id: 's7-gate',
            x: gateX,
            y: 355,
            w: 28,
            h: 145,
            openOffsetX: 0,
            openOffsetY: -150,
            buttonId: 's7-btn',
            color: '#10B981',
            mode: 'gate',
          },
        ],
        spikes: [
          { id: 's7-spk1', x: wallX + 380, y: floorY - 12, w: 54, h: 12 },
        ],
        keyPos: { x: wallX + 297, y: floorY - subStack2 - 42 },
        doorPos: { x: gateX + 135, y: floorY - 56 },
      };
    }

    case 8: {
      const floorY = 480;
      return {
        index: globalIndex,
        stageNumber: 8,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Twin Relay Bridges',
        hint: `${tag}: Hold bridges in relay until someone hits the green master switch to lock both bridges!`,
        worldWidth: 1280,
        worldHeight: 620,
        spawnStart: { x: 40, y: 400, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's8-p1', x: 0, y: floorY, w: 340, h: 150 },
          { id: 's8-p2', x: 520, y: floorY, w: 220, h: 150 },
          { id: 's8-p3', x: 920, y: floorY, w: 360, h: 150 },
          { id: 's8-key-shelf', x: 565, y: floorY - subStack3, w: 130, h: 24 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's8-b1', x: 235, y: floorY - 10, w: 48, h: 10, color: '#F59E0B', latch: false },
          { id: 's8-b2', x: 605, y: floorY - 10, w: 48, h: 10, color: '#A78BFA', latch: false },
          { id: 's8-lock', x: 965, y: floorY - 10, w: 52, h: 10, color: '#10B981', latch: true },
        ],
        gates: [
          {
            id: 's8-br1',
            x: 340,
            y: floorY,
            w: 180,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's8-b1',
            altButtonId: 's8-lock',
            color: '#F59E0B',
            mode: 'bridge',
          },
          {
            id: 's8-br2',
            x: 740,
            y: floorY,
            w: 180,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's8-b2',
            altButtonId: 's8-lock',
            color: '#A78BFA',
            mode: 'bridge',
          },
        ],
        spikes: [{ id: 's8-spk', x: 1055, y: floorY - 12, w: 48, h: 12 }],
        keyPos: { x: 630, y: floorY - subStack3 - 42 },
        doorPos: { x: 1175, y: floorY - 56 },
      };
    }

    // ==========================================
    // TIER 3: MULTI-HAZARD & SPLITS (Stages 9..12)
    // ==========================================
    case 9: {
      // Staircase Spring Cliff: form a human staircase against the tall cliff so 1 cat presses
      // the red button on top to unlock the green scissor spring ("per lompat") for everyone!
      const floorY = 580;
      const cliffHeight = 76 + P * 32; // 2P:140 .. 6P:268 (always taller than 1-cat 106px jump)
      const cliffY = floorY - cliffHeight;
      const cliffX = 520;
      const springW = Math.min(230, Math.max(150, P * 38));
      const springH = 30;
      const launchVelY = -Math.round(Math.sqrt(2 * 1480 * (cliffHeight + 65)));
      return {
        index: globalIndex,
        stageNumber: 9,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Staircase Spring Cliff',
        hint: `${tag}: Stack a ${P}-cat staircase by the cliff so 1 climber hits the red button to unlock the spring pad below!`,
        worldWidth: 1180,
        worldHeight: 680,
        spawnStart: { x: 40, y: 490, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's9-floor', x: 0, y: floorY, w: 540, h: 120 },
          { id: 's9-cliff', x: cliffX, y: cliffY, w: 660, h: cliffHeight + 120 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's9-spring-btn', x: cliffX + 185, y: cliffY - 10, w: 52, h: 10, color: '#EF4444', latch: true },
        ],
        gates: [],
        spikes: [],
        springs: [
          {
            id: 's9-spring',
            x: cliffX - springW,
            y: floorY - springH,
            w: springW,
            h: springH,
            launchVelY,
            buttonId: 's9-spring-btn',
            color: '#22C55E',
          },
        ],
        keyPos: { x: cliffX + 340, y: cliffY - 48 },
        doorPos: { x: cliffX + 515, y: cliffY - 56 },
      };
    }

    case 10: {
      const floorY = 500;
      const crateX = 225 + runway;
      const btnX = crateX + 145;
      const dockStart = btnX + 85;
      const dockEnd = dockStart + 120;
      const ferryX = dockEnd + 20;
      const farX = dockEnd + 355;
      return {
        index: globalIndex,
        stageNumber: 10,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Pendulum Ferry & Boulder',
        hint: `${tag}: Push the ${P}/${P} boulder to summon the dock bridge, ride the ferry, and grab the key!`,
        worldWidth: farX + 440,
        worldHeight: 620,
        spawnStart: { x: 40, y: 410, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's10-left', x: 0, y: floorY, w: dockStart, h: 140 },
          {
            id: 's10-ferry',
            x: ferryX,
            y: floorY - 12,
            w: 140 + P * 4,
            h: 24,
            kind: 'moving',
            moveAxis: 'x',
            moveRange: 175,
            moveSpeed: 1.25,
          },
          { id: 's10-right', x: farX, y: floorY, w: 440, h: 140 },
          { id: 's10-key-shelf', x: farX + 120, y: floorY - subStack2, w: 135, h: 24 },
        ],
        pushBlocks: [
          { id: 's10-boulder', x: crateX, y: floorY - (56 + P * 4), w: 56 + P * 4, h: 56 + P * 4, requiredPlayers: P },
        ],
        buttons: [
          { id: 's10-btn', x: btnX, y: floorY - 10, w: 54, h: 10, color: '#F59E0B', latch: true },
        ],
        gates: [
          {
            id: 's10-dock',
            x: dockStart,
            y: floorY,
            w: 120,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's10-btn',
            color: '#F59E0B',
            mode: 'bridge',
          },
        ],
        spikes: [{ id: 's10-spk', x: farX + 275, y: floorY - 12, w: 48, h: 12 }],
        keyPos: { x: farX + 188, y: floorY - subStack2 - 42 },
        doorPos: { x: farX + 355, y: floorY - 56 },
      };
    }

    case 11: {
      const cliffY = 240;
      const deepY = cliffY + Math.min(285, 130 + P * 30);
      return {
        index: globalIndex,
        stageNumber: 11,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Canyon Rope & Spikes',
        hint: `${tag}: Tethered cliff run! Anchors hop over cliff spikes while the diver snags the deep key!`,
        worldWidth: 1220 + P * 30,
        worldHeight: 660,
        spawnStart: { x: 430, y: 170, spacing: spawnSpacing },
        tetheredRope: true,
        ropeMaxDist: P <= 2 ? 96 : 90,
        platforms: [
          { id: 's11-cliff', x: 390, y: cliffY, w: 830 + P * 30, h: 430 },
          { id: 's11-mid-step', x: 255, y: cliffY + 125, w: 95, h: 22 },
          { id: 's11-deep', x: 135, y: deepY, w: 125, h: 24 },
          { id: 's11-arch', x: 840, y: cliffY - 68, w: 130, h: 22 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [
          { id: 's11-spk1', x: 700, y: cliffY - 12, w: 48, h: 12 },
          { id: 's11-spk2', x: 970, y: cliffY - 12, w: 48, h: 12 },
        ],
        keyPos: { x: 197, y: deepY - 44 },
        doorPos: { x: 1110 + P * 25, y: cliffY - 56 },
      };
    }

    case 12: {
      const gateCount = Math.max(1, P - 1);
      const floorY = 500;
      const firstGateX = 560;
      const gateSpacing = 110;
      const lastGateX = firstGateX + (gateCount - 1) * gateSpacing;
      const masterX = lastGateX + 75;
      const worldW = Math.max(1220, masterX + 310);

      const platforms: PlatformDef[] = [
        { id: 's12-floor', x: 0, y: floorY, w: worldW, h: 140 },
      ];
      const buttons: ButtonDef[] = [];
      const gates: GateDef[] = [];

      for (let i = 0; i < gateCount; i++) {
        const col = VAULT_COLORS[i % VAULT_COLORS.length];
        const gx = firstGateX + i * gateSpacing;
        platforms.push({ id: `s12-w${i}`, x: gx, y: 100, w: 26, h: 245 });
        buttons.push({
          id: `s12-b${i}`,
          x: 165 + i * 70,
          y: floorY - 10,
          w: 44,
          h: 10,
          color: col,
          latch: false,
        });
        gates.push({
          id: `s12-g${i}`,
          x: gx,
          y: 345,
          w: 26,
          h: 155,
          openOffsetX: 0,
          openOffsetY: -160,
          buttonId: `s12-b${i}`,
          altButtonId: 's12-master',
          color: col,
          mode: 'gate',
        });
      }

      buttons.push({
        id: 's12-master',
        x: masterX,
        y: floorY - 10,
        w: 50,
        h: 10,
        color: '#10B981',
        latch: true,
      });

      return {
        index: globalIndex,
        stageNumber: 12,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Squad Lock Vault',
        hint: `${tag}: Hold all ${gateCount} vault buttons simultaneously so 1 runner unlocks the green master latch!`,
        worldWidth: worldW,
        worldHeight: 620,
        spawnStart: { x: 40, y: 410, spacing: spawnSpacing },
        tetheredRope: false,
        platforms,
        pushBlocks: [],
        buttons,
        gates,
        spikes: [],
        keyPos: { x: masterX + 25, y: 430 },
        doorPos: { x: worldW - 120, y: floorY - 56 },
      };
    }

    // ==========================================
    // TIER 4: DUAL MECHANICS & CHAINS (Stages 13..16)
    // ==========================================
    case 13: {
      const floorY = 520;
      const ceilY = 82;
      const z1Start = 320 + P * 10;
      const tunnelX = z1Start + 330;
      const tunnelW = 285;
      const emitterColX = tunnelX + tunnelW + 95;
      const upperDeckY = 390;
      const upperStart = tunnelX;
      const hasThirdShield = P >= 3;
      const hiBridgeX = emitterColX + 75;
      const hiBridgeW = 330;
      const worldW = hasThirdShield ? hiBridgeX + hiBridgeW + 170 : emitterColX + 260;

      const platforms: PlatformDef[] = [
        { id: 's13-floor', x: 0, y: floorY, w: worldW, h: 130 },
        { id: 's13-ceil', x: z1Start - 25, y: ceilY, w: 290, h: 28 },
        { id: 's13-roof', x: upperStart, y: upperDeckY, w: tunnelW, h: 42 },
        { id: 's13-step', x: tunnelX + tunnelW + 16, y: 454, w: 66, h: 20 },
        { id: 's13-emitter-col', x: emitterColX, y: 440, w: 34, h: 80 },
      ];

      const lasers: LaserDef[] = [
        {
          id: 's13-down-1',
          x: z1Start,
          y: ceilY + 28,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: floorY - (ceilY + 28) + 4,
          thickness: 10,
        },
        {
          id: 's13-down-2',
          x: z1Start + 108,
          y: ceilY + 28,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: floorY - (ceilY + 28) + 4,
          thickness: 10,
        },
        {
          id: 's13-down-3',
          x: z1Start + 216,
          y: ceilY + 28,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: floorY - (ceilY + 28) + 4,
          thickness: 10,
        },
        {
          // Horizontal beam firing leftward from right column through the low tunnel
          id: 's13-horiz-left',
          x: emitterColX - 12,
          y: floorY - 34,
          w: 12,
          h: 24,
          dir: 'left',
          maxLength: emitterColX - 12 - (tunnelX - 30),
          thickness: 10,
        },
      ];

      let keyPos = { x: tunnelX + 95, y: upperDeckY - 46 };
      let doorPos = { x: emitterColX + 145, y: floorY - 56 };

      if (hasThirdShield) {
        // 3P+ adds an elevated upper corridor entered from the right; beam fires rightward (needs Left Shield ◀!)
        platforms.push(
          { id: 's13-hi-step', x: hiBridgeX + hiBridgeW + 20, y: 454, w: 66, h: 20 },
          { id: 's13-hi-bridge', x: hiBridgeX, y: upperDeckY, w: hiBridgeW, h: 26 },
          { id: 's13-hi-emitter-wall', x: hiBridgeX, y: 248, w: 28, h: 142 },
          { id: 's13-hi-roof', x: hiBridgeX + 28, y: 248, w: 220, h: 42 },
        );
        lasers.push({
          id: 's13-horiz-right',
          x: hiBridgeX + 28,
          y: upperDeckY - 34,
          w: 12,
          h: 24,
          dir: 'right',
          maxLength: 270,
          thickness: 10,
        });
        keyPos = { x: hiBridgeX + 68, y: upperDeckY - 44 };
        doorPos = { x: worldW - 85, y: floorY - 56 };
      }

      return {
        index: globalIndex,
        stageNumber: 13,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Laser Crossfire Vault',
        hint: hasThirdShield
          ? `${tag}: Use all 3 random shields! Up blocks ceiling beams, Right leads through the bottom tunnel, Left leads left up top!`
          : `${tag}: Up-Shield rides on top past ceiling lasers; Right-Shield leads rightward to block the tunnel beam!`,
        worldWidth: worldW,
        worldHeight: 640,
        spawnStart: { x: 40, y: 430, spacing: spawnSpacing },
        tetheredRope: false,
        platforms,
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [],
        lasers,
        keyPos,
        doorPos,
      };
    }

    case 14: {
      const floorY = 500;
      const g1X = 460;
      const crate2X = 600 + runway;
      const b2X = crate2X + 185;
      const g2X = b2X + 120;
      const worldW = g2X + 410;
      return {
        index: globalIndex,
        stageNumber: 14,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Double Crate Relay',
        hint: `${tag}: First push the 1/1 light crate to open Gate 1, then unite behind the ${P}/${P} boulder!`,
        worldWidth: worldW,
        worldHeight: 620,
        spawnStart: { x: 40, y: 410, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's14-floor', x: 0, y: floorY, w: worldW, h: 130 },
          { id: 's14-w1', x: g1X, y: 120, w: 28, h: 225 },
          { id: 's14-w2', x: g2X, y: 120, w: 30, h: 225 },
          { id: 's14-key-plat', x: g2X + 85, y: floorY - subStack2, w: 130, h: 24 },
        ],
        pushBlocks: [
          { id: 's14-c1', x: 245, y: floorY - 56, w: 56, h: 56, requiredPlayers: 1 },
          { id: 's14-c2', x: crate2X, y: floorY - (56 + P * 4), w: 56 + P * 4, h: 56 + P * 4, requiredPlayers: P },
        ],
        buttons: [
          { id: 's14-b1', x: g1X - 95, y: floorY - 10, w: 48, h: 10, color: '#F59E0B', latch: true },
          { id: 's14-b2', x: b2X, y: floorY - 10, w: 52, h: 10, color: '#EF6B6B', latch: false },
        ],
        gates: [
          {
            id: 's14-g1',
            x: g1X,
            y: 345,
            w: 28,
            h: 155,
            openOffsetX: 0,
            openOffsetY: -160,
            buttonId: 's14-b1',
            color: '#F59E0B',
            mode: 'gate',
          },
          {
            id: 's14-g2',
            x: g2X,
            y: 345,
            w: 30,
            h: 155,
            openOffsetX: 0,
            openOffsetY: -160,
            buttonId: 's14-b2',
            color: '#EF6B6B',
            mode: 'gate',
          },
        ],
        spikes: [{ id: 's14-spk', x: g2X + 235, y: floorY - 12, w: 48, h: 12 }],
        keyPos: { x: g2X + 150, y: floorY - subStack2 - 42 },
        doorPos: { x: worldW - 100, y: floorY - 56 },
      };
    }

    case 15: {
      const floorY = 470;
      return {
        index: globalIndex,
        stageNumber: 15,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Tethered Twin Ferries',
        hint: `${tag}: Tied by rope, leap together across two moving ferries without pulling teammates down!`,
        worldWidth: 1380,
        worldHeight: 620,
        spawnStart: { x: 40, y: 390, spacing: spawnSpacing },
        tetheredRope: true,
        ropeMaxDist: P <= 2 ? 105 : 94,
        platforms: [
          { id: 's15-p1', x: 0, y: floorY, w: 380, h: 160 },
          {
            id: 's15-f1',
            x: 405,
            y: floorY - 12,
            w: 135 + P * 4,
            h: 24,
            kind: 'moving',
            moveAxis: 'x',
            moveRange: 130,
            moveSpeed: 1.15,
          },
          { id: 's15-mid', x: 660, y: floorY, w: 205, h: 160 },
          { id: 's15-key-ledge', x: 695, y: floorY - subStack3, w: 135, h: 24 },
          {
            id: 's15-f2',
            x: 890,
            y: floorY - 12,
            w: 135 + P * 4,
            h: 24,
            kind: 'moving',
            moveAxis: 'x',
            moveRange: 130,
            moveSpeed: 1.35,
          },
          { id: 's15-end', x: 1145, y: floorY, w: 235, h: 160 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [],
        keyPos: { x: 762, y: floorY - subStack3 - 42 },
        doorPos: { x: 1265, y: floorY - 56 },
      };
    }

    case 16: {
      const summitY = 420;
      const keyShelfY = summitY - fullStack;
      const lasers: LaserDef[] = [
        {
          id: 's16-down-1',
          x: 495,
          y: 106,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: 485 - 118 + 4,
          thickness: 10,
        },
        {
          id: 's16-down-2',
          x: 605,
          y: 106,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: 485 - 118 + 4,
          thickness: 10,
        },
        {
          id: 's16-horiz-l',
          x: 1318,
          y: 466,
          w: 12,
          h: 24,
          dir: 'left',
          maxLength: 265,
          thickness: 10,
        },
      ];
      return {
        index: globalIndex,
        stageNumber: 16,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Laser Pyramid Climb',
        hint: `${tag}: Shield past the mid-step ceiling lasers, stack ${P} cats at the summit for the key, then Right-Shield blocks the exit laser!`,
        worldWidth: 1500,
        worldHeight: 680,
        spawnStart: { x: 40, y: 460, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's16-p1', x: 0, y: 550, w: 400, h: 140 },
          { id: 's16-p2', x: 460, y: 485, w: 225, h: 24 },
          { id: 's16-p2-ceil', x: 470, y: 80, w: 190, h: 26 },
          { id: 's16-summit', x: 735, y: summitY, w: 240, h: 26 },
          { id: 's16-key-shelf', x: 805, y: keyShelfY, w: 130, h: 24 },
          { id: 's16-end', x: 1020, y: 500, w: 480, h: 190 },
          { id: 's16-end-roof', x: 1070, y: 372, w: 185, h: 40 },
          { id: 's16-end-step', x: 1265, y: 438, w: 55, h: 20 },
          { id: 's16-end-col', x: 1330, y: 422, w: 32, h: 78 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [{ id: 's16-spk', x: 1025, y: 488, w: 42, h: 12 }],
        lasers,
        keyPos: { x: 870, y: keyShelfY - 42 },
        doorPos: { x: 1415, y: 444 },
      };
    }

    // ==========================================
    // TIER 5: MASTER GAUNTLETS (Stages 17..20)
    // ==========================================
    case 17: {
      return {
        index: globalIndex,
        stageNumber: 17,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Rope Elevator Rescue',
        hint: `${tag}: Tied by rope, ride the elevator up, dangle through the shaft for the key, and cross safely!`,
        worldWidth: 1340,
        worldHeight: 640,
        spawnStart: { x: 40, y: 410, spacing: spawnSpacing },
        tetheredRope: true,
        ropeMaxDist: P <= 2 ? 105 : 92,
        platforms: [
          { id: 's17-base', x: 0, y: 500, w: 415, h: 150 },
          {
            id: 's17-lift',
            x: 435,
            y: 445,
            w: 135,
            h: 24,
            kind: 'moving',
            moveAxis: 'y',
            moveRange: 170,
            moveSpeed: 1.2,
          },
          { id: 's17-hi1', x: 590, y: 275, w: 210, h: 30 },
          { id: 's17-dive-step', x: 825, y: 415, w: 120, h: 24 },
          { id: 's17-hi2', x: 960, y: 275, w: 380, h: 30 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [{ id: 's17-spk', x: 1045, y: 263, w: 52, h: 12 }],
        keyPos: { x: 885, y: 372 },
        doorPos: { x: 1235, y: 219 },
      };
    }

    case 18: {
      const floorY = 500;
      return {
        index: globalIndex,
        stageNumber: 18,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'The Gauntlet Bridges',
        hint: `${tag}: Relay across 3 gaps over spikes, lock the green master switch, and stack for the key!`,
        worldWidth: 1460,
        worldHeight: 640,
        spawnStart: { x: 40, y: 410, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's18-i1', x: 0, y: floorY, w: 350, h: 150 },
          { id: 's18-i2', x: 510, y: floorY, w: 195, h: 150 },
          { id: 's18-i3', x: 865, y: floorY, w: 195, h: 150 },
          { id: 's18-i4', x: 1210, y: floorY, w: 250, h: 150 },
          { id: 's18-key-shelf', x: 1240, y: floorY - subStack3, w: 135, h: 24 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's18-b1', x: 245, y: floorY - 10, w: 46, h: 10, color: '#EF6B6B', latch: false },
          { id: 's18-b2', x: 540, y: floorY - 10, w: 46, h: 10, color: '#F59E0B', latch: false },
          { id: 's18-b3', x: 900, y: floorY - 10, w: 46, h: 10, color: '#A78BFA', latch: false },
          { id: 's18-lock', x: 1230, y: floorY - 10, w: 48, h: 10, color: '#10B981', latch: true },
        ],
        gates: [
          {
            id: 's18-br1',
            x: 350,
            y: floorY,
            w: 160,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's18-b1',
            altButtonId: 's18-lock',
            color: '#EF6B6B',
            mode: 'bridge',
          },
          {
            id: 's18-br2',
            x: 705,
            y: floorY,
            w: 160,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's18-b2',
            altButtonId: 's18-lock',
            color: '#F59E0B',
            mode: 'bridge',
          },
          {
            id: 's18-br3',
            x: 1060,
            y: floorY,
            w: 150,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's18-b3',
            altButtonId: 's18-lock',
            color: '#A78BFA',
            mode: 'bridge',
          },
        ],
        spikes: [
          { id: 's18-spk1', x: 615, y: floorY - 12, w: 44, h: 12 },
          { id: 's18-spk2', x: 970, y: floorY - 12, w: 44, h: 12 },
        ],
        keyPos: { x: 1308, y: floorY - subStack3 - 42 },
        doorPos: { x: 1390, y: floorY - 56 },
      };
    }

    case 19: {
      const floorY = 520;
      const crateX = 220 + runway;
      const b0X = crateX + 165;
      const g0X = b0X + 95;
      const gateCount = Math.max(1, P - 1);
      const swStart = g0X + 65;
      const firstInnerGate = swStart + gateCount * 62 + 65;
      const lastInnerGate = firstInnerGate + (gateCount - 1) * 90;
      const masterX = lastInnerGate + 70;
      const worldW = masterX + 275;

      const platforms: PlatformDef[] = [
        { id: 's19-floor', x: 0, y: floorY, w: worldW, h: 140 },
        { id: 's19-w0', x: g0X, y: 120, w: 28, h: 245 },
      ];
      const buttons: ButtonDef[] = [
        { id: 's19-b0', x: b0X, y: floorY - 10, w: 52, h: 10, color: '#F48C42', latch: true },
      ];
      const gates: GateDef[] = [
        {
          id: 's19-g0',
          x: g0X,
          y: 365,
          w: 28,
          h: 155,
          openOffsetX: 0,
          openOffsetY: -160,
          buttonId: 's19-b0',
          color: '#F48C42',
          mode: 'gate',
        },
      ];

      for (let i = 0; i < gateCount; i++) {
        const col = VAULT_COLORS[i % VAULT_COLORS.length];
        const gx = firstInnerGate + i * 90;
        platforms.push({ id: `s19-w${i + 1}`, x: gx, y: 120, w: 24, h: 245 });
        buttons.push({
          id: `s19-b${i + 1}`,
          x: swStart + i * 62,
          y: floorY - 10,
          w: 42,
          h: 10,
          color: col,
          latch: false,
        });
        gates.push({
          id: `s19-g${i + 1}`,
          x: gx,
          y: 365,
          w: 24,
          h: 155,
          openOffsetX: 0,
          openOffsetY: -160,
          buttonId: `s19-b${i + 1}`,
          altButtonId: 's19-master',
          color: col,
          mode: 'gate',
        });
      }

      buttons.push({
        id: 's19-master',
        x: masterX,
        y: floorY - 10,
        w: 50,
        h: 10,
        color: '#10B981',
        latch: true,
      });

      return {
        index: globalIndex,
        stageNumber: 19,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Fortress Siege',
        hint: `${tag}: Breach the outer wall with the ${P}/${P} siege crate, then hold ${gateCount} inner switches together!`,
        worldWidth: worldW,
        worldHeight: 640,
        spawnStart: { x: 40, y: 430, spacing: spawnSpacing },
        tetheredRope: false,
        platforms,
        pushBlocks: [
          { id: 's19-crate', x: crateX, y: floorY - (56 + P * 4), w: 56 + P * 4, h: 56 + P * 4, requiredPlayers: P },
        ],
        buttons,
        gates,
        spikes: [],
        keyPos: { x: masterX + 25, y: 435 },
        doorPos: { x: worldW - 105, y: floorY - 56 },
      };
    }

    case 20: {
      const floorY = 530;
      const crateReq = Math.max(2, P - 1);
      const crateX = 250 + runway;
      const tunnelX = crateX + 125;
      const btnX = tunnelX + 125;
      const startEnd = btnX + 95;
      const ferryX = startEnd + 25;
      const midX = ferryX + 245;
      const liftX = midX + 200;
      const summitX = liftX + 125;
      const worldW = summitX + 340;
      return {
        index: globalIndex,
        stageNumber: 20,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: `Grand ${cfg.stackLabel} Checkpoint`,
        hint: `${tag}: Halfway milestone! Rope tether, ${crateReq}/${crateReq} tunnel crate, ferry, elevator, and summit stack!`,
        worldWidth: worldW,
        worldHeight: 680,
        spawnStart: { x: 40, y: 440, spacing: spawnSpacing },
        tetheredRope: true,
        ropeMaxDist: P <= 2 ? 110 : 96,
        platforms: [
          { id: 's20-start', x: 0, y: floorY, w: startEnd, h: 160 },
          { id: 's20-tunnel', x: tunnelX, y: 200, w: 72, h: 255 },
          {
            id: 's20-ferry',
            x: ferryX,
            y: floorY - 15,
            w: 140,
            h: 24,
            kind: 'moving',
            moveAxis: 'x',
            moveRange: 105,
            moveSpeed: 1.15,
          },
          { id: 's20-mid', x: midX, y: floorY - 20, w: 180, h: 180 },
          {
            id: 's20-lift',
            x: liftX,
            y: 475,
            w: 110,
            h: 24,
            kind: 'moving',
            moveAxis: 'y',
            moveRange: 115,
            moveSpeed: 1.2,
          },
          { id: 's20-summit', x: summitX, y: 380, w: 340, h: 310 },
          { id: 's20-key-perch', x: summitX + 75, y: 380 - subStack3, w: 125, h: 24 },
          { id: 's20-wall', x: summitX + 215, y: 120, w: 26, h: 125 },
        ],
        pushBlocks: [
          { id: 's20-crate', x: crateX, y: floorY - 60, w: 60, h: 60, requiredPlayers: crateReq },
        ],
        buttons: [
          { id: 's20-b-gate', x: btnX, y: floorY - 10, w: 50, h: 10, color: '#10B981', latch: true },
        ],
        gates: [
          {
            id: 's20-gate',
            x: summitX + 215,
            y: 245,
            w: 26,
            h: 135,
            openOffsetX: 0,
            openOffsetY: -140,
            buttonId: 's20-b-gate',
            color: '#10B981',
            mode: 'gate',
          },
        ],
        spikes: [{ id: 's20-spk', x: midX + 68, y: floorY - 32, w: 42, h: 12 }],
        keyPos: { x: summitX + 137, y: 380 - subStack3 - 42 },
        doorPos: { x: summitX + 270, y: 324 },
      };
    }

    // ==========================================
    // TIER 6: SPRING & SPIKE TRIALS (Stages 21..24)
    // ==========================================
    case 21: {
      const floorY = 560;
      const arenaX = 520;
      const keyShelfY = floorY - fullStack;
      return {
        index: globalIndex,
        stageNumber: 21,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Spike Valley Stack',
        hint: `${tag}: Hop cleanly past the spike beds and stack all ${P} cats in the center to reach ${fullStack}px!`,
        worldWidth: 1340,
        worldHeight: 680,
        spawnStart: { x: 40, y: 470, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's21-floor', x: 0, y: floorY, w: 1340, h: 130 },
          { id: 's21-key-shelf', x: arenaX + 40, y: keyShelfY, w: 150, h: 26 },
          { id: 's21-exit', x: 1090, y: 495, w: 250, h: 65 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [
          { id: 's21-spk1', x: 345, y: floorY - 12, w: 62, h: 12 },
          { id: 's21-spk2', x: 785, y: floorY - 12, w: 62, h: 12 },
          { id: 's21-spk3', x: 965, y: floorY - 12, w: 58, h: 12 },
        ],
        keyPos: { x: arenaX + 115, y: keyShelfY - 42 },
        doorPos: { x: 1210, y: 439 },
      };
    }

    case 22: {
      const floorY = 580;
      const cliff1H = 74 + Math.min(P, 4) * 30;
      const cliff1Y = floorY - cliff1H;
      const cliff2H = 70 + Math.min(P, 3) * 30;
      const cliff2Y = cliff1Y - cliff2H;
      const sp1W = 155;
      const sp2W = 140;
      const c1X = 480;
      const c2X = 955;
      return {
        index: globalIndex,
        stageNumber: 22,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Twin Spring Canyon',
        hint: `${tag}: Staircase up cliff 1 for the red spring switch, then team-stack cliff 2 to unlock spring #2!`,
        worldWidth: 1360,
        worldHeight: 680,
        spawnStart: { x: 40, y: 490, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's22-floor', x: 0, y: floorY, w: 490, h: 120 },
          { id: 's22-c1', x: c1X, y: cliff1Y, w: 485, h: cliff1H + 120 },
          { id: 's22-c2', x: c2X, y: cliff2Y, w: 405, h: cliff2H + cliff1H + 120 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's22-b1', x: c1X + 125, y: cliff1Y - 10, w: 48, h: 10, color: '#EF4444', latch: true },
          { id: 's22-b2', x: c2X + 100, y: cliff2Y - 10, w: 48, h: 10, color: '#38BDF8', latch: true },
        ],
        gates: [],
        spikes: [{ id: 's22-spk', x: c1X + 215, y: cliff1Y - 12, w: 44, h: 12 }],
        springs: [
          {
            id: 's22-sp1',
            x: c1X - sp1W,
            y: floorY - 28,
            w: sp1W,
            h: 28,
            launchVelY: -Math.round(Math.sqrt(2 * 1480 * (cliff1H + 62))),
            buttonId: 's22-b1',
            color: '#22C55E',
          },
          {
            id: 's22-sp2',
            x: c2X - sp2W,
            y: cliff1Y - 28,
            w: sp2W,
            h: 28,
            launchVelY: -Math.round(Math.sqrt(2 * 1480 * (cliff2H + 62))),
            buttonId: 's22-b2',
            color: '#22C55E',
          },
        ],
        keyPos: { x: c2X + 195, y: cliff2Y - 46 },
        doorPos: { x: c2X + 305, y: cliff2Y - 56 },
      };
    }

    case 23: {
      const floorY = 530;
      const liftX = 435;
      const upperY = 330;
      const lasers: LaserDef[] = [
        {
          id: 's23-down-1',
          x: 695,
          y: 106,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: upperY - 118 + 4,
          thickness: 10,
        },
        {
          id: 's23-horiz-r',
          x: 845,
          y: upperY - 34,
          w: 12,
          h: 24,
          dir: 'right',
          maxLength: 260,
          thickness: 10,
        },
      ];
      return {
        index: globalIndex,
        stageNumber: 23,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Laser Elevator Shield',
        hint: `${tag}: Ride the vertical elevator as a stack, then pair Up & Left shields to clear the upper beams!`,
        worldWidth: 1320,
        worldHeight: 650,
        spawnStart: { x: 40, y: 440, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's23-base', x: 0, y: floorY, w: 410, h: 130 },
          {
            id: 's23-lift',
            x: liftX,
            y: floorY - 30,
            w: 145,
            h: 24,
            kind: 'moving',
            moveAxis: 'y',
            moveRange: 175,
            moveSpeed: 1.15,
          },
          { id: 's23-deck', x: 605, y: upperY, w: 715, h: 36 },
          { id: 's23-ceil', x: 655, y: 80, w: 120, h: 26 },
          { id: 's23-col', x: 815, y: upperY - 95, w: 30, h: 95 },
          { id: 's23-roof', x: 845, y: upperY - 95, w: 180, h: 30 },
          { id: 's23-key-ledge', x: 1055, y: upperY - subStack2, w: 115, h: 22 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [],
        lasers,
        keyPos: { x: 1112, y: upperY - subStack2 - 42 },
        doorPos: { x: 1225, y: upperY - 56 },
      };
    }

    case 24: {
      const floorY = 500;
      return {
        index: globalIndex,
        stageNumber: 24,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Bridge Lockout Lab',
        hint: `${tag}: Push the 1/1 crate onto the amber plate, stack for the upper key, and hold purple bridge!`,
        worldWidth: 1340,
        worldHeight: 640,
        spawnStart: { x: 40, y: 410, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's24-p1', x: 0, y: floorY, w: 380, h: 150 },
          { id: 's24-p2', x: 560, y: floorY, w: 230, h: 150 },
          { id: 's24-p3', x: 965, y: floorY, w: 375, h: 150 },
          { id: 's24-key-step', x: 615, y: floorY - fullStack, w: 135, h: 24 },
        ],
        pushBlocks: [
          { id: 's24-c1', x: 255, y: floorY - 56, w: 56, h: 56, requiredPlayers: 1 },
        ],
        buttons: [
          { id: 's24-b1', x: 185, y: floorY - 10, w: 50, h: 10, color: '#F59E0B', latch: false },
          { id: 's24-b2', x: 590, y: floorY - 10, w: 48, h: 10, color: '#A78BFA', latch: false },
          { id: 's24-lock', x: 1015, y: floorY - 10, w: 52, h: 10, color: '#10B981', latch: true },
        ],
        gates: [
          {
            id: 's24-g1',
            x: 380,
            y: floorY,
            w: 180,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's24-b1',
            altButtonId: 's24-lock',
            color: '#F59E0B',
            mode: 'bridge',
          },
          {
            id: 's24-g2',
            x: 790,
            y: floorY,
            w: 175,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's24-b2',
            altButtonId: 's24-lock',
            color: '#A78BFA',
            mode: 'bridge',
          },
        ],
        spikes: [{ id: 's24-spk', x: 1125, y: floorY - 12, w: 50, h: 12 }],
        keyPos: { x: 682, y: floorY - fullStack - 42 },
        doorPos: { x: 1245, y: floorY - 56 },
      };
    }

    // ==========================================
    // TIER 7: TOWER LIFTS & CLIMBS (Stages 25..28)
    // ==========================================
    case 25: {
      const floorY = 560;
      const midY = 395;
      const topKeyY = midY - Math.min(184, fullStack);
      return {
        index: globalIndex,
        stageNumber: 25,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Elevator Tower Carry',
        hint: `${tag}: Stack together ON the moving platform! The whole cat tower rides the vertical & horizontal lifts together!`,
        worldWidth: 1360,
        worldHeight: 680,
        spawnStart: { x: 40, y: 470, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's25-base', x: 0, y: floorY, w: 390, h: 130 },
          {
            id: 's25-vlift',
            x: 415,
            y: 530,
            w: 145,
            h: 24,
            kind: 'moving',
            moveAxis: 'y',
            moveRange: 135,
            moveSpeed: 1.1,
          },
          {
            id: 's25-hlift',
            x: 590,
            y: midY,
            w: 145,
            h: 24,
            kind: 'moving',
            moveAxis: 'x',
            moveRange: 185,
            moveSpeed: 1.05,
          },
          { id: 's25-top', x: 940, y: midY, w: 420, h: 295 },
          { id: 's25-key-ledge', x: 1000, y: topKeyY, w: 135, h: 24 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [{ id: 's25-spk', x: 1165, y: midY - 12, w: 44, h: 12 }],
        keyPos: { x: 1067, y: topKeyY - 42 },
        doorPos: { x: 1255, y: midY - 56 },
      };
    }

    case 26: {
      const floorY = 580;
      const cliffH = 82 + P * 30;
      const cliffY = floorY - cliffH;
      const spX = 320;
      const cliffX = 515;
      const crateX = cliffX + 165;
      const btnX = crateX + 165;
      return {
        index: globalIndex,
        stageNumber: 26,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Spring & Crate Seesaw',
        hint: `${tag}: Staircase onto the cliff, push the crate over the pink spring switch, then bounce everyone up!`,
        worldWidth: 1320,
        worldHeight: 680,
        spawnStart: { x: 35, y: 490, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's26-floor', x: 0, y: floorY, w: 530, h: 120 },
          { id: 's26-cliff', x: cliffX, y: cliffY, w: 805, h: cliffH + 120 },
        ],
        pushBlocks: [
          { id: 's26-crate', x: crateX, y: cliffY - 56, w: 56, h: 56, requiredPlayers: 1 },
        ],
        buttons: [
          { id: 's26-btn', x: btnX, y: cliffY - 10, w: 54, h: 10, color: '#EC4899', latch: true },
        ],
        gates: [],
        spikes: [{ id: 's26-spk', x: btnX + 135, y: cliffY - 12, w: 46, h: 12 }],
        springs: [
          {
            id: 's26-sp',
            x: spX,
            y: floorY - 30,
            w: 185,
            h: 30,
            launchVelY: -Math.round(Math.sqrt(2 * 1480 * (cliffH + 72))),
            buttonId: 's26-btn',
            color: '#22C55E',
          },
        ],
        keyPos: { x: btnX + 27, y: cliffY - 120 },
        doorPos: { x: 1185, y: cliffY - 56 },
      };
    }

    case 27: {
      const floorY = 520;
      const lasers: LaserDef[] = [
        {
          id: 's27-d1',
          x: 410,
          y: 116,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: floorY - 128 + 4,
          thickness: 10,
        },
        {
          id: 's27-d2',
          x: 740,
          y: 116,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: floorY - 128 + 4,
          thickness: 10,
        },
        {
          id: 's27-hl',
          x: 1138,
          y: floorY - 34,
          w: 12,
          h: 24,
          dir: 'left',
          maxLength: 215,
          thickness: 10,
        },
      ];
      return {
        index: globalIndex,
        stageNumber: 27,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Laser Bridge Gauntlet',
        hint: `${tag}: Hold the relay bridges while shielded teammates block overhead & corridor lasers!`,
        worldWidth: 1380,
        worldHeight: 650,
        spawnStart: { x: 40, y: 430, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's27-i1', x: 0, y: floorY, w: 350, h: 140 },
          { id: 's27-c1', x: 375, y: 90, w: 98, h: 26 },
          { id: 's27-i2', x: 525, y: floorY, w: 170, h: 140 },
          { id: 's27-c2', x: 705, y: 90, w: 98, h: 26 },
          { id: 's27-i3', x: 870, y: floorY, w: 510, h: 140 },
          { id: 's27-end-col', x: 1150, y: floorY - 96, w: 30, h: 96 },
          { id: 's27-end-roof', x: 960, y: floorY - 118, w: 190, h: 32 },
          { id: 's27-step', x: 900, y: floorY - 62, w: 56, h: 20 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's27-b1', x: 255, y: floorY - 10, w: 46, h: 10, color: '#F59E0B', latch: false },
          { id: 's27-b2', x: 585, y: floorY - 10, w: 46, h: 10, color: '#A78BFA', latch: false },
          { id: 's27-lock', x: 895, y: floorY - 10, w: 48, h: 10, color: '#10B981', latch: true },
        ],
        gates: [
          {
            id: 's27-g1',
            x: 350,
            y: floorY,
            w: 175,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's27-b1',
            altButtonId: 's27-lock',
            color: '#F59E0B',
            mode: 'bridge',
          },
          {
            id: 's27-g2',
            x: 695,
            y: floorY,
            w: 175,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's27-b2',
            altButtonId: 's27-lock',
            color: '#A78BFA',
            mode: 'bridge',
          },
        ],
        spikes: [],
        lasers,
        keyPos: { x: 1055, y: floorY - 160 },
        doorPos: { x: 1275, y: floorY - 56 },
      };
    }

    case 28: {
      const cliffY = 235;
      const deepY = cliffY + Math.min(285, 130 + P * 30);
      return {
        index: globalIndex,
        stageNumber: 28,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Rope Cliff Ascent',
        hint: `${tag}: Tied by rope, lower 1 diver into the lower alcove for the key, then haul across the moving lift!`,
        worldWidth: 1400,
        worldHeight: 670,
        spawnStart: { x: 40, y: 400, spacing: spawnSpacing },
        tetheredRope: true,
        ropeMaxDist: P <= 2 ? 108 : 94,
        platforms: [
          { id: 's28-base', x: 0, y: 495, w: 375, h: 185 },
          {
            id: 's28-lift',
            x: 395,
            y: 460,
            w: 140,
            h: 24,
            kind: 'moving',
            moveAxis: 'y',
            moveRange: 215,
            moveSpeed: 1.1,
          },
          { id: 's28-hi', x: 560, y: cliffY, w: 340, h: 32 },
          { id: 's28-alcove', x: 925, y: deepY, w: 120, h: 24 },
          { id: 's28-end', x: 1065, y: cliffY, w: 335, h: 32 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [{ id: 's28-spk', x: 1135, y: cliffY - 12, w: 48, h: 12 }],
        keyPos: { x: 985, y: deepY - 44 },
        doorPos: { x: 1295, y: cliffY - 56 },
      };
    }

    // ==========================================
    // TIER 8: SPRING & SHIELD MASTERS (Stages 29..32)
    // ==========================================
    case 29: {
      const floorY = 580;
      const midH = 82 + Math.min(P, 4) * 28;
      const midY = floorY - midH;
      const topH = 86 + Math.min(P, 3) * 32;
      const topY = midY - topH;
      return {
        index: globalIndex,
        stageNumber: 29,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Dual Cliff Staircase',
        hint: `${tag}: Two giant cliffs! Build human staircases & trigger sequential red & amber spring buttons!`,
        worldWidth: 1440,
        worldHeight: 680,
        spawnStart: { x: 40, y: 490, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's29-floor', x: 0, y: floorY, w: 500, h: 110 },
          { id: 's29-mid', x: 485, y: midY, w: 495, h: midH + 110 },
          { id: 's29-top', x: 965, y: topY, w: 475, h: topH + midH + 110 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's29-b1', x: 645, y: midY - 10, w: 50, h: 10, color: '#EF4444', latch: true },
          { id: 's29-b2', x: 1125, y: topY - 10, w: 50, h: 10, color: '#F59E0B', latch: true },
        ],
        gates: [],
        spikes: [{ id: 's29-spk', x: 735, y: midY - 12, w: 42, h: 12 }],
        springs: [
          {
            id: 's29-sp1',
            x: 325,
            y: floorY - 30,
            w: 160,
            h: 30,
            launchVelY: -Math.round(Math.sqrt(2 * 1480 * (midH + 66))),
            buttonId: 's29-b1',
            color: '#22C55E',
          },
          {
            id: 's29-sp2',
            x: 815,
            y: midY - 30,
            w: 150,
            h: 30,
            launchVelY: -Math.round(Math.sqrt(2 * 1480 * (topH + 66))),
            buttonId: 's29-b2',
            color: '#22C55E',
          },
        ],
        keyPos: { x: 1225, y: topY - 46 },
        doorPos: { x: 1345, y: topY - 56 },
      };
    }

    case 30: {
      const floorY = 530;
      const lasers: LaserDef[] = [
        {
          id: 's30-d1',
          x: 515,
          y: 116,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: floorY - 128,
          thickness: 10,
        },
        {
          id: 's30-d2',
          x: 645,
          y: 116,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: floorY - 128,
          thickness: 10,
        },
        {
          id: 's30-d3',
          x: 775,
          y: 116,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: floorY - 128,
          thickness: 10,
        },
      ];
      return {
        index: globalIndex,
        stageNumber: 30,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Crossfire Ferry Ride',
        hint: `${tag}: Stack with Up-Shield on top ON the ferry to block three overhead lasers as you glide across!`,
        worldWidth: 1400,
        worldHeight: 650,
        spawnStart: { x: 40, y: 440, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's30-left', x: 0, y: floorY, w: 380, h: 130 },
          { id: 's30-ceil', x: 470, y: 90, w: 375, h: 26 },
          {
            id: 's30-ferry',
            x: 410,
            y: floorY - 10,
            w: 155,
            h: 24,
            kind: 'moving',
            moveAxis: 'x',
            moveRange: 345,
            moveSpeed: 0.9,
          },
          { id: 's30-right', x: 935, y: floorY, w: 465, h: 130 },
          { id: 's30-key-ledge', x: 1055, y: floorY - subStack3, w: 135, h: 24 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [{ id: 's30-spk', x: 985, y: floorY - 12, w: 44, h: 12 }],
        lasers,
        keyPos: { x: 1122, y: floorY - subStack3 - 42 },
        doorPos: { x: 1305, y: floorY - 56 },
      };
    }

    case 31: {
      const floorY = 515;
      const crateX = 225 + runway;
      const gateCount = Math.max(2, P - 1);
      const swStart = crateX + 195;
      const gStart = swStart + gateCount * 64 + 65;
      const masterX = gStart + gateCount * 84 + 35;
      const worldW = masterX + 260;

      const platforms: PlatformDef[] = [
        { id: 's31-floor', x: 0, y: floorY, w: worldW, h: 145 },
      ];
      const buttons: ButtonDef[] = [];
      const gates: GateDef[] = [];

      for (let i = 0; i < gateCount; i++) {
        const col = VAULT_COLORS[i % VAULT_COLORS.length];
        const gx = gStart + i * 84;
        platforms.push({ id: `s31-w${i}`, x: gx, y: 120, w: 24, h: 240 });
        buttons.push({
          id: `s31-b${i}`,
          x: swStart + i * 64,
          y: floorY - 10,
          w: 44,
          h: 10,
          color: col,
          latch: false,
        });
        gates.push({
          id: `s31-g${i}`,
          x: gx,
          y: 360,
          w: 24,
          h: 155,
          openOffsetX: 0,
          openOffsetY: -160,
          buttonId: `s31-b${i}`,
          altButtonId: 's31-master',
          color: col,
          mode: 'gate',
        });
      }
      buttons.push({
        id: 's31-master',
        x: masterX,
        y: floorY - 10,
        w: 50,
        h: 10,
        color: '#10B981',
        latch: true,
      });

      return {
        index: globalIndex,
        stageNumber: 31,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Monolith Twin Locks',
        hint: `${tag}: Park the ${P}/${P} monolith on the first gate switch so teammates have enough hands for the rest!`,
        worldWidth: worldW,
        worldHeight: 640,
        spawnStart: { x: 40, y: 425, spacing: spawnSpacing },
        tetheredRope: false,
        platforms,
        pushBlocks: [
          { id: 's31-mono', x: crateX, y: floorY - (58 + P * 4), w: 58 + P * 4, h: 58 + P * 4, requiredPlayers: P },
        ],
        buttons,
        gates,
        spikes: [],
        keyPos: { x: masterX + 25, y: 425 },
        doorPos: { x: worldW - 105, y: floorY - 56 },
      };
    }

    case 32: {
      const floorY = 560;
      const upperY = 335;
      return {
        index: globalIndex,
        stageNumber: 32,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Suspended Spike Vault',
        hint: `${tag}: Leap cleanly past floor spikes, unlock the spring cliff switch, then sky-launch to the high vault!`,
        worldWidth: 1380,
        worldHeight: 680,
        spawnStart: { x: 40, y: 470, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's32-floor', x: 0, y: floorY, w: 800, h: 120 },
          { id: 's32-upper', x: 785, y: upperY, w: 595, h: 350 },
          { id: 's32-mid-ledge', x: 515, y: 455, w: 120, h: 22 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's32-btn', x: 910, y: upperY - 10, w: 50, h: 10, color: '#22C55E', latch: true },
        ],
        gates: [],
        spikes: [
          { id: 's32-s1', x: 355, y: floorY - 12, w: 52, h: 12 },
          { id: 's32-s2', x: 1015, y: upperY - 12, w: 52, h: 12 },
          { id: 's32-s3', x: 1135, y: upperY - 12, w: 52, h: 12 },
        ],
        springs: [
          {
            id: 's32-sp',
            x: 615,
            y: floorY - 30,
            w: 170,
            h: 30,
            launchVelY: -Math.round(Math.sqrt(2 * 1480 * (floorY - upperY + 70))),
            buttonId: 's32-btn',
            color: '#22C55E',
          },
        ],
        keyPos: { x: 1095, y: upperY - 62 },
        doorPos: { x: 1280, y: upperY - 56 },
      };
    }

    // ==========================================
    // TIER 9: EXPERT TEAM ENDURANCE (Stages 33..36)
    // ==========================================
    case 33: {
      const floorY = 570;
      const cliffH = 82 + Math.min(P, 5) * 30;
      const cliffY = floorY - cliffH;
      const cliffX = 490;
      const lasers: LaserDef[] = [
        {
          id: 's33-d1',
          x: cliffX + 340,
          y: 112,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: cliffY - 124 + 4,
          thickness: 10,
        },
        {
          id: 's33-hl',
          x: cliffX + 690,
          y: cliffY - 34,
          w: 12,
          h: 24,
          dir: 'left',
          maxLength: 215,
          thickness: 10,
        },
      ];
      return {
        index: globalIndex,
        stageNumber: 33,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Laser & Spring Fortress',
        hint: `${tag}: Staircase up the cliff, unlock the green spring for everyone, then shield-escort through dual lasers!`,
        worldWidth: cliffX + 940,
        worldHeight: 680,
        spawnStart: { x: 40, y: 480, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's33-floor', x: 0, y: floorY, w: 505, h: 120 },
          { id: 's33-cliff', x: cliffX, y: cliffY, w: 940, h: cliffH + 120 },
          { id: 's33-ceil', x: cliffX + 305, y: 86, w: 98, h: 26 },
          { id: 's33-tunnel-roof', x: cliffX + 495, y: cliffY - 120, w: 195, h: 36 },
          { id: 's33-tunnel-step', x: cliffX + 435, y: cliffY - 62, w: 56, h: 20 },
          { id: 's33-col', x: cliffX + 702, y: cliffY - 94, w: 30, h: 94 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's33-btn', x: cliffX + 145, y: cliffY - 10, w: 50, h: 10, color: '#EF4444', latch: true },
        ],
        gates: [],
        spikes: [],
        lasers,
        springs: [
          {
            id: 's33-sp',
            x: cliffX - 180,
            y: floorY - 30,
            w: 180,
            h: 30,
            launchVelY: -Math.round(Math.sqrt(2 * 1480 * (cliffH + 72))),
            buttonId: 's33-btn',
            color: '#22C55E',
          },
        ],
        keyPos: { x: cliffX + 590, y: cliffY - 160 },
        doorPos: { x: cliffX + 835, y: cliffY - 56 },
      };
    }

    case 34: {
      const floorY = 500;
      return {
        index: globalIndex,
        stageNumber: 34,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Triple Ferry Tether',
        hint: `${tag}: Tied by rope across 3 moving ferries! Keep timing in sync so nobody gets dragged off the edge!`,
        worldWidth: 1520,
        worldHeight: 650,
        spawnStart: { x: 40, y: 410, spacing: spawnSpacing },
        tetheredRope: true,
        ropeMaxDist: P <= 2 ? 105 : 92,
        platforms: [
          { id: 's34-start', x: 0, y: floorY, w: 360, h: 160 },
          {
            id: 's34-f1',
            x: 385,
            y: floorY - 10,
            w: 135,
            h: 24,
            kind: 'moving',
            moveAxis: 'x',
            moveRange: 115,
            moveSpeed: 1.1,
          },
          { id: 's34-mid1', x: 635, y: floorY, w: 175, h: 160 },
          {
            id: 's34-f2',
            x: 830,
            y: floorY - 10,
            w: 135,
            h: 24,
            kind: 'moving',
            moveAxis: 'y',
            moveRange: 105,
            moveSpeed: 1.25,
          },
          {
            id: 's34-f3',
            x: 990,
            y: floorY - 10,
            w: 135,
            h: 24,
            kind: 'moving',
            moveAxis: 'x',
            moveRange: 115,
            moveSpeed: 1.2,
          },
          { id: 's34-end', x: 1245, y: floorY, w: 275, h: 160 },
          { id: 's34-key-ledge', x: 660, y: floorY - subStack3, w: 125, h: 24 },
        ],
        pushBlocks: [],
        buttons: [],
        gates: [],
        spikes: [{ id: 's34-spk', x: 1275, y: floorY - 12, w: 46, h: 12 }],
        keyPos: { x: 722, y: floorY - subStack3 - 42 },
        doorPos: { x: 1415, y: floorY - 56 },
      };
    }

    case 35: {
      const floorY = 510;
      return {
        index: globalIndex,
        stageNumber: 35,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Grand Relay Citadel',
        hint: `${tag}: Bridge relay across 4 island spans, lock the green master switch, and tower up for the key!`,
        worldWidth: 1620,
        worldHeight: 650,
        spawnStart: { x: 40, y: 420, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's35-i1', x: 0, y: floorY, w: 345, h: 150 },
          { id: 's35-i2', x: 505, y: floorY, w: 175, h: 150 },
          { id: 's35-i3', x: 840, y: floorY, w: 175, h: 150 },
          { id: 's35-i4', x: 1175, y: floorY, w: 175, h: 150 },
          { id: 's35-i5', x: 1460, y: floorY, w: 160, h: 150 },
          { id: 's35-key-shelf', x: 860, y: floorY - subStack4, w: 130, h: 24 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's35-b1', x: 255, y: floorY - 10, w: 44, h: 10, color: '#EF6B6B', latch: false },
          { id: 's35-b2', x: 535, y: floorY - 10, w: 44, h: 10, color: '#F59E0B', latch: false },
          { id: 's35-b3', x: 870, y: floorY - 10, w: 44, h: 10, color: '#38BDF8', latch: false },
          { id: 's35-b4', x: 1205, y: floorY - 10, w: 44, h: 10, color: '#A78BFA', latch: false },
          { id: 's35-lock', x: 1475, y: floorY - 10, w: 46, h: 10, color: '#10B981', latch: true },
        ],
        gates: [
          {
            id: 's35-br1',
            x: 345,
            y: floorY,
            w: 160,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's35-b1',
            altButtonId: 's35-lock',
            color: '#EF6B6B',
            mode: 'bridge',
          },
          {
            id: 's35-br2',
            x: 680,
            y: floorY,
            w: 160,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's35-b2',
            altButtonId: 's35-lock',
            color: '#F59E0B',
            mode: 'bridge',
          },
          {
            id: 's35-br3',
            x: 1015,
            y: floorY,
            w: 160,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's35-b3',
            altButtonId: 's35-lock',
            color: '#38BDF8',
            mode: 'bridge',
          },
          {
            id: 's35-br4',
            x: 1350,
            y: floorY,
            w: 110,
            h: 22,
            openOffsetX: 0,
            openOffsetY: 0,
            buttonId: 's35-b4',
            altButtonId: 's35-lock',
            color: '#A78BFA',
            mode: 'bridge',
          },
        ],
        spikes: [
          { id: 's35-s1', x: 610, y: floorY - 12, w: 40, h: 12 },
          { id: 's35-s2', x: 1275, y: floorY - 12, w: 40, h: 12 },
        ],
        keyPos: { x: 925, y: floorY - subStack4 - 42 },
        doorPos: { x: 1550, y: floorY - 56 },
      };
    }

    case 36: {
      const floorY = 560;
      const topY = 300;
      return {
        index: globalIndex,
        stageNumber: 36,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Piston Stack Factory',
        hint: `${tag}: Ride twin alternating vertical lifts as a cohesive tower, flip the gate button, and descend safely!`,
        worldWidth: 1420,
        worldHeight: 680,
        spawnStart: { x: 40, y: 470, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's36-start', x: 0, y: floorY, w: 390, h: 130 },
          {
            id: 's36-l1',
            x: 415,
            y: 520,
            w: 135,
            h: 24,
            kind: 'moving',
            moveAxis: 'y',
            moveRange: 175,
            moveSpeed: 1.2,
          },
          { id: 's36-mid', x: 580, y: 395, w: 190, h: 28 },
          {
            id: 's36-l2',
            x: 800,
            y: 385,
            w: 135,
            h: 24,
            kind: 'moving',
            moveAxis: 'y',
            moveRange: 110,
            moveSpeed: 1.35,
          },
          { id: 's36-top', x: 965, y: topY, w: 455, h: 390 },
          { id: 's36-wall', x: 1210, y: 80, w: 26, h: 100 },
          { id: 's36-key-ledge', x: 1015, y: topY - subStack2, w: 125, h: 22 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's36-btn', x: 645, y: 385, w: 48, h: 10, color: '#EC4899', latch: true },
        ],
        gates: [
          {
            id: 's36-gate',
            x: 1210,
            y: 180,
            w: 26,
            h: 120,
            openOffsetX: 0,
            openOffsetY: -125,
            buttonId: 's36-btn',
            color: '#EC4899',
            mode: 'gate',
          },
        ],
        spikes: [{ id: 's36-spk', x: 1120, y: topY - 12, w: 44, h: 12 }],
        keyPos: { x: 1077, y: topY - subStack2 - 42 },
        doorPos: { x: 1325, y: topY - 56 },
      };
    }

    // ==========================================
    // TIER 10: ULTIMATE 307 LEGENDS (Stages 37..40)
    // ==========================================
    case 37: {
      const floorY = 590;
      const tier1H = 74 + Math.min(P, 4) * 30;
      const tier1Y = floorY - tier1H;
      const tier2H = 125;
      const tier2Y = tier1Y - tier2H;
      return {
        index: globalIndex,
        stageNumber: 37,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Skyward Spring Tower',
        hint: `${tag}: 3-tier vertical fortress! Staircase for switch 1, launch to tier 2 for switch 2, then stack to the summit!`,
        worldWidth: 1360,
        worldHeight: 680,
        spawnStart: { x: 40, y: 500, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's37-floor', x: 0, y: floorY, w: 495, h: 110 },
          { id: 's37-t1', x: 480, y: tier1Y, w: 465, h: tier1H + 110 },
          { id: 's37-t2', x: 930, y: tier2Y, w: 430, h: tier2H + tier1H + 110 },
          { id: 's37-key-top', x: 1055, y: tier2Y - subStack2, w: 120, h: 22 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's37-b1', x: 640, y: tier1Y - 10, w: 48, h: 10, color: '#EF4444', latch: true },
          { id: 's37-b2', x: 970, y: tier2Y - 10, w: 48, h: 10, color: '#10B981', latch: true },
        ],
        gates: [],
        spikes: [{ id: 's37-spk', x: 705, y: tier1Y - 12, w: 42, h: 12 }],
        springs: [
          {
            id: 's37-sp1',
            x: 320,
            y: floorY - 28,
            w: 160,
            h: 28,
            launchVelY: -Math.round(Math.sqrt(2 * 1480 * (tier1H + 64))),
            buttonId: 's37-b1',
            color: '#22C55E',
          },
          {
            id: 's37-sp2',
            x: 785,
            y: tier1Y - 28,
            w: 145,
            h: 28,
            launchVelY: -Math.round(Math.sqrt(2 * 1480 * (tier2H + 64))),
            buttonId: 's37-b2',
            color: '#22C55E',
          },
        ],
        keyPos: { x: 1115, y: tier2Y - subStack2 - 42 },
        doorPos: { x: 1265, y: tier2Y - 56 },
      };
    }

    case 38: {
      const floorY = 530;
      const crateX = 240 + runway;
      const wallX = crateX + 130;
      const lasStart = wallX + 120;
      const gateX = lasStart + 380;
      const worldW = gateX + 340;
      const lasers: LaserDef[] = [
        {
          id: 's38-d1',
          x: lasStart,
          y: 116,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: floorY - 128 + 4,
          thickness: 10,
        },
        {
          id: 's38-d2',
          x: lasStart + 115,
          y: 116,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: floorY - 128 + 4,
          thickness: 10,
        },
        {
          id: 's38-hr',
          x: gateX - 95,
          y: floorY - 34,
          w: 12,
          h: 24,
          dir: 'right',
          maxLength: 145,
          thickness: 10,
        },
      ];
      return {
        index: globalIndex,
        stageNumber: 38,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Laser & Crate Siege',
        hint: `${tag}: Push the ${P}/${P} crate through the tunnel while random shields cover downward & side lasers!`,
        worldWidth: worldW,
        worldHeight: 650,
        spawnStart: { x: 40, y: 440, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's38-floor', x: 0, y: floorY, w: worldW, h: 130 },
          { id: 's38-tunnel', x: wallX, y: 185, w: 74, h: 270 },
          { id: 's38-ceil', x: lasStart - 30, y: 90, w: 195, h: 26 },
          { id: 's38-exit-top', x: gateX, y: 120, w: 28, h: 255 },
          { id: 's38-key-ledge', x: gateX + 75, y: floorY - subStack3, w: 130, h: 24 },
        ],
        pushBlocks: [
          { id: 's38-crate', x: crateX, y: floorY - (56 + P * 4), w: 56 + P * 4, h: 56 + P * 4, requiredPlayers: P },
        ],
        buttons: [
          { id: 's38-btn', x: gateX - 65, y: floorY - 10, w: 50, h: 10, color: '#10B981', latch: true },
        ],
        gates: [
          {
            id: 's38-gate',
            x: gateX,
            y: 375,
            w: 28,
            h: 155,
            openOffsetX: 0,
            openOffsetY: -160,
            buttonId: 's38-btn',
            color: '#10B981',
            mode: 'gate',
          },
        ],
        spikes: [],
        lasers,
        keyPos: { x: gateX + 140, y: floorY - subStack3 - 42 },
        doorPos: { x: worldW - 95, y: floorY - 56 },
      };
    }

    case 39: {
      const floorY = 555;
      const cliffY = 385;
      const deepY = 545;
      return {
        index: globalIndex,
        stageNumber: 39,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: 'Rope, Spring & Abyss',
        hint: `${tag}: Tethered spring jump! Staircase up, unlock the spring together, then dangle off the far cliff for the key!`,
        worldWidth: 1440,
        worldHeight: 680,
        spawnStart: { x: 40, y: 465, spacing: spawnSpacing },
        tetheredRope: true,
        ropeMaxDist: P <= 2 ? 112 : 96,
        platforms: [
          { id: 's39-floor', x: 0, y: floorY, w: 485, h: 135 },
          { id: 's39-cliff', x: 470, y: cliffY, w: 380, h: 300 },
          { id: 's39-deep-key', x: 905, y: deepY, w: 120, h: 24 },
          { id: 's39-end', x: 1060, y: cliffY, w: 380, h: 300 },
        ],
        pushBlocks: [],
        buttons: [
          { id: 's39-btn', x: 645, y: cliffY - 10, w: 50, h: 10, color: '#22C55E', latch: true },
        ],
        gates: [],
        spikes: [{ id: 's39-spk', x: 1135, y: cliffY - 12, w: 46, h: 12 }],
        springs: [
          {
            id: 's39-sp',
            x: 315,
            y: floorY - 30,
            w: 155,
            h: 30,
            launchVelY: -Math.round(Math.sqrt(2 * 1480 * (floorY - cliffY + 70))),
            buttonId: 's39-btn',
            color: '#22C55E',
          },
        ],
        keyPos: { x: 965, y: deepY - 42 },
        doorPos: { x: 1315, y: cliffY - 56 },
      };
    }

    case 40:
    default: {
      const floorY = 560;
      const crateReq = Math.max(2, P - 1);
      const crateX = 240 + runway;
      const tunnelX = crateX + 120;
      const cliffX = tunnelX + 260;
      const cliffH = 80 + Math.min(P, 4) * 30;
      const cliffY = floorY - cliffH;
      const ferryX = cliffX + 350;
      const endX = ferryX + 280;
      const worldW = endX + 340;
      const lasers: LaserDef[] = [
        {
          id: 's40-d1',
          x: ferryX + 95,
          y: 116,
          w: 28,
          h: 12,
          dir: 'down',
          maxLength: cliffY - 128,
          thickness: 10,
        },
      ];
      return {
        index: globalIndex,
        stageNumber: 40,
        bracket: cfg.bracket,
        recommendedPlayers: P,
        name: `Ultimate 307 ${cfg.stackLabel} Finale`,
        hint: `${tag} STAGE 40 FINALE: Heavy ${crateReq}/${crateReq} crate, cliff staircase spring, shielded laser ferry, and final tower!`,
        worldWidth: worldW,
        worldHeight: 680,
        spawnStart: { x: 40, y: 470, spacing: spawnSpacing },
        tetheredRope: false,
        platforms: [
          { id: 's40-base', x: 0, y: floorY, w: cliffX + 15, h: 130 },
          { id: 's40-tunnel', x: tunnelX, y: 205, w: 68, h: 280 },
          { id: 's40-cliff', x: cliffX, y: cliffY, w: 325, h: cliffH + 130 },
          { id: 's40-ceil', x: ferryX + 60, y: 90, w: 100, h: 26 },
          {
            id: 's40-ferry',
            x: ferryX,
            y: cliffY,
            w: 145,
            h: 24,
            kind: 'moving',
            moveAxis: 'x',
            moveRange: 115,
            moveSpeed: 1.15,
          },
          { id: 's40-end', x: endX, y: cliffY, w: 340, h: cliffH + 130 },
          { id: 's40-gate-wall', x: endX + 190, y: 90, w: 26, h: cliffY - 220 },
          { id: 's40-key-perch', x: endX + 45, y: cliffY - subStack3, w: 125, h: 22 },
        ],
        pushBlocks: [
          { id: 's40-crate', x: crateX, y: floorY - 58, w: 58, h: 58, requiredPlayers: crateReq },
        ],
        buttons: [
          { id: 's40-b-gate', x: tunnelX + 100, y: floorY - 10, w: 48, h: 10, color: '#10B981', latch: true },
          { id: 's40-b-spring', x: cliffX + 145, y: cliffY - 10, w: 48, h: 10, color: '#EF4444', latch: true },
        ],
        gates: [
          {
            id: 's40-gate',
            x: endX + 190,
            y: cliffY - 130,
            w: 26,
            h: 130,
            openOffsetX: 0,
            openOffsetY: -135,
            buttonId: 's40-b-gate',
            color: '#10B981',
            mode: 'gate',
          },
        ],
        spikes: [{ id: 's40-spk', x: cliffX + 235, y: cliffY - 12, w: 42, h: 12 }],
        lasers,
        springs: [
          {
            id: 's40-sp',
            x: cliffX - 140,
            y: floorY - 30,
            w: 140,
            h: 30,
            launchVelY: -Math.round(Math.sqrt(2 * 1480 * (cliffH + 72))),
            buttonId: 's40-b-spring',
            color: '#22C55E',
          },
        ],
        keyPos: { x: endX + 107, y: cliffY - subStack3 - 42 },
        doorPos: { x: endX + 260, y: cliffY - 56 },
      };
    }
  }
}

export const LEVELS: LevelDef[] = (() => {
  const all: LevelDef[] = [];
  let idx = 0;
  for (const cfg of BRACKET_CONFIGS) {
    for (let s = 1; s <= 40; s++) {
      all.push(buildStageForBracket(idx++, s, cfg));
    }
  }
  return all;
})();

export function getLevelsByBracket(bracket: PlayerBracket): LevelDef[] {
  return LEVELS.filter((l) => l.bracket === bracket);
}

export function getRecommendedBracketForCount(playerCount: number): PlayerBracket {
  if (playerCount <= 2) return '2p';
  if (playerCount === 3) return '3p';
  if (playerCount === 4) return '4p';
  if (playerCount === 5) return '5p';
  return '6p';
}
