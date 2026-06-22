'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerSocketViajes } from '../lib/socket-viajes';
import { api } from '../services/api';
import { locationTestServicio } from '../services/location-test.servicio';

export interface BusEnVivo {
  viajeId: string;
  latitud: number;
  longitud: number;
  rumbo: number;
  velocidad: number;
  lineaId?: string;
  sindicatoId?: string;
  registradoEn?: string;
  esSimulacion?: boolean;
  conductorNombre?: string;
  internalNumber?: string;
  licensePlate?: string;
  lineaNombre?: string;
  lineaColor?: string;
  lineaCodigo?: string;
  sindicatoNombre?: string;
  rutaNombre?: string;
}

interface Filtros {
  sindicatoId?: string;
  lineaId?: string;
  conductorId?: string;
}

function normalizarViaje(v: any): BusEnVivo | null {
  const loc = v.locations?.[0];
  if (!loc) return null;
  return {
    viajeId: String(v.id),
    latitud: parseFloat(loc.latitude),
    longitud: parseFloat(loc.longitude),
    rumbo: parseFloat(loc.heading ?? 0),
    velocidad: parseFloat(loc.speed ?? 0),
    lineaId: String(v.assignment?.internal?.line?.id ?? ''),
    sindicatoId: String(v.assignment?.syndicate?.id ?? ''),
    conductorNombre: v.assignment?.driver?.user?.name ?? '',
    internalNumber: v.assignment?.internal?.internalNumber ?? '',
    licensePlate: v.assignment?.internal?.licensePlate ?? '',
    lineaNombre: v.assignment?.internal?.line?.name ?? '',
    lineaColor: v.assignment?.internal?.line?.color ?? '#6366f1',
    lineaCodigo: v.assignment?.internal?.line?.code ?? '',
    sindicatoNombre: v.assignment?.syndicate?.name ?? '',
    rutaNombre: v.assignment?.route?.name ?? '',
  };
}

export function useMapaAdmin(filtros: Filtros) {
  const [busesMap, setBusesMap] = useState<Map<string, BusEnVivo>>(new Map());
  const [cargando, setCargando] = useState(true);
  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  // Carga inicial via REST
  const cargarActivos = useCallback(async () => {
    setCargando(true);
    try {
      const params: Record<string, string> = {};
      if (filtros.sindicatoId) params.sindicatoId = filtros.sindicatoId;
      if (filtros.lineaId) params.lineaId = filtros.lineaId;
      if (filtros.conductorId) params.conductorId = filtros.conductorId;

      const { data } = await api.get('/viajes/activos', { params });
      const mapa = new Map<string, BusEnVivo>();
      (data as any[]).forEach((v) => {
        const b = normalizarViaje(v);
        if (b) mapa.set(b.viajeId, b);
      });

      // Agregar ubicaciones de prueba (simulador)
      try {
        const ubicacionesPrueba = await locationTestServicio.obtenerActivas();
        (ubicacionesPrueba as any[]).forEach((u) => {
          const id = `test-${u.internalId}`;
          mapa.set(id, {
            viajeId: id,
            latitud: parseFloat(u.latitude.toString()),
            longitud: parseFloat(u.longitude.toString()),
            rumbo: u.heading ?? 0,
            velocidad: u.speedKmh,
            sindicatoId: u.syndicateId?.toString(),
            sindicatoNombre: u.syndicate?.name,
            internalNumber: u.internal?.internalNumber,
            licensePlate: u.internal?.licensePlate,
            conductorNombre: u.driver?.name,
            esSimulacion: true,
            registradoEn: u.timestamp,
          });
        });
      } catch (e) {
        console.debug('No se pudieron cargar ubicaciones de prueba');
      }

      setBusesMap(mapa);
    } catch {}
    setCargando(false);
  }, [filtros.sindicatoId, filtros.lineaId, filtros.conductorId]);

  useEffect(() => { cargarActivos(); }, [cargarActivos]);

  // Polling de ubicaciones de prueba CADA 500ms - actualización constante en tiempo real
  useEffect(() => {
    let mounted = true;
    let pollCount = 0;

    const poll = async () => {
      if (!mounted) return;

      try {
        const ubicacionesPrueba = await locationTestServicio.obtenerActivas();
        pollCount++;

        const filtrosActuales = filtrosRef.current;
        console.log(`🔄 [Poll #${pollCount}] obtenerActivas() retornó ${ubicacionesPrueba?.length ?? 0} ubicaciones`, {
          filtros: {
            sindicatoId: filtrosActuales.sindicatoId,
            lineaId: filtrosActuales.lineaId,
            conductorId: filtrosActuales.conductorId,
          },
          timestamp: new Date().toLocaleTimeString(),
        });

        if (!mounted) return;

        setBusesMap((prevMap) => {
          const newMap = new Map(prevMap);
          const f = filtrosRef.current;
          const testIds = new Set<string>();

          // Procesar ubicaciones de prueba
          (ubicacionesPrueba as any[]).forEach((u, idx) => {
            // Filtrar por sindicato si está especificado
            const sindicatoFiltro = f.sindicatoId;
            const sindicatoUbicacion = String(u.syndicateId);
            const coincide = !sindicatoFiltro || sindicatoUbicacion === sindicatoFiltro;

            console.log(`  [Ubicación ${idx}] ID=${u.internalId}, sindicatoId=${sindicatoUbicacion}, filtroSindicato=${sindicatoFiltro}, coincide=${coincide}`);

            if (!coincide) {
              console.log(`    ❌ Descartada por sindicato`);
              return;
            }

            const id = `test-${u.internalId}`;
            testIds.add(id);

            // SIEMPRE actualizar con los últimos datos
            newMap.set(id, {
              viajeId: id,
              latitud: Number(u.latitude),
              longitud: Number(u.longitude),
              rumbo: Number(u.heading ?? 0),
              velocidad: Number(u.speedKmh ?? 0),
              sindicatoId: String(u.syndicateId ?? ''),
              sindicatoNombre: u.syndicate?.name,
              internalNumber: u.internal?.internalNumber,
              licensePlate: u.internal?.licensePlate,
              conductorNombre: u.driver?.name,
              esSimulacion: true,
              registradoEn: u.timestamp,
            });
          });

          // Limpiar ubicaciones de prueba que ya no existen
          for (const key of newMap.keys()) {
            if (key.startsWith('test-') && !testIds.has(key)) {
              newMap.delete(key);
            }
          }

          return newMap;
        });
      } catch (e) {
        console.error('❌ Error polling simulaciones:', e);
      }

      // Siguiente poll
      if (mounted) {
        setTimeout(poll, 500);
      }
    };

    // Iniciar polling inmediatamente
    poll();

    return () => {
      mounted = false;
    };
  }, []);

  // WebSocket para viajes en vivo (no simulaciones)
  useEffect(() => {
    const socket = obtenerSocketViajes();

    const handleBusActualizado = (payload: any) => {
      const f = filtrosRef.current;
      if (f.lineaId && payload.lineaId !== f.lineaId) return;
      if (f.sindicatoId && payload.sindicatoId !== f.sindicatoId) return;

      setBusesMap((prev) => {
        const next = new Map(prev);
        const existente = next.get(payload.viajeId);
        next.set(payload.viajeId, {
          ...(existente ?? {}),
          viajeId: payload.viajeId,
          latitud: payload.latitud,
          longitud: payload.longitud,
          rumbo: payload.rumbo ?? existente?.rumbo ?? 0,
          velocidad: payload.velocidad ?? existente?.velocidad ?? 0,
          lineaId: payload.lineaId ?? existente?.lineaId,
          sindicatoId: payload.sindicatoId ?? existente?.sindicatoId,
          lineaColor: existente?.lineaColor ?? '#6366f1',
          lineaNombre: existente?.lineaNombre ?? '',
          conductorNombre: existente?.conductorNombre ?? '',
          internalNumber: existente?.internalNumber ?? '',
          registradoEn: payload.registradoEn,
        });
        return next;
      });
    };

    socket.on('bus-actualizado', handleBusActualizado);

    if (filtros.sindicatoId) {
      socket.emit('suscribir-sindicato', { sindicatoId: filtros.sindicatoId });
    } else if (filtros.lineaId) {
      socket.emit('suscribir-linea', { lineaId: filtros.lineaId });
    } else {
      socket.emit('suscribir-admin-global');
    }

    return () => {
      socket.off('bus-actualizado', handleBusActualizado);
      if (filtros.sindicatoId) socket.emit('desuscribir-sindicato', { sindicatoId: filtros.sindicatoId });
    };
  }, [filtros.sindicatoId, filtros.lineaId]);

  return { buses: Array.from(busesMap.values()), cargando, recargar: cargarActivos };
}
