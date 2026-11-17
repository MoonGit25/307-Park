import type { GameState } from './types';

/**
 * Smoothly interpolates client-rendered GameState toward the latest server snapshot
 * so LAN movement stays silky-smooth at 60/120Hz even with Wi-Fi jitter or 30Hz snapshots.
 */
export class SnapshotInterpolator {
  private visual: GameState | null = null;

  public reset(): void {
    this.visual = null;
  }

  public step(target: GameState | null, dt: number): GameState | null {
    if (!target) {
      this.visual = null;
      return null;
    }

    if (
      !this.visual ||
      this.visual.stageIndex !== target.stageIndex ||
      this.visual.players.length !== target.players.length ||
      this.visual.deaths !== target.deaths
    ) {
      this.visual = structuredClone(target);
      return this.visual;
    }

    const alpha = 1 - Math.exp(-32 * Math.min(dt, 0.05));
    const v = this.visual;

    v.status = target.status;
    v.respawnTimer = target.respawnTimer;
    v.elapsedTime = target.elapsedTime;
    v.deaths = target.deaths;
    v.door.unlocked = target.door.unlocked;
    v.key.collected = target.key.collected;
    v.key.carrierId = target.key.carrierId;

    // Smooth key position
    if (Math.hypot(target.key.x - v.key.x, target.key.y - v.key.y) > 110) {
      v.key.x = target.key.x;
      v.key.y = target.key.y;
    } else {
      v.key.x += (target.key.x - v.key.x) * alpha;
      v.key.y += (target.key.y - v.key.y) * alpha;
    }

    // Smooth players
    for (let i = 0; i < target.players.length; i++) {
      const tp = target.players[i];
      const vp = v.players[i];
      if (!vp || vp.id !== tp.id) {
        v.players[i] = structuredClone(tp);
        continue;
      }
      const dist = Math.hypot(tp.x - vp.x, tp.y - vp.y);
      if (dist > 110) {
        vp.x = tp.x;
        vp.y = tp.y;
      } else {
        vp.x += (tp.x - vp.x) * alpha;
        vp.y += (tp.y - vp.y) * alpha;
      }
      vp.vx = tp.vx;
      vp.vy = tp.vy;
      vp.facing = tp.facing;
      vp.onGround = tp.onGround;
      vp.inDoor = tp.inDoor;
      vp.walkDist = tp.walkDist;
      vp.squashX += (tp.squashX - vp.squashX) * alpha;
      vp.squashY += (tp.squashY - vp.squashY) * alpha;
      vp.blinkTimer = tp.blinkTimer;
      vp.name = tp.name;
      vp.color = tp.color;
      vp.shieldDir = tp.shieldDir;
    }

    // Smooth moving platforms
    for (let i = 0; i < target.platforms.length; i++) {
      const tplat = target.platforms[i];
      const vplat = v.platforms[i];
      if (!vplat) continue;
      vplat.x += (tplat.x - vplat.x) * alpha;
      vplat.y += (tplat.y - vplat.y) * alpha;
    }

    // Smooth push blocks
    for (let i = 0; i < target.pushBlocks.length; i++) {
      const tb = target.pushBlocks[i];
      const vb = v.pushBlocks[i];
      if (!vb) continue;
      if (Math.hypot(tb.x - vb.x, tb.y - vb.y) > 100) {
        vb.x = tb.x;
        vb.y = tb.y;
      } else {
        vb.x += (tb.x - vb.x) * alpha;
        vb.y += (tb.y - vb.y) * alpha;
      }
      vb.activePushers = tb.activePushers;
      vb.neededPushers = tb.neededPushers;
    }

    // Sync buttons & smooth gates
    for (let i = 0; i < target.buttons.length; i++) {
      if (v.buttons[i]) {
        v.buttons[i].pressed = target.buttons[i].pressed;
      }
    }
    for (let i = 0; i < target.gates.length; i++) {
      const tg = target.gates[i];
      const vg = v.gates[i];
      if (!vg) continue;
      vg.x += (tg.x - vg.x) * alpha;
      vg.y += (tg.y - vg.y) * alpha;
      vg.progress += (tg.progress - vg.progress) * alpha;
    }

    // Sync stationary lasers & shield-clipped beam endpoints
    if (target.lasers) {
      if (!v.lasers || v.lasers.length !== target.lasers.length) {
        v.lasers = structuredClone(target.lasers);
      } else {
        for (let i = 0; i < target.lasers.length; i++) {
          const tl = target.lasers[i];
          const vl = v.lasers[i];
          vl.beamX = tl.beamX;
          vl.beamY = tl.beamY;
          vl.beamW = tl.beamW;
          vl.beamH = tl.beamH;
          vl.blockedByShield = tl.blockedByShield;
        }
      }
    }

    // Sync spring jump-pads
    if (target.springs) {
      if (!v.springs || v.springs.length !== target.springs.length) {
        v.springs = structuredClone(target.springs);
      } else {
        for (let i = 0; i < target.springs.length; i++) {
          v.springs[i].active = target.springs[i].active;
          v.springs[i].bounceTimer = target.springs[i].bounceTimer;
        }
      }
    }

    return v;
  }
}
