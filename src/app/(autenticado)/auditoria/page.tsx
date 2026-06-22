'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Activity } from 'lucide-react';
import { auditoriaServicio, type RegistroAuditoria, type FiltrosBitacora } from '@/services/auditoria.servicio';
import { sindicatosServicio, type Sindicato } from '@/services/sindicatos.servicio';
import { usuariosServicio, type Usuario } from '@/services/usuarios.servicio';
import { Modal } from '@/components/dashboard/Modal';
import { Cargando } from '@/components/dashboard/Cargando';
import { useUsuarioAlmacen } from '@/almacen/usuario.almacen';

const accionColor: Record<string, string> = {
  LOGIN: 'insignia-info',
  INSERT: 'insignia-exito',
  UPDATE: 'insignia-advertencia',
  DELETE: 'insignia-peligro',
};

const accionLabel: Record<string, string> = {
  LOGIN: 'Login',
  INSERT: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
};

const POR_PAGINA = 20;

export default function PaginaAuditoria() {
  const { usuario } = useUsuarioAlmacen();
  const esSuperAdmin = usuario?.rol === 'SUPERADMIN';
  const esSindicatoAdmin = usuario?.rol === 'ADMIN_SINDICATO';
  const userSindicatoId = usuario?.sindicatoId?.toString();

  const [busqueda, setBusqueda] = useState('');
  const [filtroAccion, setFiltroAccion] = useState<'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | ''>('');
  const [filtroTabla, setFiltroTabla] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroSindicato, setFiltroSindicato] = useState(
    esSuperAdmin ? '' : userSindicatoId || ''
  );
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<RegistroAuditoria | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const { data: sindicatos = [] } = useQuery<Sindicato[]>({
    queryKey: ['sindicatos'],
    queryFn: () => sindicatosServicio.obtenerTodos(),
  });

  const { data: usuarios = [] } = useQuery<Usuario[]>({
    queryKey: ['usuarios', filtroSindicato],
    queryFn: () => usuariosServicio.obtenerTodos({
      ...(filtroSindicato ? { sindicatoId: filtroSindicato } : {}),
    }),
  });

  const filtros: FiltrosBitacora = {
    sindicatoId: filtroSindicato || undefined,
    tableName: filtroTabla || undefined,
    accion: filtroAccion || undefined,
    usuarioId: filtroUsuario || undefined,
    desde: filtroDesde || undefined,
    hasta: filtroHasta || undefined,
    pagina,
    limite: POR_PAGINA,
  };

  const { data: bitacora, isLoading } = useQuery({
    queryKey: ['auditoria', filtros],
    queryFn: () => auditoriaServicio.obtenerBitacora(filtros),
  });

  const registros = bitacora?.registros || [];
  const total = bitacora?.total || 0;
  const totalPaginas = Math.ceil(total / POR_PAGINA);

  const abrirDetalle = (registro: RegistroAuditoria) => {
    setSeleccionado(registro);
    setMostrarDetalle(true);
  };

  const cerrarDetalle = () => {
    setMostrarDetalle(false);
    setSeleccionado(null);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroAccion('');
    setFiltroTabla('');
    setFiltroUsuario('');
    setFiltroRol('');
    setFiltroSindicato(esSuperAdmin ? '' : userSindicatoId || '');
    setFiltroDesde('');
    setFiltroHasta('');
    setPagina(1);
  };

  const cambiarFiltro = (fn: () => void) => {
    fn();
    setPagina(1);
  };

  if (isLoading) return <Cargando />;

  return (
    <div style={{ padding: '2rem' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.625rem', color: '#f2f2f2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={22} color="#00d992" /> Bitácora de Auditoría
          </h1>
          <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>{total} registros encontrados</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: '1 1 150px', minWidth: 0 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
          <input
            className="campo-entrada"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Tabla..."
            value={filtroTabla}
            onChange={(e) => cambiarFiltro(() => setFiltroTabla(e.target.value))}
          />
        </div>

        <select
          className="campo-entrada"
          style={{ flex: '0 1 150px' }}
          value={filtroAccion}
          onChange={(e) => cambiarFiltro(() => setFiltroAccion(e.target.value as any))}
        >
          <option value="">Todas las acciones</option>
          <option value="LOGIN">Login</option>
          <option value="INSERT">Creación</option>
          <option value="UPDATE">Actualización</option>
          <option value="DELETE">Eliminación</option>
        </select>

        <select
          className="campo-entrada"
          style={{ flex: '0 1 150px' }}
          value={filtroRol}
          onChange={(e) => cambiarFiltro(() => setFiltroRol(e.target.value))}
        >
          <option value="">Todos los roles</option>
          <option value="SUPERADMIN">Superadmin</option>
          <option value="SINDICATO_ADMIN">Admin Sindicato</option>
          <option value="OPERATOR">Operador</option>
          <option value="DRIVER">Conductor</option>
          <option value="PASSENGER">Pasajero</option>
        </select>

        <select
          className="campo-entrada"
          style={{ flex: '0 1 150px' }}
          value={filtroUsuario}
          onChange={(e) => cambiarFiltro(() => setFiltroUsuario(e.target.value))}
        >
          <option value="">Todos los usuarios</option>
          {usuarios.map((u: any) => (
            <option key={u.id} value={u.id}>
              {u.name || u.email}
            </option>
          ))}
        </select>

        {esSuperAdmin && (
          <select
            className="campo-entrada"
            style={{ flex: '0 1 150px' }}
            value={filtroSindicato}
            onChange={(e) => cambiarFiltro(() => setFiltroSindicato(e.target.value))}
          >
            <option value="">Todos los sindicatos</option>
            {sindicatos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        )}

        <input
          className="campo-entrada"
          type="date"
          style={{ flex: '0 1 130px' }}
          value={filtroDesde}
          onChange={(e) => cambiarFiltro(() => setFiltroDesde(e.target.value))}
          placeholder="Desde"
        />

        <input
          className="campo-entrada"
          type="date"
          style={{ flex: '0 1 130px' }}
          value={filtroHasta}
          onChange={(e) => cambiarFiltro(() => setFiltroHasta(e.target.value))}
          placeholder="Hasta"
        />

        <button
          className="boton boton-secundario"
          onClick={limpiarFiltros}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          Limpiar
        </button>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #3d3a39' }}>
              {['Fecha', 'Usuario', 'Rol', 'Acción', 'Tabla', 'Registro', 'Sindicato', 'Acciones'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#8b949e',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#8b949e' }}>
                  No hay registros de auditoría
                </td>
              </tr>
            ) : (
              registros.map((registro) => (
                <tr key={registro.id} style={{ borderBottom: '1px solid rgba(61,58,57,0.5)' }}>
                  <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', fontSize: '0.875rem' }}>
                    {format(parseISO(registro.createdAt), 'dd MMM HH:mm', { locale: es })}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0' }}>{registro.user?.name || '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', color: '#8b949e', fontSize: '0.75rem' }}>
                    {(registro as any).userRole || '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span className={`insignia ${accionColor[registro.action] || 'insignia-info'}`}>
                      {accionLabel[registro.action] || registro.action}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: '#00d992', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {registro.tableName}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', fontSize: '0.875rem' }}>
                    {registro.recordName || `#${registro.recordId}`}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: '#8b949e', fontSize: '0.875rem' }}>
                    {registro.syndicate?.name || '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <button
                      className="boton boton-secundario"
                      style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                      onClick={() => abrirDetalle(registro)}
                    >
                      <Eye size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#8b949e', fontSize: '0.8rem' }}>
          <span>
            Mostrando {registros.length === 0 ? 0 : Math.min((pagina - 1) * POR_PAGINA + 1, total)}–
            {Math.min(pagina * POR_PAGINA, total)} de {total}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="boton boton-secundario"
              style={{ padding: '0.375rem 0.625rem' }}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ color: '#f2f2f2', fontWeight: 600 }}>
              Pág. {pagina} / {totalPaginas}
            </span>
            <button
              className="boton boton-secundario"
              style={{ padding: '0.375rem 0.625rem' }}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalle */}
      {mostrarDetalle && seleccionado && (
        <Modal
          titulo={`Detalle del Registro #${seleccionado.recordId}`}
          onCerrar={cerrarDetalle}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Usuario</label>
              <p style={{ color: '#f2f2f2' }}>{seleccionado.user?.name || '—'}</p>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Email</label>
              <p style={{ color: '#f2f2f2', fontSize: '0.875rem' }}>{seleccionado.user?.email || '—'}</p>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Acción</label>
              <p style={{ color: '#f2f2f2' }}>{accionLabel[seleccionado.action]}</p>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Tabla</label>
              <p style={{ color: '#00d992', fontFamily: 'monospace', fontSize: '0.875rem' }}>{seleccionado.tableName}</p>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Fecha</label>
              <p style={{ color: '#f2f2f2' }}>
                {format(parseISO(seleccionado.createdAt), 'dd MMM yyyy HH:mm:ss', { locale: es })}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Sindicato</label>
              <p style={{ color: '#f2f2f2' }}>{seleccionado.syndicate?.name || '—'}</p>
            </div>
          </div>

          {seleccionado.previousData && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#f2f2f2' }}>Datos Anteriores</h3>
              <pre
                style={{
                  background: 'rgba(61,58,57,0.5)',
                  padding: '0.75rem',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  color: '#b8b3b0',
                  border: '1px solid #3d3a39',
                }}
              >
                {JSON.stringify(seleccionado.previousData, null, 2)}
              </pre>
            </div>
          )}

          {seleccionado.newData && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#f2f2f2' }}>Datos Nuevos</h3>
              <pre
                style={{
                  background: 'rgba(61,58,57,0.5)',
                  padding: '0.75rem',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  color: '#00d992',
                  border: '1px solid #3d3a39',
                }}
              >
                {JSON.stringify(seleccionado.newData, null, 2)}
              </pre>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
