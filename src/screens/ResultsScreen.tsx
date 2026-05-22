import { Player, GameMode } from '../gameTypes';

interface Props {
  players: Player[];
  mode: GameMode;
  onRematch: () => void;
  onLeave: () => void;
}

export function ResultsScreen({ onRematch, onLeave }: Props) {
  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-2xl font-bold text-orange-400">Results — Phase 3</p>
        <button onClick={onRematch} className="px-6 py-2 bg-orange-500 text-white rounded-lg font-bold">Rematch</button>
        <button onClick={onLeave} className="px-6 py-2 bg-stone-700 text-white rounded-lg font-bold ml-3">Leave</button>
      </div>
    </div>
  );
}
