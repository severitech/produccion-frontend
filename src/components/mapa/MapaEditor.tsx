'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const TIPOS_SUPERFICIE = {
  STATION: '#FF6B6B',
  SQUARE: '#4ECDC4',
  STREET: '#FFE66D',
  PARKING: '#95E1D3',
  BUILDING: '#C7B3E5',
  MARKET: '#F7DC6F',
  OTHER: '#BDC3C7',
};

interface Punto {
  lat: number;
  lng: number;
}

interface MapaEditorProps {
  centerLat: number;
  centerLng: number;
  puntosLimite: Punto[];
  setPuntosLimite: (puntos: Punto[]) => void;
  dibujandoPoligono: boolean;
  tipoSuperficie: string;
  altura?: string;
}

export default function MapaEditor({
  centerLat,
  centerLng,
  puntosLimite,
  setPuntosLimite,
  dibujandoPoligono,
  tipoSuperficie,
  altura = '500px',
}: MapaEditorProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const marcadoresRef = useRef<any[]>([]);
  const poligonoRef = useRef<any>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapDivRef.current || initRef.current) return;
    initRef.current = true;

    import('leaflet').then((L) => {
      if (!mapDivRef.current) return;
      (mapDivRef.current as any)._leaflet_id = undefined;
      (L.Icon.Default.prototype as any)._getIconUrl = undefined;

      const map = L.map(mapDivRef.current, {
        center: [centerLat, centerLng],
        zoom: 14,
        doubleClickZoom: false,
        dragging: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      mapRef.current = map;
      map.dragging.disable();
      map.off('click'); // Desabilitar listeners de Leaflet

      let rightClickDrag = false;
      let rightClickStart = { x: 0, y: 0 };

      if (mapDivRef.current) {
        mapDivRef.current.addEventListener('contextmenu', (e) => e.preventDefault());

        // Click IZQUIERDO para dibujar punto
        const handleMapClick = (e: any) => {
          if (e.button === 0 && !rightClickDrag && dibujandoPoligono) {
            e.stopPropagation();
            e.preventDefault();

            const rect = mapDivRef.current!.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const latlng = map.containerPointToLatLng([x, y]);

            if (latlng) {
              setPuntosLimite((prev) => {
                if (prev.length >= 20) return prev;
                const lat = Number(latlng.lat);
                const lng = Number(latlng.lng);
                if (isNaN(lat) || isNaN(lng)) return prev;
                return [...prev, { lat, lng }];
              });
            }
          }
        };

        mapDivRef.current.addEventListener('click', handleMapClick, true);

        // Click DERECHO para iniciar pan
        mapDivRef.current.addEventListener('mousedown', (e: any) => {
          if (e.button === 2) {
            rightClickDrag = true;
            rightClickStart = { x: e.clientX, y: e.clientY };
          }
        });

        // Pan con click derecho
        mapDivRef.current.addEventListener('mousemove', (e: any) => {
          if (rightClickDrag) {
            const dx = e.clientX - rightClickStart.x;
            const dy = e.clientY - rightClickStart.y;
            if (dx !== 0 || dy !== 0) {
              const point = map.project(map.getCenter());
              const newPoint = L.point(point.x - dx, point.y - dy);
              const newLatlng = map.unproject(newPoint);
              map.setView(newLatlng, map.getZoom(), { animate: false });
              rightClickStart = { x: e.clientX, y: e.clientY };
            }
          }
        });

        // Fin del pan
        document.addEventListener('mouseup', (e: any) => {
          if (rightClickDrag && e.button === 2) {
            rightClickDrag = false;
          }
        });
      }
    });

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
      }
      initRef.current = false;
    };
  }, [dibujandoPoligono]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    marcadoresRef.current.forEach((m) => m.remove());
    marcadoresRef.current = [];
    if (poligonoRef.current) poligonoRef.current.remove();

    import('leaflet').then((L) => {
      const icono = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#00d992;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px #00d992;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marcador = L.marker([centerLat, centerLng], { icon: icono })
        .bindTooltip('Centro de parada', { permanent: false })
        .addTo(map);
      marcadoresRef.current.push(marcador);

      const colorSuperficie = TIPOS_SUPERFICIE[tipoSuperficie as keyof typeof TIPOS_SUPERFICIE] || '#00d992';

      const puntosValidos = puntosLimite.filter((p) => p.lat !== undefined && p.lng !== undefined);

      if (puntosValidos.length >= 3) {
        const coordenadas = puntosValidos.map((p) => [Number(p.lat), Number(p.lng)]);
        try {
          poligonoRef.current = L.polygon(coordenadas, {
            color: colorSuperficie,
            weight: 2,
            opacity: 0.6,
            fillOpacity: 0.2,
            fillColor: colorSuperficie,
          }).addTo(map);
        } catch (e) {
          console.error('Error al dibujar polígono:', e);
        }
      }

      puntosValidos.forEach((punto, idx) => {
        const icono = L.divIcon({
          html: `<div style="width:14px;height:14px;background:#fff;border:2px solid ${colorSuperficie};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;color:#000;font-weight:bold;cursor:pointer;" onclick="event.stopPropagation(); event.preventDefault();">${idx + 1}</div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        try {
          const m = L.marker([Number(punto.lat), Number(punto.lng)], { icon: icono })
            .bindTooltip(`Punto ${idx + 1} - Click para eliminar`, { permanent: false })
            .addTo(map);

          ((index) => {
            m.on('click', () => {
              setPuntosLimite((prev) => prev.filter((_, i) => i !== index));
            });
          })(idx);

          marcadoresRef.current.push(m);
        } catch (e) {
          console.error('Error al crear marcador:', e);
        }
      });

      if (puntosValidos.length > 0) {
        try {
          const bounds = L.latLngBounds(puntosValidos.map((p) => [Number(p.lat), Number(p.lng)]));
          map.fitBounds(bounds.pad(0.1));
        } catch (e) {
          console.error('Error al centrar mapa:', e);
        }
      }
    });
  }, [centerLat, centerLng, puntosLimite, tipoSuperficie, dibujandoPoligono]);

  return <div ref={mapDivRef} style={{ width: '100%', height: altura, borderRadius: 8 }} />;
}
