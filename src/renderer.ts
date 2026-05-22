import { GameState, GameAsset } from './gameTypes';

const RACCOON_RADIUS = 1; // in game units (game space is 0-100)

/** Map game coordinates (0-100) to canvas pixels. */
function gx(canvas: HTMLCanvasElement, v: number) { return (v / 100) * canvas.width; }
function gy(canvas: HTMLCanvasElement, v: number) { return (v / 100) * canvas.height; }

function drawBackground(ctx: CanvasRenderingContext2D, frenzy: boolean) {
  ctx.fillStyle = frenzy ? '#1a0a00' : '#c8a86b';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Subtle grid lines to give depth
  ctx.strokeStyle = frenzy ? '#2a0f00' : '#b8944a';
  ctx.lineWidth = 0.5;
  const step = ctx.canvas.width / 10;
  for (let i = 0; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, ctx.canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(ctx.canvas.width, i * step);
    ctx.stroke();
  }
}

function drawAsset(
  ctx: CanvasRenderingContext2D,
  asset: GameAsset,
  anim?: { startMs: number; color: string },
) {
  const canvas = ctx.canvas;
  const x = gx(canvas, asset.x);
  const y = gy(canvas, asset.y);
  const w = gx(canvas, asset.w);
  const h = gy(canvas, asset.h);
  const cx = x + w / 2;
  const cy = y + h / 2;

  const elapsed = anim ? Date.now() - anim.startMs : 700;

  // GPS Rings — drawn before the asset (behind it), no scale applied
  if (anim && elapsed < 700) {
    ctx.strokeStyle = anim.color;
    ctx.lineWidth = 2;

    const expand1 = 1 + elapsed / 700;
    ctx.globalAlpha = 0.8 * (1 - elapsed / 700);
    ctx.beginPath();
    ctx.roundRect(cx - (w * expand1) / 2, cy - (h * expand1) / 2, w * expand1, h * expand1, 4);
    ctx.stroke();

    if (elapsed >= 180) {
      const elapsed2 = elapsed - 180;
      const expand2 = 1 + elapsed2 / 520;
      ctx.globalAlpha = 0.7 * (1 - elapsed2 / 520);
      ctx.beginPath();
      ctx.roundRect(cx - (w * expand2) / 2, cy - (h * expand2) / 2, w * expand2, h * expand2, 4);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  // Scale pop — scale around the asset center
  let scale = 1;
  if (anim && elapsed < 700) {
    if (elapsed < 100) {
      scale = 1 + 0.22 * (elapsed / 100);
    } else {
      const t = (elapsed - 100) / 600;
      scale = 1 + 0.22 * Math.pow(1 - t, 2);
    }
  }

  if (scale !== 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }

  // Asset body
  ctx.fillStyle = asset.ownerColor ?? '#555555';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = asset.moving ? 2 : 1;
  ctx.strokeRect(x, y, w, h);
  const label = asset.type.split('-').map(s => s[0].toUpperCase()).join('');
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(8, Math.min(11, w / 3))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  if (asset.moving) {
    const arrowLen = Math.min(w, h) * 0.3;
    const angle = Math.atan2(asset.vy, asset.vx);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * arrowLen, cy + Math.sin(angle) * arrowLen);
    ctx.stroke();
  }

  // Color flash (on top of asset, inside scale transform)
  if (anim && elapsed < 200) {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.65 * (1 - elapsed / 200);
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }

  if (scale !== 1) {
    ctx.restore();
  }
}

function drawRaccoon(
  ctx: CanvasRenderingContext2D,
  player: GameState['players'][number],
  isMe: boolean,
) {
  const canvas = ctx.canvas;
  const cx = gx(canvas, player.x + RACCOON_RADIUS);
  const cy = gy(canvas, player.y + RACCOON_RADIUS);
  const r  = gx(canvas, RACCOON_RADIUS);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = player.color;
  ctx.fill();

  if (isMe) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Initial
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${Math.floor(r * 1.1)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(player.name.charAt(0).toUpperCase(), cx, cy);

  // Name tag below
  const tagText = player.name.length > 12 ? player.name.slice(0, 12) : player.name;
  const tagY = cy + r + 10;
  ctx.font = 'bold 11px monospace';
  const tw = ctx.measureText(tagText).width;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.roundRect(cx - tw / 2 - 5, tagY - 7, tw + 10, 14, 3);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, cx, tagY);
}

/**
 * Render a complete frame onto the canvas.
 * Call this every animation frame with the latest game state.
 */
export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  myPlayerId: string,
  anims: Map<string, { startMs: number; color: string }>,
) {
  // Prune expired animations (>700ms old)
  const now = Date.now();
  for (const [id, anim] of anims) {
    if (now - anim.startMs >= 700) anims.delete(id);
  }

  drawBackground(ctx, state.frenzy);

  // Static assets first (behind moving ones)
  for (const asset of state.assets) {
    if (!asset.moving) drawAsset(ctx, asset, anims.get(asset.id));
  }
  for (const asset of state.assets) {
    if (asset.moving) drawAsset(ctx, asset, anims.get(asset.id));
  }

  for (const player of state.players) {
    drawRaccoon(ctx, player, player.id === myPlayerId);
  }
}
