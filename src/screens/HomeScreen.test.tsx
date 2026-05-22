import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeScreen } from './HomeScreen';

const mockSend = vi.fn();
const mockOnMessage = vi.fn(() => () => {});

const defaultProps = {
  onRoomReady: vi.fn(),
  send: mockSend,
  onMessage: mockOnMessage,
  connected: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('HomeScreen', () => {
  it('renders the game title', () => {
    render(<HomeScreen {...defaultProps} />);
    expect(screen.getByText('TRAKOONS')).toBeInTheDocument();
  });

  it('shows Join Room tab as active by default', () => {
    render(<HomeScreen {...defaultProps} />);
    const buttons = screen.getAllByRole('button', { name: 'Join Room' });
    const tabBtn = buttons[0];
    expect(tabBtn).toHaveClass('bg-orange-500');
  });

  it('shows room code input in Join tab', () => {
    render(<HomeScreen {...defaultProps} />);
    expect(screen.getByPlaceholderText(/room code/i)).toBeInTheDocument();
  });

  it('hides room code input in Create tab', () => {
    render(<HomeScreen {...defaultProps} />);
    const createTabBtns = screen.getAllByRole('button', { name: 'Create Room' });
    fireEvent.click(createTabBtns[0]);
    expect(screen.queryByPlaceholderText(/room code/i)).not.toBeInTheDocument();
  });

  it('shows inline error when submitting join with short code', async () => {
    render(<HomeScreen {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByPlaceholderText(/room code/i), { target: { value: 'AB' } });
    const submitBtn = screen.getAllByRole('button', { name: 'Join Room' })[1];
    fireEvent.submit(submitBtn);
    expect(await screen.findByText(/4 letters/i)).toBeInTheDocument();
  });

  it('calls send with joinRoom message on valid join submit', () => {
    render(<HomeScreen {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByPlaceholderText(/room code/i), { target: { value: 'ABCD' } });
    const submitBtn = screen.getAllByRole('button', { name: 'Join Room' })[1];
    fireEvent.submit(submitBtn);
    expect(mockSend).toHaveBeenCalledWith({ type: 'joinRoom', name: 'Alice', code: 'ABCD' });
  });

  it('calls send with createRoom message on create submit', () => {
    render(<HomeScreen {...defaultProps} />);
    const createTabBtns = screen.getAllByRole('button', { name: 'Create Room' });
    fireEvent.click(createTabBtns[0]);
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Alice' } });
    const submitBtn = screen.getAllByRole('button', { name: 'Create Room' })[1];
    fireEvent.submit(submitBtn);
    expect(mockSend).toHaveBeenCalledWith({ type: 'createRoom', name: 'Alice' });
  });

  it('disables submit button when not connected', () => {
    render(<HomeScreen {...defaultProps} connected={false} />);
    const submitBtn = screen.getAllByRole('button', { name: /join room/i })[1];
    expect(submitBtn).toBeDisabled();
  });

  it('pre-fills room code from URL ?code= param', () => {
    window.history.replaceState({}, '', '/?code=XYZA');
    render(<HomeScreen {...defaultProps} />);
    const input = screen.getByPlaceholderText(/room code/i) as HTMLInputElement;
    expect(input.value).toBe('XYZA');
  });
});
