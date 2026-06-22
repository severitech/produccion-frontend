'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Bus, Navigation, MapPin, Search, X, LogOut, User, ChevronRight, ArrowRight } from 'lucide-react';
import { api } from '../../../services/api';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { authServicio } from '../../../services/auth.servicio';
import { useRouter } from 'next/navigation';

const MapaLineasDynamic = dynamic(() => import('@/components/mapa/MapaLineas'), { ssr: false });

interface LineaConPuntos {
  id: string;
  nombre: string;
  codigo: string;
  color: string;
  imageUrl: string | null;
  tarifa: number;
  descripcion: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  distanciaKm: number;
  tiempoEstimadoMin: number;
  puntos: [number, number][];
}

function esPasajero(rol?: string) {
  return rol === 'PASSENGER' || rol === 'PASAJERO';
}

export default function PaginaLineasMapa() {
  const router = useRouter();
  const { usuario } = useUsuarioAlmacen();
  const [hidratado, setHidratado] = useState(false);
  const [lineas, setLineas] = useState<LineaConPuntos[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [lineaSeleccionada, setLineaSeleccionada] = useState<string | null>(null);
  const [lineaHover, setLineaHover] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => { setHidratado(true); }, []);

  const cargarLineas = () => {
    setCargando(true);
    setErrorCarga(false);
    api.get('/planificador/lineas-mapa')
      .then(({ data }) => setLineas(Array.isArray(data) ? data : []))
      .catch(() => { setLineas([]); setErrorCarga(true); })
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarLineas(); }, []);

  const pasajero = hidratado && esPasajero(usuario?.rol as string);
  const handleLogout = async () => { await authServicio.logout(); router.push('/'); };

  const lineasFiltradas = lineas.filter(
    (l) => l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
           l.codigo.toLowerCase().includes(busqueda.toLowerCase()),
  );
  const lineaActiva = lineas.find((l) => l.id === lineaSeleccionada);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#050507' }}>

      {/* Header con tabs */}
      <header style={{
        padding: '0 1.5rem', flexShrink: 0, height: 54,
        display: 'flex', justifyContent: 'space-between', alignItems: 'stretch',
        borderBottom: '1px solid #1e1e22', background: '#0d0d0f', zIndex: 1000,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,217,146,0.12)', border: '1px solid rgba(0,217,146,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bus size={15} color="#00d992" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f2f2f2' }}>Transit<span style={{ color: '#00d992' }}>AI</span></span>
        </div>

        {hidratado && pasajero && (
          <nav style={{ display: 'flex', alignItems: 'stretch' }}>
            {[
              { href: '/mapa', label: 'Planificar Viaje', icon: <Navigation size={14} />, activa: false },
              { href: '/lineas-mapa', label: 'Ver Líneas', icon: <MapPin size={14} />, activa: true },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0 1.25rem', fontSize: '0.8125rem', fontWeight: 600,
                color: item.activa ? '#00d992' : '#8b949e',
                borderBottom: item.activa ? '2px solid #00d992' : '2px solid transparent',
                textDecoration: 'none',
              }}>
                {item.icon} {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#00d992', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d992' }} /> En vivo
          </span>
          {hidratado && pasajero && usuario && (
            <>
              <Link href="/perfil" className="boton boton-secundario" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                <User size={13} /> {usuario.nombreCompleto.split(' ')[0]}
              </Link>
              <button onClick={handleLogout} className="boton boton-secundario" style={{ padding: '0.375rem 0.5rem' }}>
                <LogOut size={13} color="#fb565b" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Cuerpo */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{
          width: 300, flexShrink: 0, background: '#0d0d0f',
          borderRight: '1px solid #1e1e22', display: 'flex', flexDirection: 'column',
        }}>

          {/* Cabecera del panel */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e1e22' }}>
            {lineaSeleccionada ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <button
                  onClick={() => setLineaSeleccionada(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', padding: 0 }}
                >
                  ← Volver
                </button>
                <div style={{ width: 1, height: 16, background: '#2a2a2f' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: lineaActiva?.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f2f2f2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lineaActiva?.nombre}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#555" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Buscar línea..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid #1e1e22', borderRadius: 9,
                    padding: '0.5rem 2rem 0.5rem 2rem',
                    color: '#f2f2f2', fontSize: '0.8125rem', outline: 'none',
                  }}
                />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Vista de detalle de línea seleccionada */}
          {lineaSeleccionada && lineaActiva ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              {/* Imagen del micro */}
              {lineaActiva.imageUrl ? (
                <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: '1rem', position: 'relative' }}>
                  <img
                    src={lineaActiva.imageUrl}
                    alt={lineaActiva.nombre}
                    style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(to top, ${lineaActiva.color}60 0%, transparent 60%)`,
                  }} />
                  <span style={{
                    position: 'absolute', bottom: 10, left: 12,
                    fontSize: '0.75rem', fontWeight: 900, padding: '0.25rem 0.625rem',
                    borderRadius: 6, background: lineaActiva.color, color: 'white',
                  }}>{lineaActiva.codigo}</span>
                </div>
              ) : (
                <div style={{
                  borderRadius: 14, marginBottom: '1rem',
                  background: `linear-gradient(135deg, ${lineaActiva.color}30 0%, ${lineaActiva.color}08 100%)`,
                  border: `1px solid ${lineaActiva.color}35`,
                  height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <Bus size={36} color={lineaActiva.color} style={{ opacity: 0.4 }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.25rem 0.75rem', borderRadius: 6, background: lineaActiva.color, color: 'white', position: 'absolute', top: 10, left: 12 }}>
                    {lineaActiva.codigo}
                  </span>
                </div>
              )}

              {/* Info card */}
              <div style={{ borderRadius: 12, padding: '1rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e22' }}>
                <p style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#f2f2f2', lineHeight: 1.3, marginBottom: '0.5rem' }}>{lineaActiva.nombre}</p>
                {lineaActiva.descripcion && (
                  <p style={{ fontSize: '0.8125rem', color: '#666', lineHeight: 1.55, marginBottom: '0.875rem' }}>{lineaActiva.descripcion}</p>
                )}

                {/* Stats en grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                  <div style={{ background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.15)', borderRadius: 10, padding: '0.625rem 0.75rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 900, color: '#00d992' }}>Bs {lineaActiva.tarifa.toFixed(2)}</p>
                    <p style={{ fontSize: '0.6875rem', color: '#555' }}>Precio del pasaje</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e22', borderRadius: 10, padding: '0.625rem 0.75rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 900, color: '#f2f2f2' }}>{lineaActiva.distanciaKm} km</p>
                    <p style={{ fontSize: '0.6875rem', color: '#555' }}>Distancia del recorrido</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e22', borderRadius: 10, padding: '0.625rem 0.75rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 900, color: '#f2f2f2' }}>~{lineaActiva.tiempoEstimadoMin} min</p>
                    <p style={{ fontSize: '0.6875rem', color: '#555' }}>Tiempo estimado</p>
                  </div>
                  {lineaActiva.horaInicio && lineaActiva.horaFin && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e22', borderRadius: 10, padding: '0.625rem 0.75rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 900, color: '#f2f2f2' }}>{lineaActiva.horaInicio} – {lineaActiva.horaFin}</p>
                      <p style={{ fontSize: '0.6875rem', color: '#555' }}>Horario de servicio</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* Lista de líneas */
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {cargando && (
                <div style={{ padding: '3rem 1.25rem', textAlign: 'center' }}>
                  <div style={{ width: 32, height: 32, border: '3px solid #1e1e22', borderTopColor: '#00d992', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem' }} />
                  <p style={{ color: '#555', fontSize: '0.8125rem' }}>Cargando líneas...</p>
                </div>
              )}

              {!cargando && errorCarga && (
                <div style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
                  <p style={{ color: '#fb565b', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>Error al cargar las líneas</p>
                  <button onClick={cargarLineas} style={{ background: 'rgba(0,217,146,0.1)', border: '1px solid rgba(0,217,146,0.2)', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', color: '#00d992', fontSize: '0.8125rem' }}>
                    Reintentar
                  </button>
                </div>
              )}

              {!cargando && !errorCarga && lineasFiltradas.length === 0 && (
                <p style={{ color: '#555', fontSize: '0.8125rem', textAlign: 'center', padding: '3rem 1.25rem' }}>
                  {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay líneas disponibles'}
                </p>
              )}

              {!cargando && lineasFiltradas.length > 0 && !busqueda && (
                <div style={{ padding: '0.75rem 1.25rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {lineasFiltradas.length} {lineasFiltradas.length === 1 ? 'línea' : 'líneas'}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: '#333' }}>Pasa el cursor para previsualizar</p>
                </div>
              )}

              <div style={{ padding: '0.5rem 1rem 1rem' }}>
                {lineasFiltradas.map((linea) => {
                  const hover = lineaHover === linea.id;
                  return (
                    <button
                      key={linea.id}
                      onClick={() => setLineaSeleccionada(linea.id)}
                      onMouseEnter={() => setLineaHover(linea.id)}
                      onMouseLeave={() => setLineaHover(null)}
                      style={{
                        width: '100%', textAlign: 'left',
                        background: hover ? `${linea.color}12` : 'transparent',
                        borderTop: `1px solid ${hover ? linea.color + '40' : 'transparent'}`,
                        borderRight: `1px solid ${hover ? linea.color + '40' : 'transparent'}`,
                        borderBottom: `1px solid ${hover ? linea.color + '40' : 'transparent'}`,
                        borderLeft: `3px solid ${linea.color}`,
                        borderRadius: '0 10px 10px 0',
                        padding: '0.75rem 0.875rem',
                        marginBottom: '0.375rem',
                        cursor: 'pointer', transition: 'all 0.12s',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                      }}
                    >
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 900,
                        padding: '0.2rem 0.5rem', borderRadius: 5,
                        background: linea.color, color: 'white',
                        flexShrink: 0, letterSpacing: '0.04em',
                      }}>{linea.codigo}</span>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: hover ? '#f2f2f2' : '#c8c3c0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {linea.nombre}
                        </p>
                        <p style={{ fontSize: '0.6875rem', color: '#444', marginTop: 2 }}>
                          Bs {linea.tarifa.toFixed(2)} · {linea.distanciaKm} km · ~{linea.tiempoEstimadoMin} min
                        </p>
                      </div>

                      <ChevronRight size={14} color={hover ? linea.color : '#333'} style={{ flexShrink: 0, transition: 'color 0.12s' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Mapa */}
        <div style={{ flex: 1, position: 'relative' }}>
          {cargando ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: '0.875rem', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, border: '3px solid #1e1e22', borderTopColor: '#00d992', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span>Cargando...</span>
            </div>
          ) : (
            <MapaLineasDynamic
              lineas={lineas}
              lineaSeleccionada={lineaSeleccionada}
              lineaHover={lineaHover}
              onSeleccionar={setLineaSeleccionada}
            />
          )}

          {/* Botón flotante calcular — aparece cuando hay línea seleccionada */}
          {lineaActiva && (
            <div style={{
              position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'rgba(13,13,15,0.92)', border: '1px solid #2a2a2f',
              backdropFilter: 'blur(16px)', borderRadius: 50,
              padding: '0.625rem 0.75rem 0.625rem 1rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: lineaActiva.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem', color: '#c8c3c0', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {lineaActiva.codigo} · {lineaActiva.nombre.split('—')[0].trim()}
                </span>
              </div>
              <Link
                href="/mapa"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  background: '#00d992', color: '#000',
                  fontWeight: 800, fontSize: '0.8125rem',
                  padding: '0.5rem 1rem', borderRadius: 40,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Navigation size={13} /> Calcular viaje
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
