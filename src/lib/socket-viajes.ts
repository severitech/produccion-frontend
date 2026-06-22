import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socketViajes: Socket | null = null;

export function obtenerSocketViajes(): Socket {
  if (!socketViajes) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    socketViajes = io(`${WS_URL}/viajes`, {
      transports: ['websocket'],
      autoConnect: true,
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Manejar desconexión por error de autenticación
    socketViajes.on('connect_error', (error: any) => {
      console.error('[Socket] Error de conexión:', error);
    });
  }
  return socketViajes;
}

export function reconectarSocket(): void {
  if (socketViajes) {
    socketViajes.disconnect();
    socketViajes = null;
  }
  obtenerSocketViajes();
}

export function desconectarSocketViajes() {
  if (socketViajes) {
    socketViajes.disconnect();
    socketViajes = null;
  }
}
