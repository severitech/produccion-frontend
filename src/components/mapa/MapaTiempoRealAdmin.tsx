'use client';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { BusEnVivo } from '../../hooks/useMapaAdmin';

// ─── Icono del bus con rumbo y color de línea ─────────────────────────────────
function crearIconoBusAdmin(color: string, rumbo: number, seleccionado: boolean): L.DivIcon {
  const size = seleccionado ? 42 : 34;
  const border = seleccionado ? '3px solid white' : '2.5px solid rgba(255,255,255,0.7)';
  const shadow = seleccionado ? '0 0 0 3px ' + color + '60, 0 3px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.4)';
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:${border};
      display:flex;align-items:center;justify-content:center;
      box-shadow:${shadow};
      transform:rotate(${rumbo}deg);
      transition:transform 0.4s ease, box-shadow 0.2s;
    ">
      <svg width="${Math.round(size * 0.48)}" height="${Math.round(size * 0.48)}" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L19 21L12 17L5 21L12 2Z"/>
      </svg>
    </div>`,
  });
}

// ─── Ajusta la vista al conjunto de buses ─────────────────────────────────────
function AjustarVista({ buses }: { buses: BusEnVivo[] }) {
  const map = useMap();
  useEffect(() => {
    if (buses.length === 0) return;
    const puntos: [number, number][] = buses.map((b) => [b.latitud, b.longitud]);
    if (puntos.length === 1) {
      map.flyTo(puntos[0], 15, { animate: true, duration: 0.6 });
    } else {
      map.fitBounds(puntos as any, { padding: [60, 60], maxZoom: 15, animate: true });
    }
  }, [buses.length, map]);
  return null;
}

interface Props {
  buses: BusEnVivo[];
  busSelId: string | null;
  onSeleccionarBus: (id: string | null) => void;
}

export default function MapaTiempoRealAdmin({ buses, busSelId, onSeleccionarBus }: Props) {
  console.log('🗺️ [MapaTiempoRealAdmin] Renderizando con buses:', {
    cantidad: buses.length,
    buses: buses.map((b) => ({
      id: b.viajeId,
      lat: b.latitud,
      lng: b.longitud,
      esSimulacion: b.esSimulacion,
      numeroInterno: b.internalNumber,
    })),
    timestamp: new Date().toLocaleTimeString(),
  });

  const iconos = useMemo(() => {
    const m = new Map<string, L.DivIcon>();
    buses.forEach((b) => {
      m.set(b.viajeId, crearIconoBusAdmin(b.lineaColor ?? '#6366f1', b.rumbo, busSelId === b.viajeId));
    });
    return m;
  }, [buses, busSelId]);

  return (
    <MapContainer
      center={[-17.7833, -63.1821]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <AjustarVista buses={buses} />

      {buses.map((bus) => (
        <Marker
          key={bus.viajeId}
          position={[bus.latitud, bus.longitud]}
          icon={iconos.get(bus.viajeId) ?? crearIconoBusAdmin(bus.lineaColor ?? '#6366f1', bus.rumbo, false)}
          eventHandlers={{ click: () => onSeleccionarBus(busSelId === bus.viajeId ? null : bus.viajeId) }}
          zIndexOffset={busSelId === bus.viajeId ? 1000 : 0}
        >
          <Popup>
            <div style={{ minWidth: 180, fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: bus.lineaColor ?? '#6366f1' }} />
                <strong style={{ color: '#111' }}>{bus.lineaNombre ?? 'Sin línea'}</strong>
              </div>
              <div style={{ display: 'grid', gap: '0.25rem', color: '#444' }}>
                <div><span style={{ color: '#888' }}>Bus:</span> {bus.internalNumber} · {bus.licensePlate}</div>
                <div><span style={{ color: '#888' }}>Conductor:</span> {bus.conductorNombre}</div>
                <div><span style={{ color: '#888' }}>Velocidad:</span> {bus.velocidad} km/h</div>
                <div><span style={{ color: '#888' }}>Ruta:</span> {bus.rutaNombre}</div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Overlay cuando no hay buses */}
      {buses.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'rgba(13,13,15,0.85)', backdropFilter: 'blur(12px)',
            border: '1px solid #2a2a2f', borderRadius: 12,
            padding: '1rem 1.5rem', textAlign: 'center',
          }}>
            <p style={{ color: '#f2f2f2', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              Sin buses activos en este momento
            </p>
            <p style={{ color: '#555', fontSize: '0.8125rem' }}>
              Los conductores aparecerán aquí cuando activen el GPS
            </p>
          </div>
        </div>
      )}
    </MapContainer>
  );
}
