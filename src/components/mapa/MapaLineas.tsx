'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

interface LineaConPuntos {
  id: string;
  nombre: string;
  codigo: string;
  color: string;
  imageUrl: string | null;
  tarifa: number;
  puntos: [number, number][];
}

function crearIconoTerminal(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`,
  });
}

function AjustarVista({ puntos }: { puntos: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length > 1) {
      map.fitBounds(puntos as any, { padding: [60, 60], animate: true, duration: 0.6 });
    }
  }, [puntos, map]);
  return null;
}

interface Props {
  lineas: LineaConPuntos[];
  lineaSeleccionada: string | null;
  lineaHover: string | null;
  onSeleccionar: (id: string | null) => void;
}

export default function MapaLineas({ lineas, lineaSeleccionada, lineaHover, onSeleccionar }: Props) {
  const lineaActiva = lineas.find((l) => l.id === lineaSeleccionada);
  const lineaPreview = lineas.find((l) => l.id === lineaHover);
  const puntosVista = lineaActiva?.puntos ?? lineaPreview?.puntos ?? [];

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
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

        {puntosVista.length > 0 && <AjustarVista puntos={puntosVista} />}

        {/* Solo dibuja la línea hover (si no hay selección) */}
        {!lineaSeleccionada && lineaPreview && (
          <Polyline
            positions={lineaPreview.puntos}
            pathOptions={{ color: lineaPreview.color, weight: 4, opacity: 0.55, dashArray: '10 5', lineCap: 'round' }}
          />
        )}

        {/* Línea seleccionada: trazo completo y terminales */}
        {lineaActiva && (
          <>
            {/* Halo exterior */}
            <Polyline
              positions={lineaActiva.puntos}
              pathOptions={{ color: lineaActiva.color, weight: 10, opacity: 0.15, lineCap: 'round' }}
            />
            {/* Trazo principal */}
            <Polyline
              positions={lineaActiva.puntos}
              pathOptions={{ color: lineaActiva.color, weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
              eventHandlers={{ click: () => onSeleccionar(null) }}
            />
            {/* Terminales */}
            {lineaActiva.puntos.length >= 2 && (
              <>
                <Marker position={lineaActiva.puntos[0]} icon={crearIconoTerminal(lineaActiva.color)}>
                  <Popup><strong style={{ color: lineaActiva.color }}>Inicio · {lineaActiva.nombre}</strong></Popup>
                </Marker>
                <Marker position={lineaActiva.puntos[lineaActiva.puntos.length - 1]} icon={crearIconoTerminal(lineaActiva.color)}>
                  <Popup><strong style={{ color: lineaActiva.color }}>Fin · {lineaActiva.nombre}</strong></Popup>
                </Marker>
              </>
            )}
          </>
        )}
      </MapContainer>

      {/* Overlay cuando no hay nada seleccionado ni hover */}
      {!lineaSeleccionada && !lineaHover && (
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, pointerEvents: 'none',
          background: 'rgba(13,13,15,0.85)', border: '1px solid #2a2a2f',
          backdropFilter: 'blur(12px)', borderRadius: 40,
          padding: '0.625rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <span style={{ color: '#8b949e', fontSize: '0.875rem' }}>
            Selecciona una línea para ver su recorrido
          </span>
        </div>
      )}
    </div>
  );
}
