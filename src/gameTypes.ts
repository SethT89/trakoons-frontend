export type GameMode = 'ffa' | 'teams';
export type GamePhase = 'home' | 'lobby' | 'countdown' | 'playing' | 'results';

export const TEAM_COLORS: Record<0 | 1, string> = {
  0: '#FF6B35',
  1: '#4CC9F0',
};

export interface Player {
  id: string;
  name: string;
  color: string;
  teamId: 0 | 1 | null;
  isBot: boolean;
}

export type ClientMessage =
  | { type: 'createRoom'; name: string }
  | { type: 'joinRoom';   name: string; code: string }
  | { type: 'setMode';    mode: GameMode }
  | { type: 'setTeam';    teamId: 0 | 1 }
  | { type: 'kickPlayer'; playerId: string }
  | { type: 'addBot' }
  | { type: 'removeBot'; botId: string }
  | { type: 'startGame' };

export type ServerMessage =
  | { type: 'roomCreated'; roomCode: string; playerId: string; color: string; mode: GameMode; hostId: string; players: Player[] }
  | { type: 'roomJoined';  roomCode: string; playerId: string; color: string; mode: GameMode; hostId: string; players: Player[] }
  | { type: 'playerJoined';   players: Player[] }
  | { type: 'playerLeft';     players: Player[] }
  | { type: 'modeChanged';    mode: GameMode; players: Player[] }
  | { type: 'teamChanged';    players: Player[] }
  | { type: 'playerKicked';   kickedPlayerId: string; players: Player[] }
  | { type: 'kicked' }
  | { type: 'hostChanged';    hostId: string }
  | { type: 'countdown';      count: number }
  | { type: 'gameStarted';    players: Player[]; mode: GameMode }
  | { type: 'error';          message: string };
