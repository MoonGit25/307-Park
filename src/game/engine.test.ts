import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRandomLaserShields,
  createStageState,
  getLevelCount,
  getRequiredShieldDirs,
  PLAYER_H,
  stepSimulation,
} from './engine.ts';
import { SnapshotInterpolator } from './interpolator.ts';
import { getLevelsByBracket, getRecommendedBracketForCount, LEVELS } from './levels.ts';
import type { PlayerBracket, PlayerInput, PlayerSpec } from './types.ts';

const IDLE: PlayerInput = { left: false, right: false, jump: false };

const TWO_SPECS: PlayerSpec[] = [
  { id: 'p1', name: 'P1', color: 'coral', deviceType: 'pc' },
  { id: 'p2', name: 'P2', color: 'mint', deviceType: 'mobile' },
];

const THREE_SPECS: PlayerSpec[] = [
  ...TWO_SPECS,
  { id: 'p3', name: 'P3', color: 'amber', deviceType: 'mobile' },
];

const FOUR_SPECS: PlayerSpec[] = [
  ...THREE_SPECS,
  { id: 'p4', name: 'P4', color: 'lavender', deviceType: 'pc' },
];

const FIVE_SPECS: PlayerSpec[] = [
  ...FOUR_SPECS,
  { id: 'p5', name: 'P5', color: 'sky', deviceType: 'mobile' },
];

const SIX_SPECS: PlayerSpec[] = [
  ...FIVE_SPECS,
  { id: 'p6', name: 'P6', color: 'pink', deviceType: 'pc' },
];

function specsForBracket(bracket: PlayerBracket): PlayerSpec[] {
  switch (bracket) {
    case '2p':
      return TWO_SPECS;
    case '3p':
      return THREE_SPECS;
    case '4p':
      return FOUR_SPECS;
    case '5p':
      return FIVE_SPECS;
    case '6p':
      return SIX_SPECS;
  }
}

function tickN(
  state: ReturnType<typeof createStageState>,
  inputs: Record<string, PlayerInput>,
  frames: number,
) {
  for (let i = 0; i < frames; i++) {
    stepSimulation(state, inputs, 1 / 60);
  }
}

test('all 5 player modes (2P, 3P, 4P, 5P, 6P+) have 40 balanced stages each (200 total) and survive idle', () => {
  assert.equal(getLevelCount(), 200);
  const brackets: PlayerBracket[] = ['2p', '3p', '4p', '5p', '6p'];
  for (const b of brackets) {
    const list = getLevelsByBracket(b);
    assert.equal(list.length, 40, `${b} has 40 stages`);
    assert.deepEqual(
      list.map((l) => l.stageNumber),
      Array.from({ length: 40 }, (_, i) => i + 1),
      `${b} stages numbered 1..40`,
    );
  }

  assert.equal(getRecommendedBracketForCount(2), '2p');
  assert.equal(getRecommendedBracketForCount(3), '3p');
  assert.equal(getRecommendedBracketForCount(4), '4p');
  assert.equal(getRecommendedBracketForCount(5), '5p');
  assert.equal(getRecommendedBracketForCount(6), '6p');
  assert.equal(getRecommendedBracketForCount(8), '6p');

  for (const lvl of LEVELS) {
    const specs = specsForBracket(lvl.bracket);
    const state = createStageState(lvl.index, specs);
    const idleMap = Object.fromEntries(specs.map((s) => [s.id, IDLE]));
    tickN(state, idleMap, 90);
    assert.equal(
      state.status,
      'playing',
      `${lvl.bracket.toUpperCase()} Stage ${lvl.stageNumber} (${lvl.name}) survived idle`,
    );
    assert.equal(
      state.deaths,
      0,
      `${lvl.bracket.toUpperCase()} Stage ${lvl.stageNumber} (${lvl.name}) had 0 idle deaths`,
    );
    assert.ok(state.key.y >= 100 && state.door.y >= 100, 'Key and door within canvas headroom');
  }
});

test('head stacking lets P2 stand on P1 head and ride horizontally without side-walk snap glitches', () => {
  const state = createStageState(0, TWO_SPECS);
  tickN(state, { p1: IDLE, p2: IDLE }, 40);

  const p1 = state.players[0];
  const p2 = state.players[1];

  p2.x = p1.x + p1.w + 2;
  p2.y = p1.y;
  tickN(state, { p1: { left: false, right: true, jump: false }, p2: IDLE }, 15);
  assert.equal(p2.standingOnPlayerId, null, 'Horizontal push does not snap onto head');

  p2.x = p1.x;
  p2.y = p1.y - PLAYER_H - 12;
  p2.vy = 0;

  tickN(state, { p1: IDLE, p2: IDLE }, 20);
  assert.equal(p2.onGround, true);
  assert.equal(p2.standingOnPlayerId, 'p1');
  assert.equal(Math.round(p2.y + PLAYER_H), Math.round(p1.y));

  const p2StartX = p2.x;
  tickN(state, { p1: { left: false, right: true, jump: false }, p2: IDLE }, 30);
  assert.ok(p1.x > 120, 'P1 moved right');
  assert.ok(p2.x > p2StartX + 40, 'P2 rode horizontally on P1 head');
});

test('6P+ Stage 02 (Co-op Push & Gate) requires all 6 players pushing together', () => {
  const stage6p2 = getLevelsByBracket('6p')[1]; // Stage 2 in 6P
  const state = createStageState(stage6p2.index, SIX_SPECS);
  const idleMap = Object.fromEntries(SIX_SPECS.map((s) => [s.id, IDLE]));
  tickN(state, idleMap, 40);

  const monolith = state.pushBlocks[0];
  const startX = monolith.x;
  const players = state.players;

  for (let i = 0; i < 5; i++) {
    players[i].x = monolith.x - players[i].w * (i + 1);
    players[i].y = monolith.y + monolith.h - PLAYER_H;
  }
  players[5].x = 20;

  const fivePushInputs = Object.fromEntries(
    players.map((p, idx) => [
      p.id,
      idx < 5 ? { left: false, right: true, jump: false } : IDLE,
    ]),
  );
  tickN(state, fivePushInputs, 25);
  assert.equal(monolith.x, startX, '5 players cannot move a 6/6 crate');

  players[5].x = players[4].x - players[5].w;
  players[5].y = players[4].y;
  const sixPushInputs = Object.fromEntries(
    players.map((p) => [p.id, { left: false, right: true, jump: false }]),
  );
  tickN(state, sixPushInputs, 30);
  assert.ok(monolith.x > startX + 18, '6 players together move the 6/6 crate');
});

test('Stage 12 (Squad Lock Vault) scales vault gates by player count and master latch opens all', () => {
  for (const bracket of ['3p', '5p', '6p'] as PlayerBracket[]) {
    const lvl = getLevelsByBracket(bracket)[11]; // Stage 12
    const specs = specsForBracket(bracket);
    const state = createStageState(lvl.index, specs);
    const idleMap = Object.fromEntries(specs.map((s) => [s.id, IDLE]));
    tickN(state, idleMap, 40);

    assert.equal(state.gates.length, specs.length - 1, `${bracket} Stage 12 has P-1 gates`);
    const masterBtn = state.buttons.find((b) => b.id === 's12-master')!;
    const runner = state.players[specs.length - 1];
    runner.x = masterBtn.x + 6;
    runner.y = masterBtn.y - PLAYER_H;

    tickN(state, idleMap, 35);
    assert.equal(masterBtn.pressed, true);
    assert.ok(
      state.gates.every((g) => g.progress > 0.9),
      `${bracket} Stage 12 opens all gates via master latch`,
    );
  }
});

test('Stage 11 (Canyon Rope & Spikes) in 5P holds dangling player safely off cliff edge', () => {
  const lvl = getLevelsByBracket('5p')[10]; // Stage 11
  const state = createStageState(lvl.index, FIVE_SPECS);
  const idleMap = Object.fromEntries(FIVE_SPECS.map((s) => [s.id, IDLE]));
  tickN(state, idleMap, 40);

  const [p1, p2] = state.players;
  p1.x = 420;
  p1.y = 240 - p1.h;
  p2.x = 395;
  p2.y = 240 - p2.h;

  const moveMap = { ...idleMap, p2: { left: true, right: false, jump: false } };
  tickN(state, moveMap, 90);
  assert.equal(state.status, 'playing');
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  assert.ok(dist <= state.ropeMaxDist + 8);
});

test('Random laser shields cover all required map laser directions and shuffle across players', () => {
  const stage5 = getLevelsByBracket('2p')[4]; // Stage 5 Laser Shield Corridor
  const stage13_3p = getLevelsByBracket('3p')[12]; // Stage 13 Laser Crossfire Vault

  const state5 = createStageState(stage5.index, TWO_SPECS);
  assert.ok(state5.players.every((p) => p.shieldDir === 'up' || p.shieldDir === 'left' || p.shieldDir === 'right'));
  assert.ok(state5.players.some((p) => p.shieldDir === 'up'), 'Stage 5 guarantees at least one Up shield');

  const state13 = createStageState(stage13_3p.index, THREE_SPECS);
  const req13 = getRequiredShieldDirs(stage13_3p.lasers ?? []);
  assert.deepEqual(req13.sort(), ['left', 'right', 'up']);
  for (const dir of req13) {
    assert.ok(state13.players.some((p) => p.shieldDir === dir), `Stage 13 3P covers ${dir} shield`);
  }

  // Deterministic RNG variation test verifies shuffle places shields in different slots
  let sA = 0.05;
  assignRandomLaserShields(state13.players, stage13_3p.lasers ?? [], () => {
    sA = (sA + 0.37) % 1;
    return sA;
  });
  const firstDeal = state13.players.map((p) => p.shieldDir);

  let sB = 0.89;
  assignRandomLaserShields(state13.players, stage13_3p.lasers ?? [], () => {
    sB = (sB + 0.21) % 1;
    return sB;
  });
  const secondDeal = state13.players.map((p) => p.shieldDir);
  assert.notDeepEqual(firstDeal, secondDeal, 'Shield slots shuffle randomly across deals');
});

test('Up shield blocks ceiling downward lasers for owner and stacked teammate, while wrong shield triggers death', () => {
  const stage5 = getLevelsByBracket('2p')[4];
  const state = createStageState(stage5.index, TWO_SPECS);
  const idleMap = { p1: IDLE, p2: IDLE };
  tickN(state, idleMap, 40);

  const [p1, p2] = state.players;
  p1.shieldDir = 'up';
  p2.shieldDir = 'right';

  const laser0 = state.lasers[0];
  const laserCenterX = laser0.x + laser0.w * 0.5;

  // Stack P1 ('up' shield) on top of P2 ('right' shield) and walk straight under ceiling laser 0!
  p2.x = laserCenterX - p2.w * 0.5 - 35;
  p2.y = 500 - PLAYER_H;
  p1.x = p2.x;
  p1.y = p2.y - PLAYER_H;
  p1.vy = 0;

  tickN(state, { p1: IDLE, p2: { left: false, right: true, jump: false } }, 20);
  assert.equal(state.status, 'playing', 'Stacked Up-shield escort passes ceiling laser safely');
  assert.equal(state.deaths, 0);
  assert.ok(
    state.lasers[0].blockedByShield || p2.x > laserCenterX,
    'Beam was blocked overhead while walking through',
  );

  // Standing still directly centered under laser0 clips beam cleanly above P1
  p2.x = laserCenterX - p2.w * 0.5;
  p1.x = p2.x;
  p1.y = p2.y - PLAYER_H;
  tickN(state, idleMap, 3);
  assert.equal(state.lasers[0].blockedByShield, true);
  assert.ok(state.lasers[0].beamY + state.lasers[0].beamH <= p1.y, 'Laser stops at Up shield above head');

  // Now move P2 alone (with 'right' shield, no 'up' shield) under laser 1 -> gets zapped!
  const laser1 = state.lasers[1];
  p1.x = 40;
  p1.y = 500 - PLAYER_H;
  p2.x = laser1.x + laser1.w * 0.5 - p2.w * 0.5;
  p2.y = 500 - PLAYER_H;
  tickN(state, idleMap, 2);
  assert.equal(state.status, 'respawning', 'Unprotected player hit by vertical laser triggers respawn');
  assert.equal(state.deaths, 1);
});

test('Left and Right shields block horizontal lasers and protect teammates behind them', () => {
  const stage13 = getLevelsByBracket('3p')[12];
  const state = createStageState(stage13.index, THREE_SPECS);
  const idleMap = { p1: IDLE, p2: IDLE, p3: IDLE };
  tickN(state, idleMap, 40);

  const [p1, p2, p3] = state.players;
  p1.shieldDir = 'up';
  p2.shieldDir = 'right';
  p3.shieldDir = 'left';

  // Right shield blocks leftward-firing beam (s13-horiz-left) and shields p1 standing behind to its left
  const horizLeft = state.lasers.find((l) => l.id === 's13-horiz-left')!;
  p2.x = horizLeft.x - 120;
  p2.y = 520 - PLAYER_H;
  p1.x = p2.x - 40;
  p1.y = 520 - PLAYER_H;
  p3.x = 40;
  p3.y = 520 - PLAYER_H;

  tickN(state, idleMap, 5);
  assert.equal(state.status, 'playing');
  assert.equal(horizLeft.blockedByShield, true, 'Right shield blocks leftward beam');
  assert.ok(horizLeft.beamX >= p2.x + p2.w, 'Leftward beam stops on the right side of P2 shield');

  // Left shield blocks rightward-firing beam (s13-horiz-right) on the upper bridge and shields p1 to its right
  const horizRight = state.lasers.find((l) => l.id === 's13-horiz-right')!;
  p3.x = horizRight.x + 80;
  p3.y = 390 - PLAYER_H;
  p1.x = p3.x + 40;
  p1.y = 390 - PLAYER_H;

  tickN(state, idleMap, 5);
  assert.equal(state.status, 'playing');
  assert.equal(horizRight.blockedByShield, true, 'Left shield blocks rightward beam');
  assert.ok(horizRight.beamX + horizRight.beamW <= p3.x, 'Rightward beam stops on the left side of P3 shield');
});

test('5-cat stacked tower stays together when bottom cat jumps or rides a vertical moving platform', () => {
  const stage25 = getLevelsByBracket('5p')[24]; // 5P Stage 25: Elevator Tower Carry
  const state = createStageState(stage25.index, FIVE_SPECS);
  const idleMap = Object.fromEntries(FIVE_SPECS.map((s) => [s.id, IDLE]));
  tickN(state, idleMap, 25);

  const [p1, p2, p3, p4, p5] = state.players;
  const plat = state.platforms.find((pl) => pl.kind === 'moving' && pl.moveAxis === 'y')!;
  const stackX = plat.x + plat.w * 0.5 - p1.w * 0.5;

  // Stack 5 cats cleanly on top of the vertical moving platform
  p1.x = stackX;
  p1.y = plat.y - PLAYER_H;
  p1.onGround = true;
  p1.standingOnPlayerId = null;

  const tower = [p1, p2, p3, p4, p5];
  for (let i = 1; i < tower.length; i++) {
    tower[i].x = stackX;
    tower[i].y = tower[i - 1].y - PLAYER_H;
    tower[i].vy = 0;
    tower[i].onGround = true;
    tower[i].standingOnPlayerId = tower[i - 1].id;
  }

  // Ride moving platform vertically for 40 ticks: top cat (P5) must stay stacked atop P1
  tickN(state, idleMap, 40);
  assert.ok(plat.y < plat.originY - 10, 'Moving elevator moved upward');
  for (let i = 1; i < tower.length; i++) {
    assert.equal(
      Math.round(tower[i].y + PLAYER_H),
      Math.round(tower[i - 1].y),
      `Cat ${i + 1} stays seated on Cat ${i} while riding elevator vertically`,
    );
  }

  // Now move stack to solid floor and make bottom cat (p1) jump while carrying all 4 cats above!
  for (let i = 0; i < tower.length; i++) {
    tower[i].x = 200;
    tower[i].y = 560 - (i + 1) * PLAYER_H;
    tower[i].vy = 0;
    tower[i].onGround = true;
    tower[i].standingOnPlayerId = i === 0 ? null : tower[i - 1].id;
  }
  const p5BeforeJumpY = p5.y;
  const jumpInputs = { ...idleMap, p1: { left: false, right: true, jump: true } };
  tickN(state, jumpInputs, 12);

  assert.ok(p1.y < 560 - PLAYER_H - 35, 'Bottom cat jumped clearly off ground');
  assert.ok(p5.y < p5BeforeJumpY - 35, 'Top cat P5 rose cleanly WITH bottom cat P1');
  assert.ok(p5.x > 200 + 20, 'Top cat P5 moved horizontally WITH bottom cat P1');
  for (let i = 1; i < tower.length; i++) {
    assert.ok(
      Math.abs(tower[i].y + PLAYER_H - tower[i - 1].y) <= 2,
      `Cat ${i + 1} stays stacked on Cat ${i} mid-jump`,
    );
  }
});

test('Stage 09 (Staircase Spring Cliff): locked until top climber presses cliff button, then launches stack to cliff top', () => {
  const stage9_5p = getLevelsByBracket('5p')[8]; // Stage 09
  const state = createStageState(stage9_5p.index, FIVE_SPECS);
  const idleMap = Object.fromEntries(FIVE_SPECS.map((s) => [s.id, IDLE]));
  tickN(state, idleMap, 30);

  const spring = state.springs[0];
  const cliff = state.platforms.find((p) => p.id === 's9-cliff')!;
  const btn = state.buttons.find((b) => b.id === 's9-spring-btn')!;
  const [p1, p2, , , p5] = state.players;

  assert.equal(spring.active, false, 'Spring starts inactive before cliff button is pressed');

  // Stand P1 and stacked P2 on the inactive spring pad -> should rest solidly without bouncing
  p1.x = spring.x + 40;
  p1.y = spring.y - PLAYER_H;
  p2.x = p1.x;
  p2.y = p1.y - PLAYER_H;
  tickN(state, idleMap, 15);
  assert.equal(Math.round(p1.y + PLAYER_H), Math.round(spring.y), 'Cats stand solidly on locked spring');
  assert.equal(p2.standingOnPlayerId, 'p1');

  // Top climber P5 climbs the staircase onto the cliff and presses the red latch button
  p5.x = btn.x + 8;
  p5.y = cliff.y - PLAYER_H;
  tickN(state, idleMap, 3);
  assert.equal(btn.pressed, true);
  assert.equal(spring.active, true, 'Red cliff button activates green spring pad below');

  // Step frames cleanly until P1 and P2 clear the cliff top height!
  let peakP1Y = p1.y;
  let peakP2Y = p2.y;
  for (let i = 0; i < 45; i++) {
    stepSimulation(state, idleMap, 1 / 60);
    peakP1Y = Math.min(peakP1Y, p1.y);
    peakP2Y = Math.min(peakP2Y, p2.y);
  }
  assert.ok(peakP1Y + PLAYER_H <= cliff.y - 10, 'Activated spring launches bottom cat above cliff ledge');
  assert.ok(peakP2Y + PLAYER_H <= cliff.y - 10, 'Activated spring launches stacked cat above cliff ledge');
});

test('SnapshotInterpolator smoothly interpolates LAN positions and syncs shield/laser/spring state', () => {
  const interp = new SnapshotInterpolator();
  const stage5 = getLevelsByBracket('2p')[4];
  const s1 = createStageState(stage5.index, TWO_SPECS);
  const v1 = interp.step(s1, 1 / 60);
  assert.ok(v1);
  const startX = v1.players[0].x;
  assert.equal(v1.players[0].shieldDir, s1.players[0].shieldDir);
  assert.equal(v1.lasers.length, s1.lasers.length);

  const s2 = structuredClone(s1);
  s2.players[0].x += 30;
  s2.lasers[0].blockedByShield = true;
  s2.lasers[0].beamH = 150;
  const v2 = interp.step(s2, 1 / 60);
  assert.ok(v2);
  assert.ok(v2.players[0].x > startX && v2.players[0].x < startX + 30, 'Interpolated midway');
  assert.equal(v2.lasers[0].blockedByShield, true);
  assert.equal(v2.lasers[0].beamH, 150);
});
