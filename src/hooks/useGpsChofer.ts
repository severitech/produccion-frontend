'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerSocketViajes } from '../lib/socket-viajes';

interface EstadoGps {
  activo: boolean;
  error: string | null;
  ultimaPosicion: { lat: number; lng: number; velocidad: number; rumbo: number } | null;
}

export function useGpsChofer(viajeId: string | null) {
  const [estado, setEstado] = useState<EstadoGps>({ activo: false, error: null, ultimaPosicion: null });
  const watchIdRef = useRef<number | null>(null);

  const enviarUbicacion = useCallback((pos: GeolocationPosition) => {
    if (!viajeId) return;
    const { latitude, longitude, speed, heading, accuracy } = pos.coords;
    const socket = obtenerSocketViajes();
    socket.emit('ubicacion-conductor', {
      viajeId,
      latitud: latitude,
      longitud: longitude,
      velocidad: speed != null ? Math.round(speed * 3.6) : 0,
      rumbo: heading ?? 0,
      precisionMetros: accuracy,
    });
    setEstado((prev) => ({
      ...prev,
      ultimaPosicion: { lat: latitude, lng: longitude, velocidad: speed ? Math.round(speed * 3.6) : 0, rumbo: heading ?? 0 },
    }));
  }, [viajeId]);

  const activar = useCallback(() => {
    if (!navigator.geolocation) {
      setEstado((prev) => ({ ...prev, error: 'Geolocalización no disponible en este dispositivo' }));
      return;
    }
    if (!viajeId) {
      setEstado((prev) => ({ ...prev, error: 'No hay un viaje activo para enviar la ubicación' }));
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setEstado((prev) => ({ ...prev, activo: true, error: null }));
        enviarUbicacion(pos);
      },
      (err) => setEstado((prev) => ({ ...prev, error: err.message })),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
    setEstado((prev) => ({ ...prev, activo: true, error: null }));
  }, [viajeId, enviarUbicacion]);

  const desactivar = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setEstado((prev) => ({ ...prev, activo: false }));
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  return { ...estado, activar, desactivar };
}
