import { useEffect, useRef } from 'react';

export function useGameInput() {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS'].includes(e.code)) {
        e.preventDefault(); // stop page scrolling while playing
      }
      keys.current.add(e.code);
    };
    const up   = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, []);

  function getDirection(): { dx: number; dy: number } {
    let dx = 0, dy = 0;
    if (keys.current.has('ArrowLeft')  || keys.current.has('KeyA')) dx -= 1;
    if (keys.current.has('ArrowRight') || keys.current.has('KeyD')) dx += 1;
    if (keys.current.has('ArrowUp')    || keys.current.has('KeyW')) dy -= 1;
    if (keys.current.has('ArrowDown')  || keys.current.has('KeyS')) dy += 1;
    if (dx !== 0 && dy !== 0) {
      const len = Math.SQRT2;
      dx /= len;
      dy /= len;
    }
    return { dx, dy };
  }

  return { getDirection };
}
