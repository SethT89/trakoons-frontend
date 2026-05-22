import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, afterEach } from 'vitest';
import { useGameInput } from './useGameInput';

afterEach(() => {
  // Release all keys between tests
  ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS'].forEach(code => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  });
});

describe('useGameInput', () => {
  test('returns zero direction when no keys held', () => {
    const { result } = renderHook(() => useGameInput());
    const { dx, dy } = result.current.getDirection();
    expect(dx).toBe(0);
    expect(dy).toBe(0);
  });

  test('returns dx=1 for ArrowRight', () => {
    const { result } = renderHook(() => useGameInput());
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' })); });
    expect(result.current.getDirection().dx).toBe(1);
  });

  test('returns dx=-1 for KeyA', () => {
    const { result } = renderHook(() => useGameInput());
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' })); });
    expect(result.current.getDirection().dx).toBe(-1);
  });

  test('returns dy=-1 for ArrowUp', () => {
    const { result } = renderHook(() => useGameInput());
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' })); });
    expect(result.current.getDirection().dy).toBe(-1);
  });

  test('returns dy=1 for KeyS', () => {
    const { result } = renderHook(() => useGameInput());
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' })); });
    expect(result.current.getDirection().dy).toBe(1);
  });

  test('normalizes diagonal to length 1', () => {
    const { result } = renderHook(() => useGameInput());
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
    });
    const { dx, dy } = result.current.getDirection();
    expect(Math.sqrt(dx * dx + dy * dy)).toBeCloseTo(1, 5);
  });

  test('clears direction after key release', () => {
    const { result } = renderHook(() => useGameInput());
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' })); });
    act(() => { window.dispatchEvent(new KeyboardEvent('keyup',   { code: 'ArrowRight' })); });
    expect(result.current.getDirection().dx).toBe(0);
  });
});
