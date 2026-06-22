'use client';
import { create } from 'zustand';
import { UbicacionBus } from '../types';

interface BusesEstado {
  buses: Map<number, UbicacionBus>;
  conectado: boolean;
  error: string | null;
  actualizarBus: (busId: number, datos: UbicacionBus) => void;
  setConectado: (valor: boolean) => void;
  setError: (mensaje: string) => void;
}

export const useBusesAlmacen = create<BusesEstado>((set) => ({
  buses: new Map(),
  conectado: false,
  error: null,
  actualizarBus: (busId, datos) =>
    set((state) => {
      const nuevos = new Map(state.buses);
      nuevos.set(busId, datos);
      return { buses: nuevos };
    }),
  setConectado: (valor) => set({ conectado: valor, error: null }),
  setError: (mensaje) => set({ error: mensaje, conectado: false }),
}));
