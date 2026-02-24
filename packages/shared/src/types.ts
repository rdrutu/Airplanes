// ─── Grid ────────────────────────────────────────────────────────────────────

export const GRID_SIZE = 8;
export const PLANES_PER_PLAYER = 3;

export type CellState =
  | 'empty'      // 0 – netins
  | 'plane'      // 1 – corp avion (nu a fost lovit)
  | 'head'       // 2 – cap avion
  | 'miss'       // Aer!
  | 'hit'        // Lovit! (corp)
  | 'dead';      // MORT! (tot avionul)

export type Orientation = 'N' | 'E' | 'S' | 'W';

// ─── Avion ───────────────────────────────────────────────────────────────────

export interface Plane {
  id: number;           // 0, 1, 2
  headRow: number;
  headCol: number;
  orientation: Orientation;
}

export interface PlaneCell {
  row: number;
  col: number;
  isHead: boolean;
}

// ─── Stările jocului ─────────────────────────────────────────────────────────

export type GamePhase = 'waiting' | 'setup' | 'battle' | 'finished';

export interface Player {
  id: string;           // socket.id
  nickname: string;
  ready: boolean;
  planes: Plane[];
  grid: CellState[][];  // propria tablă (cu avioane vizibile)
  shotsGrid: CellState[][]; // tabla de ținte (ce a tras la adversar)
}

export interface GameRoom {
  code: string;
  phase: GamePhase;
  players: Record<string, Player>;   // socketId → Player
  playerOrder: string[];              // [socketId1, socketId2]
  currentTurn: string | null;         // socketId-ul cui e rândul
  winner: string | null;
  createdAt: number;
}

// ─── Socket Events ────────────────────────────────────────────────────────────

// Client → Server
export interface ClientToServerEvents {
  create_room:  (nickname: string, cb: (res: RoomCreatedPayload | ErrorPayload) => void) => void;
  join_room:    (data: { code: string; nickname: string }, cb: (res: RoomJoinedPayload | ErrorPayload) => void) => void;
  place_planes: (planes: Plane[], cb: (res: OkPayload | ErrorPayload) => void) => void;
  shoot:        (data: { row: number; col: number }, cb: (res: ShotResultPayload | ErrorPayload) => void) => void;
  rematch:      () => void;
  leave_room:   () => void;
}

// Server → Client
export interface ServerToClientEvents {
  opponent_joined:       (payload: { nickname: string }) => void;
  opponent_ready:        () => void;
  game_start:            (payload: { yourTurn: boolean }) => void;
  shot_received:         (payload: IncomingShotPayload) => void;   // un adversar a tras în tine
  your_shot_result:      (payload: ShotResultPayload) => void;     // rezultatul loviturii tale
  turn_change:           (payload: { yourTurn: boolean }) => void;
  game_over:             (payload: GameOverPayload) => void;
  opponent_disconnected: () => void;
  rematch_requested:     () => void;
  rematch_start:         (payload: { yourTurn: boolean }) => void;
  room_state:            (payload: RoomStatePayload) => void;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface RoomCreatedPayload {
  ok: true;
  code: string;
  playerId: string;
}

export interface RoomJoinedPayload {
  ok: true;
  code: string;
  playerId: string;
  opponentNickname: string;
}

export interface OkPayload {
  ok: true;
}

export interface ErrorPayload {
  ok: false;
  error: string;
}

export interface ShotResultPayload {
  ok: true;
  row: number;
  col: number;
  result: 'miss' | 'hit' | 'dead';
  deadPlane?: PlaneCell[];  // dacă e dead, toate celulele avionului
}

export interface IncomingShotPayload {
  row: number;
  col: number;
  result: 'miss' | 'hit' | 'dead';
  deadPlane?: PlaneCell[];
}

export interface GameOverPayload {
  winnerId: string;
  winnerNickname: string;
  myStats: { hits: number; misses: number; totalShots: number };
}

export interface RoomStatePayload {
  code: string;
  phase: GamePhase;
  opponentNickname?: string;
  opponentReady: boolean;
}
