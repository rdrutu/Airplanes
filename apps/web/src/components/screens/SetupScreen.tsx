'use client';

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Orientation, getPlaneCells, validatePlanes, buildOwnGrid, PLANES_PER_PLAYER, GRID_SIZE, CellState } from '@avioane/shared';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/context/GameContext';
import { useTranslation } from '@/lib/i18n';
import { useIsMobile } from '@/lib/useIsMobile';

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

function handleLeave(dispatch: ReturnType<typeof useGame>['dispatch']) {
  getSocket().emit('leave_room');
  getSocket().disconnect();
  dispatch({ type: 'RESET' });
}

export default function SetupScreen() {
  const { state, dispatch } = useGame();
  const t = useTranslation(state.lang);
  const isMobile = useIsMobile();

  const [selectedPlane, setSelectedPlane] = useState(0);        // 0, 1, 2
  const [orientation, setOrientation] = useState<Orientation>('N');
  const [placedPlanes, setPlacedPlanes] = useState<PlacedPlaneInfo[]>([]);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  // Mobile ghost – celula "fantomă" selectată prin touch, necesită confirmare
  const [ghostCell, setGhostCell] = useState<{ row: number; col: number } | null>(null);
  const [justPlacedCells, setJustPlacedCells] = useState<Set<string>>(new Set());
  const justPlacedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Preview hover (desktop) – celulele unde ar ateriza avionul curent
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

  // Ghost preview (mobile) – aceeași logică dar din ghostCell
  const { ghostBodyCells, ghostHeadCells, ghostValid } = useMemo(() => {
    if (!ghostCell) return { ghostBodyCells: new Set<string>(), ghostHeadCells: new Set<string>(), ghostValid: false };

    const tempPlane: Plane = {
      id: selectedPlane,
      headRow: ghostCell.row,
      headCol: ghostCell.col,
      orientation,
    };
    const cells = getPlaneCells(tempPlane);
    const occupied = new Set<string>();
    for (const { plane } of placedPlanes) {
      for (const c of getPlaneCells(plane)) occupied.add(`${c.row},${c.col}`);
    }

    const body = new Set<string>();
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
      else body.add(key);
    }

    return { ghostBodyCells: body, ghostHeadCells: heads, ghostValid: valid };
  }, [ghostCell, selectedPlane, orientation, placedPlanes]);

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

    // Flash verde pentru 600ms
    setJustPlacedCells(new Set(cells.map(c => `${c.row},${c.col}`)));
    if (justPlacedTimer.current) clearTimeout(justPlacedTimer.current);
    justPlacedTimer.current = setTimeout(() => setJustPlacedCells(new Set()), 600);

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

  // Mobile: tap pe o celulă setează ghost-ul (nu plasează direct)
  function handleCellTouch(row: number, col: number) {
    if (ready) return;
    // Al doilea tap pe aceeași celulă → confirmă plasarea
    if (ghostCell && ghostCell.row === row && ghostCell.col === col) {
      handleGhostConfirm();
      return;
    }
    setGhostCell({ row, col });
    setErrorMsg('');
  }

  // Confirmă plasarea fantomei
  function handleGhostConfirm() {
    if (!ghostCell) return;
    handleCellClick(ghostCell.row, ghostCell.col);
    setGhostCell(null);
  }

  // Anulează ghost-ul
  function handleGhostCancel() {
    setGhostCell(null);
  }

  function removePlane(id: number) {
    setPlacedPlanes(prev => prev.filter(p => p.plane.id !== id));
    setSelectedPlane(id);
    setGhostCell(null);
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
    <div className="min-h-screen flex flex-col items-center justify-center px-2 sm:px-4 py-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-accent)' }}>{t('setupTitle')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t('setupSubtitle')}</p>
        {state.opponentNickname && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Adversar: <span style={{ color: 'var(--text-primary)' }}>{state.opponentNickname}</span>
          </p>
        )}
      </motion.div>

      {/* Abandon btn */}
      <button
        className="absolute top-4 right-4 text-xs px-3 py-1 rounded transition-colors"
        style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-panel-border)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--ind-miss)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        onClick={() => handleLeave(dispatch)}
      >
        Ieși ×
      </button>

      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full max-w-4xl">

        {/* ── Gridul de plasare ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-4"
          onMouseLeave={() => { setHoverCell(null); }}
        >
          <div className="flex justify-center">
            <SetupGrid
              grid={currentGrid}
              hoveredCells={hoveredCells}
              headCells={headCells}
              previewValid={previewValid}
              ghostBodyCells={ghostBodyCells}
              ghostHeadCells={ghostHeadCells}
              ghostValid={ghostValid}
              justPlacedCells={justPlacedCells}
              onCellClick={isMobile ? handleCellTouch : handleCellClick}
              onCellHover={(r, c) => setHoverCell({ row: r, col: c })}
              onCellTouch={handleCellTouch}
              disabled={ready}
            />
          </div>

          {/* ── Bara de acțiuni (apare doar pe mobile când există ghost) ── */}
          <AnimatePresence>
            {ghostCell && isMobile && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-3 flex gap-2"
              >
                <button
                  className="flex-1 py-3 rounded-xl text-base font-bold transition-colors"
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--bg-panel-border)',
                    color: 'var(--text-primary)',
                  }}
                  onTouchStart={e => { e.stopPropagation(); handleRotate(); }}
                  onClick={handleRotate}
                >
                  ↻ Rotește
                </button>
                <button
                  className="flex-1 py-3 rounded-xl text-base font-bold transition-colors"
                  style={{
                    background: ghostValid ? 'var(--cell-dead-bg)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${ghostValid ? 'var(--cell-dead-bd)' : 'rgba(239,68,68,0.5)'}`,
                    color: ghostValid ? 'var(--ind-dead)' : 'rgba(239,68,68,0.8)',
                  }}
                  disabled={!ghostValid}
                  onTouchStart={e => { e.stopPropagation(); if (ghostValid) handleGhostConfirm(); }}
                  onClick={() => { if (ghostValid) handleGhostConfirm(); }}
                >
                  ✓ Plasează
                </button>
                <button
                  className="py-3 px-4 rounded-xl text-base transition-colors"
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--bg-panel-border)',
                    color: 'var(--text-muted)',
                  }}
                  onTouchStart={e => { e.stopPropagation(); handleGhostCancel(); }}
                  onClick={handleGhostCancel}
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Orientare</span>
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
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{t('selectPlane')}</p>
            {[0, 1, 2].map(id => {
              const placed = placedPlanes.find(p => p.plane.id === id);
              const isSelected = selectedPlane === id && !ready;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer border transition-all duration-150"
                  style={{
                    background: isSelected ? 'var(--cell-head-bg)' : 'var(--cell-empty-bg)',
                    borderColor: isSelected ? 'var(--cell-head-bd)' : 'var(--cell-empty-bd)',
                  }}
                  onClick={() => !ready && (setSelectedPlane(id), setGhostCell(null))}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black" style={{ color: 'var(--text-accent)' }}>A{id + 1}</span>
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {t('plane')} {id + 1}
                    </span>
                  </div>
                  {placed ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--ind-dead)' }}>✓ {ORIENT_NAMES[placed.plane.orientation]}</span>
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
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>neplasat</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Status adversar */}
          <div className="glass-panel p-4 text-sm">
            {state.opponentReady
              ? <p style={{ color: 'var(--ind-dead)' }}>✓ {t('opponentReady')}</p>
              : <p style={{ color: 'var(--text-muted)' }}>{t('waitingOpponentSetup')}</p>
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
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{state.opponentNickname} plasează avioanele...</p>
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
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Codul camerei:</p>
          <p className="font-bold text-2xl tracking-widest" style={{ color: 'var(--text-accent)' }}>{state.roomCode}</p>
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
  ghostBodyCells: Set<string>;
  ghostHeadCells: Set<string>;
  ghostValid: boolean;
  justPlacedCells: Set<string>;
  onCellClick: (row: number, col: number) => void;
  onCellHover: (row: number, col: number) => void;
  onCellTouch: (row: number, col: number) => void;
  disabled: boolean;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function SetupGrid({ grid, hoveredCells, headCells, previewValid, ghostBodyCells, ghostHeadCells, ghostValid, justPlacedCells, onCellClick, onCellHover, onCellTouch, disabled }: SetupGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    if (!el) return;
    const r = el.dataset.row ?? el.closest<HTMLElement>('[data-row]')?.dataset.row;
    const c = el.dataset.col ?? el.closest<HTMLElement>('[data-col]')?.dataset.col;
    if (r !== undefined && c !== undefined) {
      onCellTouch(parseInt(r), parseInt(c));
    }
  }

  return (
    <div
      ref={gridRef}
      className="select-none"
      onTouchMove={handleTouchMove}
      style={{ touchAction: disabled ? 'auto' : 'none' }}
    >
      <div className="flex mb-1" style={{ marginLeft: '1.75rem' }}>
        {COL_LABELS.map(l => (
          <div key={l} className="grid-col-label" style={{ color: 'var(--text-muted)' }}>{l}</div>
        ))}
      </div>
      {grid.map((row, rIdx) => (
        <div key={rIdx} className="flex">
          <div className="grid-row-label" style={{ color: 'var(--text-muted)' }}>
            {ROW_LABELS[rIdx]}
          </div>
          {row.map((cell, cIdx) => {
            const key = `${rIdx},${cIdx}`;
            const isHovered = hoveredCells.has(key);
            const isHead = headCells.has(key);
            const isGhostBody = ghostBodyCells.has(key);
            const isGhostHead = ghostHeadCells.has(key);
            const isJustPlaced = justPlacedCells.has(key);
            const isPlacedHead = cell === 'head';
            const isPlacedBody = cell === 'plane';

            let bg = 'var(--cell-empty-bg)';
            let bd = 'var(--cell-empty-bd)';
            let opacity = 1;

            if (isGhostHead) {
              bg = ghostValid ? 'var(--cell-dead-bg)' : 'rgba(239,68,68,0.3)';
              bd = ghostValid ? 'var(--cell-dead-bd)' : 'rgba(239,68,68,0.7)';
              opacity = 0.85;
            } else if (isGhostBody) {
              bg = ghostValid ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
              bd = ghostValid ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)';
              opacity = 0.85;
            } else if (isHead) {
              bg = previewValid ? 'var(--cell-dead-bg)' : 'rgba(239,68,68,0.3)';
              bd = previewValid ? 'var(--cell-dead-bd)' : 'rgba(239,68,68,0.7)';
            } else if (isHovered) {
              bg = previewValid ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
              bd = previewValid ? 'rgba(34,197,94,0.4)'  : 'rgba(239,68,68,0.4)';
            } else if (isPlacedHead) {
              bg = isJustPlaced ? 'var(--cell-dead-bg)' : 'var(--cell-head-bg)';
              bd = isJustPlaced ? 'var(--cell-dead-bd)' : 'var(--cell-head-bd)';
            } else if (isPlacedBody) {
              bg = isJustPlaced ? 'rgba(34,197,94,0.12)' : 'var(--cell-plane-bg)';
              bd = isJustPlaced ? 'rgba(34,197,94,0.4)'  : 'var(--cell-plane-bd)';
            }

            return (
              <div
                key={cIdx}
                data-row={rIdx}
                data-col={cIdx}
                className="grid-setup-cell"
                style={{
                  background: bg,
                  border: `1px solid ${bd}`,
                  opacity,
                  cursor: disabled ? 'default' : 'crosshair',
                  position: 'relative',
                  transition: 'background 0.35s, border-color 0.35s',
                }}
                onClick={() => !disabled && onCellClick(rIdx, cIdx)}
                onMouseEnter={() => !disabled && onCellHover(rIdx, cIdx)}
                onTouchStart={e => {
                  if (disabled) return;
                  e.preventDefault();
                  onCellTouch(rIdx, cIdx);
                }}
              >
                {isPlacedHead && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--ind-head)' }} />
                )}
                {/* Iconiță ↻ pe capul fantomei */}
                {isGhostHead && !disabled && (
                  <span style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.65rem', pointerEvents: 'none',
                    color: ghostValid ? 'var(--ind-dead)' : 'rgba(239,68,68,0.9)',
                    fontWeight: 700,
                  }}>↻</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
