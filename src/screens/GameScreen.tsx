import { useEffect, useRef, useState } from 'react';
import { Player, GameMode, GameState, GameAsset, ClientMessage, ServerMessage } from '../gameTypes';
import { useGameInput } from '../useGameInput';
import { render } from '../renderer';

const SPEED_PER_SEC = 25;  // game units per second (frame-rate independent)
const MAX_DT = 0.05;       // clamp dt to 50ms — prevents huge jumps on tab focus
const RACCOON_SIZE = 2;    // must match server RACCOON_SIZE

/** Check if a raccoon at (x,y) overlaps any non-moving asset. Matches server's overlaps(). */
function overlapsBlockingAsset(x: number, y: number, assets: GameAsset[]): boolean {
  for (const a of assets) {
    if (a.moving) continue;
    if (!(x + RACCOON_SIZE <= a.x || a.x + a.w <= x ||
          y + RACCOON_SIZE <= a.y || a.y + a.h <= y)) {
      return true;
    }
  }
  return false;
}

interface Props {
  players: Player[];
  mode: GameMode;
  myPlayerId: string;
  send: (msg: ClientMessage) => void;
  onMessage: (handler: (msg: ServerMessage) => void) => () => void;
}

export function GameScreen({ myPlayerId, mode, send, onMessage }: Props) {
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const stateRef         = useRef<GameState | null>(null);
  const posRef           = useRef({ x: 50, y: 50 });
  const posInitRef       = useRef(false); // sync posRef from server only once at game start
  const lastFrameRef     = useRef<number>(0); // performance.now() of previous frame, for dt
  const { getDirection } = useGameInput();
  const rafRef           = useRef<number>(0);
  const animRef          = useRef<Map<string, { startMs: number; color: string }>>(new Map());

  // Listen for gameState messages
  useEffect(() => {
    return onMessage(msg => {
      if (msg.type === 'gameState') {
        // Detect ownership changes for tag animations
        const prev = stateRef.current;
        if (prev) {
          for (const asset of msg.assets) {
            const prevAsset = prev.assets.find(a => a.id === asset.id);
            if (prevAsset && prevAsset.ownerId !== asset.ownerId && asset.ownerColor) {
              animRef.current.set(asset.id, { startMs: Date.now(), color: asset.ownerColor });
            }
          }
        }
        stateRef.current = msg;
        const me = msg.players.find(p => p.id === myPlayerId);
        if (me) {
          if (!posInitRef.current) {
            // First state: snap to server spawn position
            posRef.current = { x: me.x, y: me.y };
            posInitRef.current = true;
          } else {
            // Client and server now use identical axis-separated collision, so
            // their positions should agree. Only snap on huge drift (teleport,
            // server reset, etc.).
            const ddx = me.x - posRef.current.x;
            const ddy = me.y - posRef.current.y;
            if (ddx * ddx + ddy * ddy > 100) {
              posRef.current = { x: me.x, y: me.y };
            }
          }
        }
      }
    });
  }, [onMessage, myPlayerId]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);

    function frame() {
      // Frame-rate independent movement: scale by real elapsed time
      const now = performance.now();
      const dt = lastFrameRef.current === 0
        ? 1 / 60
        : Math.min(MAX_DT, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      const { dx, dy } = getDirection();
      if (dx !== 0 || dy !== 0) {
        // Divide x by aspect ratio so horizontal and vertical feel the same speed visually
        const ar = canvas!.width / canvas!.height;
        const stepX = dx * SPEED_PER_SEC * dt / ar;
        const stepY = dy * SPEED_PER_SEC * dt;
        const assets = stateRef.current?.assets ?? [];

        // Unclamped desired position — what we'd be at with no collision.
        // Send this to the server so it can detect overlap and tag the asset.
        const desiredX = Math.max(0, Math.min(98, posRef.current.x + stepX));
        const desiredY = Math.max(0, Math.min(98, posRef.current.y + stepY));

        // Axis-separated collision for our own rendering (wall-slide feel).
        // Server runs the same logic, so positions will agree.
        let nx = desiredX;
        if (overlapsBlockingAsset(nx, posRef.current.y, assets)) nx = posRef.current.x;
        let ny = desiredY;
        if (overlapsBlockingAsset(nx, ny, assets)) ny = posRef.current.y;

        posRef.current = { x: nx, y: ny };
        // Send the *desired* (unclamped) position so server can detect the
        // overlap and tag the asset. Server clamps with its own collision.
        send({ type: 'move', x: desiredX, y: desiredY });
      }

      const ctx = canvas!.getContext('2d');
      if (ctx && stateRef.current) {
        render(ctx, stateRef.current, myPlayerId, animRef.current, dx, dy, posRef.current);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [getDirection, send, myPlayerId]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-stone-950">
      {/* Game canvas — full width now */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* HUD — floating overlay top-right */}
      <div className="absolute top-4 right-4">
        <HudPanel stateRef={stateRef} myPlayerId={myPlayerId} mode={mode} />
      </div>
    </div>
  );
}

// ── HUD Panel ────────────────────────────────────────────────────────────────

interface HudProps {
  stateRef: React.RefObject<GameState | null>;
  myPlayerId: string;
  mode: GameMode;
}

function HudPanel({ stateRef, myPlayerId, mode }: HudProps) {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      if (stateRef.current) setState(stateRef.current);
    }, 100);
    return () => clearInterval(iv);
  }, [stateRef]);

  const timerColor = (state?.frenzy) ? 'bg-red-700 animate-pulse' : 'bg-red-800';
  const seconds = state ? Math.ceil(state.timeLeft) : 30;
  const mm = String(Math.floor(seconds / 60)).padStart(1, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="w-40 bg-gray-900/85 backdrop-blur-sm rounded-xl flex flex-col p-2 gap-1 shadow-lg">
      {/* Frenzy badge */}
      {state?.frenzy && (
        <div className="bg-red-600 animate-pulse text-white text-center font-black text-[9px] tracking-[0.2em] rounded px-1 py-0.5">
          ⚡ FRENZY
        </div>
      )}

      {/* Timer */}
      <div className={`${timerColor} text-white text-center font-bold text-sm rounded px-1 py-0.5 tracking-widest mb-1`}>
        {mm}:{ss}
      </div>

      {state && mode === 'ffa' && <FfaList state={state} myPlayerId={myPlayerId} />}
      {state && mode === 'teams' && <TeamsList state={state} myPlayerId={myPlayerId} />}
    </div>
  );
}

function FfaList({ state, myPlayerId }: { state: GameState; myPlayerId: string }) {
  const counts: Record<string, number> = {};
  for (const p of state.players) counts[p.id] = 0;
  for (const a of state.assets) { if (a.ownerId) counts[a.ownerId] = (counts[a.ownerId] ?? 0) + 1; }

  const ranked = [...state.players].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));

  return (
    <>
      {ranked.map((p, i) => {
        const isMe = p.id === myPlayerId;
        return (
          <div key={p.id} className="flex items-center gap-1 bg-gray-800 rounded px-1 py-0.5">
            <span className="text-gray-500 text-[9px] w-2">{i + 1}</span>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className={`text-[10px] flex-1 truncate ${isMe ? 'text-yellow-300' : 'text-gray-300'}`}>{p.name}</span>
            <span className={`text-[10px] font-bold ${isMe ? 'text-yellow-300' : 'text-white'}`}>{counts[p.id] ?? 0}</span>
          </div>
        );
      })}
    </>
  );
}

function TeamsList({ state, myPlayerId }: { state: GameState; myPlayerId: string }) {
  const counts: Record<string, number> = {};
  for (const p of state.players) counts[p.id] = 0;
  for (const a of state.assets) { if (a.ownerId) counts[a.ownerId] = (counts[a.ownerId] ?? 0) + 1; }

  const team0 = state.players.filter(p => p.teamId === 0).sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
  const team1 = state.players.filter(p => p.teamId === 1).sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
  const total0 = team0.reduce((s, p) => s + (counts[p.id] ?? 0), 0);
  const total1 = team1.reduce((s, p) => s + (counts[p.id] ?? 0), 0);

  function TeamBlock({ players, total, teamColor, label }: { players: typeof team0; total: number; teamColor: string; label: string }) {
    return (
      <div className="rounded p-1" style={{ background: teamColor + '22', border: `1px solid ${teamColor}55` }}>
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] font-bold tracking-wide" style={{ color: teamColor }}>{label}</span>
          <span className="text-xs font-bold" style={{ color: teamColor }}>{total}</span>
        </div>
        {players.map(p => {
          const isMe = p.id === myPlayerId;
          return (
            <div key={p.id} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: teamColor }} />
              <span className={`text-[10px] flex-1 truncate ${isMe ? 'text-yellow-300' : 'text-gray-300'}`}>{p.name}</span>
              <span className={`text-[10px] ${isMe ? 'text-yellow-300' : 'text-gray-400'}`}>{counts[p.id] ?? 0}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const firstTeam  = total0 >= total1 ? 0 : 1;
  const secondTeam = firstTeam === 0 ? 1 : 0;
  const teams = [
    { players: team0, total: total0, color: '#FF6B35', label: 'ORG' },
    { players: team1, total: total1, color: '#4CC9F0', label: 'BLU' },
  ];

  return (
    <>
      <TeamBlock players={teams[firstTeam].players}  total={teams[firstTeam].total}  teamColor={teams[firstTeam].color}  label={teams[firstTeam].label} />
      <TeamBlock players={teams[secondTeam].players} total={teams[secondTeam].total} teamColor={teams[secondTeam].color} label={teams[secondTeam].label} />
    </>
  );
}
