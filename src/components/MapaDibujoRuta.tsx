'use client';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Undo2, Trash2, CheckCircle } from 'lucide-react';

type LatLng = { lat: number; lng: number };

async function snapToRoad(raw: LatLng): Promise<{ ok: true; snapped: LatLng; streetName: string } | { ok: false; reason: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${raw.lat}&lon=${raw.lng}&format=json&zoom=17&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'es', 'User-Agent': 'TransitAI/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, reason: 'Sin respuesta del servicio de calles.' };
    const json = await res.json();
    if (json.error) return { ok: false, reason: 'No hay ninguna vía en ese punto.' };
    const address: Record<string, string> = json.address ?? {};
    const streetName = ['road', 'highway', 'residential', 'footway', 'path']
      .map(k => address[k])
      .find(v => !!v);
    if (!streetName) return { ok: false, reason: 'No es una vía transitable. Haz clic sobre una calle o avenida.' };
    return { ok: true, snapped: raw, streetName };
  } catch {
    return { ok: true, snapped: raw, streetName: 'Calle (sin validar)' };
  }
}

async function routeByRoad(from: LatLng, to: LatLng): Promise<LatLng[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [from, to];
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes?.[0]) return [from, to];
    const coords: [number, number][] = json.routes[0].geometry.coordinates;
    return coords.map(([lng, lat]) => ({ lat, lng }));
  } catch {
    return [from, to];
  }
}

export function MapaDibujoRuta({
  onFinish,
}: {
  onFinish: (puntos: LatLng[]) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [anchors, setAnchors] = useState<LatLng[]>([]);
  const [segments, setSegments] = useState<LatLng[][]>([]);
  const [snapping, setSnapping] = useState(false);
  const [snapError, setSnapError] = useState('');
  const [dibujando, setDibujando] = useState(true);
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapDivRef.current) return;
    const container = mapDivRef.current;

    import('leaflet').then(L => {
      if ((container as any)._leaflet_id) delete (container as any)._leaflet_id;
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(container, {
        center: [-17.783, -63.182],
        zoom: 14,
        scrollWheelZoom: true,
        doubleClickZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      map.invalidateSize();
    });

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { }
        mapRef.current = null;
      }
      if (container) delete (container as any)._leaflet_id;
    };
  }, []);

  const agregarPunto = useCallback(async (raw: LatLng) => {
    if (!dibujando || snapping) return;
    setSnapping(true);
    setSnapError('');

    const snap = await snapToRoad(raw);
    if (!snap.ok) {
      setSnapping(false);
      setSnapError(snap.reason);
      setTimeout(() => setSnapError(''), 3500);
      return;
    }

    const { snapped } = snap;
    const newAnchors = [...anchors, snapped];
    let newSegment: LatLng[] = [snapped];
    if (anchors.length > 0) {
      newSegment = await routeByRoad(anchors[anchors.length - 1], snapped);
    }

    setAnchors(newAnchors);
    setSegments(s => [...s, newSegment]);
    setSnapping(false);

    import('leaflet').then(L => {
      const map = mapRef.current;
      if (!map) return;

      const allPts = [...segments, newSegment].flat();
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(allPts.map(p => [p.lat, p.lng]));
      } else {
        polylineRef.current = L.polyline(allPts.map(p => [p.lat, p.lng]), {
          color: '#00d992',
          weight: 5,
          opacity: 0.9,
        }).addTo(map);
      }

      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:#00d992;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(0,217,146,0.9)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: '',
      });

      const m = L.marker([snapped.lat, snapped.lng], { icon }).addTo(map);
      m.bindTooltip(newAnchors.length === 1 ? 'Inicio' : 'Punto', { permanent: true, direction: 'top' });
      markersRef.current.push(m);
    });
  }, [anchors, segments, dibujando, snapping]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (dibujando) {
      const clickHandler = (e: any) => {
        void agregarPunto({ lat: e.latlng.lat, lng: e.latlng.lng });
      };

      const containerEl = map.getContainer();
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;

      const mouseDownHandler = (e: MouseEvent) => {
        if (e.button === 2) { // botón derecho
          e.preventDefault();
          isDragging = true;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          containerEl.style.cursor = 'grabbing';
        }
      };

      const mouseMoveHandler = (e: MouseEvent) => {
        if (isDragging) {
          const deltaX = e.clientX - dragStartX;
          const deltaY = e.clientY - dragStartY;
          map.panBy([-deltaX, -deltaY], { animate: false });
          dragStartX = e.clientX;
          dragStartY = e.clientY;
        }
      };

      const mouseUpHandler = (e: MouseEvent) => {
        if (e.button === 2 || !isDragging) {
          isDragging = false;
          containerEl.style.cursor = 'crosshair';
        }
      };

      const contextMenuHandler = (e: Event) => {
        e.preventDefault();
      };

      map.on('click', clickHandler);
      containerEl.addEventListener('mousedown', mouseDownHandler, true);
      containerEl.addEventListener('mousemove', mouseMoveHandler, true);
      document.addEventListener('mouseup', mouseUpHandler, true);
      containerEl.addEventListener('contextmenu', contextMenuHandler);
      containerEl.style.cursor = 'crosshair';

      return () => {
        map.off('click', clickHandler);
        containerEl.removeEventListener('mousedown', mouseDownHandler, true);
        containerEl.removeEventListener('mousemove', mouseMoveHandler, true);
        document.removeEventListener('mouseup', mouseUpHandler, true);
        containerEl.removeEventListener('contextmenu', contextMenuHandler);
        containerEl.style.cursor = '';
      };
    }
  }, [dibujando, agregarPunto]);

  const deshacer = () => {
    if (anchors.length === 0) return;
    const newAnchors = anchors.slice(0, -1);
    const newSegments = segments.slice(0, -1);
    setAnchors(newAnchors);
    setSegments(newSegments);
    const m = markersRef.current.pop();
    m?.remove();
    const allPts = newSegments.flat();
    if (polylineRef.current) {
      if (allPts.length === 0) {
        polylineRef.current.remove();
        polylineRef.current = null;
      } else {
        polylineRef.current.setLatLngs(allPts.map(p => [p.lat, p.lng]));
      }
    }
  };

  const limpiar = () => {
    setAnchors([]);
    setSegments([]);
    setDibujando(false);
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    polylineRef.current?.remove();
    polylineRef.current = null;
  };

  const terminar = () => {
    if (anchors.length < 2) return;
    const allPts = segments.flat();
    onFinish(allPts);
    limpiar();
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div ref={mapDivRef} style={{ flex: 1, width: '100%', height: '100%' }} />

      {/* Controles */}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: '0.625rem', background: 'rgba(16,16,16,0.95)', border: '1px solid #3d3a39', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
        {!dibujando ? (
          <button className="boton boton-primario" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => setDibujando(true)}>
            <MapPin size={14} /> Iniciar dibujo
          </button>
        ) : (
          <>
            <button className="boton boton-secundario" style={{ fontSize: '0.8rem', padding: '0.4rem 0.625rem' }} onClick={deshacer} disabled={anchors.length === 0}>
              <Undo2 size={12} /> Deshacer
            </button>
            <button className="boton" style={{ fontSize: '0.8rem', padding: '0.4rem 0.625rem', background: 'rgba(251,86,91,0.1)', color: '#fb565b', border: '1px solid rgba(251,86,91,0.2)' }} onClick={limpiar}>
              <Trash2 size={12} /> Limpiar
            </button>
            <button className="boton boton-primario" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={terminar} disabled={anchors.length < 2}>
              <CheckCircle size={12} /> Terminar
            </button>
            <span style={{ fontSize: '0.75rem', color: '#8b949e', marginLeft: '0.5rem' }}>
              {anchors.length} puntos dibujados
            </span>
          </>
        )}
      </div>

      {snapError && (
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1001, background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.5)', borderRadius: 8, padding: '0.5rem 1rem', color: '#f5a623', fontSize: '0.75rem' }}>
          {snapError}
        </div>
      )}

      {/* Instrucciones */}
      {!dibujando && (
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1001, background: 'rgba(16,16,16,0.92)', border: '1px solid #3d3a39', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#8b949e', maxWidth: 200 }}>
          <p style={{ margin: '0 0 0.5rem 0', color: '#00d992', fontWeight: 700 }}>Instrucciones:</p>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            <li>Click izquierdo: Agregar punto</li>
            <li>Click derecho: Mover mapa</li>
            <li>2+ puntos para terminar</li>
          </ul>
        </div>
      )}
    </div>
  );
}
