import { GRID_SIZE, Orientation, Plane, PlaneCell, CellState } from './types';

// ─── Formele avionului (8 celule per avion) ───────────────────────────────────
//
//  NORD (nasul sus):         VEST (nasul stânga):
//    . H .                     . . . . H
//    L B R                     T T T . B
//    . B .                     . . . . B
//    L B R                     T T T . B
//
//  Offset-uri: (dCol, dRow) față de cap
//
//   NORTH:  nasul sus, coada jos
//   EAST:   nasul dreapta, coada stânga
//   SOUTH:  nasul jos, coada sus
//   WEST:   nasul stânga, coada dreapta

type Offset = [number, number]; // [dCol, dRow]

const NORTH_OFFSETS: Offset[] = [
  // head
  [0, 0],
  // wings row 1
  [-1, 1], [0, 1], [1, 1],
  // body
  [0, 2],
  // tail wings row 3
  [-1, 3], [0, 3], [1, 3],
];

function rotateCW(offsets: Offset[]): Offset[] {
  // Rotatie 90° in sensul acelor de ceasornic în sistemul grid (row jos):
  // (dCol, dRow) → (-dRow, dCol)
  return offsets.map(([dc, dr]) => [-dr, dc]);
}

const EAST_OFFSETS  = rotateCW(NORTH_OFFSETS);
const SOUTH_OFFSETS = rotateCW(EAST_OFFSETS);
const WEST_OFFSETS  = rotateCW(SOUTH_OFFSETS);

const OFFSETS: Record<Orientation, Offset[]> = {
  N: NORTH_OFFSETS,
  E: EAST_OFFSETS,
  S: SOUTH_OFFSETS,
  W: WEST_OFFSETS,
};

// ─── Getters ──────────────────────────────────────────────────────────────────

/** Returnează toate celulele unui avion. Prima celulă este capul. */
export function getPlaneCells(plane: Plane): PlaneCell[] {
  const offsets = OFFSETS[plane.orientation];
  return offsets.map(([dc, dr], index) => ({
    row: plane.headRow + dr,
    col: plane.headCol + dc,
    isHead: index === 0,
  }));
}

// ─── Validare ─────────────────────────────────────────────────────────────────

export function isPlaneInBounds(plane: Plane): boolean {
  return getPlaneCells(plane).every(
    ({ row, col }) => row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE
  );
}

export function doPlaneOverlap(a: Plane, b: Plane): boolean {
  const cellsA = new Set(getPlaneCells(a).map(c => `${c.row},${c.col}`));
  return getPlaneCells(b).some(c => cellsA.has(`${c.row},${c.col}`));
}

export function validatePlanes(planes: Plane[]): string | null {
  if (planes.length !== 3) return 'Trebuie să plasezi exact 3 avioane.';

  for (const plane of planes) {
    if (!isPlaneInBounds(plane)) return `Avionul ${plane.id + 1} iese din grilă.`;
  }

  for (let i = 0; i < planes.length; i++) {
    for (let j = i + 1; j < planes.length; j++) {
      if (doPlaneOverlap(planes[i], planes[j])) {
        return `Avionul ${planes[i].id + 1} și avionul ${planes[j].id + 1} se suprapun.`;
      }
    }
  }

  return null; // valid
}

// ─── Grid factory ────────────────────────────────────────────────────────────

export function createEmptyGrid(): CellState[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array<CellState>(GRID_SIZE).fill('empty')
  );
}

/** Completează un grid cu celulele avioanelor (pentru propria tablă). */
export function buildOwnGrid(planes: Plane[]): CellState[][] {
  const grid = createEmptyGrid();
  for (const plane of planes) {
    for (const cell of getPlaneCells(plane)) {
      grid[cell.row][cell.col] = cell.isHead ? 'head' : 'plane';
    }
  }
  return grid;
}

// ─── Logica lovitura ─────────────────────────────────────────────────────────

export type ShotOutcome = 'miss' | 'hit' | 'dead';

export interface ShotResult {
  outcome: ShotOutcome;
  deadPlaneCells?: PlaneCell[];
  hitPlaneId?: number;
}

/**
 * Procesează o lovitură.
 * @param planes - avioanele jucătorului care a primit lovitura
 * @param grid   - grila jucătorului (va fi mutată / modificată)
 * @param hitGrid - celulele deja lovite (pentru validare dublă)
 * @param row / col - coordonatele loviiturii
 */
export function processShot(
  planes: Plane[],
  grid: CellState[][],
  row: number,
  col: number
): ShotResult {
  const cell = grid[row][col];

  if (cell === 'miss' || cell === 'hit' || cell === 'dead') {
    // Celulă deja lovită - nu ar trebui să ajungem aici dacă serverul validează
    return { outcome: 'miss' };
  }

  if (cell === 'empty') {
    grid[row][col] = 'miss';
    return { outcome: 'miss' };
  }

  if (cell === 'plane') {
    grid[row][col] = 'hit';
    // Găsim avionul lovit
    const hitPlane = planes.find(p =>
      getPlaneCells(p).some(c => c.row === row && c.col === col)
    );
    return { outcome: 'hit', hitPlaneId: hitPlane?.id };
  }

  if (cell === 'head') {
    // MORT! – marcăm tot avionul
    const deadPlane = planes.find(p => p.headRow === row && p.headCol === col)!;
    const cells = getPlaneCells(deadPlane);
    for (const c of cells) {
      grid[c.row][c.col] = 'dead';
    }
    return { outcome: 'dead', deadPlaneCells: cells, hitPlaneId: deadPlane.id };
  }

  return { outcome: 'miss' };
}

/** Verifică dacă un jucător a pierdut (toate cele 3 capete au fost lovite). */
export function isDefeated(planes: Plane[], grid: CellState[][]): boolean {
  return planes.every(plane => grid[plane.headRow][plane.headCol] === 'dead');
}

export { OFFSETS, NORTH_OFFSETS };
