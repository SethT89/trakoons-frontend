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

  const actions = (
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
  );

  if (isTeams && gameOver.teamScores) {
    const team0 = gameOver.scores.filter(s => s.teamId === 0);
    const team1 = gameOver.scores.filter(s => s.teamId === 1);

    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center gap-6 px-4">
        {/* Winner banner */}
        <div className="text-center">
          <p className="text-stone-400 text-sm uppercase tracking-widest mb-1">Winner</p>
          <p className="text-5xl font-black" style={{ color: winnerColor }}>
            {gameOver.winnerLabel}
          </p>
        </div>

        {/* Team score cards — side by side */}
        <div className="flex gap-3 w-full max-w-sm">
          {([0, 1] as const).map(teamIdx => {
            const players = teamIdx === 0 ? team0 : team1;
            const total = gameOver.teamScores![teamIdx];
            const color = TEAM_COLORS[teamIdx];
            const label = teamIdx === 0 ? 'ORG' : 'BLU';
            const isWinner = gameOver.winner === String(teamIdx);

            return (
              <div
                key={teamIdx}
                className="flex-1 rounded-xl p-3"
                style={{ background: color + '18', border: `2px solid ${isWinner ? color : color + '40'}` }}
              >
                {/* Team header */}
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
                  <span className="text-3xl font-black" style={{ color }}>{total}</span>
                </div>

                {/* Players */}
                <div className="space-y-1">
                  {players.map(p => {
                    const isMe = p.id === myPlayerId;
                    return (
                      <div key={p.id} className="flex items-center justify-between">
                        <span className={`text-xs truncate ${isMe ? 'text-yellow-300 font-bold' : 'text-stone-300'}`}>
                          {p.name}
                        </span>
                        <span className={`text-xs ml-2 shrink-0 ${isMe ? 'text-yellow-300' : 'text-stone-500'}`}>
                          {p.assetCount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {actions}
      </div>
    );
  }

  // FFA scoreboard (unchanged)
  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <p className="text-stone-400 text-sm uppercase tracking-widest mb-1">Winner</p>
        <p className="text-4xl font-black" style={{ color: winnerColor }}>
          {gameOver.winnerLabel}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-1">
        {gameOver.scores.map((score, i) => {
          const isMe = score.id === myPlayerId;
          return (
            <div
              key={score.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isMe ? 'bg-stone-700' : 'bg-stone-800'}`}
            >
              <span className="text-stone-500 text-sm w-4 text-right">{i + 1}</span>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: score.color }} />
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

      {actions}
    </div>
  );
}
