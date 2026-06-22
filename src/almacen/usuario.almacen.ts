'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Usuario } from '../types';

interface UsuarioEstado {
  usuario: Usuario | null;
  token: string | null;
  setUsuario: (usuario: Usuario, token: string) => void;
  cerrarSesion: () => void;
}

export const useUsuarioAlmacen = create<UsuarioEstado>()(
  persist(
    (set) => ({
      usuario: null,
      token: null,
      setUsuario: (usuario, token) => set({ usuario, token }),
      cerrarSesion: () => set({ usuario: null, token: null }),
    }),
    { name: 'usuario-almacen' },
  ),
);
