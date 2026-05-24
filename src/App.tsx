import React, { useState, useEffect } from 'react';
import { useGameSocket } from './useGameSocket';
import { GameMode, GamePhase, GameOverPayload, Player } from './gameTypes';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { CountdownScreen } from './screens/CountdownScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultsScreen } from './screens/ResultsScreen';

export default function App() {
  const { send, onMessage, connected } = useGameSocket();
  const [phase, setPhase] = useState<GamePhase>('home');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [myColor, setMyColor] = useState('');
  const [hostId, setHostId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [mode, setMode] = useState<GameMode>('ffa');
  const [countdown, setCountdown] = useState(3);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [showGetReady, setShowGetReady] = useState(false);

  // Handle countdown ticks and game start at App level so they work across all phases
  useEffect(() => {
    return onMessage(msg => {
      if (msg.type === 'getReady') {
        setShowGetReady(true);
      }
      if (msg.type === 'countdown') {
        setShowGetReady(false);
        setCountdown(msg.count);
        setPhase('countdown');
      }
      if (msg.type === 'gameStarted') {
        setPlayers(msg.players);
        setMode(msg.mode);
        setPhase('playing');
      }
      if (msg.type === 'gameOver') {
        setGameOver(msg);
        setPhase('results');
      }
    });
  }, [onMessage]);

  function handleRoomReady(args: {
    roomCode: string; playerId: string; myColor: string;
    mode: GameMode; hostId: string; players: Player[];
  }) {
    setRoomCode(args.roomCode);
    setPlayerId(args.playerId);
    setMyColor(args.myColor);
    setMode(args.mode);
    setHostId(args.hostId);
    setPlayers(args.players);
    history.pushState(null, '', '?code=' + args.roomCode);
    setPhase('lobby');
  }

  function handleLeave() {
    setPhase('home');
    setRoomCode('');
    setPlayerId('');
    setPlayers([]);
    history.pushState(null, '', '/');
  }

  function handleGameStart(updatedPlayers: Player[], updatedMode: GameMode) {
    setPlayers(updatedPlayers);
    setMode(updatedMode);
    setPhase('playing');
  }

  let screen: React.ReactNode = null;

  if (phase === 'home') {
    screen = (
      <HomeScreen
        onRoomReady={handleRoomReady}
        send={send}
        onMessage={onMessage}
        connected={connected}
      />
    );
  } else if (phase === 'lobby') {
    screen = (
      <LobbyScreen
        roomCode={roomCode}
        playerId={playerId}
        myColor={myColor}
        hostId={hostId}
        players={players}
        mode={mode}
        onPlayersChange={setPlayers}
        onModeChange={(m, p) => { setMode(m); setPlayers(p); }}
        onHostChange={setHostId}
        onGameStart={handleGameStart}
        onLeave={handleLeave}
        send={send}
        onMessage={onMessage}
      />
    );
  } else if (phase === 'countdown') {
    screen = <CountdownScreen count={countdown} />;
  } else if (phase === 'playing') {
    screen = (
      <GameScreen
        players={players}
        mode={mode}
        myPlayerId={playerId}
        send={send}
        onMessage={onMessage}
      />
    );
  } else if (phase === 'results') {
    screen = (
      <ResultsScreen
        gameOver={gameOver}
        mode={mode}
        myPlayerId={playerId}
        onBackToLobby={() => { send({ type: 'backToLobby' }); setPhase('lobby'); }}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <div className="relative">
      {screen}
      {showGetReady && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-stone-800 border border-stone-600 rounded-2xl px-12 py-10 text-center shadow-2xl">
            <p className="text-5xl font-black text-orange-400 tracking-wide mb-3">GET READY</p>
            <p className="text-stone-400 text-sm uppercase tracking-widest">The host started the game</p>
          </div>
        </div>
      )}
    </div>
  );
}
