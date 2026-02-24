'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Orientation, getPlaneCells, validatePlanes, buildOwnGrid, PLANES_PER_PLAYER, GRID_SIZE, CellState } from '@avioane/shared';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/context/GameContext';
import { useTranslation } from '@/lib/i18n';
import Grid from '@/components/Grid';

const ORIENTATIONS: Orientation[] = ['N', 'E', 'S', 'W'];
const ORIENT_LABELS: Record<Orientation, string> = { N: '↑', E: '→', S: '↓', W: '←' };
const ORIENT_NAMES: Record<Orientation, string> = { N: 'Nord', E: 'Est', S: 'Sud', W: 'Vest' };
const PLANE_COLORS = ['text-cyan-400', 'text-amber-400', 'text-emerald-400'];
const PLANE_BG    = ['bg-cyan-400/20', 'bg-amber-400/20', 'bg-emerald-400/20'];
const PLANE_BORDER = ['border-cyan-400/40', 'border-amber-400/40', 'border-emerald-400/40'];

interface PlacedPlaneInfo {
  plane: Plane;
  cells: Set<string>;
  headKey: string;
}

export default function SetupScreen() {
  const { state, dispatch } = useGame();
  const t = useTranslation(state.lang);

  const [selectedPlane, setSelectedPlane] = useState(0);        // 0, 1, 2
  const [orientation, setOrientation] = useState<Orientation>('N');
  const [placedPlanes, setPlacedPlanes] = useState<PlacedPlaneInfo[]>([]);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculăm grila curentă cu avioanele plasate
  const currentGrid = useMemo((): CellState[][] => {
    const grid: CellState[][] = Array.from({ length: GRID_SIZE }, () =>
      Array<CellState>(GRID_SIZE).fill('empty')
    );
    for (const { plane } of placedPlanes) {
      const cells = getPlaneCells(plane);
      for (const c of cells) {
        grid[c.row][c.col] = c.isHead ? 'head' : 'plane';
      }
    }
    return grid;
  }, [placedPlanes]);

  // Preview hover – celulele unde ar ateriza avionul curent
  const { hoveredCells, headCells, previewValid } = useMemo(() => {
    if (!hoverCell) return { hoveredCells: new Set<string>(), headCells: new Set<string>(), previewValid: false };

    const tempPlane: Plane = {
      id: selectedPlane,
      headRow: hoverCell.row,
      headCol: hoverCell.col,
      orientation,
    };
    const cells = getPlaneCells(tempPlane);
    const occupied = new Set<string>();
    for (const { plane } of placedPlanes) {
      for (const c of getPlaneCells(plane)) occupied.add(`${c.row},${c.col}`);
    }

    const hovered = new Set<string>();
    const heads = new Set<string>();
    let valid = true;

    for (const c of cells) {
      if (c.row < 0 || c.row >= GRID_SIZE || c.col < 0 || c.col >= GRID_SIZE) {
        valid = false;
        break;
      }
      if (occupied.has(`${c.row},${c.col}`)) { valid = false; }
      const key = `${c.row},${c.col}`;
      if (c.isHead) heads.add(key);
      else hovered.add(key);
    }

    return { hoveredCells: hovered, headCells: heads, previewValid: valid };
  }, [hoverCell, selectedPlane, orientation, placedPlanes]);

  function handleCellClick(row: number, col: number) {
    if (ready) return;

    // Verificăm dacă avionul curent e deja plasat → îl ștergem
    const existing = placedPlanes.find(p => p.plane.id === selectedPlane);
    if (existing) {
      setPlacedPlanes(prev => prev.filter(p => p.plane.id !== selectedPlane));
    }

    const tempPlane: Plane = { id: selectedPlane, headRow: row, headCol: col, orientation };
    const cells = getPlaneCells(tempPlane);

    // Verificăm bounds și suprapunere cu alte avioane
    const others = placedPlanes.filter(p => p.plane.id !== selectedPlane);
    const occupiedByOthers = new Set<string>();
    for (const { plane } of others) {
      for (const c of getPlaneCells(plane)) occupiedByOthers.add(`${c.row},${c.col}`);
    }

    if (cells.some(c => c.row < 0 || c.row >= GRID_SIZE || c.col < 0 || c.col >= GRID_SIZE)) {
      setErrorMsg('Avionul iese din grilă!');
      return;
    }
    if (cells.some(c => occupiedByOthers.has(`${c.row},${c.col}`))) {
      setErrorMsg('Avioanele nu se pot suprapune!');
      return;
    }

    setErrorMsg('');
    const cellSet = new Set(cells.map(c => `${c.row},${c.col}`));
    const headKey = `${row},${col}`;
    setPlacedPlanes(prev => [
      ...prev.filter(p => p.plane.id !== selectedPlane),
      { plane: tempPlane, cells: cellSet, headKey },
    ]);

    // Auto-selectăm următorul avion neplasat
    const allIds = [0, 1, 2];
    const placed = new Set([...others.map(p => p.plane.id), selectedPlane]);
    const next = allIds.find(id => !placed.has(id));
    if (next !== undefined) setSelectedPlane(next);
  }

  function handleRotate() {
    const idx = ORIENTATIONS.indexOf(orientation);
    setOrientation(ORIENTATIONS[(idx + 1) % 4]);
  }

  function removePlane(id: number) {
    setPlacedPlanes(prev => prev.filter(p => p.plane.id !== id));
    setSelectedPlane(id);
  }

  async function handleReady() {
    if (placedPlanes.length < PLANES_PER_PLAYER) {
      return setErrorMsg(`Plasează toate cele ${PLANES_PER_PLAYER} avioane.`);
    }

    const planes = placedPlanes.map(p => p.plane);
    const validationErr = validatePlanes(planes);
    if (validationErr) return setErrorMsg(validationErr);

    setLoading(true);
    const socket = getSocket();
    socket.emit('place_planes', planes, (res) => {
      setLoading(false);
      if (!res.ok) return setErrorMsg(res.error);
      const grid = buildOwnGrid(planes);
      dispatch({ type: 'SET_MY_PLANES', planes, grid });
      setReady(true);
    });
  }

  const allPlaced = placedPlanes.length === PLANES_PER_PLAYER;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-3xl font-bold text-cyan-400">{t('setupTitle')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('setupSubtitle')}</p>
        {state.opponentNickname && (
          <p className="text-slate-500 text-xs mt-1">
            Adversar: <span className="text-slate-300">{state.opponentNickname}</span>
          </p>
        )}
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full max-w-4xl">

        {/* ── Gridul de plasare ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-4"
          onMouseLeave={() => setHoverCell(null)}
        >
          <div
            onMouseMove={e => {
              // calculăm celula din poziția mousului
              // Aceasta e gestionată la nivel de celulă prin onMouseEnter
            }}
          >
            <SetupGrid
              grid={currentGrid}
              hoveredCells={hoveredCells}
              headCells={headCells}
              previewValid={previewValid}
              onCellClick={handleCellClick}
              onCellHover={(r, c) => setHoverCell({ row: r, col: c })}
              disabled={ready}
            />
          </div>
        </motion.div>

        {/* ── Panoul lateral ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-4 w-full lg:w-64"
        >
          {/* Rotire + hint */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-300 text-sm font-semibold">Orientare</span>
              <button
                className="btn-secondary py-2 px-4 text-sm"
                onClick={handleRotate}
                disabled={ready}
              >
                {ORIENT_LABELS[orientation]} {ORIENT_NAMES[orientation]}
              </button>
            </div>
            <p className="text-slate-500 text-xs">{t('planeHint')}</p>
          </div>

          {/* Avioanele */}
          <div className="glass-panel p-4">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">{t('selectPlane')}</p>
            {[0, 1, 2].map(id => {
              const placed = placedPlanes.find(p => p.plane.id === id);
              const isSelected = selectedPlane === id && !ready;
              return (
                <div
                  key={id}
                  className={`flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer border transition-all duration-150 ${
                    isSelected
                      ? `${PLANE_BG[id]} ${PLANE_BORDER[id]}`
                      : 'bg-navy-900/50 border-navy-700 hover:border-navy-500'
                  }`}
                  onClick={() => !ready && setSelectedPlane(id)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${PLANE_COLORS[id]}`}>A{id + 1}</span>
                    <span className="text-slate-300 text-sm">
                      {t('plane')} {id + 1}
                    </span>
                  </div>
                  {placed ? (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 text-xs">✓ {ORIENT_NAMES[placed.plane.orientation]}</span>
                      {!ready && (
                        <button
                          className="text-slate-500 hover:text-red-400 text-xs transition-colors"
                          onClick={e => { e.stopPropagation(); removePlane(id); }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-600 text-xs">neplasat</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Status adversar */}
          <div className="glass-panel p-4 text-sm">
            {state.opponentReady
              ? <p className="text-emerald-400">✓ {t('opponentReady')}</p>
              : <p className="text-slate-500">{t('waitingOpponentSetup')}</p>
            }
          </div>

          {/* Erori */}
          <AnimatePresence>
            {errorMsg && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-sm glass-panel p-3"
              >
                {errorMsg}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Buton Gata */}
          {!ready ? (
            <button
              className="btn-primary py-4"
              onClick={handleReady}
              disabled={!allPlaced || loading}
            >
              {loading ? t('connecting') : t('ready')}
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-4 text-center"
            >
              <div className="flex items-center gap-2 justify-center text-cyan-400 text-sm mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                Ești gata! Aștepți adversarul...
              </div>
              {state.opponentNickname && !state.opponentReady && (
                <p className="text-slate-500 text-xs">{state.opponentNickname} plasează avioanele...</p>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Room code reminder */}
      {state.roomCode && !state.opponentNickname && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <p className="text-slate-500 text-sm">Codul camerei:</p>
          <p className="text-cyan-400 font-bold text-2xl tracking-widest">{state.roomCode}</p>
        </motion.div>
      )}
    </div>
  );
}

// ─── SetupGrid – Grid specializat cu hover tracking ────────────────────────────

interface SetupGridProps {
  grid: CellState[][];
  hoveredCells: Set<string>;
  headCells: Set<string>;
  previewValid: boolean;
  onCellClick: (row: number, col: number) => void;
  onCellHover: (row: number, col: number) => void;
  disabled: boolean;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function SetupGrid({ grid, hoveredCells, headCells, previewValid, onCellClick, onCellHover, disabled }: SetupGridProps) {
  return (
    <div className="select-none">
      <div className="flex mb-1 ml-7">
        {COL_LABELS.map(l => (
          <div key={l} className="w-10 h-10 flex items-center justify-center text-navy-500 text-xs font-mono font-semibold">{l}</div>
        ))}
      </div>
      {grid.map((row, rIdx) => (
        <div key={rIdx} className="flex">
          <div className="w-7 flex items-center justify-center text-navy-500 text-xs font-mono font-semibold">
            {ROW_LABELS[rIdx]}
          </div>
          {row.map((cell, cIdx) => {
            const key = `${rIdx},${cIdx}`;
            const isHovered = hoveredCells.has(key);
            const isHead = headCells.has(key);
            const isPlacedHead = cell === 'head';
            const isPlacedBody = cell === 'plane';

            return (
              <div
                key={cIdx}
                className={`w-10 h-10 border rounded-sm flex items-center justify-center transition-all duration-75 cursor-crosshair ${
                  isHead
                    ? previewValid
                      ? 'bg-cyan-400/40 border-cyan-300/80'
                      : 'bg-red-500/30 border-red-400/60'
                    : isHovered
                    ? previewValid
                      ? 'bg-cyan-400/15 border-cyan-400/50'
                      : 'bg-red-500/15 border-red-400/40'
                    : isPlacedHead
                    ? 'bg-cyan-400/25 border-cyan-400/70'
                    : isPlacedBody
                    ? 'bg-navy-600/80 border-cyan-400/30'
                    : 'bg-navy-900/50 border-navy-600/30 hover:bg-navy-700/40 hover:border-navy-400/30'
                }`}
                onClick={() => !disabled && onCellClick(rIdx, cIdx)}
                onMouseEnter={() => !disabled && onCellHover(rIdx, cIdx)}
              >
                {isPlacedHead && <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
