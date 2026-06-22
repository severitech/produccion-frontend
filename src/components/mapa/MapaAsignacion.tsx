'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

function crearPinLetra(color: string, letra: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    html: `<div style="position:relative;width:36px;height:36px;">
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%) rotate(-45deg);
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        background:${color};border:2.5px solid white;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 10px rgba(0,0,0,0.5);">
        <span style="transform:rotate(45deg);color:white;font-weight:900;font-size:14px;font-family:Inter,sans-serif;">${letra}</span>
      </div>
    </div>`,
  });
}

function crearFlechaDireccion(angulo: number, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="${color}" opacity="0.9"
        style="transform:rotate(${angulo}deg)">
        <path d="M12 2L19 21L12 17L5 21L12 2Z"/>
      </svg>
    </div>`,
  });
}

function calcularAngulo(p1: [number, number], p2: [number, number]): number {
  const dLat = p2[0] - p1[0];
  const dLng = p2[1] - p1[1];
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

function AjustarVista({ puntos }: { puntos: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length >= 2) {
      map.fitBounds(puntos as any, { padding: [50, 50], animate: true, duration: 0.5 });
    }
  }, [puntos, map]);
  return null;
}

interface Props {
  puntos: [number, number][];
  colorLinea: string;
  nombreLinea: string;
  direccion?: string;
}

export default function MapaAsignacion({ puntos, colorLinea, nombreLinea, direccion }: Props) {
  if (puntos.length < 2) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', color: '#333', fontSize: '0.875rem', flexDirection: 'column', gap: '0.75rem', borderRadius: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
        </div>
        <span style={{ color: '#444' }}>Selecciona una ruta para ver el recorrido</span>
      </div>
    );
  }

  const inicio = puntos[0];
  const fin = puntos[puntos.length - 1];

  // Flechas de dirección cada ~20% del recorrido
  const flechas: Array<{ pos: [number, number]; angulo: number }> = [];
  const pasoFlecha = Math.max(3, Math.floor(puntos.length / 5));
  for (let i = pasoFlecha; i < puntos.length - 1; i += pasoFlecha) {
    flechas.push({ pos: puntos[i], angulo: calcularAngulo(puntos[i], puntos[i + 1]) });
  }

  const pinA = crearPinLetra('#00d992', 'A');
  const pinB = crearPinLetra('#fb565b', 'B');
  const dirLabel: Record<string, string> = { OUTBOUND: 'IDA →', INBOUND: '← VUELTA', CIRCULAR: '↺ CIRCULAR' };

  return (
    <div style={{ height: '100%', position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
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
        <AjustarVista puntos={puntos} />

        {/* Halo */}
        <Polyline positions={puntos} pathOptions={{ color: colorLinea, weight: 10, opacity: 0.12, lineCap: 'round' }} />
        {/* Trazo principal */}
        <Polyline positions={puntos} pathOptions={{ color: colorLinea, weight: 4, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />

        {/* Flechas de dirección */}
        {flechas.map((f, i) => (
          <Marker key={i} position={f.pos} icon={crearFlechaDireccion(f.angulo, colorLinea)} />
        ))}

        {/* Marcadores inicio/fin */}
        <Marker position={inicio} icon={pinA} zIndexOffset={1000} />
        <Marker position={fin} icon={pinB} zIndexOffset={1000} />
      </MapContainer>

      {/* Overlay info ruta */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 1000,
        background: 'rgba(13,13,15,0.88)', border: `1px solid ${colorLinea}40`,
        backdropFilter: 'blur(10px)', borderRadius: 10,
        padding: '0.5rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: colorLinea, flexShrink: 0 }} />
        <span style={{ fontSize: '0.8125rem', color: '#f2f2f2', fontWeight: 700 }}>{nombreLinea}</span>
        {direccion && (
          <span style={{ fontSize: '0.75rem', color: colorLinea, fontWeight: 600, marginLeft: 4 }}>
            {dirLabel[direccion] ?? direccion}
          </span>
        )}
      </div>
    </div>
  );
}
