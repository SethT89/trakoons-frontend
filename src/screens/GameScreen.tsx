import { Player, GameMode } from '../gameTypes';

interface Props {
  players: Player[];
  mode: GameMode;
  myPlayerId: string;
}

export function GameScreen({ players, mode, myPlayerId }: Props) {
  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center">
      <div className="text-center text-stone-400">
        <p className="text-2xl font-bold text-orange-400 mb-2">Game — Phase 2</p>
        <p className="text-sm">Mode: {mode} | Players: {players.length} | You: {players.find(p => p.id === myPlayerId)?.name}</p>
      </div>
    </div>
  );
}
