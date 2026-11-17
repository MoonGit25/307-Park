import { PALETTE_BY_ID } from './types';
import type {
  GameState,
  LaserShieldDir,
  LaserState,
  PlayerColorId,
  PlayerState,
  SpringState,
} from './types';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

const POOL_SIZE = 160;
const OUT_LINE = '#1A1A1A';
const GROUND_FILL = '#F7C382';
const GROUND_TOP = '#FBE0B8';

export class PicoRenderer {
  private particles: Particle[];
  private cursor = 0;
  private trauma = 0;
  private hitstopTimer = 0;
  private animClock = 0;

  constructor() {
    this.particles = Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      life: 0,
      maxLife: 0.4,
      color: '#F48C42',
    }));
  }

  public addShake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  public triggerHitstop(seconds: number): void {
    this.hitstopTimer = Math.max(this.hitstopTimer, seconds);
  }

  public isHitstopped(dt: number): boolean {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return true;
    }
    return false;
  }

  public spawnBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    speed = 140,
    size = 5,
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % POOL_SIZE;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const spd = speed * (0.45 + Math.random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd - 45;
      p.size = size * (0.7 + Math.random() * 0.6);
      p.maxLife = 0.25 + Math.random() * 0.3;
      p.life = p.maxLife;
      p.color = color;
    }
  }

  public updateEffects(dt: number): void {
    this.animClock += dt;
    this.trauma = Math.max(0, this.trauma - dt * 2.8);
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += 420 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private drawPicoCat(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    colorId: PlayerColorId,
    facing: 1 | -1,
    walkDist: number,
    squashX: number,
    squashY: number,
    isBlinking: boolean,
    isOnGround: boolean,
    label?: string,
    isLocal?: boolean,
    shieldDir?: LaserShieldDir | null,
  ): void {
    const pal = PALETTE_BY_ID[colorId] ?? PALETTE_BY_ID.coral;

    ctx.save();
    // Anchor squash-and-stretch at bottom center of feet
    const cx = x + w * 0.5;
    const cy = y + h;
    ctx.translate(cx, cy);
    ctx.scale(squashX, squashY);

    const bw = w;
    const earH = 6;
    const earW = 6;

    // Legs (animated walk cycle synced to walkDist)
    const step = isOnGround ? Math.sin(walkDist * 0.22) * 3 : 2;
    ctx.fillStyle = OUT_LINE;
    // Left leg
    ctx.fillRect(-bw * 0.34, -6 + Math.max(0, step), 6, 6);
    // Right leg
    ctx.fillRect(bw * 0.14, -6 + Math.max(0, -step), 6, 6);
    // Inner colored leg fill
    ctx.fillStyle = pal.shade;
    ctx.fillRect(-bw * 0.34 + 1.5, -6 + Math.max(0, step), 3, 4);
    ctx.fillRect(bw * 0.14 + 1.5, -6 + Math.max(0, -step), 3, 4);

    // Body + Ears outline
    ctx.fillStyle = pal.fill;
    ctx.strokeStyle = OUT_LINE;
    ctx.lineWidth = 2.4;

    const topY = -h + earH * 0.45;
    const leftX = -bw * 0.5;

    ctx.beginPath();
    ctx.moveTo(leftX, topY + earH);
    // Left ear
    ctx.lineTo(leftX, topY);
    ctx.lineTo(leftX + earW, topY);
    ctx.lineTo(leftX + earW + 2, topY + earH);
    // Top head bridge
    ctx.lineTo(leftX + bw - earW - 2, topY + earH);
    // Right ear
    ctx.lineTo(leftX + bw - earW, topY);
    ctx.lineTo(leftX + bw, topY);
    ctx.lineTo(leftX + bw, topY + earH);
    // Right & bottom & left body
    ctx.lineTo(leftX + bw, -6);
    ctx.lineTo(leftX, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eyes (directional Pico Park pixel eyes!)
    const eyeY = -h + 15;
    const eyeOffsetX = facing * 3.5;
    ctx.fillStyle = OUT_LINE;
    if (isBlinking) {
      ctx.fillRect(eyeOffsetX - 6, eyeY + 2, 4, 2);
      ctx.fillRect(eyeOffsetX + 2, eyeY + 2, 4, 2);
    } else {
      ctx.fillRect(eyeOffsetX - 6, eyeY, 4, 4.5);
      ctx.fillRect(eyeOffsetX + 2, eyeY, 4, 4.5);
    }

    ctx.restore();

    // Directional laser shield bar stuck to cat (matches player palette + crisp dark border)
    if (shieldDir) {
      ctx.save();
      ctx.fillStyle = pal.fill;
      ctx.strokeStyle = OUT_LINE;
      ctx.lineWidth = 2;
      if (shieldDir === 'up') {
        ctx.fillRect(x - 10, y - 10, w + 20, 6);
        ctx.strokeRect(x - 10, y - 10, w + 20, 6);
      } else if (shieldDir === 'left') {
        ctx.fillRect(x - 10, y - 4, 6, h + 6);
        ctx.strokeRect(x - 10, y - 4, 6, h + 6);
      } else {
        ctx.fillRect(x + w + 4, y - 4, 6, h + 6);
        ctx.strokeRect(x + w + 4, y - 4, 6, h + 6);
      }
      ctx.restore();
    }

    // Crisp player tag above head
    if (label) {
      ctx.save();
      ctx.font = '700 10px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const tagY = shieldDir === 'up' ? y - 14 : y - 6;
      if (isLocal) {
        // Small downward caret for your own cat
        ctx.fillStyle = '#F48C42';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.5, tagY + 1);
        ctx.lineTo(x + w * 0.5 - 4, tagY - 4);
        ctx.lineTo(x + w * 0.5 + 4, tagY - 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1A1A1A';
        ctx.fillText(label, x + w * 0.5, tagY - 6);
      } else {
        ctx.fillStyle = '#52525B';
        ctx.fillText(label, x + w * 0.5, tagY - 2);
      }
      ctx.restore();
    }
  }

  private drawLaser(ctx: CanvasRenderingContext2D, L: LaserState): void {
    ctx.save();
    // 1. Animated orange zig-zag laser beam
    const step = 12;
    const amp = 4.5;
    const phase = (this.animClock * 96) % (step * 2);

    ctx.strokeStyle = '#F48C42';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    if (L.dir === 'down' && L.beamH > 0) {
      const cx = L.beamX + L.beamW * 0.5;
      const startY = L.beamY;
      const endY = L.beamY + L.beamH;
      ctx.beginPath();
      ctx.moveTo(cx, startY);
      let idx = 0;
      for (let py = startY + (phase % step); py < endY; py += step) {
        const zig = idx % 2 === 0 ? -amp : amp;
        ctx.lineTo(cx + zig, py);
        idx++;
      }
      ctx.lineTo(cx, endY);
      ctx.stroke();

      if (L.blockedByShield) {
        this.drawShieldBlockSpark(ctx, cx, endY);
      }
    } else if ((L.dir === 'left' || L.dir === 'right') && L.beamW > 0) {
      const cy = L.beamY + L.beamH * 0.5;
      const startX = L.beamX;
      const endX = L.beamX + L.beamW;
      ctx.beginPath();
      if (L.dir === 'right') {
        ctx.moveTo(startX, cy);
        let idx = 0;
        for (let px = startX + (phase % step); px < endX; px += step) {
          const zig = idx % 2 === 0 ? -amp : amp;
          ctx.lineTo(px, cy + zig);
          idx++;
        }
        ctx.lineTo(endX, cy);
      } else {
        ctx.moveTo(endX, cy);
        let idx = 0;
        for (let px = endX - (phase % step); px > startX; px -= step) {
          const zig = idx % 2 === 0 ? -amp : amp;
          ctx.lineTo(px, cy + zig);
          idx++;
        }
        ctx.lineTo(startX, cy);
      }
      ctx.stroke();

      if (L.blockedByShield) {
        const hitX = L.dir === 'right' ? endX : startX;
        this.drawShieldBlockSpark(ctx, hitX, cy);
      }
    }

    // 2. Stationary orange emitter nozzle (drawn above beam endpoint)
    ctx.fillStyle = '#F48C42';
    ctx.strokeStyle = OUT_LINE;
    ctx.lineWidth = 2.2;
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    ctx.restore();
  }

  private drawShieldBlockSpark(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const pulse = 5 + Math.sin(this.animClock * 24) * 2;
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = '#F48C42';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, pulse * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawSpring(ctx: CanvasRenderingContext2D, sp: SpringState): void {
    const active = sp.active;
    const stretchRatio = sp.bounceTimer > 0 ? Math.sin((sp.bounceTimer / 0.28) * Math.PI) * 0.65 : 0;
    const drawH = active ? sp.h + sp.h * stretchRatio : Math.max(20, sp.h * 0.78);
    const topY = sp.y + sp.h - drawH;
    const mainGreen = active ? (sp.color ?? '#22C55E') : '#86EFAC';
    const shadeGreen = active ? '#15803D' : '#16A34A';

    ctx.save();
    // White lattice backing so scissor struts pop clearly against grid
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sp.x, topY, sp.w, drawH);

    // Repeating diamond-lattice scissor bays (matching the reference screenshot)
    const bays = Math.max(2, Math.round(sp.w / 32));
    const bayW = sp.w / bays;
    const railH = 6;
    const innerTop = topY + railH;
    const innerBot = sp.y + sp.h - railH;
    const midY = (innerTop + innerBot) * 0.5;

    ctx.strokeStyle = shadeGreen;
    ctx.lineWidth = 2.4;
    for (let i = 0; i < bays; i++) {
      const bx = sp.x + i * bayW;
      const cx = bx + bayW * 0.5;
      // Scissor X + center diamond lattice
      ctx.beginPath();
      ctx.moveTo(bx + 2, innerTop);
      ctx.lineTo(bx + bayW - 2, innerBot);
      ctx.moveTo(bx + bayW - 2, innerTop);
      ctx.lineTo(bx + 2, innerBot);
      ctx.moveTo(cx, innerTop + 1);
      ctx.lineTo(bx + bayW - 3, midY);
      ctx.lineTo(cx, innerBot - 1);
      ctx.lineTo(bx + 3, midY);
      ctx.closePath();
      ctx.stroke();

      // Vertical post between bays
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(bx, innerTop);
        ctx.lineTo(bx, innerBot);
        ctx.stroke();
      }
    }

    // Top bounce plate & bottom anchor plate
    ctx.fillStyle = mainGreen;
    ctx.fillRect(sp.x, topY, sp.w, railH);
    ctx.fillRect(sp.x, sp.y + sp.h - railH, sp.w, railH);

    // Crisp borders
    ctx.strokeStyle = OUT_LINE;
    ctx.lineWidth = 2.2;
    ctx.strokeRect(sp.x, topY, sp.w, railH);
    ctx.strokeRect(sp.x, sp.y + sp.h - railH, sp.w, railH);
    ctx.strokeRect(sp.x, topY, sp.w, drawH);

    // Status pill / upward chevrons when armed vs locked waiting for cliff button
    if (active) {
      const bob = Math.sin(this.animClock * 7) * 2;
      ctx.strokeStyle = shadeGreen;
      ctx.lineWidth = 2.2;
      const midX = sp.x + sp.w * 0.5;
      ctx.beginPath();
      ctx.moveTo(midX - 8, topY - 4 + bob);
      ctx.lineTo(midX, topY - 10 + bob);
      ctx.lineTo(midX + 8, topY - 4 + bob);
      ctx.stroke();
    } else if (sp.buttonId) {
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(sp.x + sp.w * 0.5 - 4, topY - 7, 8, 5);
      ctx.strokeStyle = OUT_LINE;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sp.x + sp.w * 0.5 - 4, topY - 7, 8, 5);
    }

    ctx.restore();
  }

  private drawKey(ctx: CanvasRenderingContext2D, x: number, y: number, bob: number): void {
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.strokeStyle = OUT_LINE;
    ctx.lineWidth = 2.4;
    ctx.fillStyle = '#FDE047';

    // Key ring
    ctx.beginPath();
    ctx.arc(0, -6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner hole
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, -6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Stem + teeth
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(-2.5, 1, 5, 13);
    ctx.strokeRect(-2.5, 1, 5, 13);
    ctx.fillRect(2.5, 7, 5, 3);
    ctx.strokeRect(2.5, 7, 5, 3);
    ctx.fillRect(2.5, 11.5, 4, 2.5);
    ctx.strokeRect(2.5, 11.5, 4, 2.5);
    ctx.restore();
  }

  private drawDoor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    unlocked: boolean,
  ): void {
    ctx.save();
    ctx.strokeStyle = OUT_LINE;
    ctx.lineWidth = 2.6;
    ctx.fillStyle = unlocked ? '#262626' : '#D6CFC7';

    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + 12);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x + w - 10, y);
    ctx.lineTo(x + w, y + 12);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!unlocked) {
      // Dark keyhole on door
      ctx.fillStyle = OUT_LINE;
      ctx.fillRect(x + 10, y + h * 0.52, 5, 6);
    } else {
      // Inner subtle warm frame
      ctx.strokeStyle = '#F48C42';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 6, y + 14, w - 12, h - 16);
    }
    ctx.restore();
  }

  public renderGame(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    state: GameState,
    localPlayerId: string | null,
    isMobilePadding = false,
  ): void {
    // Clear pure Pico Park white canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, viewW, viewH);

    // Subtle crisp drafting grid in very faint neutral (single batched path)
    ctx.strokeStyle = 'rgba(0,0,0,0.035)';
    ctx.lineWidth = 1;
    const gridSize = 64;
    ctx.beginPath();
    for (let gx = 0; gx < viewW; gx += gridSize) {
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, viewH);
    }
    for (let gy = 0; gy < viewH; gy += gridSize) {
      ctx.moveTo(0, gy);
      ctx.lineTo(viewW, gy);
    }
    ctx.stroke();

    // Fit world bounds cleanly inside viewport (reserve bottom strip for mobile virtual pad if visible)
    const padX = viewW < 640 ? 10 : 24;
    const padTop = 58;
    const padBottom = isMobilePadding ? 128 : 24;
    const availW = Math.max(200, viewW - padX * 2);
    const availH = Math.max(200, viewH - padTop - padBottom);
    const fitScale = Math.min(availW / state.worldWidth, availH / state.worldHeight);
    const isPortraitPhone = viewW < 640 && viewH > viewW;
    const scale = isPortraitPhone
      ? Math.min(availH / state.worldHeight, Math.max(fitScale, availW / 620))
      : fitScale;

    let offsetX = (viewW - state.worldWidth * scale) * 0.5;
    if (state.worldWidth * scale > availW) {
      const focusPlayer =
        state.players.find((p) => p.id === localPlayerId && !p.inDoor) ??
        state.players.find((p) => !p.inDoor) ??
        state.players[0];
      const targetWorldX = focusPlayer ? focusPlayer.x + focusPlayer.w * 0.5 : state.worldWidth * 0.5;
      const desiredOffset = viewW * 0.5 - targetWorldX * scale;
      const minOffset = viewW - padX - state.worldWidth * scale;
      const maxOffset = padX;
      offsetX = Math.max(minOffset, Math.min(maxOffset, desiredOffset));
    }
    const offsetY = padTop + (availH - state.worldHeight * scale) * 0.5;

    const shakeMag = this.trauma * this.trauma * 9;
    const shakeX = shakeMag > 0.1 ? (Math.random() * 2 - 1) * shakeMag : 0;
    const shakeY = shakeMag > 0.1 ? (Math.random() * 2 - 1) * shakeMag : 0;

    ctx.save();
    ctx.translate(offsetX + shakeX, offsetY + shakeY);
    ctx.scale(scale, scale);

    // 1. Platforms
    for (const plat of state.platforms) {
      ctx.fillStyle = plat.kind === 'moving' ? '#FBBF68' : GROUND_FILL;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.fillStyle = GROUND_TOP;
      ctx.fillRect(plat.x, plat.y, plat.w, Math.min(7, plat.h));
      ctx.strokeStyle = OUT_LINE;
      ctx.lineWidth = 2.6;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

      if (plat.kind === 'moving') {
        ctx.fillStyle = OUT_LINE;
        ctx.fillRect(plat.x + 12, plat.y + plat.h * 0.5 - 2, plat.w - 24, 4);
      }
    }

    // 2. Gates & Bridges
    for (const gate of state.gates) {
      if (gate.mode === 'bridge') {
        if (gate.progress > 0.5) {
          ctx.fillStyle = gate.color;
          ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
          ctx.strokeStyle = OUT_LINE;
          ctx.lineWidth = 2.4;
          ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
        } else {
          ctx.save();
          ctx.setLineDash([7, 6]);
          ctx.strokeStyle = 'rgba(26, 26, 26, 0.25)';
          ctx.lineWidth = 2;
          ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = gate.color;
        ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
        ctx.strokeStyle = OUT_LINE;
        ctx.lineWidth = 2.4;
        ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
      }
    }

    // 3. Floor Buttons
    for (const btn of state.buttons) {
      const pressOffset = btn.pressed ? 5 : 0;
      ctx.fillStyle = btn.color;
      ctx.fillRect(btn.x, btn.y + pressOffset, btn.w, btn.h - pressOffset);
      ctx.strokeStyle = OUT_LINE;
      ctx.lineWidth = 2.2;
      ctx.strokeRect(btn.x, btn.y + pressOffset, btn.w, btn.h - pressOffset);
    }

    // 3b. Spring Jump-Pads (Per Lompat)
    if (state.springs) {
      for (const sp of state.springs) {
        this.drawSpring(ctx, sp);
      }
    }

    // 4. Spikes
    for (const spk of state.spikes) {
      const teeth = Math.max(2, Math.floor(spk.w / 14));
      const tw = spk.w / teeth;
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = OUT_LINE;
      ctx.lineWidth = 2;
      for (let i = 0; i < teeth; i++) {
        const sx = spk.x + i * tw;
        ctx.beginPath();
        ctx.moveTo(sx, spk.y + spk.h);
        ctx.lineTo(sx + tw * 0.5, spk.y);
        ctx.lineTo(sx + tw, spk.y + spk.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 4b. Stationary Lasers (drawn before players so shield sparks snap right onto shield edges)
    if (state.lasers) {
      for (const L of state.lasers) {
        this.drawLaser(ctx, L);
      }
    }

    // 5. Push Blocks (with live pusher badge!)
    for (const b of state.pushBlocks) {
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = OUT_LINE;
      ctx.lineWidth = 2.8;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // Inner crate cross & player count indicator
      ctx.fillStyle = b.activePushers >= b.neededPushers ? '#F48C42' : '#1A1A1A';
      ctx.font = '800 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${b.activePushers}/${b.neededPushers}`,
        b.x + b.w * 0.5,
        b.y + b.h * 0.5,
      );
    }

    // 6. Exit Door
    this.drawDoor(ctx, state.door.x, state.door.y, state.door.w, state.door.h, state.door.unlocked);

    // 7. Rope Tether Lines (drawn behind players just like Pico Park!)
    const activePlayers: PlayerState[] = state.players.filter((p) => !p.inDoor);
    if (state.tetheredRope && activePlayers.length > 1) {
      ctx.save();
      ctx.strokeStyle = OUT_LINE;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i < activePlayers.length - 1; i++) {
        const a = activePlayers[i];
        const b = activePlayers[i + 1];
        const ax = a.x + a.w * 0.5;
        const ay = a.y + a.h * 0.62;
        const bx = b.x + b.w * 0.5;
        const by = b.y + b.h * 0.62;
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 8. Players + Directional Laser Shields
    for (const p of activePlayers) {
      this.drawPicoCat(
        ctx,
        p.x,
        p.y,
        p.w,
        p.h,
        p.color,
        p.facing,
        p.walkDist,
        p.squashX,
        p.squashY,
        p.blinkTimer < 0,
        p.onGround,
        p.name,
        p.id === localPlayerId,
        p.shieldDir,
      );
    }

    // 9. Golden Key
    if (!state.door.unlocked) {
      const bob = Math.sin(this.animClock * 4.5) * 3.5;
      this.drawKey(ctx, state.key.x, state.key.y, bob);
    }

    // 10. Pooled Particles
    for (let i = 0; i < POOL_SIZE; i++) {
      const pt = this.particles[i];
      if (!pt.active) continue;
      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size * 0.5, pt.y - pt.size * 0.5, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // Subtle respawn flash
    if (state.status === 'respawning') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fillRect(0, 0, state.worldWidth, state.worldHeight);
    }

    ctx.restore();
  }

  /**
   * Renders the Title Screen live animated diorama matching the attached reference screenshot:
   * 6 pastel Pico Cats tethered together dangling off the warm peach cliff toward the grey door!
   */
  public renderTitleDiorama(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, timeSec: number): void {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, viewW, viewH);

    // Scale virtual diorama (1000 x 560) cleanly into viewport
    const vw = 1000;
    const vh = 560;
    const scale = Math.min(viewW / vw, viewH / vh);
    const ox = (viewW - vw * scale) * 0.5;
    const oy = (viewH - vh * scale) * 0.5;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    // Warm peach cliff block on right (matching screenshot!)
    const cliffX = 310;
    const cliffY = 290;
    ctx.fillStyle = GROUND_FILL;
    ctx.fillRect(cliffX, cliffY, vw - cliffX + 300, vh - cliffY + 200);
    ctx.strokeStyle = OUT_LINE;
    ctx.lineWidth = 3;
    ctx.strokeRect(cliffX, cliffY, vw - cliffX + 300, vh - cliffY + 200);

    // Grey Exit Door on the right
    this.drawDoor(ctx, 810, cliffY - 56, 48, 56, false);

    // Dangling sway animation
    const sway = Math.sin(timeSec * 2.1) * 7;
    const cats: Array<{
      x: number;
      y: number;
      color: PlayerColorId;
      facing: 1 | -1;
      blink: boolean;
    }> = [
      { x: 205 + sway * 1.1, y: 428 + Math.cos(timeSec * 2.1) * 4, color: 'mint', facing: 1, blink: Math.sin(timeSec * 1.2) > 0.96 },
      { x: 268 + sway * 0.55, y: 342, color: 'peach', facing: 1, blink: Math.sin(timeSec * 1.5 + 1) > 0.96 },
      { x: 334, y: cliffY - 32, color: 'lavender', facing: 1, blink: Math.sin(timeSec * 1.1 + 2) > 0.96 },
      { x: 416, y: cliffY - 32, color: 'coral', facing: 1, blink: Math.sin(timeSec * 1.4 + 3) > 0.96 },
      { x: 500, y: cliffY - 32, color: 'amber', facing: 1, blink: Math.sin(timeSec * 1.3 + 4) > 0.96 },
      { x: 584, y: cliffY - 32, color: 'pink', facing: 1, blink: Math.sin(timeSec * 1.6 + 5) > 0.96 },
    ];

    // Draw rope connecting all 6 cats
    ctx.strokeStyle = OUT_LINE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < cats.length - 1; i++) {
      ctx.moveTo(cats[i].x + 14, cats[i].y + 22);
      ctx.lineTo(cats[i + 1].x + 14, cats[i + 1].y + 22);
    }
    ctx.stroke();

    // Draw each cat
    for (const c of cats) {
      this.drawPicoCat(
        ctx,
        c.x,
        c.y,
        30,
        34,
        c.color,
        c.facing,
        0,
        1,
        1,
        c.blink,
        c.y === cliffY - 32,
      );
    }

    // Golden Key carried by the mint cat!
    this.drawKey(ctx, cats[0].x - 10, cats[0].y - 10, Math.sin(timeSec * 3.8) * 3);

    ctx.restore();
  }
}
