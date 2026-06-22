'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useBusesEnTiempoReal } from '../../hooks/useBusesEnTiempoReal';
import { UbicacionBus } from '../../types';
import { crearIconoOrigen, crearIconoDestino, crearIconoEmbarque, crearIconoBus } from './MarcadoresMapa';

// ─── Tipos de segmento de ruta ────────────────────────────────────────────────
export interface SegmentoBus {
  tipo: 'bus';
  linea: { id: string; nombre: string; codigo: string; color: string; imageUrl: string | null; tarifa: number };
  embarque: { lat: number; lng: number };
  descenso: { lat: number; lng: number };
  puntosRuta: [number, number][];
  distanciaKm: number;
  tiempoMin: number;
}
export interface SegmentoCaminata {
  tipo: 'caminata';
  desde: { lat: number; lng: number };
  hasta: { lat: number; lng: number };
  puntosRuta: [number, number][];
  distanciaMetros: number;
  tiempoMin: number;
}
export type Segmento = SegmentoBus | SegmentoCaminata;


// ─── Componente click handler ─────────────────────────────────────────────────
function ClickHandler({ onClickMapa }: { onClickMapa: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onClickMapa(e.latlng.lat, e.latlng.lng); } });
  return null;
}

// ─── Ajusta vista a los puntos relevantes ─────────────────────────────────────
function AjustarVista({
  origen, destino, segmentos,
}: {
  origen?: [number, number] | null;
  destino?: [number, number] | null;
  segmentos?: Segmento[];
}) {
  const map = useMap();
  useEffect(() => {
    if (segmentos && segmentos.length > 0) {
      const allPts: [number, number][] = [];
      for (const seg of segmentos) {
        if (seg.tipo === 'bus') allPts.push(...seg.puntosRuta);
        else allPts.push([seg.desde.lat, seg.desde.lng], [seg.hasta.lat, seg.hasta.lng]);
      }
      if (allPts.length > 0) {
        map.fitBounds(allPts as any, { padding: [60, 60], animate: true });
      }
      return;
    }
    if (origen && destino) {
      map.fitBounds([origen, destino], { padding: [80, 80], maxZoom: 15, animate: true });
    } else if (origen) {
      map.flyTo(origen, 15, { animate: true, duration: 0.8 });
    }
  }, [origen, destino, segmentos, map]);
  return null;
}

// ─── Props del componente ─────────────────────────────────────────────────────
interface Props {
  onClickMapa?: (lat: number, lng: number) => void;
  origen?: [number, number] | null;
  destino?: [number, number] | null;
  paso?: 1 | 2 | null;
  segmentosRuta?: Segmento[];
}

export default function MapaPrincipal({ onClickMapa, origen, destino, paso, segmentosRuta }: Props = {}) {
  const { buses, unirseALinea } = useBusesEnTiempoReal();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const suscribirse = async () => {
      for (const id of [1, 2, 3, 4, 5]) {
        try {
          await unirseALinea(id);
        } catch (err) {
          console.error(`Error suscribiéndose a línea ${id}:`, err);
        }
      }
    };
    suscribirse();
  }, [unirseALinea]);

  const busesReales = useMemo<UbicacionBus[]>(() => Array.from(buses.values()), [buses]);
  const iconoOrigen = useMemo(() => crearIconoOrigen(), []);
  const iconoDestino = useMemo(() => crearIconoDestino(), []);

  const tieneRuta = segmentosRuta && segmentosRuta.length > 0;

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[-17.7833, -63.1821]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {onClickMapa && !tieneRuta && <ClickHandler onClickMapa={onClickMapa} />}
        <AjustarVista origen={origen} destino={destino} segmentos={tieneRuta ? segmentosRuta : undefined} />

        {/* Buses en tiempo real */}
        {busesReales.map((bus) => (
          <Marker key={bus.busId} position={[bus.latitud, bus.longitud]}
            icon={crearIconoBus(bus.lineaColor || '#6366f1', bus.rumboCrados)}>
            <Popup>
              <div style={{ minWidth: 180, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: bus.lineaColor || '#6366f1' }} />
                  <strong>{bus.lineaNombre}</strong>
                </div>
                <div style={{ fontSize: '0.8125rem', display: 'grid', gap: '0.25rem' }}>
                  <div><span style={{ color: '#94a3b8' }}>Bus:</span> {bus.numeroInterno}</div>
                  <div><span style={{ color: '#94a3b8' }}>Velocidad:</span> {bus.velocidadKmh} km/h</div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Segmentos de ruta calculada */}
        {tieneRuta && segmentosRuta.map((seg, i) => {
          if (seg.tipo === 'bus') {
            return (
              <Polyline
                key={`bus-${i}`}
                positions={seg.puntosRuta}
                pathOptions={{ color: seg.linea.color, weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
              />
            );
          } else {
            const walkPts: [number, number][] =
              seg.puntosRuta && seg.puntosRuta.length > 1
                ? seg.puntosRuta
                : [[seg.desde.lat, seg.desde.lng], [seg.hasta.lat, seg.hasta.lng]];
            return (
              <Polyline
                key={`walk-${i}`}
                positions={walkPts}
                pathOptions={{ color: '#8b949e', weight: 3, opacity: 0.85, dashArray: '8 5' }}
              />
            );
          }
        })}

        {/* Marcadores de embarque/descenso */}
        {tieneRuta && segmentosRuta.filter((s) => s.tipo === 'bus').map((seg, i) => {
          const s = seg as SegmentoBus;
          return [
            <Marker key={`emb-${i}`} position={[s.embarque.lat, s.embarque.lng]} icon={crearIconoEmbarque(s.linea.color)}>
              <Popup><strong style={{ color: s.linea.color }}>Subir en {s.linea.nombre}</strong></Popup>
            </Marker>,
            <Marker key={`des-${i}`} position={[s.descenso.lat, s.descenso.lng]} icon={crearIconoEmbarque(s.linea.color)}>
              <Popup><strong style={{ color: s.linea.color }}>Bajar de {s.linea.nombre}</strong></Popup>
            </Marker>,
          ];
        })}

        {/* Marcadores A y B */}
        {origen && (
          <Marker position={origen} icon={iconoOrigen} zIndexOffset={1000}>
            <Popup><strong style={{ color: '#00d992' }}>Origen (A)</strong><br />{origen[0].toFixed(5)}, {origen[1].toFixed(5)}</Popup>
          </Marker>
        )}
        {destino && (
          <Marker position={destino} icon={iconoDestino} zIndexOffset={1000}>
            <Popup><strong style={{ color: '#fb565b' }}>Destino (B)</strong><br />{destino[0].toFixed(5)}, {destino[1].toFixed(5)}</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Overlay instrucción */}
      {onClickMapa && paso && !tieneRuta && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, pointerEvents: 'none',
          background: paso === 1 ? 'rgba(0,217,146,0.15)' : 'rgba(251,86,91,0.15)',
          border: `1px solid ${paso === 1 ? 'rgba(0,217,146,0.5)' : 'rgba(251,86,91,0.5)'}`,
          backdropFilter: 'blur(12px)', borderRadius: 40, padding: '0.625rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: paso === 1 ? '#00d992' : '#fb565b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: '12px' }}>{paso === 1 ? 'A' : 'B'}</span>
          </div>
          <span style={{ color: '#f2f2f2', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {paso === 1 ? 'Haz clic en el mapa para marcar el origen' : 'Ahora haz clic para marcar el destino'}
          </span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: paso === 1 ? '#00d992' : '#fb565b', animation: 'pulse-dot 1s ease-in-out infinite' }} />
        </div>
      )}

      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
      `}</style>
    </div>
  );
}
