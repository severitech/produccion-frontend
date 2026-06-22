'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bus, MapPin, User, LogOut, Wallet } from 'lucide-react';
import { useUsuarioAlmacen } from '../../almacen/usuario.almacen';
import { authServicio } from '../../services/auth.servicio';

function esPasajero(rol?: string) {
  return rol === 'PASSENGER' || rol === 'PASAJERO';
}

export default function LayoutPasajero({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { usuario, token } = useUsuarioAlmacen();
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => { setHidratado(true); }, []);

  useEffect(() => {
    if (!hidratado) return;
    if (!token) { router.push('/autenticacion/iniciar-sesion'); return; }
    if (!esPasajero(usuario?.rol as string)) router.push('/panel');
  }, [hidratado, token, usuario, router]);

  if (!hidratado || !token) return null;

  const handleLogout = async () => {
    await authServicio.logout();
    router.push('/');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050507', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '0.875rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #3d3a39',
        background: 'rgba(5,5,7,0.95)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'rgba(0,217,146,0.1)', border: '1px solid rgba(0,217,146,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bus size={16} color="#00d992" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f2f2f2' }}>
            Transit<span style={{ color: '#00d992' }}>AI</span>
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link href="/mapa" className="boton boton-secundario" style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}>
            <MapPin size={14} /> Mapa
          </Link>
          <Link href="/mi-billetera" className="boton boton-secundario" style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}>
            <Wallet size={14} /> Billetera
          </Link>
          <Link href="/pasajero/perfil" className="boton boton-secundario" style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}>
            <User size={14} /> Mi cuenta
          </Link>
          <button onClick={handleLogout} className="boton boton-secundario" style={{ padding: '0.5rem 0.625rem' }}>
            <LogOut size={14} color="#fb565b" />
          </button>
        </nav>
      </header>

      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}
