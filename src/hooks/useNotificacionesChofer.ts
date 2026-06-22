'use client';
import { useCallback, useEffect, useState } from 'react';
import { obtenerSocketNotificaciones } from '../lib/socket-notificaciones';
import { api } from '../services/api';

export interface NotificacionChofer {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: string;
  leida: boolean;
  creadoEn: string;
}

export function useNotificacionesChofer(usuarioId: string | number | undefined) {
  const [notificaciones, setNotificaciones] = useState<NotificacionChofer[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);

  // Carga historial desde REST
  useEffect(() => {
    if (!usuarioId) return;
    setCargando(true);
    api.get('/notificaciones', { params: { usuarioDestinoId: String(usuarioId) } })
      .then(({ data }) => {
        const lista: NotificacionChofer[] = (data as any[]).map((n: any) => ({
          id: String(n.id),
          titulo: n.title,
          cuerpo: n.body,
          tipo: n.type,
          leida: (n.receipts ?? []).some((r: any) => String(r.userId) === String(usuarioId) && r.readAt),
          creadoEn: n.createdAt,
        }));
        setNotificaciones(lista);
        setNoLeidas(lista.filter((n) => !n.leida).length);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [usuarioId]);

  // WebSocket: suscripción en tiempo real
  useEffect(() => {
    if (!usuarioId) return;
    const socket = obtenerSocketNotificaciones();

    socket.emit('suscribir-usuario', { usuarioId: String(usuarioId) });
    socket.emit('suscribir-rol', { rol: 'DRIVER' });

    socket.on('nueva-notificacion', (payload: any) => {
      const nueva: NotificacionChofer = {
        id: String(payload.id ?? Date.now()),
        titulo: payload.titulo ?? payload.title ?? '',
        cuerpo: payload.cuerpo ?? payload.body ?? '',
        tipo: payload.tipo ?? payload.type ?? 'SYSTEM',
        leida: false,
        creadoEn: new Date().toISOString(),
      };
      setNotificaciones((prev) => [nueva, ...prev]);
      setNoLeidas((prev) => prev + 1);
    });

    return () => { socket.off('nueva-notificacion'); };
  }, [usuarioId]);

  const marcarLeida = useCallback(async (notifId: string) => {
    if (!usuarioId) return;
    try {
      await api.patch(`/notificaciones/${notifId}/leer/${usuarioId}`);
      setNotificaciones((prev) =>
        prev.map((n) => n.id === notifId ? { ...n, leida: true } : n),
      );
      setNoLeidas((prev) => Math.max(0, prev - 1));
    } catch {}
  }, [usuarioId]);

  const marcarTodasLeidas = useCallback(() => {
    notificaciones.filter((n) => !n.leida).forEach((n) => marcarLeida(n.id));
  }, [notificaciones, marcarLeida]);

  return { notificaciones, noLeidas, cargando, marcarLeida, marcarTodasLeidas };
}
