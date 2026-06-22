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

export default function RouteSimulator() {
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

  const simulationRef = useRef<NodeJS.Timeout>();
  const stopIndexRef = useRef(0);
  const distanceTraveledRef = useRef(0);

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locationTest'] }),
  });

  const updateLocation = useMutation({
    mutationFn: (data: any) => locationTestServicio.actualizar(data.id, data.updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locationTest'] }),
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

  const startSimulation = async () => {
    const currentRoute = routes.find((r) => r.id === config.routeId);
    if (!currentRoute || !config.internoId) return;

    const stops = currentRoute.stops?.sort((a, b) => a.orderIndex - b.orderIndex) || [];
    if (stops.length < 2) return;

    let currentLocation = locations.find((u) => u.internalId === config.internoId);

    if (!currentLocation) {
      const newLocation = await createLocation.mutateAsync({
        internalId: config.internoId,
        syndicateId: userSyndicateId,
        driverId: config.driverId,
        latitude: stops[0].centerLat,
        longitude: stops[0].centerLng,
        speedKmh: config.speedKmh,
      });
      currentLocation = newLocation;
    }

    setConfig((prev) => ({ ...prev, isSimulating: true }));
    stopIndexRef.current = 0;
    distanceTraveledRef.current = 0;

    simulationRef.current = setInterval(async () => {
      const stop1 = stops[stopIndexRef.current];
      const stop2 = stops[(stopIndexRef.current + 1) % stops.length];

      const totalDistance = calculateDistance(
        parseFloat(stop1.centerLat.toString()),
        parseFloat(stop1.centerLng.toString()),
        parseFloat(stop2.centerLat.toString()),
        parseFloat(stop2.centerLng.toString())
      );

      const distanceTraveled = (config.speedKmh / 3600) * 5;
      distanceTraveledRef.current += distanceTraveled;

      if (distanceTraveledRef.current >= totalDistance) {
        stopIndexRef.current = (stopIndexRef.current + 1) % stops.length;
        distanceTraveledRef.current = 0;
      } else {
        const fraction = distanceTraveledRef.current / totalDistance;
        const position = interpolatePosition(
          parseFloat(stop1.centerLat.toString()),
          parseFloat(stop1.centerLng.toString()),
          parseFloat(stop2.centerLat.toString()),
          parseFloat(stop2.centerLng.toString()),
          fraction
        );

        if (currentLocation) {
          await updateLocation.mutateAsync({
            id: currentLocation.id,
            updates: {
              latitude: position.lat,
              longitude: position.lon,
              speedKmh: config.speedKmh,
            },
          });
        }
      }
    }, 5000);
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
          <Zap size={22} color="#00d992" /> Route Simulator for AI
        </h1>
        <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>Simulate vehicles traversing routes in real-time</p>
      </div>

      {/* Configuration */}
      <div style={{ background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.15)', borderRadius: 8, padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '1.5rem' }}>Configuration</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Driver */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Driver
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
              <option value="">— Select Driver —</option>
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
              Vehicle
            </label>
            <select
              value={config.internoId}
              onChange={(e) => {
                const interno = internos.find((i) => i.id === e.target.value);
                setConfig((prev) => ({
                  ...prev,
                  internoId: e.target.value,
                  internoNumber: interno?.internalNumber || '',
                  lineId: '',
                  lineName: '',
                  routeId: '',
                  routeName: '',
                }));
              }}
              className="campo-entrada"
              disabled={config.isSimulating}
            >
              <option value="">— Select Vehicle —</option>
              {internos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.internalNumber} ({i.licensePlate})
                </option>
              ))}
            </select>
          </div>

          {/* Line */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Line
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
              <option value="">— Select Line —</option>
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
              Route
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
              <option value="">— Select Route —</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.stops?.length || 0} stops)
                </option>
              ))}
            </select>
          </div>

          {/* Speed */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Speed (km/h)
            </label>
            <input
              type="number"
              value={config.speedKmh}
              onChange={(e) => setConfig((prev) => ({ ...prev, speedKmh: parseInt(e.target.value) || 40 }))}
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
            <Play size={15} /> Start Simulation
          </button>
          <button
            onClick={stopSimulation}
            disabled={!config.isSimulating}
            className="boton boton-secundario"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: !config.isSimulating ? 0.5 : 1 }}
          >
            <Pause size={15} /> Stop
          </button>
        </div>

        {/* Info */}
        {selectedRoute && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,217,146,0.05)', borderRadius: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Driver</p>
                <p style={{ color: '#f2f2f2', fontWeight: 600 }}>{config.driverName || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Vehicle</p>
                <p style={{ color: '#f2f2f2', fontWeight: 600 }}>{config.internoNumber || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Line</p>
                <p style={{ color: '#f2f2f2', fontWeight: 600 }}>{config.lineName || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Route</p>
                <p style={{ color: '#f2f2f2', fontWeight: 600 }}>{config.routeName || '—'}</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Stops</p>
                <p style={{ color: '#00d992', fontWeight: 600 }}>{selectedRoute.stops?.length || 0}</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Distance</p>
                <p style={{ color: '#f2f2f2', fontWeight: 600 }}>{parseFloat(selectedRoute.totalDistanceKm?.toString() || '0').toFixed(2)} km</p>
              </div>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Est. Time</p>
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
          Vehicles on Route
        </h2>

        {locations.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#8b949e', background: 'rgba(61,58,57,0.3)', borderRadius: 8 }}>
            No vehicles in simulation
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3d3a39' }}>
                  {['Vehicle', 'Lat', 'Lon', 'Speed', 'Status', 'Actions'].map((h) => (
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
                        {u.isActive ? 'Running' : 'Paused'}
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

      {/* Route Stops */}
      {selectedRoute && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Route size={18} color="#00d992" />
            Route Stops
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3d3a39' }}>
                  {['#', 'Stop Name', 'Latitude', 'Longitude'].map((h) => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedRoute.stops
                  ?.sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(61,58,57,0.5)' }}>
                      <td style={{ padding: '0.875rem 1rem', color: '#00d992', fontWeight: 600 }}>{p.orderIndex}</td>
                      <td style={{ padding: '0.875rem 1rem', color: '#f2f2f2' }}>{p.name}</td>
                      <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {parseFloat(p.centerLat.toString()).toFixed(6)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {parseFloat(p.centerLng.toString()).toFixed(6)}
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
