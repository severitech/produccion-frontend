import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'https://d24b2ge9tptla9.cloudfront.net/';

let socket: Socket | null = null;

export function obtenerSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

export function desconectarSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
