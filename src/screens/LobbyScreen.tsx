import { useState, useEffect } from 'react';
import { ClientMessage, GameMode, Player, ServerMessage, TEAM_COLORS } from '../gameTypes';

interface Props {
  roomCode: string;
  playerId: string;
  myColor: string;
  hostId: string;
  players: Player[];
  mode: GameMode;
  onPlayersChange: (players: Player[]) => void;
  onModeChange: (mode: GameMode, players: Player[]) => void;
  onHostChange: (hostId: string) => void;
  onGameStart: (players: Player[], mode: GameMode) => void;
  onLeave: () => void;
  send: (msg: ClientMessage) => void;
  onMessage: (handler: (msg: ServerMessage) => void) => () => void;
}

const MIN_PLAYERS = 5;

export function LobbyScreen({
  roomCode, playerId, hostId, players, mode,
  onPlayersChange, onModeChange, onHostChange, onGameStart, onLeave,
  send, onMessage,
}: Props) {
  const [howToOpen, setHowToOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isHost = playerId === hostId;

  useEffect(() => {
    return onMessage(msg => {
      if (msg.type === 'playerJoined' || msg.type === 'playerLeft' || msg.type === 'playerKicked') {
        onPlayersChange(msg.players);
      }
      if (msg.type === 'modeChanged') {
        onModeChange(msg.mode, msg.players);
      }
      if (msg.type === 'teamChanged') {
        onPlayersChange(msg.players);
      }
      if (msg.type === 'hostChanged') {
        onHostChange(msg.hostId);
      }
      if (msg.type === 'kicked') {
        onLeave();
      }
      if (msg.type === 'gameStarted') {
        onGameStart(msg.players, msg.mode);
      }
    });
  }, [onMessage, onPlayersChange, onModeChange, onHostChange, onGameStart, onLeave]);

  function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}?code=${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function getPlayerColor(p: Player): string {
    if (mode === 'teams' && p.teamId !== null) return TEAM_COLORS[p.teamId];
    return p.color;
  }

  const myPlayer = players.find(p => p.id === playerId);
  const myTeamId = myPlayer?.teamId ?? null;

  const team0 = players.filter(p => p.teamId === 0);
  const team1 = players.filter(p => p.teamId === 1);
  const unassigned = players.filter(p => p.teamId === null);

  return (
    <div className="min-h-screen bg-stone-900 text-orange-100 p-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black text-orange-400 tracking-widest">TRAKOONS</h1>
          <button
            onClick={onLeave}
            className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
          >
            Leave
          </button>
        </div>

        {/* Room code */}
        <div className="bg-stone-800 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Room Code</p>
            <p className="text-3xl font-black tracking-[0.3em] text-orange-400">{roomCode}</p>
          </div>
          <button
            onClick={copyLink}
            className="px-4 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-sm font-semibold transition-colors"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Mode selector (host only) */}
        {isHost && (
          <div className="mb-4">
            <p className="text-stone-400 text-xs uppercase tracking-widest mb-2">Game Mode</p>
            <div className="flex rounded-lg overflow-hidden border border-stone-700">
              <button
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${mode === 'ffa' ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}
                onClick={() => send({ type: 'setMode', mode: 'ffa' })}
              >
                Free for All
              </button>
              <button
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${mode === 'teams' ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}
                onClick={() => send({ type: 'setMode', mode: 'teams' })}
              >
                Teams
              </button>
            </div>
          </div>
        )}

        {/* Team picker (teams mode) */}
        {mode === 'teams' && (
          <div className="mb-4">
            <p className="text-stone-400 text-xs uppercase tracking-widest mb-2">Pick Your Team</p>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map(teamId => (
                <button
                  key={teamId}
                  onClick={() => send({ type: 'setTeam', teamId: teamId as 0 | 1 })}
                  style={{ borderColor: TEAM_COLORS[teamId as 0 | 1] }}
                  className={`rounded-xl p-3 border-2 text-left transition-all ${myTeamId === teamId ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
                >
                  <p className="font-bold text-sm mb-2" style={{ color: TEAM_COLORS[teamId as 0 | 1] }}>
                    {teamId === 0 ? 'Team Orange' : 'Team Blue'}
                  </p>
                  {(teamId === 0 ? team0 : team1).map(p => (
                    <p key={p.id} className="text-xs text-stone-300">
                      {p.name}{p.id === hostId ? ' 👑' : ''}{p.id === playerId ? ' (you)' : ''}
                    </p>
                  ))}
                  {(teamId === 0 ? team0 : team1).length === 0 && (
                    <p className="text-xs text-stone-600 italic">No players yet</p>
                  )}
                </button>
              ))}
            </div>
            {unassigned.length > 0 && (
              <p className="text-stone-500 text-xs mt-2">
                {unassigned.map(p => p.name).join(', ')} — pick a team
              </p>
            )}
          </div>
        )}

        {/* Player list (FFA mode) */}
        {mode === 'ffa' && (
          <div className="mb-4">
            <p className="text-stone-400 text-xs uppercase tracking-widest mb-2">
              Players ({players.length}/10)
            </p>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-stone-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPlayerColor(p) }} />
                    <span className="text-sm font-medium">
                      {p.name}
                      {p.id === hostId && <span className="ml-1 text-yellow-400 text-xs">👑</span>}
                      {p.id === playerId && <span className="ml-1 text-stone-500 text-xs">(you)</span>}
                    </span>
                  </div>
                  {isHost && p.id !== playerId && (
                    <button
                      onClick={() => send({ type: 'kickPlayer', playerId: p.id })}
                      className="text-stone-600 hover:text-red-400 text-xs transition-colors"
                      title={`Kick ${p.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How to play */}
        <div className="mb-6 border border-stone-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setHowToOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            <span>How to play</span>
            <span>{howToOpen ? '▲' : '▼'}</span>
          </button>
          {howToOpen && (
            <div className="px-4 pb-4 text-sm text-stone-400 space-y-1 border-t border-stone-700 pt-3">
              <p>🦝 Move with arrow keys. Tag assets by touching them.</p>
              <p>🏷️ Steal opponents' tags — most tags when time runs out wins.</p>
              <p>⚡ Last 10 seconds: <strong className="text-orange-400">FRENZY MODE</strong> — retag cooldown drops to 1s.</p>
              <p>🚛 Moving vehicles count as assets too.</p>
            </div>
          )}
        </div>

        {/* Start button (host only) */}
        {isHost && (
          <div>
            <button
              onClick={() => send({ type: 'startGame' })}
              disabled={players.length < MIN_PLAYERS}
              title={players.length < MIN_PLAYERS ? `Need ${MIN_PLAYERS}+ players to start` : ''}
              className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-lg tracking-wide transition-colors"
            >
              START GAME
            </button>
            {players.length < MIN_PLAYERS && (
              <p className="text-stone-500 text-xs text-center mt-2">
                Need {MIN_PLAYERS - players.length} more player{(MIN_PLAYERS - players.length) !== 1 ? 's' : ''} to start
              </p>
            )}
          </div>
        )}
        {!isHost && (
          <p className="text-stone-500 text-sm text-center">Waiting for host to start the game…</p>
        )}

      </div>
    </div>
  );
}
