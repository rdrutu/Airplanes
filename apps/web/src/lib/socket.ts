import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@avioane/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Conectează socket-ul dacă nu e deja conectat, apoi rulează callback-ul. */
export function connectAndRun(fn: (s: Socket<ServerToClientEvents, ClientToServerEvents>) => void) {
  const s = getSocket();
  if (s.connected) {
    fn(s);
  } else {
    s.once('connect', () => fn(s));
    s.once('connect_error', (err) => {
      console.error('Socket connect error:', err);
    });
    if (!s.active) s.connect();
  }
}
