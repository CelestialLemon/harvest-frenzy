// Master palette: Resurrect 64 (by Kerrie Lake). Every sprite should use these colors.
// Each color has a single-character key used in string-grid sprites ('.' = transparent)
// and a descriptive name usable from draw() code via C.<name> or P['<char>'].

export const P: Record<string, string> = {
  // neutrals (dark -> light)
  '0': '#2e222f', // ink       (darkest; default outline)
  '1': '#3e3546', // night
  '2': '#625565', // slate
  '3': '#966c6c', // dusty rose-brown
  '4': '#ab947a', // khaki
  '5': '#694f62', // plum gray
  '6': '#7f708a', // lavender gray
  '7': '#9babb2', // light gray
  '8': '#c7dcd0', // pale gray / snow shade
  '9': '#ffffff', // white
  // reds / oranges
  r: '#6e2727', // dark red
  R: '#b33831', // red
  e: '#ea4f36', // bright red-orange
  o: '#f57d4a', // salmon orange
  q: '#ae2334', // crimson
  Q: '#e83b3b', // bright red
  O: '#fb6b1d', // orange
  y: '#f79617', // amber
  Y: '#f9c22b', // yellow
  // browns / wood
  m: '#7a3045', // maroon
  n: '#9e4539', // brick / dark wood
  b: '#cd683d', // wood
  B: '#e6904e', // light wood
  t: '#fbb954', // tan / straw
  // olives
  d: '#4c3e24', // dark olive-brown
  D: '#676633', // olive
  l: '#a2a947', // light olive
  L: '#d5e04b', // lime
  z: '#fbff86', // pale yellow
  // greens
  f: '#165a4c', // deep green
  F: '#239063', // green
  G: '#1ebc73', // bright green
  h: '#91db69', // light green
  H: '#cddf6c', // yellow-green
  // gray-greens
  c: '#313638', // charcoal
  C: '#374e4a', // dark moss
  s: '#547e64', // moss
  S: '#92a984', // sage
  x: '#b2ba90', // pale sage
  // teals
  i: '#0b5e65', // deep teal
  I: '#0b8a8f', // teal
  j: '#0eaf9b', // aqua
  J: '#30e1b9', // mint
  v: '#8ff8e2', // pale mint
  // blues
  u: '#323353', // navy
  U: '#484a77', // indigo
  w: '#4d65b4', // blue
  W: '#4d9be6', // sky blue
  a: '#8fd3ff', // pale sky
  // purples
  p: '#45293f', // dark purple
  P: '#6b3e75', // purple
  M: '#905ea9', // violet
  N: '#a884f3', // lilac
  A: '#eaaded', // pale pink-lilac
  // pinks
  E: '#753c54', // dark rose
  T: '#a24b6f', // rose
  X: '#cf657f', // pink
  Z: '#ed8099', // light pink
  V: '#831c5d', // magenta dark
  '!': '#c32454', // magenta
  '#': '#f04f78', // hot pink
  $: '#f68181', // coral
  '%': '#fca790', // peach
  '&': '#fdcbb0', // skin / cream
};

// Named access for draw() code.
export const C = {
  ink: P['0'], night: P['1'], slate: P['2'], roseBrown: P['3'], khaki: P['4'], plumGray: P['5'],
  lavGray: P['6'], lightGray: P['7'], paleGray: P['8'], white: P['9'],
  darkRed: P.r, red: P.R, redOrange: P.e, salmon: P.o, crimson: P.q, brightRed: P.Q, orange: P.O,
  amber: P.y, yellow: P.Y,
  maroon: P.m, brick: P.n, wood: P.b, lightWood: P.B, tan: P.t,
  darkOlive: P.d, olive: P.D, lightOlive: P.l, lime: P.L, paleYellow: P.z,
  deepGreen: P.f, green: P.F, brightGreen: P.G, lightGreen: P.h, yellowGreen: P.H,
  charcoal: P.c, darkMoss: P.C, moss: P.s, sage: P.S, paleSage: P.x,
  deepTeal: P.i, teal: P.I, aqua: P.j, mint: P.J, paleMint: P.v,
  navy: P.u, indigo: P.U, blue: P.w, skyBlue: P.W, paleSky: P.a,
  darkPurple: P.p, purple: P.P, violet: P.M, lilac: P.N, palePink: P.A,
  darkRose: P.E, rose: P.T, pink: P.X, lightPink: P.Z, magentaDark: P.V, magenta: P['!'],
  hotPink: P['#'], coral: P.$, peach: P['%'], cream: P['&'],
} as const;
