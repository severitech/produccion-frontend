import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

let socketNotif: Socket | null = null;

export function obtenerSocketNotificaciones(): Socket {
  if (!socketNotif) {
    socketNotif = io(`${WS_URL}/notificaciones`, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socketNotif;
}
