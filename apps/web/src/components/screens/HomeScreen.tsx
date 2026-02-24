'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSocket, connectAndRun } from '@/lib/socket';
import { useGame } from '@/context/GameContext';
import { useTranslation } from '@/lib/i18n';

export default function HomeScreen() {
  const { state, dispatch } = useGame();
  const t = useTranslation(state.lang);

  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [copied, setCopied] = useState(false);

  function handleCreate() {
    if (!nickname.trim()) return setErrorMsg('Introdu un nickname.');
    setLoading(true);
    setErrorMsg('');

    connectAndRun(s => {
      s.emit('create_room', nickname.trim(), (res) => {
        setLoading(false);
        if (!res.ok) return setErrorMsg(res.error);
        setCreatedCode(res.code);
        dispatch({ type: 'ROOM_CREATED', code: res.code, playerId: res.playerId, nickname: nickname.trim() });
      });
    });
  }

  function handleJoin() {
    if (!nickname.trim()) return setErrorMsg('Introdu un nickname.');
    if (!roomCode.trim()) return setErrorMsg('Introdu codul camerei.');
    setLoading(true);
    setErrorMsg('');

    connectAndRun(s => {
      s.emit('join_room', { code: roomCode.trim().toUpperCase(), nickname: nickname.trim() }, (res) => {
        setLoading(false);
        if (!res.ok) return setErrorMsg(res.error);
        dispatch({
          type: 'ROOM_JOINED',
          code: res.code,
          playerId: res.playerId,
          nickname: nickname.trim(),
          opponentNickname: res.opponentNickname,
        });
      });
    });
  }

  function copyCode() {
    navigator.clipboard.writeText(createdCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12">

      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <button
          className="text-xs transition-colors px-3 py-1 rounded"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-panel-border)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          onClick={() => dispatch({ type: 'SET_LANG', lang: state.lang === 'ro' ? 'en' : 'ro' })}
        >
          {state.lang === 'ro' ? 'EN' : 'RO'}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        {/* Logo / Title */}
        <div className="mb-4 select-none">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl" style={{ background: 'var(--cell-head-bg)', border: '1px solid var(--bg-panel-border)' }}>
            <span className="font-black text-2xl sm:text-3xl tracking-tighter" style={{ color: 'var(--text-accent)' }}>AVN</span>
          </div>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-accent)' }}>
          {t('homeTitle')}
        </h1>
        <p className="text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>{t('homeSubtitle')}</p>
        <p className="text-xs sm:text-sm mt-1 italic" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{t('homeTagline')}</p>
      </motion.div>

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-panel p-5 sm:p-8 w-full max-w-md"
      >

        {/* ── Meniu principal ── */}
        {mode === 'menu' && (
          <div className="flex flex-col gap-4">
            <button className="btn-primary text-lg py-4" onClick={() => setMode('create')}>
              🛫  {t('createRoom')}
            </button>
            <button className="btn-secondary text-lg py-4" onClick={() => setMode('join')}>
              {t('joinRoom')}
            </button>
          </div>
        )}

        {/* ── Creare cameră ── */}
        {mode === 'create' && (
          <div className="flex flex-col gap-4">
            <button
              className="text-sm text-left transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              onClick={() => { setMode('menu'); setErrorMsg(''); setCreatedCode(''); }}
            >
              {t('back')}
            </button>
            <h2 className="font-bold text-xl" style={{ color: 'var(--text-accent)' }}>{t('createRoom')}</h2>
            <input
              className="input-field"
              placeholder={t('enterNickname')}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              onKeyDown={e => e.key === 'Enter' && !createdCode && handleCreate()}
            />
            {!createdCode && (
              <button className="btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? t('connecting') : t('createRoom')}
              </button>
            )}

          {createdCode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-4"
              >
                <div className="text-center py-4">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{t('sharecode')}</p>
                  <div className="flex items-center gap-3 justify-center">
                    <span className="text-4xl font-bold tracking-[0.3em]" style={{ color: 'var(--text-accent)' }}>
                      {createdCode}
                    </span>
                    <button
                      className="transition-colors px-2 py-1 rounded text-xs"
                      style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-panel-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-accent)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      onClick={copyCode}
                    >
                      {copied ? '✓' : '⧉'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--text-accent)' }}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--text-accent)' }}></span>
                  </span>
                  {state.opponentNickname ? (
                    <span style={{ color: 'var(--text-accent)' }}>
                      {state.opponentNickname} s-a alăturat!
                    </span>
                  ) : (
                    t('waitingForOpponent')
                  )}
                </div>

                {/* Cancel waiting */}
                <button
                  className="btn-secondary text-sm py-2"
                  onClick={() => {
                    getSocket().emit('leave_room');
                    getSocket().disconnect();
                    dispatch({ type: 'RESET' });
                    setCreatedCode('');
                    setMode('menu');
                  }}
                >
                  Anulează aşteptarea
                </button>
              </motion.div>
            )}

            {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
          </div>
        )}

        {/* ── Alăturare cameră ── */}
        {mode === 'join' && (
          <div className="flex flex-col gap-4">
            <button
              className="text-sm text-left transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              onClick={() => { setMode('menu'); setErrorMsg(''); }}
            >
              {t('back')}
            </button>
            <h2 className="font-bold text-xl" style={{ color: 'var(--text-accent)' }}>{t('joinRoom')}</h2>
            <input
              className="input-field"
              placeholder={t('enterNickname')}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
            />
            <input
              className="input-field uppercase tracking-widest text-center text-xl font-bold"
              placeholder={t('enterCode')}
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button className="btn-primary" onClick={handleJoin} disabled={loading}>
              {loading ? t('connecting') : t('join')}
            </button>
            {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
          </div>
        )}

      </motion.div>

        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-center text-xs max-w-sm"
        style={{ color: 'var(--text-muted)', opacity: 0.7 }}
      >
        <p><span style={{ color: 'var(--ind-hit)', fontWeight: 700 }}>X</span> Lovești corpul → „Lovit!”</p>
        <p><span style={{ color: 'var(--ind-dead)', fontWeight: 700 }}>X</span> Lovești capul → <span style={{ color: 'var(--ind-dead)', fontWeight: 700 }}>„MORT!”</span></p>
        <p className="mt-1">Fiecare jucător are 3 avioane. Distruge-le pe toate primul.</p>
      </motion.div>
    </div>
  );
}
