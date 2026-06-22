'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Zap, MapPin, Trash2, Route } from 'lucide-react';
import {
  simuladorServicio,
  type Driver,
  type Interno,
  type Linea,
  type Ruta,
} from '@/services/simulador.servicio';
import {
  locationTestServicio,
  type UbicacionPrueba,
} from '@/services/location-test.servicio';
import { Cargando } from '@/components/dashboard/Cargando';
import { useUsuarioAlmacen } from '@/almacen/usuario.almacen';

interface Config {
  driverId: string;
  driverName: string;
  internoId: string;
  internoNumber: string;
  lineId: string;
  lineName: string;
  routeId: string;
  routeName: string;
  speedKmh: number;
  isSimulating: boolean;
}

export default function SimuladorRutas() {
  const { usuario } = useUsuarioAlmacen();
  const userSyndicateId = usuario?.syndicateId?.toString() || '';
  const qc = useQueryClient();

  const [config, setConfig] = useState<Config>({
    driverId: '',
    driverName: '',
    internoId: '',
    internoNumber: '',
    lineId: '',
    lineName: '',
    routeId: '',
    routeName: '',
    speedKmh: 40,
    isSimulating: false,
  });

  const [error, setError] = useState<string>('');

  const simulationRef = useRef<NodeJS.Timeout>();
  const routePointsRef = useRef<any[]>([]);
  const routeDistancesRef = useRef<number[]>([]);
  const totalDistanceRef = useRef(0);
  const distanceTraveledRef = useRef(0);
  const currentLocationRef = useRef<string>('');
  const speedKmhRef = useRef(40);

  // Queries
  const { data: drivers = [], isLoading: loadingDrivers } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: () => simuladorServicio.obtenerConductores(),
  });

  const { data: internos = [], isLoading: loadingInternos } = useQuery<Interno[]>({
    queryKey: ['internos'],
    queryFn: () => simuladorServicio.obtenerInternos(),
  });

  const { data: lines = [], isLoading: loadingLines } = useQuery<Linea[]>({
    queryKey: ['lines'],
    queryFn: () => simuladorServicio.obtenerLineas(),
  });

  const { data: routes = [], isLoading: loadingRoutes } = useQuery<Ruta[]>({
    queryKey: ['routes', config.lineId],
    queryFn: () => simuladorServicio.obtenerRutas(config.lineId),
    enabled: !!config.lineId,
  });

  const { data: locations = [] } = useQuery<UbicacionPrueba[]>({
    queryKey: ['locationTest', userSyndicateId],
    queryFn: () => locationTestServicio.obtenerPorSindicato(userSyndicateId),
    enabled: !!userSyndicateId,
  });

  const createLocation = useMutation({
    mutationFn: (data: any) => locationTestServicio.crear(data),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['locationTest'] });
    },
    onError: (err: any) => {
      console.error('Error creando ubicación:', err);
      setError(`Error: ${err.message}`);
    },
  });

  const updateLocation = useMutation({
    mutationFn: (data: any) => locationTestServicio.actualizar(data.id, data.updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locationTest'] }),
    onError: (err: any) => console.error('Error actualizando:', err),
  });

  const deleteLocation = useMutation({
    mutationFn: (id: string) => locationTestServicio.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locationTest'] }),
  });

  // Helper functions
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const interpolatePosition = (lat1: number, lon1: number, lat2: number, lon2: number, fraction: number) => ({
    lat: lat1 + (lat2 - lat1) * fraction,
    lon: lon1 + (lon2 - lon1) * fraction,
  });

  const buildRouteWaypoints = (currentRoute: Ruta) => {
    // Primero intentar usar puntos dibujados
    let points: any[] = [];

    if (currentRoute.drawnPoints && Array.isArray(currentRoute.drawnPoints) && currentRoute.drawnPoints.length > 0) {
      console.log('Usando drawnPoints:', currentRoute.drawnPoints);
      points = currentRoute.drawnPoints.filter((p) => p && (p.lat !== undefined || p.latitude !== undefined) && (p.lng !== undefined || p.longitude !== undefined));

      // Normalizar campos
      points = points.map((p) => ({
        centerLat: p.lat ?? p.latitude,
        centerLng: p.lng ?? p.longitude,
      }));
    }

    // Fallback a paradas si no hay puntos dibujados
    if (points.length === 0 && currentRoute.stops) {
      console.log('Usando stops:', currentRoute.stops);
      const stops = currentRoute.stops.filter((s) => s && s.centerLat !== undefined && s.centerLng !== undefined);
      const sortedStops = [...stops].sort((a, b) => a.orderIndex - b.orderIndex);
      points = sortedStops.map((s) => ({
        centerLat: s.centerLat,
        centerLng: s.centerLng,
      }));
    }

    if (points.length === 0) {
      return [];
    }

    // Agregar punto inicial al final para crear un ciclo
    const waypoints = [...points];
    waypoints.push(waypoints[0]);

    return waypoints;
  };

  const calculateRouteDistances = (waypoints: any[]) => {
    const distances = [0];
    let totalDist = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const dist = calculateDistance(
        Number(waypoints[i].centerLat),
        Number(waypoints[i].centerLng),
        Number(waypoints[i + 1].centerLat),
        Number(waypoints[i + 1].centerLng)
      );
      totalDist += dist;
      distances.push(totalDist);
    }

    return { distances, totalDist };
  };

  const getPositionOnRoute = (traveledDistance: number, waypoints: any[], distances: number[]) => {
    if (waypoints.length < 2) return { lat: -17.7778, lon: -63.1819 };

    // Encontrar entre qué dos puntos estamos
    let segmentIndex = 0;
    for (let i = 0; i < distances.length - 1; i++) {
      if (traveledDistance >= distances[i] && traveledDistance <= distances[i + 1]) {
        segmentIndex = i;
        break;
      }
    }

    const p1 = waypoints[segmentIndex];
    const p2 = waypoints[segmentIndex + 1];
    const segmentStart = distances[segmentIndex];
    const segmentEnd = distances[segmentIndex + 1];
    const segmentDistance = segmentEnd - segmentStart;
    const distInSegment = traveledDistance - segmentStart;
    const fraction = segmentDistance > 0 ? distInSegment / segmentDistance : 0;

    return interpolatePosition(
      Number(p1.centerLat),
      Number(p1.centerLng),
      Number(p2.centerLat),
      Number(p2.centerLng),
      fraction
    );
  };

  const startSimulation = async () => {
    try {
      setError('');
      const currentRoute = routes.find((r) => r.id === config.routeId);
      if (!currentRoute) {
        setError('Selecciona una ruta válida');
        return;
      }
      if (!config.internoId) {
        setError('Selecciona un vehículo válido');
        return;
      }

      const waypoints = buildRouteWaypoints(currentRoute);
      if (waypoints.length < 2) {
        setError('No hay paradas disponibles para esta ruta');
        return;
      }

      const { distances, totalDist } = calculateRouteDistances(waypoints);
      routePointsRef.current = waypoints;
      routeDistancesRef.current = distances;
      totalDistanceRef.current = totalDist;

      const selectedInterno = internos.find((i) => i.id === config.internoId);
      if (!selectedInterno) {
        setError('Vehículo no encontrado');
        return;
      }

      const syndicateId = String(selectedInterno.syndicateId || selectedInterno.sindicatoId || userSyndicateId);
      if (!syndicateId || syndicateId === 'undefined') {
        setError('No se pudo determinar el sindicato del vehículo');
        return;
      }

      let currentLocation = locations.find((u) => u.internalId === config.internoId);

      if (!currentLocation) {
        const newLocation = await createLocation.mutateAsync({
          internalId: config.internoId,
          syndicateId,
          driverId: config.driverId || undefined,
          latitude: Number(waypoints[0].centerLat),
          longitude: Number(waypoints[0].centerLng),
          speedKmh: config.speedKmh,
        });
        currentLocation = newLocation;
        currentLocationRef.current = newLocation.id;
      } else {
        currentLocationRef.current = currentLocation.id;
      }

      setConfig((prev) => ({ ...prev, isSimulating: true }));
      distanceTraveledRef.current = 0;
      speedKmhRef.current = config.speedKmh;

      let updateCount = 0;

      simulationRef.current = setInterval(async () => {
        try {
          if (!currentLocationRef.current) {
            stopSimulation();
            return;
          }

          speedKmhRef.current = config.speedKmh;
          const distanceTraveled = (speedKmhRef.current / 3600) * 1;
          distanceTraveledRef.current += distanceTraveled;

          if (distanceTraveledRef.current >= totalDistanceRef.current) {
            distanceTraveledRef.current = 0;
          }

          const position = getPositionOnRoute(
            distanceTraveledRef.current,
            routePointsRef.current,
            routeDistancesRef.current
          );

          updateCount++;
          if (updateCount % 5 === 0) {
            console.log(`📍 Lat ${position.lat.toFixed(6)}, Lon ${position.lon.toFixed(6)}, Speed ${speedKmhRef.current}km/h`);
          }

          console.log(`🚗 [Simulador] Actualizando ubicación #${updateCount}:`, {
            id: currentLocationRef.current,
            lat: position.lat.toFixed(6),
            lng: position.lon.toFixed(6),
            speed: speedKmhRef.current,
          });

          await updateLocation.mutateAsync({
            id: currentLocationRef.current,
            updates: {
              latitude: position.lat,
              longitude: position.lon,
              speedKmh: speedKmhRef.current,
            },
          });
        } catch (err: any) {
          console.error('❌ Error en simulación:', err);
          stopSimulation();
        }
      }, 1000);
    } catch (err: any) {
      console.error('Error iniciando simulación:', err);
      setError(`Error: ${err.message}`);
    }
  };

  const stopSimulation = () => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
    }
    setConfig((prev) => ({ ...prev, isSimulating: false }));
  };

  useEffect(() => {
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, []);

  const selectedRoute = routes.find((r) => r.id === config.routeId);
  const isLoading = loadingDrivers || loadingInternos || loadingLines || loadingRoutes;

  if (isLoading) return <Cargando />;

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontWeight: 800, fontSize: '1.625rem', color: '#f2f2f2', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Zap size={22} color="#00d992" /> Simulador de Rutas para IA
        </h1>
        <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>Simula recorridos reales de vehículos en tiempo real</p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: 8, padding: '1rem', marginBottom: '2rem', color: '#ff4444' }}>
          {error}
        </div>
      )}

      {/* Configuration */}
      <div style={{ background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.15)', borderRadius: 8, padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '1.5rem' }}>Configuración</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Driver */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Conductor
            </label>
            <select
              value={config.driverId}
              onChange={(e) => {
                const driver = drivers.find((d) => d.id === e.target.value);
                setConfig((prev) => ({
                  ...prev,
                  driverId: e.target.value,
                  driverName: driver?.user?.name || '',
                }));
              }}
              className="campo-entrada"
              disabled={config.isSimulating}
            >
              <option value="">— Seleccionar Conductor —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user?.name || d.id}
                </option>
              ))}
            </select>
          </div>

          {/* Internal/Bus */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Vehículo
            </label>
            <select
              value={config.internoId}
              onChange={(e) => {
                const interno = internos.find((i) => i.id === e.target.value);
                setConfig((prev) => ({
                  ...prev,
                  internoId: e.target.value,
                  internoNumber: (interno?.numeroInterno || interno?.internalNumber || '').toString(),
                  lineId: '',
                  lineName: '',
                  routeId: '',
                  routeName: '',
                }));
              }}
              className="campo-entrada"
              disabled={config.isSimulating}
            >
              <option value="">— Seleccionar Vehículo —</option>
              {internos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.numeroInterno || i.internalNumber || 'Sin número'} ({i.placa || i.licensePlate || 'Sin placa'})
                </option>
              ))}
            </select>
          </div>

          {/* Line */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Línea
            </label>
            <select
              value={config.lineId}
              onChange={(e) => {
                const line = lines.find((l) => l.id === e.target.value);
                setConfig((prev) => ({
                  ...prev,
                  lineId: e.target.value,
                  lineName: line?.name || '',
                  routeId: '',
                  routeName: '',
                }));
              }}
              className="campo-entrada"
              disabled={!config.internoId || config.isSimulating}
            >
              <option value="">— Seleccionar Línea —</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>

          {/* Route */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Ruta
            </label>
            <select
              value={config.routeId}
              onChange={(e) => {
                const route = routes.find((r) => r.id === e.target.value);
                setConfig((prev) => ({
                  ...prev,
                  routeId: e.target.value,
                  routeName: route?.name || '',
                }));
              }}
              className="campo-entrada"
              disabled={!config.lineId || config.isSimulating}
            >
              <option value="">— Seleccionar Ruta —</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.stops?.length || 0} paradas)
                </option>
              ))}
            </select>
          </div>

          {/* Speed */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Velocidad (km/h)
            </label>
            <input
              type="number"
              value={config.speedKmh}
              onChange={(e) => {
                const newSpeed = parseInt(e.target.value) || 40;
                setConfig((prev) => ({ ...prev, speedKmh: newSpeed }));
              }}
              className="campo-entrada"
              min="5"
              max="100"
              step="5"
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={startSimulation}
            disabled={!config.routeId || !config.internoId || config.isSimulating}
            className="boton boton-primario"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: !config.routeId || !config.internoId || config.isSimulating ? 0.5 : 1 }}
          >
            <Play size={15} /> Iniciar Simulación
          </button>
          <button
            onClick={stopSimulation}
            disabled={!config.isSimulating}
            className="boton boton-secundario"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: !config.isSimulating ? 0.5 : 1 }}
          >
            <Pause size={15} /> Detener
          </button>
        </div>

        {/* Info */}
        {selectedRoute && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,217,146,0.05)', borderRadius: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Conductor</p>
                <p style={{ color: '#f2f2f2', fontWeight: 600 }}>{config.driverName || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Vehículo</p>
                <p style={{ color: '#f2f2f2', fontWeight: 600 }}>{config.internoNumber || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Línea</p>
                <p style={{ color: '#f2f2f2', fontWeight: 600 }}>{config.lineName || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Ruta</p>
                <p style={{ color: '#f2f2f2', fontWeight: 600 }}>{config.routeName || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Puntos</p>
                <p style={{ color: '#00d992', fontWeight: 600 }}>{selectedRoute.drawnPoints?.length || selectedRoute.stops?.length || 0}</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Distancia</p>
                <p style={{ color: '#f2f2f2', fontWeight: 600 }}>{parseFloat(selectedRoute.totalDistanceKm?.toString() || '0').toFixed(2)} km</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Tiempo Est.</p>
                <p style={{ color: '#f2f2f2', fontWeight: 600 }}>{selectedRoute.estimatedTimeMin || 0} min</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Simulations */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={18} color="#00d992" />
          Vehículos en Ruta
        </h2>

        {locations.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#8b949e', background: 'rgba(61,58,57,0.3)', borderRadius: 8 }}>
            Sin vehículos en simulación
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3d3a39' }}>
                  {['Vehículo', 'Lat', 'Lon', 'Vel', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locations.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(61,58,57,0.5)' }}>
                    <td style={{ padding: '0.875rem 1rem', color: '#f2f2f2', fontWeight: 600 }}>#{u.internalId}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#00d992', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {u.latitude.toFixed(4)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#00d992', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {u.longitude.toFixed(4)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0' }}>{u.speedKmh} km/h</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className={`insignia ${u.isActive ? 'insignia-exito' : 'insignia-advertencia'}`}>
                        {u.isActive ? 'En ruta' : 'Pausado'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <button
                        onClick={() => deleteLocation.mutate(u.id)}
                        className="boton boton-secundario"
                        style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Route Points */}
      {selectedRoute && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Route size={18} color="#00d992" />
            Puntos de la Ruta
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3d3a39' }}>
                  {['#', 'Nombre/Tipo', 'Latitud', 'Longitud'].map((h) => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(selectedRoute.drawnPoints && selectedRoute.drawnPoints.length > 0
                  ? selectedRoute.drawnPoints.map((p, i) => (
                      <tr key={`drawn-${i}`} style={{ borderBottom: '1px solid rgba(61,58,57,0.5)' }}>
                        <td style={{ padding: '0.875rem 1rem', color: '#00d992', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: '0.875rem 1rem', color: '#f2f2f2' }}>Punto Dibujado {i + 1}</td>
                        <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {Number(p.lat ?? p.latitude).toFixed(6)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {Number(p.lng ?? p.longitude).toFixed(6)}
                        </td>
                      </tr>
                    ))
                  : selectedRoute.stops?.sort((a, b) => a.orderIndex - b.orderIndex).map((p, i) => (
                      <tr key={`stop-${i}`} style={{ borderBottom: '1px solid rgba(61,58,57,0.5)' }}>
                        <td style={{ padding: '0.875rem 1rem', color: '#00d992', fontWeight: 600 }}>{p.orderIndex}</td>
                        <td style={{ padding: '0.875rem 1rem', color: '#f2f2f2' }}>{p.name}</td>
                        <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {Number(p.centerLat).toFixed(6)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {Number(p.centerLng).toFixed(6)}
                        </td>
                      </tr>
                    )) || (
                    <tr>
                      <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#8b949e' }}>
                        Sin puntos en esta ruta
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
