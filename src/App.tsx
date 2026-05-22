import { useState, useEffect } from 'react';
import { useGameSocket } from './useGameSocket';
import { GameMode, GamePhase, Player } from './gameTypes';
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

  // Handle countdown ticks and game start at App level so they work across all phases
  useEffect(() => {
    return onMessage(msg => {
      if (msg.type === 'countdown') {
        setCountdown(msg.count);
        setPhase('countdown');
      }
      if (msg.type === 'gameStarted') {
        setPlayers(msg.players);
        setMode(msg.mode);
        setPhase('playing');
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
    setPhase('lobby');
  }

  function handleLeave() {
    setPhase('home');
    setRoomCode('');
    setPlayerId('');
    setPlayers([]);
  }

  function handleGameStart(updatedPlayers: Player[], updatedMode: GameMode) {
    setPlayers(updatedPlayers);
    setMode(updatedMode);
    setPhase('playing');
  }

  if (phase === 'home') {
    return (
      <HomeScreen
        onRoomReady={handleRoomReady}
        send={send}
        onMessage={onMessage}
        connected={connected}
      />
    );
  }

  if (phase === 'lobby') {
    return (
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
  }

  if (phase === 'countdown') {
    return <CountdownScreen count={countdown} />;
  }

  if (phase === 'playing') {
    return <GameScreen players={players} mode={mode} myPlayerId={playerId} />;
  }

  if (phase === 'results') {
    return (
      <ResultsScreen
        players={players}
        mode={mode}
        onRematch={() => setPhase('lobby')}
        onLeave={handleLeave}
      />
    );
  }

  return null;
}
