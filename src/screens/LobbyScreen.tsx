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

const MIN_PLAYERS = 2;

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
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function getPlayerColor(p: Player): string {
    if (mode === 'teams' && p.teamId !== null) return TEAM_COLORS[p.teamId];
    return p.color;
  }


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
            {copied ? 'Copied!' : 'Copy Code'}
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

        {/* Teams mode — unified player list with per-row team toggle */}
        {mode === 'teams' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-stone-400 text-xs uppercase tracking-widest">
                Players ({players.length}/10)
              </p>
              {isHost && players.length < 10 && (
                <button
                  onClick={() => send({ type: 'addBot' })}
                  className="text-xs text-stone-400 hover:text-orange-400 transition-colors"
                >
                  + Add Bot
                </button>
              )}
            </div>
            <div className="space-y-2">
              {players.map(p => {
                const canToggleTeam = p.id === playerId || (isHost && p.isBot);
                return (
                  <div key={p.id} className="flex items-center justify-between bg-stone-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.teamId !== null ? TEAM_COLORS[p.teamId] : '#57534e' }} />
                      <span className="text-sm font-medium">
                        {p.name}
                        {p.isBot && <span className="ml-1 text-stone-500 text-xs">[BOT]</span>}
                        {p.id === hostId && <span className="ml-1 text-yellow-400 text-xs">👑</span>}
                        {p.id === playerId && <span className="ml-1 text-stone-500 text-xs">(you)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {canToggleTeam && (
                        <div className="flex rounded overflow-hidden border border-stone-600 text-xs font-semibold">
                          <button
                            onClick={() => p.isBot
                              ? send({ type: 'setBotTeam', botId: p.id, teamId: 0 })
                              : send({ type: 'setTeam', teamId: 0 })
                            }
                            className={`px-2 py-1 transition-colors ${p.teamId === 0 ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
                            style={p.teamId === 0 ? { backgroundColor: TEAM_COLORS[0] } : {}}
                          >
                            ORG
                          </button>
                          <button
                            onClick={() => p.isBot
                              ? send({ type: 'setBotTeam', botId: p.id, teamId: 1 })
                              : send({ type: 'setTeam', teamId: 1 })
                            }
                            className={`px-2 py-1 transition-colors ${p.teamId === 1 ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
                            style={p.teamId === 1 ? { backgroundColor: TEAM_COLORS[1] } : {}}
                          >
                            BLU
                          </button>
                        </div>
                      )}
                      {p.teamId === null && !canToggleTeam && (
                        <span className="text-stone-600 text-xs">no team</span>
                      )}
                      {isHost && p.id !== playerId && (
                        <button
                          onClick={() => p.isBot
                            ? send({ type: 'removeBot', botId: p.id })
                            : send({ type: 'kickPlayer', playerId: p.id })
                          }
                          className="text-stone-600 hover:text-red-400 text-xs transition-colors ml-1"
                          title={p.isBot ? `Remove ${p.name}` : `Kick ${p.name}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Player list (FFA mode) */}
        {mode === 'ffa' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-stone-400 text-xs uppercase tracking-widest">
                Players ({players.length}/10)
              </p>
              {isHost && players.length < 10 && (
                <button
                  onClick={() => send({ type: 'addBot' })}
                  className="text-xs text-stone-400 hover:text-orange-400 transition-colors"
                >
                  + Add Bot
                </button>
              )}
            </div>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-stone-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPlayerColor(p) }} />
                    <span className="text-sm font-medium">
                      {p.name}
                      {p.isBot && <span className="ml-1 text-stone-500 text-xs">[BOT]</span>}
                      {p.id === hostId && <span className="ml-1 text-yellow-400 text-xs">👑</span>}
                      {p.id === playerId && <span className="ml-1 text-stone-500 text-xs">(you)</span>}
                    </span>
                  </div>
                  {isHost && p.id !== playerId && (
                    <button
                      onClick={() => p.isBot
                        ? send({ type: 'removeBot', botId: p.id })
                        : send({ type: 'kickPlayer', playerId: p.id })
                      }
                      className="text-stone-600 hover:text-red-400 text-xs transition-colors"
                      title={p.isBot ? `Remove ${p.name}` : `Kick ${p.name}`}
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
