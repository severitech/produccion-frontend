'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, MapPin, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { paradasServicio, type Parada } from '@/services/paradas.servicio';
import { lineasServicio } from '@/services/lineas.servicio';
import { useUsuarioAlmacen } from '@/almacen/usuario.almacen';
import { Cargando } from '@/components/dashboard/Cargando';

const POR_PAGINA = 10;

export default function PaginaParadas() {
  const router = useRouter();
  const { usuario } = useUsuarioAlmacen();
  const sindicatoIdUsuario = usuario?.sindicatoId ? String(usuario.sindicatoId) : '';
  const qc = useQueryClient();

  const [busqueda, setBusqueda] = useState('');
  const [filtroLinea, setFiltroLinea] = useState('');
  const [pagina, setPagina] = useState(1);

  const { data: paradas = [], isLoading } = useQuery<Parada[]>({
    queryKey: ['paradas', filtroLinea],
    queryFn: () => paradasServicio.obtenerTodas(filtroLinea ? { lineaId: filtroLinea } : undefined),
  });

  const { data: lineas = [] } = useQuery({
    queryKey: ['lineas', sindicatoIdUsuario],
    queryFn: () => lineasServicio.obtenerTodas(sindicatoIdUsuario ? { sindicatoId: sindicatoIdUsuario } : undefined),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => paradasServicio.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paradas'] }),
  });

  const filtradas = paradas.filter((p) => {
    const texto = busqueda.toLowerCase();
    return !busqueda || p.nombre?.toLowerCase().includes(texto) || p.descripcion?.toLowerCase().includes(texto);
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  return (
    <div style={{ padding: '2rem' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.625rem', color: '#f2f2f2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={22} color="#00d992" /> Paradas
          </h1>
          <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>{filtradas.length} paradas encontradas</p>
        </div>
        <button className="boton boton-primario" onClick={() => router.push('/paradas/nueva')}>
          <Plus size={15} /> Nueva Parada
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
          <input
            className="campo-entrada"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Buscar parada..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
          />
        </div>
        <select
          className="campo-entrada"
          style={{ flex: '0 1 200px' }}
          value={filtroLinea}
          onChange={(e) => { setFiltroLinea(e.target.value); setPagina(1); }}
        >
          <option value="">Todas las líneas</option>
          {lineas.map((l: any) => (
            <option key={String(l.id)} value={String(l.id)}>
              {l.code} – {l.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Cargando />
      ) : (
        <>
          {/* Tabla */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3d3a39' }}>
                  {['Nombre', 'Línea', 'Centro', 'Acciones'].map((h) => (
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
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(61,58,57,0.5)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#f2f2f2' }}>{p.name || p.nombre || '—'}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#8b949e', fontSize: '0.85rem' }}>{p.line?.name || p.line?.code || '—'}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#8b949e', fontSize: '0.8rem' }}>
                      ({Number(p.centerLat).toFixed(3)}, {Number(p.centerLng).toFixed(3)})
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          className="boton boton-secundario"
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                          onClick={() => router.push(`/paradas/${p.id}`)}
                          title="Editar"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="boton"
                          style={{
                            padding: '0.375rem 0.625rem',
                            fontSize: '0.72rem',
                            background: 'rgba(251,86,91,0.1)',
                            color: '#fb565b',
                            border: '1px solid rgba(251,86,91,0.2)',
                          }}
                          onClick={() => eliminar.mutate(p.id)}
                          disabled={eliminar.isPending}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#8b949e' }}>
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', color: '#8b949e', fontSize: '0.8rem' }}>
            <span>
              Mostrando {filtradas.length === 0 ? 0 : Math.min((paginaActual - 1) * POR_PAGINA + 1, filtradas.length)}–
              {Math.min(paginaActual * POR_PAGINA, filtradas.length)} de {filtradas.length}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className="boton boton-secundario"
                style={{ padding: '0.375rem 0.625rem' }}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ color: '#f2f2f2', fontWeight: 600 }}>
                Pág. {paginaActual} / {totalPaginas}
              </span>
              <button
                className="boton boton-secundario"
                style={{ padding: '0.375rem 0.625rem' }}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
