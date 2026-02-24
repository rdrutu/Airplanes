'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '@/lib/socket';
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

  const socket = getSocket();

  async function handleCreate() {
    if (!nickname.trim()) return setErrorMsg('Introdu un nickname.');
    setLoading(true);
    setErrorMsg('');

    if (!socket.connected) socket.connect();

    socket.emit('create_room', nickname.trim(), (res) => {
      setLoading(false);
      if (!res.ok) return setErrorMsg(res.error);
      setCreatedCode(res.code);
      dispatch({ type: 'ROOM_CREATED', code: res.code, playerId: res.playerId, nickname: nickname.trim() });
    });
  }

  async function handleJoin() {
    if (!nickname.trim()) return setErrorMsg('Introdu un nickname.');
    if (!roomCode.trim()) return setErrorMsg('Introdu codul camerei.');
    setLoading(true);
    setErrorMsg('');

    if (!socket.connected) socket.connect();

    socket.emit('join_room', { code: roomCode.trim().toUpperCase(), nickname: nickname.trim() }, (res) => {
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
  }

  function copyCode() {
    navigator.clipboard.writeText(createdCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <button
          className="text-xs text-slate-400 hover:text-cyan-400 transition-colors px-3 py-1 rounded border border-navy-600 hover:border-cyan-400/30"
          onClick={() => dispatch({ type: 'SET_LANG', lang: state.lang === 'ro' ? 'en' : 'ro' })}
        >
          {state.lang === 'ro' ? '🇬🇧 EN' : '🇷🇴 RO'}
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-400/10 border border-cyan-400/20">
            <span className="text-cyan-400 font-black text-3xl tracking-tighter">AVN</span>
          </div>
        </div>
        <h1 className="text-5xl font-bold text-cyan-400 tracking-tight mb-2">
          {t('homeTitle')}
        </h1>
        <p className="text-slate-400 text-base">{t('homeSubtitle')}</p>
        <p className="text-slate-600 text-sm mt-1 italic">{t('homeTagline')}</p>
      </motion.div>

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-panel p-8 w-full max-w-md"
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
            <button className="text-slate-400 hover:text-cyan-400 text-sm text-left transition-colors" onClick={() => { setMode('menu'); setErrorMsg(''); setCreatedCode(''); }}>
              {t('back')}
            </button>
            <h2 className="text-cyan-400 font-bold text-xl">{t('createRoom')}</h2>
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

            {/* Cameră creată – așteptăm adversarul */}
            {createdCode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-4"
              >
                <div className="text-center py-4">
                  <p className="text-slate-400 text-sm mb-2">{t('sharecode')}</p>
                  <div className="flex items-center gap-3 justify-center">
                    <span className="text-4xl font-bold text-cyan-400 tracking-[0.3em]">
                      {createdCode}
                    </span>
                    <button
                      className="text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border border-navy-600 hover:border-cyan-400/30 text-xs"
                      onClick={copyCode}
                    >
                      {copied ? '✓' : '⧉'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                  </span>
                  {state.opponentNickname ? (
                    <span className="text-cyan-400">
                      {state.opponentNickname} s-a alăturat!
                    </span>
                  ) : (
                    t('waitingForOpponent')
                  )}
                </div>
              </motion.div>
            )}

            {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
          </div>
        )}

        {/* ── Alăturare cameră ── */}
        {mode === 'join' && (
          <div className="flex flex-col gap-4">
            <button className="text-slate-400 hover:text-cyan-400 text-sm text-left transition-colors" onClick={() => { setMode('menu'); setErrorMsg(''); }}>
              {t('back')}
            </button>
            <h2 className="text-cyan-400 font-bold text-xl">{t('joinRoom')}</h2>
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

      {/* Game rules teaser */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-center text-slate-600 text-xs max-w-sm"
      >
        <p><span className="text-amber-400 font-bold">x</span> Lovești corpul → „Lovit!"</p>
        <p><span className="text-red-400 font-bold">x</span> Lovești capul → <span className="text-red-400 font-bold">„MORT!"</span></p>
        <p className="mt-1">Fiecare jucător are 3 avioane. Distruge-le pe toate primul.</p>
      </motion.div>
    </div>
  );
}
