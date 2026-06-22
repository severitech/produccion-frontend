'use client';
import { useState, useCallback } from 'react';
import { planificadorServicio } from '../services/planificador.servicio';
import { OpcionViaje } from '../types';

export function usePlanificador() {
  const [opciones, setOpciones] = useState<OpcionViaje[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarOpciones = useCallback(
    async (origenLat: number, origenLng: number, destinoLat: number, destinoLng: number) => {
      setCargando(true);
      setError(null);
      try {
        const resultado = await planificadorServicio.buscarOpciones(origenLat, origenLng, destinoLat, destinoLng);
        setOpciones(resultado || []);
      } catch (err) {
        setError('Error al buscar opciones de viaje');
        setOpciones([]);
      } finally {
        setCargando(false);
      }
    },
    [],
  );

  return { opciones, cargando, error, buscarOpciones };
}
