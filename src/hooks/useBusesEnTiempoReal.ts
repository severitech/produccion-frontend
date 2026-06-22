'use client';
import { useEffect, useCallback, useRef } from 'react';
import { obtenerSocketViajes } from '../lib/socket-viajes';
import { useBusesAlmacen } from '../almacen/buses.almacen';
import { UbicacionBus } from '../types';
import { api } from '../services/api';

export function useBusesEnTiempoReal() {
  const { buses, conectado, error, actualizarBus, setConectado, setError } = useBusesAlmacen();
  const socketSetupRef = useRef(false);

  useEffect(() => {
    if (socketSetupRef.current) return;
    socketSetupRef.current = true;

    const socket = obtenerSocketViajes();

    socket.on('connect', () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));
    socket.on('connect_error', (err: Error) => {
      console.error('[Socket] Error de conexión:', err.message);
      setError(err.message);
    });

    socket.on('bus-actualizado', (payload: any) => {
      const busId = Number(payload.viajeId) || 0;
      const existente = useBusesAlmacen.getState().buses.get(busId);
      actualizarBus(busId, {
        ...(existente as UbicacionBus),
        busId,
        lineaId: payload.lineaId ? Number(payload.lineaId) : existente?.lineaId,
        latitud: payload.latitud,
        longitud: payload.longitud,
        velocidadKmh: payload.velocidad ?? existente?.velocidadKmh ?? 0,
        rumboCrados: payload.rumbo ?? existente?.rumboCrados ?? 0,
        pasajerosEstimados: existente?.pasajerosEstimados ?? 0,
        timestamp: payload.registradoEn ?? new Date().toISOString(),
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('bus-actualizado');
    };
  }, [actualizarBus, setConectado, setError]);

  // Al suscribirse a una línea, carga el estado inicial desde REST y luego escucha WS
  const unirseALinea = useCallback(async (lineaId: number) => {
    const socket = obtenerSocketViajes();
    socket.emit('suscribir-linea', { lineaId: String(lineaId) });

    try {
      const { data } = await api.get('/viajes/activos', { params: { lineaId: String(lineaId) } });
      if (Array.isArray(data)) {
        data.forEach((v: any) => {
          const loc = v.locations?.[0];
          if (!loc) return;
          const busId = Number(v.id) || 0;
          actualizarBus(busId, {
            busId,
            lineaId,
            lineaNombre: v.assignment?.internal?.line?.name ?? '',
            lineaColor: v.assignment?.internal?.line?.color ?? '#6366f1',
            placa: v.assignment?.internal?.licensePlate ?? '',
            numeroInterno: v.assignment?.internal?.internalNumber ?? '',
            conductorNombre: v.assignment?.driver?.user?.name ?? '',
            latitud: parseFloat(loc.latitude),
            longitud: parseFloat(loc.longitude),
            velocidadKmh: parseFloat(loc.speed ?? 0),
            rumboCrados: parseFloat(loc.heading ?? 0),
            pasajerosEstimados: 0,
            timestamp: loc.recordedAt,
          });
        });
      }
    } catch (err) {
      console.error(`Error cargando viajes de línea ${lineaId}:`, err);
    }
  }, [actualizarBus]);

  return { buses, conectado, error, unirseALinea };
}
