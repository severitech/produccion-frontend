'use client';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation, AlertCircle, Users, Truck, Clock, ArrowRight, MapPin } from 'lucide-react';
import { paradasServicio, type Parada } from '@/services/paradas.servicio';
import { asignacionesServicio } from '@/services/asignaciones.servicio';
import { conductoresServicio } from '@/services/conductores.servicio';
import { busesServicio } from '@/services/buses.servicio';
import { useUsuarioAlmacen } from '@/almacen/usuario.almacen';
import { Cargando } from '@/components/dashboard/Cargando';

interface MicroEnRuta {
  id: string;
  numeroInterno: string;
  chofer?: { id: string; nombreCompleto: string };
  estado: 'activo' | 'mantenimiento' | 'fuera_de_servicio';
  ubicacion?: { lat: number; lng: number };
  distanciaAParada?: number;
}

interface TransbordeOp {
  chofer: { id: string; nombreCompleto: string };
  microActual: MicroEnRuta;
  parada: Parada;
  distancia: number;
  proximoMicro?: MicroEnRuta;
}

export default function PaginaTransbordo() {
  const { usuario } = useUsuarioAlmacen();
  const sindicatoIdUsuario = usuario?.sindicatoId ? String(usuario.sindicatoId) : '';
  const qc = useQueryClient();

  const [filtroLinea, setFiltroLinea] = useState('');
  const [transbordesDisponibles, setTransbordesDisponibles] = useState<TransbordeOp[]>([]);
  const [selectedTransbordo, setSelectedTransbordo] = useState<TransbordeOp | null>(null);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const initRef = useRef(false);
  const marcadoresRef = useRef<any[]>([]);

  const { data: paradas = [] } = useQuery({
    queryKey: ['paradas', filtroLinea],
    queryFn: () => paradasServicio.obtenerTodas(filtroLinea ? { lineaId: filtroLinea } : undefined),
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => asignacionesServicio.obtenerTodas(),
  });

  const { data: choferes = [] } = useQuery({
    queryKey: ['conductores'],
    queryFn: () => conductoresServicio.obtenerTodas(),
  });

  const { data: buses = [] } = useQuery({
    queryKey: ['buses'],
    queryFn: () => busesServicio.obtenerTodas(),
  });

  // Simular ubicaciones en tiempo real (en producción sería WebSocket)
  useEffect(() => {
    // Aquí iría la lógica para obtener ubicaciones en tiempo real desde el backend
    // Por ahora, usamos datos simulados
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (typeof window === 'undefined' || !mapDivRef.current || initRef.current) return;
    initRef.current = true;

    import('leaflet').then((L) => {
      if (!mapDivRef.current) return;
      (mapDivRef.current as any)._leaflet_id = undefined;
      (L.Icon.Default.prototype as any)._getIconUrl = undefined;

      const map = L.map(mapDivRef.current, {
        center: [-17.783, -63.182],
        zoom: 14,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
      }
    };
  }, []);

  // Dibujar paradas y micros en el mapa
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !paradas.length) return;

    marcadoresRef.current.forEach((m) => m.remove());
    marcadoresRef.current = [];

    import('leaflet').then((L) => {
      // Dibujar paradas
      paradas.forEach((parada) => {
        const icono = L.divIcon({
          html: `<div style="width:20px;height:20px;background:#00d992;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2"><path d="M12 2L15.09 8.26H22L17.55 12.5L19.64 18.76L12 14.5L4.36 18.76L6.45 12.5L2 8.26H8.91L12 2Z"/></svg></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const m = L.marker([Number(parada.centerLat), Number(parada.centerLng)], { icon: icono })
          .bindTooltip(`${parada.nombre}`, { permanent: false })
          .addTo(map);

        marcadoresRef.current.push(m);

        // Dibujar círculo de cobertura
        L.circle([Number(parada.centerLat), Number(parada.centerLng)], {
          radius: parada.radiusMeters || 100,
          color: '#00d99240',
          fillColor: '#00d99220',
          weight: 1,
        }).addTo(map);
      });
    });
  }, [paradas]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 220, right: 0, bottom: 0, display: 'flex', background: '#050507', zIndex: 10 }}>
      {/* Panel izquierdo */}
      <div style={{ width: 360, flexShrink: 0, background: '#101010', borderRight: '1px solid #3d3a39', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Encabezado */}
        <div style={{ padding: '1.5rem 1.5rem', borderBottom: '1px solid #3d3a39' }}>
          <h1 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#f2f2f2', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, marginBottom: '0.75rem' }}>
            <Navigation size={20} color="#00d992" /> Transbordos
          </h1>
          <p style={{ color: '#8b949e', fontSize: '0.8rem', margin: 0 }}>Asigna choferes cuando terminen su vuelta</p>
        </div>

        {/* Lista de transbordos disponibles */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {transbordesDisponibles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#8b949e' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>Sin transbordos disponibles en este momento</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Los transbordos aparecerán cuando los choferes se acerquen a una parada después de completar su vuelta.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {transbordesDisponibles.map((tb, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTransbordo(tb)}
                  style={{
                    background: selectedTransbordo === tb ? 'rgba(0, 217, 146, 0.15)' : '#1a1a1a',
                    border: selectedTransbordo === tb ? '1px solid #00d992' : '1px solid #3d3a39',
                    borderRadius: 8,
                    padding: '1rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Users size={14} color="#00d992" />
                    <span style={{ fontWeight: 600, color: '#f2f2f2', fontSize: '0.9rem' }}>
                      {tb.chofer.nombreCompleto}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Truck size={14} color="#b8b3b0" />
                    <span style={{ color: '#8b949e', fontSize: '0.8rem' }}>
                      Micro {tb.microActual.numeroInterno}
                    </span>
                    <ArrowRight size={12} color="#8b949e" style={{ margin: '0 0.25rem' }} />
                    <MapPin size={14} color="#fb565b" />
                    <span style={{ color: '#8b949e', fontSize: '0.8rem' }}>
                      {tb.parada.nombre}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={12} color="#f5a623" />
                    <span style={{ color: '#f5a623', fontSize: '0.75rem', fontWeight: 600 }}>
                      {tb.distancia.toFixed(1)} km
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho - Detalle y acciones */}
      {selectedTransbordo ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f2f2f2', margin: 0 }}>
              Transbordo: {selectedTransbordo.chofer.nombreCompleto}
            </h2>
            <button
              className="boton boton-secundario"
              onClick={() => setSelectedTransbordo(null)}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              ✕ Cerrar
            </button>
          </div>

          {/* Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '1rem', border: '1px solid #3d3a39' }}>
              <p style={{ fontSize: '0.75rem', color: '#8b949e', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: 600 }}>
                Micro Actual
              </p>
              <p style={{ fontSize: '1.1rem', color: '#f2f2f2', margin: 0, fontWeight: 700 }}>
                #{selectedTransbordo.microActual.numeroInterno}
              </p>
              <p style={{ fontSize: '0.8rem', color: selectedTransbordo.microActual.estado === 'activo' ? '#00d992' : '#fb565b', margin: '0.5rem 0 0 0' }}>
                {selectedTransbordo.microActual.estado === 'activo' ? '✓ En servicio' : '✕ Fuera de servicio'}
              </p>
            </div>

            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '1rem', border: '1px solid #3d3a39' }}>
              <p style={{ fontSize: '0.75rem', color: '#8b949e', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: 600 }}>
                Parada Cercana
              </p>
              <p style={{ fontSize: '1.1rem', color: '#f2f2f2', margin: 0, fontWeight: 700 }}>
                {selectedTransbordo.parada.nombre}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#f5a623', margin: '0.5rem 0 0 0' }}>
                📍 {selectedTransbordo.distancia.toFixed(1)} km
              </p>
            </div>
          </div>

          {/* Opciones de transbordo */}
          <div style={{ background: '#1a1a1a', borderRadius: 8, border: '1px solid #3d3a39', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f2f2f2', margin: '0 0 1rem 0' }}>Opciones de Transbordo</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="boton boton-primario"
                style={{ justifyContent: 'center', padding: '0.75rem', fontSize: '0.85rem' }}
              >
                ✓ Asignar Automáticamente
              </button>

              <button
                className="boton boton-secundario"
                style={{ justifyContent: 'center', padding: '0.75rem', fontSize: '0.85rem' }}
              >
                ⚙ Asignar Manualmente
              </button>

              <button
                className="boton"
                style={{
                  justifyContent: 'center',
                  padding: '0.75rem',
                  fontSize: '0.85rem',
                  background: 'rgba(245, 166, 35, 0.1)',
                  color: '#f5a623',
                  border: '1px solid rgba(245, 166, 35, 0.3)',
                }}
              >
                ⏸ Aumentar Descanso
              </button>

              <button
                className="boton"
                style={{
                  justifyContent: 'center',
                  padding: '0.75rem',
                  fontSize: '0.85rem',
                  background: 'rgba(251, 86, 91, 0.1)',
                  color: '#fb565b',
                  border: '1px solid rgba(251, 86, 91, 0.3)',
                }}
              >
                ✕ Desactivar Chofer
              </button>
            </div>
          </div>

          {/* Cambiar estado del interno */}
          <div style={{ background: '#1a1a1a', borderRadius: 8, border: '1px solid #3d3a39', padding: '1.25rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f2f2f2', margin: '0 0 1rem 0' }}>Estado del Interno</h3>

            <select
              className="campo-entrada"
              style={{ width: '100%', marginBottom: '0.75rem' }}
              defaultValue={selectedTransbordo.microActual.estado}
            >
              <option value="activo">✓ En Servicio</option>
              <option value="mantenimiento">🔧 En Mantenimiento</option>
              <option value="fuera_de_servicio">✕ Fuera de Servicio</option>
            </select>

            <p style={{ fontSize: '0.75rem', color: '#8b949e', margin: 0 }}>
              Si cambias a "Fuera de Servicio", se notificará al chofer para derivarse a otro micro de la línea.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>
          <p>Selecciona un transbordo para ver detalles</p>
        </div>
      )}

      {/* Mapa */}
      <div
        ref={mapDivRef}
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: 'calc(100% - 220px - 360px)',
          height: '100vh',
          background: '#0f0f0f',
        }}
      />
    </div>
  );
}
