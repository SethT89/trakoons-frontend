import { GameState, GameAsset, TEAM_COLORS } from './gameTypes';

const RACCOON_RADIUS = 1; // in game units (game space is 0-100)

// Raccoon sprite sheet: 512×256px, 32×32px per frame (16 cols × 8 rows)
const raccoonSheet = new Image();
raccoonSheet.src = '/raccoon-sheet.png';
let sheetLoaded = false;
raccoonSheet.onload = () => { sheetLoaded = true; };

// Wild West tileset (Archonei) — base sand ground tile, 32×32 native
const sandTile = new Image();
sandTile.src = '/wild-west/tile3.png';
let sandTileLoaded = false;
sandTile.onload = () => { sandTileLoaded = true; };
const TILE_DISPLAY_SIZE = 64; // pixels — display size of each tile (2× native for chunky look)

// Decoration sprites
function makeSprite(src: string) {
  const img = new Image(); img.src = src; return img;
}
const sprPlant  = makeSprite('/wild-west/plant_1.png');
const sprBasin  = makeSprite('/wild-west/basin.png');
const sprWanted = makeSprite('/wild-west/wanted_pester.png');

// Fixed decoration layout — purely visual, no collision. Game coords (0-100).
const DECORATIONS: { img: HTMLImageElement; x: number; y: number; w: number; h: number }[] = [
  { img: sprPlant,  x: 10, y: 12, w: 5, h: 4 },
  { img: sprPlant,  x: 70, y:  8, w: 5, h: 4 },
  { img: sprPlant,  x:  6, y: 55, w: 5, h: 4 },
  { img: sprPlant,  x: 88, y: 70, w: 5, h: 4 },
  { img: sprPlant,  x: 40, y: 88, w: 5, h: 4 },
  { img: sprWanted, x:  4, y: 25, w: 4, h: 5 },
];

const SPRITE_W = 32;
const SPRITE_H = 32;
// Direction → sprite row (adjust these if the sheet rows are in a different order)
const SPRITE_ROWS: Record<string, number> = { down: 0, right: 3, up: 2, left: 1 };
const WALK_FRAMES = 4;   // animate through columns 0–3
const WALK_MS     = 150; // ms per walk frame

// Client-side per-player state for smooth direction tracking
type Dir = 'down' | 'right' | 'up' | 'left';
const _playerFacing  = new Map<string, Dir>();
const _playerPrevPos = new Map<string, { x: number; y: number }>();

/** Map game coordinates (0-100) to canvas pixels. */
function gx(canvas: HTMLCanvasElement, v: number) { return (v / 100) * canvas.width; }
function gy(canvas: HTMLCanvasElement, v: number) { return (v / 100) * canvas.height; }

function drawBackground(ctx: CanvasRenderingContext2D, frenzy: boolean) {
  const { width, height } = ctx.canvas;

  if (sandTileLoaded) {
    // Tile the sand texture across the canvas
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < height; y += TILE_DISPLAY_SIZE) {
      for (let x = 0; x < width; x += TILE_DISPLAY_SIZE) {
        ctx.drawImage(sandTile, x, y, TILE_DISPLAY_SIZE, TILE_DISPLAY_SIZE);
      }
    }
    ctx.restore();
  } else {
    // Fallback while the tile texture loads
    ctx.fillStyle = '#c8a86b';
    ctx.fillRect(0, 0, width, height);
  }

  // Frenzy red wash overlay
  if (frenzy) {
    ctx.save();
    ctx.fillStyle = 'rgba(120, 10, 0, 0.55)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

function drawDecorations(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const d of DECORATIONS) {
    if (!d.img.complete || d.img.naturalWidth === 0) continue;
    ctx.drawImage(d.img, gx(ctx.canvas, d.x), gy(ctx.canvas, d.y),
      gx(ctx.canvas, d.w), gy(ctx.canvas, d.h));
  }
  ctx.restore();
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
    ctx.save();
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

    ctx.restore();
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

  // Asset body — trough renders as sprite, everything else as colored rectangle
  if (asset.type === 'trough' && sprBasin.complete && sprBasin.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprBasin, x, y, w, h);
    ctx.restore();
  } else {
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
  }
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
  myDx: number,
  myDy: number,
) {
  const canvas = ctx.canvas;
  const cx = gx(canvas, player.x + RACCOON_RADIUS);
  const cy = gy(canvas, player.y + RACCOON_RADIUS);
  const r  = gx(canvas, RACCOON_RADIUS);
  const sw = r * 4;
  const sh = r * 4;

  // ── Determine facing direction ──
  let facing: Dir;
  let moving = false;

  if (isMe) {
    if (myDx !== 0 || myDy !== 0) {
      moving = true;
      if (Math.abs(myDx) >= Math.abs(myDy)) {
        facing = myDx > 0 ? 'right' : 'left';
      } else {
        facing = myDy > 0 ? 'down' : 'up';
      }
    } else {
      facing = _playerFacing.get(player.id) ?? 'down';
    }
  } else {
    const prev = _playerPrevPos.get(player.id);
    if (prev) {
      const ddx = player.x - prev.x;
      const ddy = player.y - prev.y;
      if (Math.abs(ddx) > 0.01 || Math.abs(ddy) > 0.01) {
        moving = true;
        facing = Math.abs(ddx) >= Math.abs(ddy)
          ? (ddx > 0 ? 'right' : 'left')
          : (ddy > 0 ? 'down'  : 'up');
      } else {
        facing = _playerFacing.get(player.id) ?? 'down';
      }
    } else {
      facing = _playerFacing.get(player.id) ?? 'down';
    }
  }

  _playerFacing.set(player.id, facing);
  _playerPrevPos.set(player.id, { x: player.x, y: player.y });

  const row = SPRITE_ROWS[facing];
  const col = moving ? Math.floor(Date.now() / WALK_MS) % WALK_FRAMES : 0;
  const spriteSx = col * SPRITE_W;
  const spriteSy = row * SPRITE_H;

  // ── Colored team glow (sized to sprite: sprite radius = r*2) ──
  const glowColor = (player.teamId === 0 || player.teamId === 1)
    ? TEAM_COLORS[player.teamId]
    : player.color;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.3, 0, Math.PI * 2);
  ctx.fillStyle = glowColor + '55';
  ctx.fill();
  ctx.restore();

  // ── "You" dashed ring (encircles the full sprite) ──
  if (isMe) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.8, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.restore();
  }

  // ── Raccoon sprite ──
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (sheetLoaded) {
    ctx.drawImage(raccoonSheet, spriteSx, spriteSy, SPRITE_W, SPRITE_H,
      cx - sw / 2, cy - sh / 2, sw, sh);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
  }
  ctx.restore();

  // ── Name tag (below the "you" ring when present, else below sprite) ──
  const tagText = player.name.length > 12 ? player.name.slice(0, 12) : player.name;
  const tagY = cy + r * 2.8 + 8;
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
  myDx: number,
  myDy: number,
  myPos: { x: number; y: number },
) {
  // Prune expired animations (>700ms old)
  const now = Date.now();
  for (const [id, anim] of anims) {
    if (now - anim.startMs >= 700) anims.delete(id);
  }

  drawBackground(ctx, state.frenzy);
  drawDecorations(ctx);

  // Static assets first (behind moving ones)
  for (const asset of state.assets) {
    if (!asset.moving) drawAsset(ctx, asset, anims.get(asset.id));
  }
  for (const asset of state.assets) {
    if (asset.moving) drawAsset(ctx, asset, anims.get(asset.id));
  }

  for (const player of state.players) {
    const isMe = player.id === myPlayerId;
    // Use client-predicted position for local player so movement feels instant
    const displayPlayer = isMe ? { ...player, x: myPos.x, y: myPos.y } : player;
    drawRaccoon(ctx, displayPlayer, isMe, isMe ? myDx : 0, isMe ? myDy : 0);
  }
}
