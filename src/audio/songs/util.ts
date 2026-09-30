// Helpers for writing pattern strings.

/** Repeat a one-bar (or multi-bar) pattern n times, joined by bar lines. */
export function rep(pattern: string, n: number): string {
  return Array.from({ length: n }, () => pattern).join(' | ');
}

/** n bars of `pattern` whose last bar is replaced by `last` (drum fills, pickups). */
export function withLast(pattern: string, n: number, last: string): string {
  return n <= 1 ? last : `${rep(pattern, n - 1)} | ${last}`;
}

/** `first` bar followed by n-1 bars of `rest` (e.g. a crash on the downbeat of a section). */
export function withFirst(first: string, n: number, rest: string): string {
  return n <= 1 ? first : `${first} | ${rep(rest, n - 1)}`;
}

/** An empty bar of `steps` rests (drum lanes: no spaces needed). */
export function restBar(steps: number, drum = false): string {
  return drum ? '.'.repeat(steps) : Array.from({ length: steps }, () => '.').join(' ');
}
