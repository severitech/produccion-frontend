'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bus, LayoutDashboard, List, UserCheck, Calendar,
  Bell, Users, Building2, Clock, Route, AlertTriangle,
  GitBranch, ArrowLeftRight, LogOut, FileCheck, Radio, Wallet, Navigation, MapPin,
  BarChart3, Activity, Zap,
} from 'lucide-react';
import { useUsuarioAlmacen } from '../../almacen/usuario.almacen';
import { authServicio } from '../../services/auth.servicio';

const menuCategorias = [
  {
    categoria: 'Principal',
    items: [
      { href: '/panel', icono: <LayoutDashboard size={16} />, label: 'Panel', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
    ],
  },
  {
    categoria: 'Transporte',
    items: [
      { href: '/lineas', icono: <List size={16} />, label: 'Líneas', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
      { href: '/buses', icono: <Bus size={16} />, label: 'Buses', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
      { href: '/conductores', icono: <UserCheck size={16} />, label: 'Conductores', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
      { href: '/rutas', icono: <Route size={16} />, label: 'Rutas', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
      { href: '/paradas', icono: <MapPin size={16} />, label: 'Paradas', rol: ['SUPERADMIN'] },
    ],
  },
  {
    categoria: 'Operaciones',
    items: [
      { href: '/asignaciones', icono: <Calendar size={16} />, label: 'Asignaciones', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
      { href: '/turnos', icono: <Clock size={16} />, label: 'Turnos', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
      { href: '/grabaciones', icono: <FileCheck size={16} />, label: 'Rutas Grabadas', rol: ['SUPERADMIN'] },
      { href: '/transbordo', icono: <Navigation size={16} />, label: 'Transbordo', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
    ],
  },
  {
    categoria: 'Finanzas',
    items: [
      { href: '/billetera', icono: <Wallet size={16} />, label: 'Billetera', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
      { href: '/reportes', icono: <BarChart3 size={16} />, label: 'Reportes', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
    ],
  },
  {
    categoria: 'Gestión',
    items: [
      { href: '/sindicatos', icono: <Building2 size={16} />, label: 'Sindicatos', rol: ['SUPERADMIN'] },
      { href: '/usuarios', icono: <Users size={16} />, label: 'Usuarios', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
      { href: '/incidentes', icono: <AlertTriangle size={16} />, label: 'Incidentes', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
      { href: '/desvios', icono: <GitBranch size={16} />, label: 'Desvíos', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
    ],
  },
  {
    categoria: 'Sistema',
    items: [
      { href: '/notificaciones', icono: <Bell size={16} />, label: 'Notificaciones', rol: ['SUPERADMIN', 'SINDICATO_ADMIN'] },
      { href: '/auditoria', icono: <Activity size={16} />, label: 'Auditoría', rol: ['SUPERADMIN'] },
      { href: '/simulador-rutas', icono: <Zap size={16} />, label: 'Simulador', rol: ['SUPERADMIN'] },
    ],
  },
];

export default function LayoutAutenticado({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { usuario, token } = useUsuarioAlmacen();
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    if (!token) { router.push('/autenticacion/iniciar-sesion'); return; }
    const rol = usuario?.rol as string;
    if (rol === 'PASSENGER' || rol === 'PASAJERO') router.push('/mapa');
    if (rol === 'DRIVER') router.push('/chofer/panel');
  }, [hidratado, token, usuario, router]);

  if (!hidratado) return null;
  if (!token) return null;

  const handleLogout = async () => {
    await authServicio.logout();
    router.push('/autenticacion/iniciar-sesion');
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#050507' }}>
      <aside style={{ width:220, borderRight:'1px solid #3d3a39', display:'flex', flexDirection:'column', padding:'1.25rem 0', background:'#101010', position:'sticky', top:0, height:'100vh', flexShrink:0 }}>
        <div style={{ padding:'0 1.25rem', marginBottom:'1.75rem', display:'flex', alignItems:'center', gap:'0.625rem' }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'rgba(0,217,146,0.1)', border:'1px solid rgba(0,217,146,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Bus size={16} color="#00d992" />
          </div>
          <span style={{ fontWeight:800, fontSize:'0.9rem', color:'#f2f2f2' }}>Transit<span style={{ color:'#00d992' }}>AI</span></span>
        </div>

        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:'0.5rem', padding:'0 0.625rem', overflowY:'auto' }}>
          {menuCategorias.map((categoria) => {
            const itemsVisibles = categoria.items.filter((item) =>
              item.rol.includes(usuario?.rol as string)
            );
            if (itemsVisibles.length === 0) return null;

            return (
              <div key={categoria.categoria} style={{ display:'flex', flexDirection:'column', gap:'0.25rem' }}>
                <p style={{ fontSize:'0.7rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px', padding:'0.75rem 0.75rem 0.5rem', margin:0 }}>
                  {categoria.categoria}
                </p>
                {itemsVisibles.map((item) => {
                  const activo = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display:'flex',
                        alignItems:'center',
                        gap:'0.5rem',
                        padding:'0.5625rem 0.75rem',
                        borderRadius:8,
                        fontSize:'0.8125rem',
                        fontWeight: activo ? 600 : 400,
                        color: activo ? '#00d992' : '#8b949e',
                        background: activo ? 'rgba(0,217,146,0.08)' : 'transparent',
                        border: activo ? '1px solid rgba(0,217,146,0.15)' : '1px solid transparent',
                        textDecoration:'none',
                        transition:'all 0.15s',
                      }}
                    >
                      {item.icono} {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div style={{ padding:'0.75rem 1rem', borderTop:'1px solid #3d3a39', marginTop:'0.5rem' }}>
          {usuario && (
            <div style={{ marginBottom:'0.75rem' }}>
              <p style={{ fontSize:'0.8125rem', fontWeight:600, color:'#f2f2f2', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{usuario.nombreCompleto}</p>
              <p style={{ fontSize:'0.6875rem', color:'#8b949e' }}>{usuario.rol}</p>
            </div>
          )}
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <Link href="/mapa-tiempo-real" className="boton boton-secundario" style={{ flex:1, justifyContent:'center', fontSize:'0.75rem', padding:'0.5rem' }}>
              <Radio size={12} /> Mapa en Vivo
            </Link>
            <button onClick={handleLogout} className="boton boton-secundario" style={{ padding:'0.5rem 0.625rem' }}>
              <LogOut size={14} color="#fb565b" />
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex:1, overflowY:'auto', minWidth:0 }}>
        {children}
      </main>
    </div>
  );
}
