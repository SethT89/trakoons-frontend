import { useEffect, useRef, useState } from 'react';
import { Player, GameMode, GameState, ClientMessage, ServerMessage } from '../gameTypes';
import { useGameInput } from '../useGameInput';
import { render } from '../renderer';

const SPEED = 0.42; // units per frame at ~60 fps  (≈ 25 units/sec)

interface Props {
  players: Player[];
  mode: GameMode;
  myPlayerId: string;
  send: (msg: ClientMessage) => void;
  onMessage: (handler: (msg: ServerMessage) => void) => () => void;
}

export function GameScreen({ myPlayerId, mode, send, onMessage }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const stateRef     = useRef<GameState | null>(null);
  const posRef       = useRef({ x: 50, y: 50 });
  const { getDirection } = useGameInput();
  const rafRef       = useRef<number>(0);

  // Listen for gameState messages
  useEffect(() => {
    return onMessage(msg => {
      if (msg.type === 'gameState') {
        stateRef.current = msg;
        // Keep local position in sync with server (server is authoritative)
        const me = msg.players.find(p => p.id === myPlayerId);
        if (me) posRef.current = { x: me.x, y: me.y };
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
      const { dx, dy } = getDirection();
      if (dx !== 0 || dy !== 0) {
        posRef.current = {
          x: Math.max(0, Math.min(98, posRef.current.x + dx * SPEED)),
          y: Math.max(0, Math.min(98, posRef.current.y + dy * SPEED)),
        };
        send({ type: 'move', x: posRef.current.x, y: posRef.current.y });
      }

      const ctx = canvas!.getContext('2d');
      if (ctx && stateRef.current) render(ctx, stateRef.current, myPlayerId);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [getDirection, send, myPlayerId]);

  return (
    <div className="flex h-screen w-screen bg-stone-950">
      {/* Game canvas */}
      <canvas ref={canvasRef} className="flex-1 block" />

      {/* HUD panel */}
      <HudPanel stateRef={stateRef} myPlayerId={myPlayerId} mode={mode} />
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
    <div className="w-24 bg-gray-900 flex flex-col p-1.5 gap-1 shrink-0">
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

  return (
    <>
      <TeamBlock players={team0} total={total0} teamColor="#FF6B35" label="ORG" />
      <TeamBlock players={team1} total={total1} teamColor="#4CC9F0" label="BLU" />
    </>
  );
}
