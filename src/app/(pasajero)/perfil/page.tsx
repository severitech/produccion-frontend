'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Mail, Shield, Star, MapPin, Trash2, Settings, Zap, Wallet, Footprints, Brain, CheckCircle } from 'lucide-react';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { api } from '../../../services/api';
import { iaServicio, Preferencias } from '../../../services/ia.servicio';

interface Favorito {
  id: string;
  alias: string;
  originLabel: string;
  destinationLabel: string;
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
}

type Tab = 'perfil' | 'favoritos' | 'preferencias';

const CRITERIO_MAP: Record<string, { label: string; icono: React.ReactNode; color: string }> = {
  FASTEST:       { label: 'Más rápida',    icono: <Zap size={16} />,       color: '#00d992' },
  LEAST_COST:    { label: 'Más económica', icono: <Wallet size={16} />,    color: '#4cb3d4' },
  LEAST_WALKING: { label: 'Menos caminar', icono: <Footprints size={16} />, color: '#ffba00' },
};

export default function PaginaPerfil() {
  const { usuario } = useUsuarioAlmacen();
  const [tab, setTab] = useState<Tab>('perfil');

  // Favoritos
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [cargando, setCargando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);

  // Preferencias IA
  const [preferencias, setPreferencias] = useState<Preferencias | null>(null);
  const [cargandoPref, setCargandoPref] = useState(false);
  const [guardandoPref, setGuardandoPref] = useState(false);
  const [prefGuardada, setPrefGuardada] = useState(false);
  const [criterioPref, setCriterioPref] = useState<string>('FASTEST');
  const [maxCaminata, setMaxCaminata] = useState<number | null>(null);
  const [maxTransbordos, setMaxTransbordos] = useState<number | null>(null);

  // ── Cargar favoritos al cambiar al tab
  useEffect(() => {
    if (tab !== 'favoritos' || !usuario?.id) return;
    setCargando(true);
    api.get(`/favoritos/usuario/${usuario.id}`)
      .then(({ data }) => setFavoritos(Array.isArray(data) ? data : []))
      .catch(() => setFavoritos([]))
      .finally(() => setCargando(false));
  }, [tab, usuario?.id]);

  // ── Cargar preferencias al cambiar al tab
  useEffect(() => {
    if (tab !== 'preferencias' || !usuario?.id) return;
    setCargandoPref(true);
    iaServicio.obtenerPreferencias(String(usuario.id))
      .then((p) => {
        setPreferencias(p);
        setCriterioPref(p.criterioPrincipal);
        setMaxCaminata(p.maxCaminataMetros);
        setMaxTransbordos(p.maxTransbordos);
      })
      .catch(() => {})
      .finally(() => setCargandoPref(false));
  }, [tab, usuario?.id]);

  const eliminar = async (id: string) => {
    setEliminando(id);
    try {
      await api.delete(`/favoritos/${id}`);
      setFavoritos((prev) => prev.filter((f) => f.id !== id));
    } catch {}
    setEliminando(null);
  };

  const guardarPreferencias = async () => {
    if (!usuario?.id) return;
    setGuardandoPref(true);
    try {
      await iaServicio.actualizarPreferencias(String(usuario.id), {
        criterioPrincipal: criterioPref,
        maxCaminataMetros: maxCaminata,
        maxTransbordos,
      });
      setPrefGuardada(true);
      setTimeout(() => setPrefGuardada(false), 3000);
    } catch {}
    setGuardandoPref(false);
  };

  if (!usuario) return null;

  const campos = [
    { icono: <User size={15} color="#8b949e" />, label: 'Nombre completo', valor: usuario.nombreCompleto },
    { icono: <Mail size={15} color="#8b949e" />, label: 'Correo electrónico', valor: usuario.email },
    { icono: <Shield size={15} color="#8b949e" />, label: 'Rol', valor: 'Pasajero' },
  ];

  const tabs: { id: Tab; label: string; icono: React.ReactNode }[] = [
    { id: 'perfil',        label: 'Mi Perfil',     icono: <User size={14} /> },
    { id: 'favoritos',     label: 'Rutas Favoritas', icono: <Star size={14} /> },
    { id: 'preferencias',  label: 'Preferencias',  icono: <Settings size={14} /> },
  ];

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,217,146,0.1)', border: '2px solid rgba(0,217,146,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={28} color="#00d992" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#f2f2f2', marginBottom: '0.2rem' }}>{usuario.nombreCompleto}</h1>
          <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>{usuario.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1e1e22', marginBottom: '1.75rem' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.625rem 1.125rem', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 600,
              color: tab === t.id ? '#00d992' : '#8b949e',
              borderBottom: tab === t.id ? '2px solid #00d992' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s',
            }}
          >
            {t.icono} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Perfil ── */}
      {tab === 'perfil' && (
        <div className="tarjeta" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {campos.map((c) => (
            <div key={c.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                {c.icono} {c.label}
              </label>
              <p style={{ fontSize: '0.9375rem', color: '#f2f2f2', background: 'rgba(61,58,57,0.3)', border: '1px solid #3d3a39', borderRadius: 10, padding: '0.625rem 0.875rem' }}>
                {c.valor}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Favoritos ── */}
      {tab === 'favoritos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <Link href="/mapa" className="boton boton-primario" style={{ fontSize: '0.8125rem' }}>
              <MapPin size={14} /> Ir al Mapa
            </Link>
          </div>
          {cargando && <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>Cargando favoritos...</div>}
          {!cargando && favoritos.length === 0 && (
            <div className="tarjeta" style={{ padding: '3rem', textAlign: 'center' }}>
              <Star size={40} color="#3d3a39" style={{ marginBottom: '1rem' }} />
              <p style={{ color: '#f2f2f2', fontWeight: 600, marginBottom: '0.5rem' }}>No tienes rutas favoritas</p>
              <p style={{ color: '#8b949e', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Calcula una ruta en el mapa y guárdala aquí.</p>
              <Link href="/mapa" className="boton boton-primario"><MapPin size={14} /> Explorar el Mapa</Link>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {favoritos.map((fav) => (
              <div key={fav.id} className="tarjeta" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0,217,146,0.1)', border: '1px solid rgba(0,217,146,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Star size={18} color="#00d992" fill="#00d992" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f2f2f2', marginBottom: '0.25rem' }}>{fav.alias}</p>
                  <p style={{ fontSize: '0.8125rem', color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#00d992' }}>A</span> {fav.originLabel} &nbsp;→&nbsp; <span style={{ color: '#fb565b' }}>B</span> {fav.destinationLabel}
                  </p>
                </div>
                <Link href={`/mapa?oLat=${fav.originLatitude}&oLng=${fav.originLongitude}&dLat=${fav.destinationLatitude}&dLng=${fav.destinationLongitude}`} className="boton boton-secundario" style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem', flexShrink: 0 }}>
                  <MapPin size={13} /> Usar
                </Link>
                <button onClick={() => eliminar(fav.id)} disabled={eliminando === fav.id} className="boton boton-secundario" style={{ padding: '0.5rem 0.625rem', flexShrink: 0 }}>
                  <Trash2 size={14} color="#fb565b" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Preferencias ── */}
      {tab === 'preferencias' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {cargandoPref && <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e' }}>Cargando preferencias...</div>}

          {!cargandoPref && (
            <>
              {/* Criterio de ordenamiento preferido */}
              <div className="tarjeta" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Brain size={16} color="#00d992" />
                  <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f2f2f2' }}>Criterio de ruta preferido</h2>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#8b949e', marginBottom: '1rem' }}>
                  El sistema aprende automáticamente según tus búsquedas, pero puedes ajustarlo manualmente.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Object.entries(CRITERIO_MAP).map(([id, { label, icono, color }]) => (
                    <button
                      key={id}
                      onClick={() => setCriterioPref(id)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '0.875rem 1rem',
                        borderRadius: 10, cursor: 'pointer',
                        background: criterioPref === id ? `${color}12` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${criterioPref === id ? `${color}40` : '#2a2a2f'}`,
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ color, flexShrink: 0 }}>{icono}</div>
                      <span style={{ fontSize: '0.9rem', fontWeight: criterioPref === id ? 700 : 400, color: criterioPref === id ? color : '#c8c3c0' }}>{label}</span>
                      {criterioPref === id && <CheckCircle size={15} color={color} style={{ marginLeft: 'auto' }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Límites de búsqueda */}
              <div className="tarjeta" style={{ padding: '1.5rem' }}>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f2f2f2', marginBottom: '1rem' }}>Límites de búsqueda</h2>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.8125rem', color: '#8b949e', fontWeight: 600 }}>Máx. distancia a caminar</label>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f2f2f2' }}>{maxCaminata ?? 500} m</span>
                  </div>
                  <input
                    type="range" min={100} max={1500} step={50}
                    value={maxCaminata ?? 500} onChange={(e) => setMaxCaminata(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#00d992' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#555', marginTop: '0.25rem' }}>
                    <span>100 m</span><span>1500 m</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.8125rem', color: '#8b949e', fontWeight: 600 }}>Máx. transbordos permitidos</label>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f2f2f2' }}>{maxTransbordos ?? 2}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[0, 1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() => setMaxTransbordos(n)}
                        style={{
                          flex: 1, padding: '0.625rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: (maxTransbordos ?? 2) === n ? '#00d992' : 'rgba(255,255,255,0.06)',
                          color: (maxTransbordos ?? 2) === n ? '#000' : '#8b949e',
                          fontWeight: (maxTransbordos ?? 2) === n ? 700 : 400, fontSize: '0.875rem',
                          transition: 'all 0.15s',
                        }}
                      >{n}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patrones aprendidos */}
              {preferencias?.patronesAprendidos && preferencias.patronesAprendidos.totalCalculos > 0 && (
                <div className="tarjeta" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Brain size={15} color="#4cb3d4" />
                    <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f2f2f2' }}>Lo que el sistema aprendió de ti</h2>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#8b949e', marginBottom: '0.875rem' }}>
                    Basado en {preferencias.patronesAprendidos.totalCalculos} búsquedas realizadas
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {Object.entries(preferencias.patronesAprendidos.criterioUsos)
                      .sort(([, a], [, b]) => b - a)
                      .map(([criterio, usos]) => {
                        const cfg = CRITERIO_MAP[criterio];
                        const pct = Math.round((usos / preferencias.patronesAprendidos!.totalCalculos) * 100);
                        return (
                          <div key={criterio}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                              <span style={{ color: '#b8b3b0', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                {cfg?.icono} {cfg?.label ?? criterio}
                              </span>
                              <span style={{ color: '#f2f2f2', fontWeight: 700 }}>{pct}%</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 4, background: 'rgba(61,58,57,0.4)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 4, background: cfg?.color ?? '#00d992', width: `${pct}%`, transition: 'width 0.8s ease-out' }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Botón guardar */}
              <button
                onClick={guardarPreferencias}
                disabled={guardandoPref}
                style={{
                  width: '100%', padding: '0.875rem', borderRadius: 12, border: 'none',
                  background: prefGuardada ? 'rgba(0,217,146,0.15)' : '#00d992',
                  color: prefGuardada ? '#00d992' : '#000',
                  fontWeight: 800, fontSize: '0.9375rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s',
                }}
              >
                {prefGuardada
                  ? <><CheckCircle size={16} /> Preferencias guardadas</>
                  : guardandoPref ? 'Guardando...' : 'Guardar preferencias'
                }
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
