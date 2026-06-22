'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bus, Navigation, MapPin, LayoutDashboard, LogOut,
  ArrowRight, Star, Map, Route,
} from 'lucide-react';
import { useUsuarioAlmacen } from '../almacen/usuario.almacen';
import { authServicio } from '../services/auth.servicio';
import { api } from '../services/api';

interface Favorito {
  id: string;
  alias: string;
  originLabel: string;
  destinationLabel: string;
}

function esPasajero(rol?: string) {
  return rol === 'PASSENGER' || rol === 'PASAJERO';
}

export default function PaginaInicio() {
  const router = useRouter();
  const { token, usuario } = useUsuarioAlmacen();
  const [hidratado, setHidratado] = useState(false);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);

  useEffect(() => { setHidratado(true); }, []);

  const sesionActiva = hidratado && !!token;
  const pasajero = sesionActiva && esPasajero(usuario?.rol as string);

  useEffect(() => {
    if (!pasajero || !usuario?.id) return;
    api.get(`/favoritos/usuario/${usuario.id}`)
      .then(({ data }) => setFavoritos(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => {});
  }, [pasajero, usuario?.id]);

  const handleLogout = async () => { await authServicio.logout(); router.refresh(); };

  return (
    <div style={{ minHeight: '100vh', background: '#050507', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Fondo decorativo */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,217,146,0.08) 0%, transparent 60%)',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '-10%', width: 500, height: 500,
        borderRadius: '50%', background: 'rgba(0,217,146,0.04)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      {/* Header */}
      <header style={{
        padding: '0 2rem', height: 60, flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(5,5,7,0.8)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(0,217,146,0.12)', border: '1px solid rgba(0,217,146,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bus size={17} color="#00d992" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f2f2f2', letterSpacing: '-0.02em' }}>
            Transit<span style={{ color: '#00d992' }}>AI</span>
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {!sesionActiva && (
            <>
              <Link href="/lineas-mapa" className="boton boton-secundario" style={{ fontSize: '0.8125rem' }}>
                <MapPin size={14} /> Ver Líneas
              </Link>
              <Link href="/autenticacion/iniciar-sesion" className="boton boton-primario" style={{ fontSize: '0.8125rem' }}>
                Iniciar Sesión
              </Link>
            </>
          )}
          {sesionActiva && pasajero && (
            <>
              <Link href="/pasajero/perfil" className="boton boton-secundario" style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}>
                {usuario?.nombreCompleto.split(' ')[0]}
              </Link>
              <button onClick={handleLogout} className="boton boton-secundario" style={{ padding: '0.5rem 0.625rem' }}>
                <LogOut size={14} color="#fb565b" />
              </button>
            </>
          )}
          {sesionActiva && !pasajero && (
            <Link href="/panel" className="boton boton-primario" style={{ fontSize: '0.8125rem' }}>
              <LayoutDashboard size={14} /> Dashboard
            </Link>
          )}
        </nav>
      </header>

      {/* Contenido principal */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', position: 'relative', zIndex: 1 }}>

        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: pasajero ? '2.5rem' : '3rem', maxWidth: 560 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.75rem', fontWeight: 700, color: '#00d992',
            background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.2)',
            borderRadius: 20, padding: '0.375rem 0.875rem', marginBottom: '1.5rem',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d992', animation: 'pulse 2s ease-in-out infinite' }} />
            Sistema activo · Santa Cruz
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            fontWeight: 900, lineHeight: 1.1,
            letterSpacing: '-0.03em', color: '#f2f2f2',
            marginBottom: '1rem',
          }}>
            {pasajero && usuario
              ? <>Hola, {usuario.nombreCompleto.split(' ')[0]} 👋</>
              : <>¿A dónde vas<br /><span style={{ color: '#00d992' }}>hoy?</span></>
            }
          </h1>

          <p style={{ fontSize: '1rem', color: '#555', lineHeight: 1.7, maxWidth: 420, margin: '0 auto' }}>
            {pasajero
              ? 'Planifica tu viaje o explora las líneas disponibles.'
              : 'Encuentra tu micro, planifica tu ruta y llega más rápido a tu destino.'}
          </p>
        </div>

        {/* Tarjetas de acción — 2 principales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', width: '100%', maxWidth: 640, marginBottom: '2rem' }}>

          {/* Planificar Viaje */}
          <Link href={pasajero || !sesionActiva ? '/mapa' : '/mapa'} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(0,217,146,0.06)', border: '1px solid rgba(0,217,146,0.2)',
              borderRadius: 18, padding: '1.75rem 1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
              cursor: 'pointer', transition: 'all 0.18s',
              height: '100%',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,217,146,0.1)'; e.currentTarget.style.borderColor = 'rgba(0,217,146,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,217,146,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,217,146,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(0,217,146,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Navigation size={24} color="#00d992" />
              </div>
              <div>
                <p style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#f2f2f2', marginBottom: '0.375rem' }}>Planificar Viaje</p>
                <p style={{ fontSize: '0.8125rem', color: '#666', lineHeight: 1.55 }}>
                  Selecciona origen y destino para ver las rutas de micro disponibles
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#00d992', fontSize: '0.8125rem', fontWeight: 600, marginTop: 'auto' }}>
                Ir al mapa <ArrowRight size={14} />
              </div>
            </div>
          </Link>

          {/* Ver Líneas */}
          <Link href="/lineas-mapa" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(75,130,220,0.06)', border: '1px solid rgba(75,130,220,0.2)',
              borderRadius: 18, padding: '1.75rem 1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
              cursor: 'pointer', transition: 'all 0.18s',
              height: '100%',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(75,130,220,0.1)'; e.currentTarget.style.borderColor = 'rgba(75,130,220,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(75,130,220,0.06)'; e.currentTarget.style.borderColor = 'rgba(75,130,220,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(75,130,220,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Route size={24} color="#4b82dc" />
              </div>
              <div>
                <p style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#f2f2f2', marginBottom: '0.375rem' }}>Ver Líneas</p>
                <p style={{ fontSize: '0.8125rem', color: '#666', lineHeight: 1.55 }}>
                  Explora todas las líneas de micro con sus recorridos en el mapa
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#4b82dc', fontSize: '0.8125rem', fontWeight: 600, marginTop: 'auto' }}>
                Ver en mapa <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        </div>

        {/* Favoritos del pasajero */}
        {pasajero && favoritos.length > 0 && (
          <div style={{ width: '100%', maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Rutas favoritas
              </p>
              <Link href="/pasajero/favoritos" style={{ fontSize: '0.75rem', color: '#00d992', textDecoration: 'none', fontWeight: 600 }}>Ver todas</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {favoritos.map((fav) => (
                <Link key={fav.id} href="/mapa" style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e22',
                    borderRadius: 12, padding: '0.75rem 1rem',
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    transition: 'all 0.15s', cursor: 'pointer',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,217,146,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,217,146,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = '#1e1e22'; }}
                  >
                    <Star size={14} color="#00d992" fill="#00d992" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f2f2f2' }}>{fav.alias}</p>
                      <p style={{ fontSize: '0.75rem', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fav.originLabel} → {fav.destinationLabel}
                      </p>
                    </div>
                    <ArrowRight size={14} color="#333" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA login para no registrados */}
        {!sesionActiva && hidratado && (
          <div style={{
            marginTop: '2rem', padding: '1rem 1.5rem',
            background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e22',
            borderRadius: 14, maxWidth: 420, width: '100%', textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '0.75rem' }}>
              Inicia sesión para guardar favoritos y calcular rutas personalizadas
            </p>
            <Link href="/autenticacion/iniciar-sesion" className="boton boton-primario" style={{ fontSize: '0.875rem', padding: '0.625rem 1.5rem' }}>
              Iniciar Sesión <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ padding: '1.25rem 2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', color: '#333', fontSize: '0.75rem', zIndex: 1 }}>
        © 2026 TransitAI · Santa Cruz, Bolivia
        {!sesionActiva && hidratado && (
          <> · <Link href="/autenticacion/iniciar-sesion" style={{ color: '#555', textDecoration: 'none' }}>Acceso operadores</Link></>
        )}
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
