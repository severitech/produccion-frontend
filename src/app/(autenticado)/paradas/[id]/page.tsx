'use client';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, MapPin, Trash2, AlertCircle, Palette } from 'lucide-react';
import { paradasServicio, type Parada, type Punto } from '@/services/paradas.servicio';
import { lineasServicio } from '@/services/lineas.servicio';
import { useUsuarioAlmacen } from '@/almacen/usuario.almacen';
import { Cargando } from '@/components/dashboard/Cargando';
import MapaEditor from '@/components/mapa/MapaEditor';

const TIPOS_SUPERFICIE = {
  STATION: { label: 'Estación', color: '#FF6B6B' },
  SQUARE: { label: 'Plaza/Parque', color: '#4ECDC4' },
  STREET: { label: 'Calle', color: '#FFE66D' },
  PARKING: { label: 'Estacionamiento', color: '#95E1D3' },
  BUILDING: { label: 'Edificio', color: '#C7B3E5' },
  MARKET: { label: 'Mercado', color: '#F7DC6F' },
  OTHER: { label: 'Otro', color: '#BDC3C7' },
};

export default function PaginaEditarParada() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();
  const { usuario } = useUsuarioAlmacen();
  const sindicatoIdUsuario = usuario?.sindicatoId ? String(usuario.sindicatoId) : '';

  // Form
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lineaId, setLineaId] = useState('');
  const [centerLat, setCenterLat] = useState(-17.783);
  const [centerLng, setCenterLng] = useState(-63.182);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [orderIndex, setOrderIndex] = useState(0);
  const [puntosLimite, setPuntosLimite] = useState<Punto[]>([]);
  const [tipoSuperficie, setTipoSuperficie] = useState<string>('STATION');
  const [dibujandoPoligono, setDibujandoPoligono] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [validacionSuperficie, setValidacionSuperficie] = useState<string>('');


  const esNueva = id === 'nueva';

  const { data: parada, isLoading } = useQuery<Parada>({
    queryKey: ['parada-detalle', id],
    queryFn: () => (esNueva ? Promise.resolve(null) : paradasServicio.obtenerPorId(id)),
    enabled: !esNueva,
  });

  const { data: lineas = [] } = useQuery({
    queryKey: ['lineas'],
    queryFn: async () => {
      const resultado = await lineasServicio.obtenerTodas();
      console.log('Líneas obtenidas:', resultado);
      return resultado;
    },
  });

  useEffect(() => {
    if (!esNueva && parada) {
      console.log('Parada cargada:', parada);
      setNombre(parada.name || parada.nombre || '');
      setDescripcion(parada.description || parada.descripcion || '');
      setLineaId(String(parada.lineId || ''));
      setCenterLat(Number(parada.centerLat) || -17.783);
      setCenterLng(Number(parada.centerLng) || -63.182);
      setRadiusMeters(parada.radiusMeters || 100);
      const puntosValidos = (parada.boundaryPoints || []).filter((p: any) => p && p.lat !== undefined && p.lng !== undefined);
      setPuntosLimite(puntosValidos);
      setTipoSuperficie(parada.surfaceType || parada.tipoSuperficie || 'STATION');
    } else if (esNueva && lineas.length > 0) {
      setLineaId(String(lineas[0].id));
    }
  }, [parada, esNueva, lineas]);


  const guardar = useMutation({
    mutationFn: () => {
      if (!nombre.trim()) {
        setError('El nombre es obligatorio');
        return Promise.reject();
      }
      if (!lineaId) {
        setError('Selecciona una línea');
        return Promise.reject();
      }

      console.log('=== DEBUG GUARDAR PARADA ===');
      console.log('puntosLimite:', puntosLimite);
      console.log('puntosLimite.length:', puntosLimite.length);
      console.log('puntosLimite[0]:', puntosLimite[0]);
      console.log('typeof puntosLimite[0]:', typeof puntosLimite[0]);

      const datos = {
        lineaId,
        nombre,
        descripcion,
        centerLat,
        centerLng,
        radiusMeters,
        boundaryPoints: puntosLimite,
        tipoSuperficie,
        orderIndex,
      };

      console.log('Guardando parada con datos:', datos);
      console.log('datos.boundaryPoints:', datos.boundaryPoints);
      return esNueva ? paradasServicio.crear(datos as any) : paradasServicio.actualizar(id, datos as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paradas'] });
      setExito(esNueva ? 'Parada creada' : 'Parada actualizada');
      setTimeout(() => router.push('/paradas'), 1500);
    },
    onError: (err: any) => {
      console.error('Error al guardar parada:', err);
      const mensaje = err?.response?.data?.error || err?.message || 'Error al guardar';
      setError(mensaje);
    },
  });

  if (!esNueva && isLoading) return <div style={{ padding: '2rem' }}><Cargando /></div>;

  return (
    <div style={{ position: 'fixed', top: 0, left: 220, right: 0, bottom: 0, display: 'flex', background: '#050507', zIndex: 10 }}>
      {/* Panel */}
      <div style={{ width: 360, flexShrink: 0, background: '#101010', borderRight: '1px solid #3d3a39', display: 'flex', flexDirection: 'column' }}>
        {/* Encabezado */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #3d3a39', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="boton boton-secundario"
            style={{ padding: '0.35rem 0.6rem', flexShrink: 0 }}
            onClick={() => router.push('/paradas')}
          >
            <ArrowLeft size={14} />
          </button>
          <h2 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f2f2f2', margin: 0 }}>
            {esNueva ? 'Nueva Parada' : nombre}
          </h2>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Línea */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b8b3b0', display: 'block', marginBottom: '0.3rem' }}>
              Línea *
            </label>
            <select
              className="campo-entrada"
              value={lineaId}
              onChange={(e) => setLineaId(e.target.value)}
            >
              <option value="">Selecciona una línea</option>
              {lineas.map((l: any) => (
                <option key={String(l.id)} value={String(l.id)}>
                  {l.code || l.numero} – {l.name || l.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b8b3b0', display: 'block', marginBottom: '0.3rem' }}>
              Nombre *
            </label>
            <input className="campo-entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>

          {/* Descripción */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b8b3b0', display: 'block', marginBottom: '0.3rem' }}>
              Descripción
            </label>
            <textarea className="campo-entrada" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={{ minHeight: '60px' }} />
          </div>

          {/* Tipo de Superficie */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b8b3b0', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
              <Palette size={12} /> Tipo de Superficie
            </label>
            <select
              className="campo-entrada"
              value={tipoSuperficie}
              onChange={(e) => setTipoSuperficie(e.target.value)}
            >
              {Object.entries(TIPOS_SUPERFICIE).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>


          {/* Dibujar Área */}
          <div style={{ background: dibujandoPoligono ? 'rgba(0,217,146,0.15)' : '#1a1a1a', borderRadius: 8, padding: '1rem', border: dibujandoPoligono ? '2px solid #00d992' : '1px solid #3d3a39' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: dibujandoPoligono ? '#00d992' : '#f2f2f2', margin: '0 0 0.5rem 0' }}>
              {dibujandoPoligono ? 'DIBUJANDO ÁREA' : 'Delimitar Área de Parada'}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#8b949e', margin: '0 0 0.75rem 0', lineHeight: '1.4' }}>
              {dibujandoPoligono
                ? `Haz clic en el mapa para agregar puntos (${puntosLimite.length} puntos)`
                : 'Dibuja un polígono en el mapa para definir el área de la parada'}
            </p>
            {dibujandoPoligono ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="boton boton-primario"
                  style={{ flex: 1, fontSize: '0.75rem', padding: '0.6rem', background: '#00d992', color: '#000', fontWeight: 600 }}
                  onClick={() => setDibujandoPoligono(false)}
                >
                  Listo ({puntosLimite.length} pts)
                </button>
                {puntosLimite.length > 0 && (
                  <button
                    className="boton"
                    style={{ flex: 1, fontSize: '0.75rem', padding: '0.6rem', background: 'rgba(251,86,91,0.1)', color: '#fb565b', border: '1px solid rgba(251,86,91,0.2)' }}
                    onClick={() => setPuntosLimite([])}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            ) : (
              <button
                className="boton boton-primario"
                style={{ width: '100%', fontSize: '0.75rem', padding: '0.6rem', fontWeight: 600 }}
                onClick={() => {
                  setDibujandoPoligono(true);
                  setError('');
                }}
              >
                ✏ Dibujar Polígono
              </button>
            )}
            {puntosLimite.length > 0 && (
              <>
                <p style={{ fontSize: '0.65rem', color: '#8b949e', margin: '0.5rem 0 0 0' }}>
                  Mínimo 3 puntos requeridos
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    className="boton"
                    style={{
                      flex: 1,
                      fontSize: '0.7rem',
                      padding: '0.3rem',
                      background: 'rgba(100,150,255,0.1)',
                      color: '#6496ff',
                      border: '1px solid rgba(100,150,255,0.2)',
                    }}
                    onClick={() => setPuntosLimite((prev) => prev.slice(0, -1))}
                  >
                    ↶ Deshacer
                  </button>
                  <button
                    className="boton"
                    style={{
                      flex: 1,
                      fontSize: '0.7rem',
                      padding: '0.3rem',
                      background: 'rgba(251,86,91,0.1)',
                      color: '#fb565b',
                      border: '1px solid rgba(251,86,91,0.2)',
                    }}
                    onClick={() => setPuntosLimite([])}
                  >
                    Limpiar Todo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #3d3a39', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {error && <p style={{ fontSize: '0.78rem', color: '#fb565b', fontWeight: 600 }}>{error}</p>}
          {exito && <p style={{ fontSize: '0.78rem', color: '#00d992', fontWeight: 600 }}>{exito}</p>}
          <button className="boton boton-primario" style={{ justifyContent: 'center' }} onClick={() => guardar.mutate()} disabled={guardar.isPending}>
            <Save size={14} /> {guardar.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Leyenda de Colores */}
      <div style={{ position: 'absolute', bottom: 20, left: 400, background: '#101010', border: '1px solid #3d3a39', borderRadius: 8, padding: '0.75rem', zIndex: 100 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f2f2f2', margin: '0 0 0.5rem 0' }}>Tipos de Superficie</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {Object.entries(TIPOS_SUPERFICIE).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: '#8b949e' }}>
              <div style={{ width: 10, height: 10, background: val.color, borderRadius: 2 }} />
              <span>{val.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mapa */}
      <MapaEditor
        centerLat={centerLat}
        centerLng={centerLng}
        puntosLimite={puntosLimite}
        setPuntosLimite={setPuntosLimite}
        dibujandoPoligono={dibujandoPoligono}
        tipoSuperficie={tipoSuperficie}
        altura="100%"
      />
    </div>
  );
}
