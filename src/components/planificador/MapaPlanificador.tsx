'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const iconoOrigen = L.divIcon({
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: '<div style="width:24px;height:24px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
});

const iconoDestino = L.divIcon({
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: '<div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
});

interface Props {
  origen: { lat: number; lng: number };
  destino: { lat: number; lng: number };
  onOrigenChange: (pos: { lat: number; lng: number }) => void;
  onDestinoChange: (pos: { lat: number; lng: number }) => void;
}

function EventosMapa({ onOrigenChange, onDestinoChange }: {
  onOrigenChange: (pos: { lat: number; lng: number }) => void;
  onDestinoChange: (pos: { lat: number; lng: number }) => void;
}) {
  useMapEvents({});
  return null;
}

export default function MapaPlanificador({ origen, destino, onOrigenChange, onDestinoChange }: Props) {
  return (
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
      <Marker
        position={[origen.lat, origen.lng]}
        icon={iconoOrigen}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const latlng = e.target.getLatLng();
            onOrigenChange({ lat: latlng.lat, lng: latlng.lng });
          },
        }}
      />
      <Marker
        position={[destino.lat, destino.lng]}
        icon={iconoDestino}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const latlng = e.target.getLatLng();
            onDestinoChange({ lat: latlng.lat, lng: latlng.lng });
          },
        }}
      />
      <EventosMapa onOrigenChange={onOrigenChange} onDestinoChange={onDestinoChange} />
    </MapContainer>
  );
}
