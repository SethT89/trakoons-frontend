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

function drawAsset(ctx: CanvasRenderingContext2D, asset: GameAsset) {
  const canvas = ctx.canvas;
  const x = gx(canvas, asset.x);
  const y = gy(canvas, asset.y);
  const w = gx(canvas, asset.w);
  const h = gy(canvas, asset.h);

  // Fill with owner color or default
  ctx.fillStyle = asset.ownerColor ?? '#555555';
  ctx.fillRect(x, y, w, h);

  // Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = asset.moving ? 2 : 1;
  ctx.strokeRect(x, y, w, h);

  // Label
  const label = asset.type.split('-').map(s => s[0].toUpperCase()).join('');
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(8, Math.min(11, w / 3))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);

  // Direction arrow for moving assets
  if (asset.moving) {
    const arrowLen = Math.min(w, h) * 0.3;
    const angle = Math.atan2(asset.vy, asset.vx);
    const cx = x + w / 2, cy = y + h / 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * arrowLen, cy + Math.sin(angle) * arrowLen);
    ctx.stroke();
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
) {
  drawBackground(ctx, state.frenzy);

  // Static assets first (behind moving ones)
  for (const asset of state.assets) {
    if (!asset.moving) drawAsset(ctx, asset);
  }
  for (const asset of state.assets) {
    if (asset.moving) drawAsset(ctx, asset);
  }

  for (const player of state.players) {
    drawRaccoon(ctx, player, player.id === myPlayerId);
  }
}
