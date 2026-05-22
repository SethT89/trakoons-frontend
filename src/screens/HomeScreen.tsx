import { useState, useEffect, useRef } from 'react';
import { GameMode, Player, ServerMessage } from '../gameTypes';

interface Props {
  onRoomReady: (args: {
    roomCode: string;
    playerId: string;
    myColor: string;
    mode: GameMode;
    hostId: string;
    players: Player[];
  }) => void;
  send: (msg: object) => void;
  onMessage: (handler: (msg: ServerMessage) => void) => () => void;
  connected: boolean;
}

function isMobile() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && navigator.maxTouchPoints > 0);
}

export function HomeScreen({ onRoomReady, send, onMessage, connected }: Props) {
  const urlCode = new URLSearchParams(window.location.search).get('code')?.toUpperCase() ?? null;
  const [tab, setTab] = useState<'join' | 'create'>(urlCode ? 'join' : 'join');
  const [name, setName] = useState(() => localStorage.getItem('trakoons_player_name') || '');
  const [roomCode, setRoomCode] = useState(urlCode || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Auto-focus name when arriving via shared link
  useEffect(() => {
    if (urlCode) nameRef.current?.focus();
  }, [urlCode]);

  useEffect(() => {
    return onMessage(msg => {
      if (msg.type === 'roomCreated' || msg.type === 'roomJoined') {
        setLoading(false);
        localStorage.setItem('trakoons_player_name', name.trim());
        onRoomReady({
          roomCode: msg.roomCode,
          playerId: msg.playerId,
          myColor: msg.color,
          mode: msg.mode,
          hostId: msg.hostId,
          players: msg.players,
        });
      }
      if (msg.type === 'error') {
        setLoading(false);
        setError(msg.message);
      }
    });
  }, [onMessage, onRoomReady, name]);

  if (isMobile()) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-4xl font-black text-orange-400 mb-4">TRAKOONS</h1>
          <p className="text-stone-300 text-lg">
            Desktop required — please join from a computer with arrow keys.
          </p>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Enter your name'); return; }
    if (tab === 'join') {
      const trimmedCode = roomCode.trim().toUpperCase();
      if (trimmedCode.length !== 4) { setError('Room code must be 4 letters'); return; }
      setLoading(true);
      send({ type: 'joinRoom', name: trimmedName, roomCode: trimmedCode });
    } else {
      setLoading(true);
      send({ type: 'createRoom', name: trimmedName });
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-orange-400 tracking-widest mb-2">TRAKOONS</h1>
          <p className="text-stone-400 text-sm">Tag every asset. Retag them all. 30 seconds of chaos.</p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-lg overflow-hidden border border-stone-700 mb-6">
          <button
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === 'join' ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}
            onClick={() => setTab('join')}
          >
            Join Room
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === 'create' ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}
            onClick={() => setTab('create')}
          >
            Create Room
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={nameRef}
            type="text"
            placeholder="Your name"
            value={name}
            maxLength={20}
            onChange={e => { setName(e.target.value); setError(''); }}
            className="w-full px-4 py-3 rounded-lg bg-stone-800 border border-stone-600 text-orange-100 placeholder-stone-500 focus:outline-none focus:border-orange-500"
          />
          {tab === 'join' && (
            <div>
              <input
                type="text"
                placeholder="Room code (e.g. ABCD)"
                value={roomCode}
                maxLength={4}
                onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                className="w-full px-4 py-3 rounded-lg bg-stone-800 border border-stone-600 text-orange-100 placeholder-stone-500 focus:outline-none focus:border-orange-500 uppercase tracking-widest"
              />
              {error && <p className="text-red-400 text-xs mt-1 ml-1">{error}</p>}
            </div>
          )}
          {tab === 'create' && error && (
            <p className="text-red-400 text-xs ml-1">{error}</p>
          )}
          <button
            type="submit"
            disabled={!connected || loading}
            className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition-colors"
          >
            {loading ? 'Connecting…' : tab === 'join' ? 'Join Room' : 'Create Room'}
          </button>
          {!connected && (
            <p className="text-stone-500 text-xs text-center">Connecting to server…</p>
          )}
        </form>
      </div>
    </div>
  );
}
