import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GameRoom,
  Player,
  Plane,
  CellState,
  GRID_SIZE,
  PLANES_PER_PLAYER,
  validatePlanes,
  buildOwnGrid,
  createEmptyGrid,
  processShot,
  isDefeated,
} from '@avioane/shared';

// ─── Setup Express + Socket.io ───────────────────────────────────────────────

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── Stocaj în memorie ────────────────────────────────────────────────────────

const rooms = new Map<string, GameRoom>();
// socketId → roomCode (reverse lookup)
const socketRoomMap = new Map<string, string>();

// ─── Utilitare ────────────────────────────────────────────────────────────────

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

function makePlayer(socketId: string, nickname: string): Player {
  return {
    id: socketId,
    nickname,
    ready: false,
    planes: [],
    grid: createEmptyGrid(),
    shotsGrid: createEmptyGrid(),
  };
}

function getOpponent(room: GameRoom, socketId: string): Player | undefined {
  const opId = room.playerOrder.find(id => id !== socketId);
  return opId ? room.players[opId] : undefined;
}

function cleanupRoom(code: string) {
  const room = rooms.get(code);
  if (!room) return;
  room.playerOrder.forEach(id => socketRoomMap.delete(id));
  rooms.delete(code);
  console.log(`[Room ${code}] șters.`);
}

function countStats(shotsGrid: CellState[][]): { hits: number; misses: number; totalShots: number } {
  let hits = 0, misses = 0;
  for (const row of shotsGrid) {
    for (const cell of row) {
      if (cell === 'hit' || cell === 'dead') hits++;
      else if (cell === 'miss') misses++;
    }
  }
  return { hits, misses, totalShots: hits + misses };
}

// ─── REST health-check ────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

// ─── Socket.io handlers ───────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[+] Conectat: ${socket.id}`);

  // ── Creare cameră ──────────────────────────────────────────────────────────
  socket.on('create_room', (nickname, cb) => {
    if (!nickname?.trim()) return cb({ ok: false, error: 'Nickname invalid.' });

    const code = generateRoomCode();
    const player = makePlayer(socket.id, nickname.trim());

    const room: GameRoom = {
      code,
      phase: 'waiting',
      players: { [socket.id]: player },
      playerOrder: [socket.id],
      currentTurn: null,
      winner: null,
      createdAt: Date.now(),
    };

    rooms.set(code, room);
    socketRoomMap.set(socket.id, code);
    socket.join(code);

    console.log(`[Room ${code}] creat de ${nickname}`);
    cb({ ok: true, code, playerId: socket.id });
  });

  // ── Alăturare cameră ───────────────────────────────────────────────────────
  socket.on('join_room', ({ code, nickname }, cb) => {
    if (!nickname?.trim()) return cb({ ok: false, error: 'Nickname invalid.' });

    const room = rooms.get(code.toUpperCase());
    if (!room) return cb({ ok: false, error: 'Camera nu există.' });
    if (room.playerOrder.length >= 2) return cb({ ok: false, error: 'Camera este plină.' });
    if (room.phase !== 'waiting') return cb({ ok: false, error: 'Jocul a început deja.' });

    const player = makePlayer(socket.id, nickname.trim());
    room.players[socket.id] = player;
    room.playerOrder.push(socket.id);
    room.phase = 'setup';

    socketRoomMap.set(socket.id, code.toUpperCase());
    socket.join(code.toUpperCase());

    const host = room.players[room.playerOrder[0]];

    console.log(`[Room ${code}] ${nickname} s-a alăturat.`);

    // Anunță host-ul că a venit adversarul
    io.to(room.playerOrder[0]).emit('opponent_joined', { nickname: nickname.trim() });

    cb({ ok: true, code: code.toUpperCase(), playerId: socket.id, opponentNickname: host.nickname });
  });

  // ── Plasare avioane ────────────────────────────────────────────────────────
  socket.on('place_planes', (planes, cb) => {
    const code = socketRoomMap.get(socket.id);
    if (!code) return cb({ ok: false, error: 'Nu ești într-o cameră.' });

    const room = rooms.get(code);
    if (!room) return cb({ ok: false, error: 'Camera nu există.' });
    if (room.phase !== 'setup') return cb({ ok: false, error: 'Nu e faza de plasare.' });

    const validationError = validatePlanes(planes);
    if (validationError) return cb({ ok: false, error: validationError });

    const player = room.players[socket.id];
    player.planes = planes;
    player.grid = buildOwnGrid(planes);
    player.ready = true;

    // Anunță adversarul că ești gata
    const opponent = getOpponent(room, socket.id);
    if (opponent) {
      io.to(opponent.id).emit('opponent_ready');
    }

    // Dacă ambii sunt gata, pornim bătălia
    const allReady = room.playerOrder.every(id => room.players[id].ready);
    if (allReady) {
      room.phase = 'battle';
      // Primul jucător din cameră începe
      room.currentTurn = room.playerOrder[0];

      room.playerOrder.forEach(id => {
        io.to(id).emit('game_start', { yourTurn: id === room.currentTurn });
      });
      console.log(`[Room ${code}] Bătălia a început! Rândul: ${room.players[room.currentTurn].nickname}`);
    }

    cb({ ok: true });
  });

  // ── Lovitură ───────────────────────────────────────────────────────────────
  socket.on('shoot', ({ row, col }, cb) => {
    const code = socketRoomMap.get(socket.id);
    if (!code) return cb({ ok: false, error: 'Nu ești într-o cameră.' });

    const room = rooms.get(code);
    if (!room) return cb({ ok: false, error: 'Camera nu există.' });
    if (room.phase !== 'battle') return cb({ ok: false, error: 'Nu e faza de bătălie.' });
    if (room.currentTurn !== socket.id) return cb({ ok: false, error: 'Nu e rândul tău.' });
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return cb({ ok: false, error: 'Coordonate invalide.' });
    }

    const opponent = getOpponent(room, socket.id);
    if (!opponent) return cb({ ok: false, error: 'Adversarul s-a deconectat.' });

    // Verificăm dacă trăgătorul a mai vizat celula (nu celula adversarului — aceea
    // e marcată 'dead' pe tot avionul după MORT, blocând lovituri legitime pe corp)
    const shooter = room.players[socket.id];
    const alreadyShot = shooter.shotsGrid[row][col];
    if (alreadyShot !== 'empty') {
      return cb({ ok: false, error: 'Ai mai tras acolo.' });
    }

    // Procesăm lovitura
    const result = processShot(opponent.planes, opponent.grid, row, col);

    // Actualizăm grila de ținte a trăgătorului
    shooter.shotsGrid[row][col] = result.outcome === 'miss' ? 'miss'
      : result.outcome === 'hit' ? 'hit'
      : 'dead';

    // Dacă e dead, marcăm tot avionul pe grila de ținte
    if (result.outcome === 'dead' && result.deadPlaneCells) {
      for (const cell of result.deadPlaneCells) {
        shooter.shotsGrid[cell.row][cell.col] = 'dead';
      }
    }

    const shotPayload = {
      ok: true as const,
      row,
      col,
      result: result.outcome,
      deadPlane: result.deadPlaneCells,
    };

    // Trimitem rezultatul trăgătorului (callback + event pentru actualizarea grilei)
    cb(shotPayload);
    io.to(socket.id).emit('your_shot_result', shotPayload);

    // Trimitem lovitura adversarului (ce a primit)
    io.to(opponent.id).emit('shot_received', {
      row,
      col,
      result: result.outcome,
      deadPlane: result.deadPlaneCells,
    });

    // Verificăm dacă jocul s-a terminat
    if (isDefeated(opponent.planes, opponent.grid)) {
      room.phase = 'finished';
      room.winner = socket.id;

      const shooterStats = countStats(shooter.shotsGrid);
      const opponentStats = countStats(opponent.shotsGrid);

      room.playerOrder.forEach(id => {
        const isWinner = id === socket.id;
        io.to(id).emit('game_over', {
          winnerId: socket.id,
          winnerNickname: shooter.nickname,
          myStats: isWinner ? shooterStats : opponentStats,
        });
      });

      console.log(`[Room ${code}] Joc terminat! Câștigător: ${shooter.nickname}`);
      return;
    }

    // Schimbăm rândul
    room.currentTurn = opponent.id;
    room.playerOrder.forEach(id => {
      io.to(id).emit('turn_change', { yourTurn: id === room.currentTurn });
    });
  });

  // ── Revanșă ────────────────────────────────────────────────────────────────
  socket.on('rematch', () => {
    const code = socketRoomMap.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room || room.phase !== 'finished') return;

    const opponent = getOpponent(room, socket.id);
    const player = room.players[socket.id];

    // Resetăm jucătorul curent
    player.ready = false;
    player.planes = [];
    player.grid = createEmptyGrid();
    player.shotsGrid = createEmptyGrid();

    if (opponent) {
      // Notificăm adversarul că vrem revanșă
      if (!opponent.ready) {
        // Primul care cere revanșă
        io.to(opponent.id).emit('rematch_requested');
      } else {
        // Amândoi au cerut revanșă – pornim o nouă rundă de setup
        opponent.ready = false;
        opponent.planes = [];
        opponent.grid = createEmptyGrid();
        opponent.shotsGrid = createEmptyGrid();

        room.phase = 'setup';
        room.winner = null;
        room.currentTurn = null;

        // Schimbăm ordinea: cel care a pierdut începe acum
        room.playerOrder.reverse();

        room.playerOrder.forEach(id => {
          io.to(id).emit('rematch_start', { yourTurn: false });
        });
        console.log(`[Room ${code}] Revanșă pornită.`);
      }
    }
  });

  // ── Plecare voluntară ──────────────────────────────────────────────────────
  socket.on('leave_room', () => {
    handleLeave(socket.id);
  });

  // ── Deconectare ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] Deconectat: ${socket.id}`);
    handleLeave(socket.id);
  });

  // ─────────────────────────────────────────────────────────────────────────

  function handleLeave(socketId: string) {
    const code = socketRoomMap.get(socketId);
    if (!code) return;

    const room = rooms.get(code);
    if (!room) return;

    const opponent = getOpponent(room, socketId);

    if (opponent) {
      io.to(opponent.id).emit('opponent_disconnected');
      // Lăsăm camera în stare de așteptare pentru câteva secunde, apoi o ștergem
      room.phase = 'waiting';
      setTimeout(() => {
        // Dacă adversarul nu a reconnectat (camera e tot în stare waiting cu 1 jucător)
        const r = rooms.get(code);
        if (r && r.playerOrder.length === 1) {
          cleanupRoom(code);
        } else if (r) {
          cleanupRoom(code); // oricum ștergem — no reconnect logic
        }
      }, 5000);
    } else {
      // Ultimul jucător a ieșit
      cleanupRoom(code);
    }

    delete room.players[socketId];
    room.playerOrder = room.playerOrder.filter(id => id !== socketId);
    socketRoomMap.delete(socketId);
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🛩️  Serverul Avioane rulează pe http://localhost:${PORT}`);
});
