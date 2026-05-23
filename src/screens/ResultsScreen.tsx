import { GameMode, GameOverPayload, TEAM_COLORS } from '../gameTypes';

interface Props {
  gameOver: GameOverPayload | null;
  mode: GameMode;
  myPlayerId: string;
  onBackToLobby: () => void;
  onLeave: () => void;
}

export function ResultsScreen({ gameOver, mode, myPlayerId, onBackToLobby, onLeave }: Props) {
  if (!gameOver) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-stone-400">
        Loading results…
      </div>
    );
  }

  const isTeams = mode === 'teams';
  const winnerColor = isTeams
    ? TEAM_COLORS[Number(gameOver.winner) as 0 | 1]
    : gameOver.scores.find(s => s.id === gameOver.winner)?.color ?? '#ffffff';

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center gap-6 px-4">
      {/* Winner banner */}
      <div className="text-center">
        <p className="text-stone-400 text-sm uppercase tracking-widest mb-1">Winner</p>
        <p className="text-4xl font-black" style={{ color: winnerColor }}>
          {gameOver.winnerLabel}
        </p>
        {isTeams && gameOver.teamScores && (
          <p className="text-stone-400 text-sm mt-1">
            <span style={{ color: TEAM_COLORS[0] }}>ORG {gameOver.teamScores[0]}</span>
            {' — '}
            <span style={{ color: TEAM_COLORS[1] }}>BLU {gameOver.teamScores[1]}</span>
          </p>
        )}
      </div>

      {/* Scoreboard */}
      <div className="w-full max-w-sm space-y-1">
        {gameOver.scores.map((score, i) => {
          const isMe = score.id === myPlayerId;
          return (
            <div
              key={score.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isMe ? 'bg-stone-700' : 'bg-stone-800'}`}
            >
              <span className="text-stone-500 text-sm w-4 text-right">{i + 1}</span>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: isTeams && score.teamId !== null ? TEAM_COLORS[score.teamId as 0 | 1] : score.color }} />
              <span className={`flex-1 text-sm ${isMe ? 'text-yellow-300 font-bold' : 'text-stone-200'}`}>
                {score.name}
              </span>
              <span className={`text-sm font-bold ${isMe ? 'text-yellow-300' : 'text-white'}`}>
                {score.assetCount}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBackToLobby}
          className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-lg transition-colors"
        >
          Back to Lobby
        </button>
        <button
          onClick={onLeave}
          className="px-6 py-2 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-lg transition-colors"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
