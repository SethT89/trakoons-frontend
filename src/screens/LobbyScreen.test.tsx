import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LobbyScreen } from './LobbyScreen';
import { Player } from '../gameTypes';

const mockSend = vi.fn();
const mockOnMessage = vi.fn(() => () => {});
const mockOnPlayersChange = vi.fn();
const mockOnModeChange = vi.fn();
const mockOnHostChange = vi.fn();
const mockOnGameStart = vi.fn();
const mockOnLeave = vi.fn();

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i + 1}`,
    color: '#FF6B35',
    teamId: null,
    isBot: false,
  }));
}

const baseProps = {
  roomCode: 'ABCD',
  playerId: 'player-0',
  myColor: '#FF6B35',
  hostId: 'player-0',
  mode: 'ffa' as const,
  onPlayersChange: mockOnPlayersChange,
  onModeChange: mockOnModeChange,
  onHostChange: mockOnHostChange,
  onGameStart: mockOnGameStart,
  onLeave: mockOnLeave,
  send: mockSend,
  onMessage: mockOnMessage,
};

describe('LobbyScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the room code', () => {
    render(<LobbyScreen {...baseProps} players={makePlayers(1)} />);
    expect(screen.getByText('ABCD')).toBeInTheDocument();
  });

  it('shows START GAME button when user is host', () => {
    render(<LobbyScreen {...baseProps} players={makePlayers(1)} />);
    expect(screen.getByRole('button', { name: 'START GAME' })).toBeInTheDocument();
  });

  it('hides START GAME button for non-host', () => {
    render(<LobbyScreen {...baseProps} playerId="player-99" players={makePlayers(2)} />);
    expect(screen.queryByRole('button', { name: 'START GAME' })).not.toBeInTheDocument();
  });

  it('disables START GAME when fewer than 2 players', () => {
    render(<LobbyScreen {...baseProps} players={makePlayers(1)} />);
    expect(screen.getByRole('button', { name: 'START GAME' })).toBeDisabled();
  });

  it('enables START GAME when 2+ players', () => {
    render(<LobbyScreen {...baseProps} players={makePlayers(2)} />);
    expect(screen.getByRole('button', { name: 'START GAME' })).not.toBeDisabled();
  });

  it('shows mode selector toggle when host', () => {
    render(<LobbyScreen {...baseProps} players={makePlayers(1)} />);
    expect(screen.getByRole('button', { name: 'Free for All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Teams' })).toBeInTheDocument();
  });

  it('hides mode selector for non-host', () => {
    render(<LobbyScreen {...baseProps} playerId="player-99" players={makePlayers(2)} />);
    expect(screen.queryByRole('button', { name: 'Free for All' })).not.toBeInTheDocument();
  });

  it('shows kick buttons on other players for host', () => {
    const players = makePlayers(2);
    render(<LobbyScreen {...baseProps} players={players} />);
    const kickBtns = screen.getAllByTitle(/Kick/);
    expect(kickBtns).toHaveLength(1);
  });
});
