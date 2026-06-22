'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Bus, ArrowLeft, Radio, Star, LogOut, User, RotateCcw, Navigation,
  CheckCircle, Footprints, Loader2, MapPin, Clock, Zap, Wallet, LocateFixed,
} from 'lucide-react';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { authServicio } from '../../../services/auth.servicio';
import { api } from '../../../services/api';
import { planificadorServicio, OpcionRuta, Segmento, SegmentoBus, SegmentoCaminata } from '../../../services/planificador.servicio';
import { iaServicio } from '../../../services/ia.servicio';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Segmento as SegmentoMapa } from '../../../components/mapa/MapaPrincipal';

const MapaConBuses = dynamic(() => import('@/components/mapa/MapaPrincipal'), { ssr: false });

type Punto = [number, number];

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

function esPasajero(rol?: string) {
  return rol === 'PASSENGER' || rol === 'PASAJERO';
}

function formatMin(min: number): string {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

type Criterio = 'rapida' | 'economica' | 'caminata';

function opcionesOrdenadas(opciones: OpcionRuta[] | null, criterio: Criterio): OpcionRuta[] {
  if (!opciones || opciones.length === 0) return [];
  const copia = [...opciones];
  if (criterio === 'rapida')    return copia.sort((a, b) => a.tiempoTotalMin - b.tiempoTotalMin);
  if (criterio === 'economica') return copia.sort((a, b) => a.costoTotal - b.costoTotal);
  if (criterio === 'caminata')  return copia.sort((a, b) => a.caminataMetros - b.caminataMetros);
  return copia;
}

// ─── Panel de resultados de ruta ──────────────────────────────────────────────
function PanelResultados({
  opciones,
  opcionActiva,
  onSeleccionar,
  onLimpiar,
  origen,
  destino,
  usuarioId,
  onFavoritoGuardado,
  criterio,
  onCriterioChange,
}: {
  opciones: OpcionRuta[];
  opcionActiva: number;
  onSeleccionar: (idx: number) => void;
  onLimpiar: () => void;
  origen: [number, number] | null;
  destino: [number, number] | null;
  usuarioId?: number | string;
  onFavoritoGuardado?: (fav: Favorito) => void;
  criterio: Criterio;
  onCriterioChange: (c: Criterio) => void;
}) {
  // Validar opciones antes de usar
  if (!opciones || !Array.isArray(opciones) || opciones.length === 0) {
    return <div style={{ padding: '1rem', color: '#8b949e' }}>Sin opciones disponibles</div>;
  }

  const opcionesOrd = opciones ? opcionesOrdenadas(opciones, criterio) : [];
  const opcion = opcionesOrd[opcionActiva];
  const [guardando, setGuardando] = useState(false);
  const [alias, setAlias] = useState('');
  const [editandoAlias, setEditandoAlias] = useState(false);
  const [favGuardado, setFavGuardado] = useState<Favorito | null>(null);

  const guardarFavorito = async () => {
    if (!origen || !destino || !usuarioId || !alias.trim()) return;
    setGuardando(true);
    try {
      const { data } = await api.post('/favoritos', {
        usuarioId: Number(usuarioId),
        alias: alias.trim(),
        latitudOrigen: origen[0],
        longitudOrigen: origen[1],
        etiquetaOrigen: `${origen[0].toFixed(4)}, ${origen[1].toFixed(4)}`,
        latitudDestino: destino[0],
        longitudDestino: destino[1],
        etiquetaDestino: `${destino[0].toFixed(4)}, ${destino[1].toFixed(4)}`,
      });
      const nuevo: Favorito = {
        id: data.id?.toString() ?? String(Date.now()),
        alias: alias.trim(),
        originLabel: `${origen[0].toFixed(4)}, ${origen[1].toFixed(4)}`,
        destinationLabel: `${destino[0].toFixed(4)}, ${destino[1].toFixed(4)}`,
        originLatitude: origen[0],
        originLongitude: origen[1],
        destinationLatitude: destino[0],
        destinationLongitude: destino[1],
      };
      setFavGuardado(nuevo);
      setEditandoAlias(false);
      setAlias('');
      onFavoritoGuardado?.(nuevo);
    } catch {}
    setGuardando(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Cabecera + criterios de ordenamiento */}
      <div style={{ padding: '1rem 1.25rem 0', borderBottom: '1px solid #1e1e22' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {opciones.length} {opciones.length === 1 ? 'opción' : 'opciones'}
          </p>
          <button onClick={onLimpiar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#555', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <RotateCcw size={11} /> Nueva búsqueda
          </button>
        </div>

        {/* Botones de ordenamiento */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.625rem' }}>
          {([
            { id: 'rapida',    label: 'Más rápida',   icono: <Zap size={11} /> },
            { id: 'economica', label: 'Más barata',    icono: <Wallet size={11} /> },
            { id: 'caminata',  label: 'Menos caminar', icono: <Footprints size={11} /> },
          ] as { id: Criterio; label: string; icono: React.ReactNode }[]).map((c) => (
            <button
              key={c.id}
              onClick={() => { onCriterioChange(c.id); onSeleccionar(0); }}
              style={{
                flex: 1, padding: '0.375rem 0.25rem', fontSize: '0.6875rem', fontWeight: 600,
                border: `1px solid ${criterio === c.id ? 'rgba(0,217,146,0.4)' : '#1e1e22'}`,
                borderRadius: 8, cursor: 'pointer',
                background: criterio === c.id ? 'rgba(0,217,146,0.1)' : 'transparent',
                color: criterio === c.id ? '#00d992' : '#555',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                transition: 'all 0.15s',
              }}
            >
              {c.icono} {c.label}
            </button>
          ))}
        </div>

        {/* Tabs de opciones — valor clave según criterio */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '-1px' }}>
          {opcionesOrd.map((op, i) => {
            const activo = opcionActiva === i;
            const valorClave =
              criterio === 'economica'
                ? op.costoTotal > 0 ? `Bs ${op.costoTotal.toFixed(2)}` : 'Gratis'
                : criterio === 'caminata'
                ? op.caminataMetros > 0 ? `${op.caminataMetros} m` : 'Sin caminar'
                : formatMin(op.tiempoTotalMin);
            const subtexto =
              criterio === 'economica'
                ? formatMin(op.tiempoTotalMin)
                : criterio === 'caminata'
                ? formatMin(op.tiempoTotalMin)
                : op.costoTotal > 0 ? `Bs ${op.costoTotal.toFixed(2)}` : '';
            return (
              <button
                key={i}
                onClick={() => onSeleccionar(i)}
                style={{
                  flex: 1, padding: '0.5rem 0.375rem', fontSize: '0.6875rem',
                  border: '1px solid transparent', borderBottom: 'none',
                  borderRadius: '8px 8px 0 0', cursor: 'pointer',
                  background: activo ? '#0d0d0f' : 'transparent',
                  color: activo ? '#00d992' : '#555',
                  borderColor: activo ? '#1e1e22' : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.75rem', color: activo ? '#00d992' : '#666' }}>
                  {valorClave}
                </span>
                {subtexto && (
                  <span style={{ fontSize: '0.6rem', color: activo ? '#555' : '#3a3a3f', fontWeight: 400 }}>
                    {subtexto}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalle de opción seleccionada */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {/* Resumen con espera + costo */}
        <div style={{ background: 'rgba(0,217,146,0.06)', border: '1px solid rgba(0,217,146,0.15)', borderRadius: 12, padding: '0.875rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: opcion.tiempoEsperaMin > 0 ? '0.75rem' : 0 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00d992' }}>{formatMin(opcion.tiempoTotalMin)}</p>
              <p style={{ fontSize: '0.6875rem', color: '#555' }}>tiempo total</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f2f2f2' }}>{opcion.distanciaTotalKm} km</p>
              <p style={{ fontSize: '0.6875rem', color: '#555' }}>en micro</p>
            </div>
            {opcion.costoTotal > 0 && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4cb3d4' }}>Bs {opcion.costoTotal.toFixed(2)}</p>
                <p style={{ fontSize: '0.6875rem', color: '#555' }}>costo</p>
              </div>
            )}
            {opcion.caminataMetros > 0 && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#8b949e' }}>{opcion.caminataMetros} m</p>
                <p style={{ fontSize: '0.6875rem', color: '#555' }}>caminando</p>
              </div>
            )}
            {opcion.transbordos > 0 && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffba00' }}>{opcion.transbordos}</p>
                <p style={{ fontSize: '0.6875rem', color: '#555' }}>transbordo</p>
              </div>
            )}
          </div>

          {/* Tiempo de espera */}
          {opcion.tiempoEsperaMin > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
              <Clock size={13} color="#ffba00" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '0.8125rem', color: '#f2f2f2', fontWeight: 700 }}>
                  ~{opcion.tiempoEsperaMin} min de espera
                </span>
                <span style={{ fontSize: '0.75rem', color: '#555', marginLeft: '0.375rem' }}>
                  hasta el próximo micro
                </span>
              </div>
              <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: opcion.tiempoEsperaMin <= 5 ? '#00d992' : opcion.tiempoEsperaMin <= 12 ? '#ffba00' : '#fb565b' }} />
            </div>
          )}
        </div>

        {/* Guardar como favorito — ubicado junto al resumen */}
        {usuarioId && (
          favGuardado ? (
            <div style={{ background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.25)', borderRadius: 12, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Star size={15} color="#00d992" fill="#00d992" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', color: '#00d992', fontWeight: 700, flex: 1 }}>
                Guardado como «{favGuardado.alias}»
              </span>
            </div>
          ) : editandoAlias ? (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a2a2f', borderRadius: 12, padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600 }}>Nombre para este favorito</p>
              <input
                autoFocus
                type="text"
                placeholder="Ej: Casa → Trabajo"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && guardarFavorito()}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid #3a3a3f', borderRadius: 8, padding: '0.625rem 0.875rem', color: '#f2f2f2', fontSize: '0.875rem', outline: 'none', width: '100%' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={guardarFavorito}
                  disabled={guardando || !alias.trim()}
                  style={{
                    flex: 1, background: alias.trim() ? '#00d992' : 'rgba(0,217,146,0.3)',
                    border: 'none', borderRadius: 8, padding: '0.625rem',
                    cursor: alias.trim() ? 'pointer' : 'not-allowed',
                    color: alias.trim() ? '#000' : '#00d992', fontWeight: 700, fontSize: '0.875rem',
                  }}
                >
                  {guardando ? 'Guardando...' : '✓ Guardar'}
                </button>
                <button
                  onClick={() => { setEditandoAlias(false); setAlias(''); }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #2a2a2f', borderRadius: 8, padding: '0.625rem 0.875rem', cursor: 'pointer', color: '#8b949e', fontSize: '0.875rem' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditandoAlias(true)}
              style={{
                width: '100%', background: 'rgba(255,186,0,0.06)', border: '1px solid rgba(255,186,0,0.2)',
                borderRadius: 12, padding: '0.75rem 1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.625rem', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,186,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,186,0,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,186,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,186,0,0.2)'; }}
            >
              <Star size={15} color="#ffba00" />
              <span style={{ fontSize: '0.875rem', color: '#ffba00', fontWeight: 600 }}>Guardar ruta como favorito</span>
            </button>
          )
        )}

        {/* Segmentos paso a paso */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {opcion.segmentos.map((seg, i) => {
            if (seg.tipo === 'bus') {
              const s = seg as SegmentoBus;
              return (
                <div key={i} style={{
                  background: `${s.linea.color}12`,
                  borderTop: `1px solid ${s.linea.color}35`,
                  borderRight: `1px solid ${s.linea.color}35`,
                  borderBottom: `1px solid ${s.linea.color}35`,
                  borderLeft: `4px solid ${s.linea.color}`,
                  borderRadius: '0 12px 12px 0', padding: '0.875rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                    {s.linea.imageUrl ? (
                      <img src={s.linea.imageUrl} alt={s.linea.nombre} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: `2px solid ${s.linea.color}` }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: s.linea.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bus size={18} color="white" />
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f2f2f2', lineHeight: 1.2 }}>{s.linea.nombre}</p>
                      <p style={{ fontSize: '0.75rem', color: s.linea.color, fontWeight: 600 }}>{s.linea.codigo}</p>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f2f2f2' }}>{formatMin(s.tiempoMin)}</p>
                      <p style={{ fontSize: '0.6875rem', color: '#555' }}>{s.distanciaKm} km · Bs {s.linea.tarifa.toFixed(2)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d992', flexShrink: 0 }} />
                    Subir en zona cercana al punto A
                    <div style={{ flex: 1, height: 1, background: '#2a2a2f', margin: '0 4px' }} />
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: '#fb565b', flexShrink: 0 }} />
                    Bajar cerca del punto B
                  </div>
                </div>
              );
            } else {
              const s = seg as SegmentoCaminata;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderTop: '1px solid #1e1e22', borderRight: '1px solid #1e1e22',
                  borderBottom: '1px solid #1e1e22', borderLeft: '3px dashed #3a3a3f',
                  borderRadius: '0 10px 10px 0',
                }}>
                  <Footprints size={16} color="#8b949e" />
                  <div>
                    <p style={{ fontSize: '0.8125rem', color: '#8b949e', fontWeight: 600 }}>Caminar {s.distanciaMetros} m</p>
                    <p style={{ fontSize: '0.6875rem', color: '#555' }}>{formatMin(s.tiempoMin)} aproximadamente</p>
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PaginaMapa() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { usuario, token } = useUsuarioAlmacen();
  const [hidratado, setHidratado] = useState(false);
  const [origen, setOrigen] = useState<Punto | null>(() => {
    const oLat = searchParams.get('oLat');
    const oLng = searchParams.get('oLng');
    return oLat && oLng ? [parseFloat(oLat), parseFloat(oLng)] : null;
  });
  const [destino, setDestino] = useState<Punto | null>(() => {
    const dLat = searchParams.get('dLat');
    const dLng = searchParams.get('dLng');
    return dLat && dLng ? [parseFloat(dLat), parseFloat(dLng)] : null;
  });
  const [criterioOrden, setCriterioOrden] = useState<Criterio>('rapida');
  const [favoritoActivo, setFavoritoActivo] = useState<string | null>(null);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [cargandoFavs, setCargandoFavs] = useState(false);

  // Estado del planificador
  const [calculando, setCalculando] = useState(false);
  const [opciones, setOpciones] = useState<OpcionRuta[] | null>(null);
  const [opcionActiva, setOpcionActiva] = useState(0);
  const [errorCalculo, setErrorCalculo] = useState<string | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<string | null>(null);

  useEffect(() => { setHidratado(true); }, []);

  const pasajero = hidratado && esPasajero(usuario?.rol as string);
  const paso: 1 | 2 | null = !origen ? 1 : !destino ? 2 : null;

  useEffect(() => {
    if (!pasajero || !usuario?.id || !token) return;
    setCargandoFavs(true);
    api.get(`/favoritos/usuario/${usuario.id}`)
      .then(({ data }) => setFavoritos(Array.isArray(data) ? data : []))
      .catch(() => setFavoritos([]))
      .finally(() => setCargandoFavs(false));
  }, [pasajero, usuario?.id, token]);

  // Permitir selección tanto a pasajeros como a usuarios no logueados
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setErrorUbicacion('Tu dispositivo no soporta geolocalización.');
      return;
    }
    setObteniendoUbicacion(true);
    setErrorUbicacion(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigen([pos.coords.latitude, pos.coords.longitude]);
        setFavoritoActivo(null);
        setObteniendoUbicacion(false);
      },
      () => {
        setErrorUbicacion('No se pudo obtener tu ubicación. Verifica los permisos.');
        setObteniendoUbicacion(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const puedeSeleccionar = !opciones && (pasajero || !token);
  const handleClickMapa = puedeSeleccionar
    ? (lat: number, lng: number) => {
        const p: Punto = [Number(lat), Number(lng)];
        if (!origen) { setOrigen(p); setFavoritoActivo(null); return; }
        if (!destino) { setDestino(p); setFavoritoActivo(null); return; }
        setOrigen(p); setDestino(null); setFavoritoActivo(null);
      }
    : undefined;

  const limpiar = () => {
    setOrigen(null); setDestino(null); setFavoritoActivo(null);
    setOpciones(null); setErrorCalculo(null);
  };

  const usarFavorito = (fav: Favorito) => {
    setOrigen([Number(fav.originLatitude), Number(fav.originLongitude)]);
    setDestino([Number(fav.destinationLatitude), Number(fav.destinationLongitude)]);
    setFavoritoActivo(fav.id);
    setOpciones(null);
  };

  const calcular = async () => {
    if (!origen || !destino) return;
    // Requiere sesión activa
    if (!token) {
      router.push('/autenticacion/iniciar-sesion');
      return;
    }
    setCalculando(true);
    setErrorCalculo(null);
    try {
      const resultado = await planificadorServicio.calcular(origen[0], origen[1], destino[0], destino[1]);
      setOpciones(resultado);
      setOpcionActiva(0);
      // Registrar uso del criterio para aprendizaje (HU-22) — sin bloquear
      if (usuario?.id) {
        iaServicio.registrarUsoRuta(String(usuario.id), criterioOrden).catch(() => {});
      }
    } catch {
      setErrorCalculo('No se pudo calcular la ruta. Intenta de nuevo.');
    } finally {
      setCalculando(false);
    }
  };

  const handleLogout = async () => {
    await authServicio.logout();
    router.push('/');
  };

  // Segmentos de la opción activa para dibujar en el mapa (con orden aplicado)
  const opcionesOrdenadasPadre = (opciones && Array.isArray(opciones) && opciones.length > 0)
    ? opcionesOrdenadas(opciones, criterioOrden)
    : [];
  const segmentosActivos: SegmentoMapa[] | undefined =
    opcionesOrdenadasPadre && opcionesOrdenadasPadre.length > 0 && opcionesOrdenadasPadre[opcionActiva]
      ? (opcionesOrdenadasPadre[opcionActiva].segmentos as SegmentoMapa[])
      : undefined;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#050507' }}>

      {/* Header */}
      <header style={{
        padding: '0 1.5rem', flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'stretch',
        zIndex: 1000, position: 'relative',
        background: '#0d0d0f', borderBottom: '1px solid #1e1e22',
        height: 54,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,217,146,0.12)', border: '1px solid rgba(0,217,146,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bus size={15} color="#00d992" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f2f2f2' }}>
            Transit<span style={{ color: '#00d992' }}>AI</span>
          </span>
        </div>

        {/* Navegación central — 2 vistas principales para pasajero */}
        {hidratado && pasajero && (
          <nav style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
            {[
              { href: '/mapa', label: 'Planificar Viaje', icon: <Navigation size={14} />, activa: true },
              { href: '/lineas-mapa', label: 'Ver Líneas', icon: <MapPin size={14} />, activa: false },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0 1.25rem', fontSize: '0.8125rem', fontWeight: 600,
                  color: item.activa ? '#00d992' : '#8b949e',
                  borderBottom: item.activa ? '2px solid #00d992' : '2px solid transparent',
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Derecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#00d992', fontWeight: 600 }}>
            <Radio size={10} /> En vivo
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
          {hidratado && !pasajero && (
            <>
              <Link href="/" className="boton boton-secundario" style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}>
                <ArrowLeft size={13} /> Inicio
              </Link>
              <Link href="/lineas-mapa" className="boton boton-secundario" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                <MapPin size={13} /> Líneas
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Cuerpo */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Panel lateral */}
        {(pasajero || (!token && hidratado)) && (
          <aside style={{
            width: 290, flexShrink: 0,
            background: '#0d0d0f', borderRight: '1px solid #1e1e22',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto', zIndex: 500,
          }}>

            {/* Si hay resultados, mostrar panel de resultados */}
            {opciones ? (
              <PanelResultados
                opciones={opciones}
                opcionActiva={opcionActiva}
                onSeleccionar={(i) => setOpcionActiva(i)}
                onLimpiar={limpiar}
                origen={origen}
                destino={destino}
                usuarioId={usuario?.id}
                onFavoritoGuardado={(fav) => setFavoritos((prev) => [fav, ...prev])}
                criterio={criterioOrden}
                onCriterioChange={setCriterioOrden}
              />
            ) : (
              <>
                {/* Selección de puntos */}
                <div style={{ padding: '1.25rem' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                    Planifica tu ruta
                  </p>

                  {/* Paso 1 — Origen */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                    padding: '0.875rem', borderRadius: 12, marginBottom: '0.5rem',
                    background: origen ? 'rgba(0,217,146,0.06)' : paso === 1 ? 'rgba(0,217,146,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${origen ? 'rgba(0,217,146,0.25)' : paso === 1 ? 'rgba(0,217,146,0.4)' : '#1e1e22'}`,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: origen ? '#00d992' : paso === 1 ? 'rgba(0,217,146,0.2)' : 'rgba(255,255,255,0.06)',
                      border: `2px solid ${origen ? '#00d992' : paso === 1 ? '#00d992' : '#2a2a2f'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {origen ? <CheckCircle size={16} color="white" /> : <span style={{ fontWeight: 900, fontSize: '13px', color: paso === 1 ? '#00d992' : '#555' }}>A</span>}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Origen</p>
                      {origen
                        ? <p style={{ fontSize: '0.8125rem', color: '#00d992', fontWeight: 600 }}>{origen[0].toFixed(4)}, {origen[1].toFixed(4)}</p>
                        : <p style={{ fontSize: '0.8125rem', color: paso === 1 ? '#00d992' : '#444', fontStyle: paso === 1 ? 'normal' : 'italic' }}>{paso === 1 ? '↓ Toca el mapa' : 'Sin definir'}</p>
                      }
                    </div>
                    {origen && (
                      <button onClick={() => { setOrigen(null); setDestino(null); setFavoritoActivo(null); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4 }}>✕</button>
                    )}
                  </div>

                  <div style={{ display: 'flex', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 2, height: 20, background: origen && destino ? 'linear-gradient(#00d992,#fb565b)' : '#1e1e22', borderRadius: 2 }} />
                  </div>

                  {/* Paso 2 — Destino */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                    padding: '0.875rem', borderRadius: 12, marginBottom: '1rem',
                    background: destino ? 'rgba(251,86,91,0.06)' : paso === 2 ? 'rgba(251,86,91,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${destino ? 'rgba(251,86,91,0.25)' : paso === 2 ? 'rgba(251,86,91,0.4)' : '#1e1e22'}`,
                    opacity: !origen && !destino ? 0.45 : 1, transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: destino ? '#fb565b' : paso === 2 ? 'rgba(251,86,91,0.2)' : 'rgba(255,255,255,0.06)',
                      border: `2px solid ${destino ? '#fb565b' : paso === 2 ? '#fb565b' : '#2a2a2f'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {destino ? <CheckCircle size={16} color="white" /> : <span style={{ fontWeight: 900, fontSize: '13px', color: paso === 2 ? '#fb565b' : '#555' }}>B</span>}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destino</p>
                      {destino
                        ? <p style={{ fontSize: '0.8125rem', color: '#fb565b', fontWeight: 600 }}>{destino[0].toFixed(4)}, {destino[1].toFixed(4)}</p>
                        : <p style={{ fontSize: '0.8125rem', color: paso === 2 ? '#fb565b' : '#444', fontStyle: paso === 2 ? 'normal' : 'italic' }}>{paso === 2 ? '↓ Toca el mapa' : 'Sin definir'}</p>
                      }
                    </div>
                    {destino && (
                      <button onClick={() => { setDestino(null); setFavoritoActivo(null); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4 }}>✕</button>
                    )}
                  </div>

                  {/* Botón CALCULAR */}
                  {origen && destino && (
                    token ? (
                      <button
                        onClick={calcular}
                        disabled={calculando}
                        style={{
                          width: '100%', padding: '0.875rem',
                          background: calculando ? 'rgba(0,217,146,0.15)' : '#00d992',
                          border: 'none', borderRadius: 12,
                          color: calculando ? '#00d992' : '#000',
                          fontWeight: 800, fontSize: '0.9375rem',
                          cursor: calculando ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          transition: 'all 0.15s',
                          boxShadow: calculando ? 'none' : '0 4px 16px rgba(0,217,146,0.25)',
                        }}
                      >
                        {calculando
                          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Calculando...</>
                          : <><Navigation size={16} /> Calcular Ruta</>
                        }
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ background: 'rgba(255,186,0,0.08)', border: '1px solid rgba(255,186,0,0.2)', borderRadius: 10, padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#ffba00', textAlign: 'center' }}>
                          Inicia sesión para calcular rutas
                        </div>
                        <Link href="/autenticacion/iniciar-sesion" className="boton boton-primario" style={{ justifyContent: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 700 }}>
                          Iniciar Sesión
                        </Link>
                      </div>
                    )
                  )}

                  {errorCalculo && (
                    <p style={{ fontSize: '0.8125rem', color: '#fb565b', marginTop: '0.75rem', textAlign: 'center' }}>{errorCalculo}</p>
                  )}

                  {(origen || destino) && (
                    <button onClick={limpiar} style={{
                      width: '100%', background: 'none', border: '1px solid #1e1e22',
                      borderRadius: 10, padding: '0.5rem', cursor: 'pointer', color: '#555',
                      fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      marginTop: '0.625rem',
                    }}>
                      <RotateCcw size={12} /> Reiniciar selección
                    </button>
                  )}
                </div>

                <div style={{ height: 1, background: '#1e1e22', margin: '0 1.25rem' }} />

                {/* Favoritos */}
                <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>
                    Rutas Favoritas
                  </p>

                  {cargandoFavs && <p style={{ fontSize: '0.8125rem', color: '#555', textAlign: 'center', padding: '1.5rem 0' }}>Cargando...</p>}

                  {!cargandoFavs && favoritos.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                      <Star size={26} color="#2a2a2f" style={{ marginBottom: '0.75rem' }} />
                      <p style={{ fontSize: '0.8125rem', color: '#444' }}>Sin favoritos aún</p>
                      <p style={{ fontSize: '0.75rem', color: '#333', marginTop: '0.375rem' }}>Calcula una ruta y guárdala</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {favoritos.map((fav) => {
                      const activo = favoritoActivo === fav.id;
                      const confirmando = confirmandoEliminar === fav.id;
                      return (
                        <div key={fav.id} style={{
                          background: activo ? 'rgba(0,217,146,0.08)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${activo ? 'rgba(0,217,146,0.3)' : '#1e1e22'}`,
                          borderRadius: 11, overflow: 'hidden', transition: 'all 0.15s',
                        }}>
                          {/* Fila principal */}
                          <button
                            onClick={() => { usarFavorito(fav); setConfirmandoEliminar(null); }}
                            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.75rem 0.875rem', cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <Star size={12} color={activo ? '#00d992' : '#555'} fill={activo ? '#00d992' : 'none'} />
                              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: activo ? '#00d992' : '#c8c3c0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.alias}</span>
                              {activo && <span style={{ fontSize: '0.6875rem', color: '#00d992', fontWeight: 700, flexShrink: 0 }}>activo</span>}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {fav.originLabel} → {fav.destinationLabel}
                            </p>
                          </button>

                          {/* Fila eliminar */}
                          {confirmando ? (
                            <div style={{ display: 'flex', borderTop: '1px solid #1e1e22', background: 'rgba(251,86,91,0.06)' }}>
                              <span style={{ flex: 1, fontSize: '0.75rem', color: '#fb565b', padding: '0.5rem 0.875rem', display: 'flex', alignItems: 'center' }}>¿Eliminar favorito?</span>
                              <button
                                onClick={async () => {
                                  try { await api.delete(`/favoritos/${fav.id}`); setFavoritos((p) => p.filter((f) => f.id !== fav.id)); if (favoritoActivo === fav.id) setFavoritoActivo(null); } catch {}
                                  setConfirmandoEliminar(null);
                                }}
                                style={{ background: '#fb565b', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.75rem', padding: '0.5rem 0.875rem', cursor: 'pointer' }}
                              >Sí</button>
                              <button
                                onClick={() => setConfirmandoEliminar(null)}
                                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderLeft: '1px solid #1e1e22', color: '#8b949e', fontSize: '0.75rem', padding: '0.5rem 0.875rem', cursor: 'pointer' }}
                              >No</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmandoEliminar(fav.id)}
                              style={{ width: '100%', background: 'none', border: 'none', borderTop: '1px solid #1e1e22', padding: '0.375rem', cursor: 'pointer', fontSize: '0.6875rem', color: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', transition: 'color 0.12s' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#fb565b')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </aside>
        )}

        {/* Mapa */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapaConBuses
            onClickMapa={handleClickMapa}
            origen={origen}
            destino={destino}
            paso={paso}
            segmentosRuta={segmentosActivos}
          />

          {/* Botón flotante — Mi ubicación */}
          {puedeSeleccionar && (
            <div style={{ position: 'absolute', bottom: 80, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              {errorUbicacion && (
                <div style={{
                  background: 'rgba(251,86,91,0.15)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(251,86,91,0.35)', borderRadius: 10,
                  padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#fb565b',
                  maxWidth: 200, textAlign: 'right',
                }}>
                  {errorUbicacion}
                </div>
              )}
              <button
                onClick={usarMiUbicacion}
                disabled={obteniendoUbicacion}
                title="Usar mi ubicación actual"
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: obteniendoUbicacion ? 'rgba(13,13,15,0.9)' : '#0d0d0f',
                  border: `2px solid ${obteniendoUbicacion ? 'rgba(0,217,146,0.4)' : 'rgba(0,217,146,0.6)'}`,
                  cursor: obteniendoUbicacion ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { if (!obteniendoUbicacion) e.currentTarget.style.background = '#1a1a1f'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = obteniendoUbicacion ? 'rgba(13,13,15,0.9)' : '#0d0d0f'; }}
              >
                {obteniendoUbicacion
                  ? <Loader2 size={18} color="#00d992" style={{ animation: 'spin 1s linear infinite' }} />
                  : <LocateFixed size={18} color="#00d992" />
                }
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
