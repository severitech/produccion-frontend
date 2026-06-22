'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, User, Mail, Phone, Building, Calendar, LogIn } from 'lucide-react';
import { billeteraServicio } from '../../../services/billetera.servicio';
import { usuariosServicio } from '../../../services/usuarios.servicio';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { Transaccion } from '../../../core/tipos/respuesta';

const VERDE = '#00d992';
const card = { padding: '1.75rem' };
const etiqueta = { fontSize: '0.8rem', fontWeight: 600, color: '#b8b3b0', display: 'block' as const, marginBottom: '0.4rem' };
const ayudaTxt = { color: '#8b949e', fontSize: '0.82rem', lineHeight: 1.5, margin: '0.35rem 0 1.5rem' };
const POR_PAGINA = 10;

const TIPO_INFO: Record<string, { label: string; color: string; signo: string }> = {
  TOPUP: { label: 'Recarga', color: '#00d992', signo: '+' },
  FARE_PAYMENT: { label: 'Pago de pasaje', color: '#3b82f6', signo: '−' },
  PASS_PURCHASE: { label: 'Abono', color: '#a855f7', signo: '−' },
};

export default function ChoferBilletera() {
  const { usuario: usuarioAuth } = useUsuarioAlmacen();
  const [paginaActual, setPaginaActual] = useState(1);

  const { data: billetera } = useQuery({
    queryKey: ['mi-billetera'],
    queryFn: () => billeteraServicio.miBilletera(),
  });

  const { data: usuario } = useQuery({
    queryKey: ['mi-perfil'],
    queryFn: () => usuariosServicio.obtenerPorId(usuarioAuth?.id || ''),
    enabled: !!usuarioAuth?.id,
  });

  const { data: transacciones = [] } = useQuery<Transaccion[]>({
    queryKey: ['mi-historial'],
    queryFn: () => billeteraServicio.obtenerMiHistorial(),
  });

  const saldo = billetera?.saldoBs || 0;
  const totalPaginas = Math.max(1, Math.ceil(transacciones.length / POR_PAGINA));
  const paginaActualVal = Math.min(paginaActual, totalPaginas);
  const transaccionesVisibles = transacciones.slice((paginaActualVal - 1) * POR_PAGINA, paginaActualVal * POR_PAGINA);

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Saldo - Una sola tarjeta */}
      <div className="tarjeta" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(0,217,146,0.15) 0%, rgba(0,217,146,0.05) 100%)', border: '1px solid rgba(0,217,146,0.2)', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.5rem', fontWeight: 600 }}>Saldo disponible</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: VERDE, margin: 0 }}>Bs {saldo.toFixed(2)}</p>
          <p style={{ fontSize: '0.8rem', color: '#8b949e', margin: 0 }}>Categoría: <strong style={{ color: VERDE }}>{billetera?.categoria || 'General'}</strong></p>
        </div>
      </div>

      {/* Datos personales - Grid denso */}
      <div className="tarjeta" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem' }}>
          <User size={16} color={VERDE} /> Mi información
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Nombre</label>
            <div style={{ padding: '0.65rem 0.85rem', background: '#0a0a0a', border: '1px solid #3d3a39', borderRadius: 6, color: '#f2f2f2', fontSize: '0.9rem', fontWeight: 500, minHeight: '2.2rem', display: 'flex', alignItems: 'center' }}>
              {usuario?.name || '—'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Email</label>
            <div style={{ padding: '0.65rem 0.85rem', background: '#0a0a0a', border: '1px solid #3d3a39', borderRadius: 6, color: '#8b949e', fontSize: '0.9rem', minHeight: '2.2rem', display: 'flex', alignItems: 'center' }}>
              {usuario?.email || '—'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Teléfono</label>
            <div style={{ padding: '0.65rem 0.85rem', background: '#0a0a0a', border: '1px solid #3d3a39', borderRadius: 6, color: '#8b949e', fontSize: '0.9rem', minHeight: '2.2rem', display: 'flex', alignItems: 'center' }}>
              {usuario?.phone || '—'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Rol</label>
            <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(0,217,146,0.1)', border: '1px solid rgba(0,217,146,0.2)', borderRadius: 6, color: VERDE, fontSize: '0.9rem', fontWeight: 600, minHeight: '2.2rem', display: 'flex', alignItems: 'center' }}>
              Conductor
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Miembro desde</label>
            <div style={{ padding: '0.65rem 0.85rem', background: '#0a0a0a', border: '1px solid #3d3a39', borderRadius: 6, color: '#8b949e', fontSize: '0.9rem', minHeight: '2.2rem', display: 'flex', alignItems: 'center' }}>
              {usuario?.createdAt
                ? new Date(usuario.createdAt).toLocaleDateString('es-BO', { year: 'numeric', month: 'short', day: 'numeric' })
                : '—'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Última actualización</label>
            <div style={{ padding: '0.65rem 0.85rem', background: '#0a0a0a', border: '1px solid #3d3a39', borderRadius: 6, color: '#8b949e', fontSize: '0.9rem', minHeight: '2.2rem', display: 'flex', alignItems: 'center' }}>
              {usuario?.updatedAt
                ? new Date(usuario.updatedAt).toLocaleDateString('es-BO', { year: 'numeric', month: 'short', day: 'numeric' })
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* TRANSACCIONES - Ancho completo */}
      <div className="tarjeta" style={card}>
        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f2f2f2', display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '1.5rem' }}>
          <LogIn size={18} color={VERDE} /> Mi historial de transacciones
        </h2>
        <p style={ayudaTxt}>Recargas, pagos y abonos registrados en el sistema</p>

        {transacciones.length === 0 ? (
          <p style={{ color: '#8b949e', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
            Sin transacciones registradas
          </p>
        ) : (
          <>
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#8b949e', fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid #3d3a39' }}>
                    <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Fecha</th>
                    <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Tipo</th>
                    <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Monto</th>
                    <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Bloque</th>
                  </tr>
                </thead>
                <tbody>
                  {transaccionesVisibles.map((tx) => {
                    const info = TIPO_INFO[tx.tipo] ?? { label: tx.tipo, color: '#8b949e', signo: '' };
                    const fecha = new Date(tx.fecha).toLocaleString('es-BO', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    return (
                      <tr key={tx.id} style={{ borderTop: '1px solid #3d3a39' }}>
                        <td style={{ padding: '0.7rem 0.75rem', color: '#b8b3b0' }}>{fecha}</td>
                        <td style={{ padding: '0.7rem 0.75rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, color: info.color, background: `${info.color}1a`, border: `1px solid ${info.color}33` }}>
                            {info.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', textAlign: 'right', fontWeight: 700, color: info.color }}>
                          {info.signo} Bs {tx.montoBs.toFixed(2)}
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', color: '#8b949e', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          #{tx.blockNumber ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #3d3a39', color: '#8b949e', fontSize: '0.8rem' }}>
                <span>
                  Mostrando {transacciones.length === 0 ? 0 : Math.min((paginaActualVal - 1) * POR_PAGINA + 1, transacciones.length)}–
                  {Math.min(paginaActualVal * POR_PAGINA, transacciones.length)} de {transacciones.length}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                    disabled={paginaActualVal === 1}
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: paginaActualVal === 1 ? '#3d3a39' : '#1a1a1a',
                      color: paginaActualVal === 1 ? '#6b7280' : '#8b949e',
                      border: '1px solid #3d3a39',
                      borderRadius: 6,
                      cursor: paginaActualVal === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← Anterior
                  </button>
                  <span style={{ fontWeight: 600, color: '#f2f2f2' }}>
                    Pág. {paginaActualVal} / {totalPaginas}
                  </span>
                  <button
                    onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaActualVal === totalPaginas}
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: paginaActualVal === totalPaginas ? '#3d3a39' : '#1a1a1a',
                      color: paginaActualVal === totalPaginas ? '#6b7280' : '#8b949e',
                      border: '1px solid #3d3a39',
                      borderRadius: 6,
                      cursor: paginaActualVal === totalPaginas ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
