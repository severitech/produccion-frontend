'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  Wallet, Plus, QrCode, Bus, Ticket, History, Check, CreditCard,
  ArrowDownLeft, ArrowUpRight, RefreshCw, GraduationCap, Accessibility, User as UserIcon,
} from 'lucide-react';
import { billeteraServicio } from '../../../services/billetera.servicio';
import { lineasServicio } from '../../../services/lineas.servicio';

type Resumen = { address: string; categoria: string; saldoBs: number; saldoCentavos: number };
type Linea = { id: string; name: string; code: string; fare: number | string; color: string };
type Mov = { id: string; tipo: string; montoBs: number; tarifaBaseBs: number | null; fecha: string; blockNumber: number | null };

const CAT_INFO: Record<string, { label: string; icono: React.ReactNode }> = {
  GENERAL: { label: 'General', icono: <UserIcon size={13} /> },
  ESTUDIANTE: { label: 'Estudiante', icono: <GraduationCap size={13} /> },
  ADULTO_MAYOR: { label: 'Adulto mayor', icono: <Accessibility size={13} /> },
};
const TIPO_INFO: Record<string, { label: string; color: string; signo: string; icono: React.ReactNode }> = {
  TOPUP: { label: 'Recarga', color: '#00d992', signo: '+', icono: <ArrowDownLeft size={14} /> },
  FARE_PAYMENT: { label: 'Pasaje', color: '#3b82f6', signo: '−', icono: <ArrowUpRight size={14} /> },
  PASS_PURCHASE: { label: 'Abono', color: '#a855f7', signo: '−', icono: <Ticket size={13} /> },
};
const VERDE = '#00d992';
const MONTOS = [10, 20, 50, 100];

type Tab = 'pagar' | 'recargar' | 'abono' | 'historial';
const TABS: { id: Tab; label: string; icono: React.ReactNode }[] = [
  { id: 'pagar', label: 'Pagar', icono: <QrCode size={14} /> },
  { id: 'recargar', label: 'Recargar', icono: <Plus size={14} /> },
  { id: 'abono', label: 'Abono', icono: <Ticket size={14} /> },
  { id: 'historial', label: 'Movimientos', icono: <History size={14} /> },
];

export default function PaginaMiBilletera() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('pagar');

  const { data: bil } = useQuery<Resumen>({ queryKey: ['mi-billetera'], queryFn: () => billeteraServicio.miBilletera() });
  const { data: lineas = [] } = useQuery<Linea[]>({ queryKey: ['lineas'], queryFn: () => lineasServicio.obtenerTodas() });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['mi-billetera'] });
    qc.invalidateQueries({ queryKey: ['mi-historial'] });
    qc.invalidateQueries({ queryKey: ['mi-abono'] });
  };

  // ── Recargar ──────────────────────────────────────────────────────────────
  const [monto, setMonto] = useState('20');
  const [stripeMsg, setStripeMsg] = useState<string | null>(null);
  const mStripe = useMutation({
    mutationFn: () => billeteraServicio.stripeCheckout({ monto: parseFloat(monto) }),
    onSuccess: (d: { url: string }) => { if (d.url) window.location.href = d.url; },
  });

  // Al volver de Stripe: confirmar el pago y acreditar el saldo.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'ok' && params.get('session_id')) {
      setTab('recargar');
      billeteraServicio.stripeConfirmar({ sessionId: params.get('session_id')! })
        .then((r: { recargaBs?: number }) => { setStripeMsg(r.recargaBs ? `¡Recarga exitosa de Bs ${r.recargaBs.toFixed(2)}!` : '¡Recarga acreditada!'); refrescar(); })
        .catch(() => setStripeMsg('No se pudo confirmar el pago.'));
    } else if (params.get('stripe') === 'cancel') {
      setTab('recargar');
      setStripeMsg('Pago cancelado.');
    }
    if (params.get('stripe')) window.history.replaceState({}, '', '/mi-billetera');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pagar ─────────────────────────────────────────────────────────────────
  const [qr, setQr] = useState<string | null>(null);
  const [seg, setSeg] = useState(0);
  const mQr = useMutation({
    mutationFn: () => billeteraServicio.generarQr(),
    onSuccess: (d: { qr: string; expiraEnSeg: number }) => { setQr(d.qr); setSeg(d.expiraEnSeg ?? 90); },
  });
  useEffect(() => {
    if (seg <= 0) return;
    const t = setInterval(() => setSeg((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [seg]);
  useEffect(() => { if (seg === 0) setQr(null); }, [seg]);

  // ── Abono ─────────────────────────────────────────────────────────────────
  const [lineaAbono, setLineaAbono] = useState('');
  const { data: abono } = useQuery<{ activo: boolean; validoHasta?: string; precioBs?: number }>({ queryKey: ['mi-abono'], queryFn: () => billeteraServicio.abonoActivo(), enabled: tab === 'abono' });
  const mAbono = useMutation({
    mutationFn: () => billeteraServicio.comprarAbono(lineaAbono ? { lineaId: lineaAbono } : {}),
    onSuccess: refrescar,
  });

  // ── Historial ─────────────────────────────────────────────────────────────
  const { data: movs = [] } = useQuery<Mov[]>({ queryKey: ['mi-historial'], queryFn: () => billeteraServicio.miHistorial(), enabled: tab === 'historial' });

  const cat = CAT_INFO[bil?.categoria ?? 'GENERAL'] ?? CAT_INFO.GENERAL;
  const fmtFecha = (f: string) => new Date(f).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      {/* ── Tarjeta de saldo ─────────────────────────────────────────────── */}
      <div className="tarjeta" style={{ padding: '1.75rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(0,217,146,0.12), rgba(0,217,146,0.02))', borderColor: 'rgba(0,217,146,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#b8b3b0', fontSize: '0.85rem' }}>
            <Wallet size={18} color={VERDE} /> Mi billetera
          </div>
          <button onClick={refrescar} className="boton boton-secundario" style={{ padding: '0.35rem 0.5rem' }}><RefreshCw size={13} /></button>
        </div>
        <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f2f2f2', margin: '0.5rem 0 0.25rem' }}>Bs {(bil?.saldoBs ?? 0).toFixed(2)}</p>
        <span className="insignia" style={{ background: 'rgba(0,217,146,0.12)', color: VERDE, border: '1px solid rgba(0,217,146,0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>{cat.icono} {cat.label}</span>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const activo = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, minWidth: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              padding: '0.65rem 0.75rem', fontSize: '0.83rem', fontWeight: activo ? 700 : 500,
              color: activo ? VERDE : '#b8b3b0', background: activo ? 'rgba(0,217,146,0.1)' : '#101010',
              border: activo ? `1px solid rgba(0,217,146,0.45)` : '1px solid #3d3a39', borderRadius: 10, cursor: 'pointer',
            }}>{t.icono} {t.label}</button>
          );
        })}
      </div>

      {/* ── PAGAR ────────────────────────────────────────────────────────── */}
      {tab === 'pagar' && (
        <div className="tarjeta" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '0.35rem' }}>Pagar con QR</h2>
          <p style={{ color: '#8b949e', fontSize: '0.82rem', marginBottom: '1.25rem' }}>Mostrá este código al chofer para que lo escanee.</p>
          {qr ? (
            <>
              <div style={{ background: '#fff', padding: '1rem', borderRadius: 12, display: 'inline-block' }}>
                <QRCodeSVG value={qr} size={190} />
              </div>
              <p style={{ color: seg <= 15 ? '#fb565b' : '#8b949e', fontSize: '0.8rem', marginTop: '0.85rem' }}>Expira en {seg}s</p>
              <button className="boton boton-secundario" style={{ marginTop: '0.5rem' }} onClick={() => mQr.mutate()}><RefreshCw size={14} /> Generar nuevo</button>
            </>
          ) : (
            <button className="boton boton-primario" style={{ justifyContent: 'center', margin: '0 auto' }} onClick={() => mQr.mutate()} disabled={mQr.isPending}>
              <QrCode size={16} /> {mQr.isPending ? 'Generando...' : 'Mostrar mi QR'}
            </button>
          )}
        </div>
      )}

      {/* ── RECARGAR ─────────────────────────────────────────────────────── */}
      {tab === 'recargar' && (
        <div className="tarjeta" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '0.35rem' }}>Recargar saldo</h2>
          <p style={{ color: '#8b949e', fontSize: '0.82rem', marginBottom: '1.25rem' }}>Pagá con tarjeta real de prueba (Stripe). El saldo se acredita al instante.</p>
          {stripeMsg && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.25)', color: VERDE, fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem' }}>{stripeMsg}</div>
          )}
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b8b3b0', display: 'block', marginBottom: '0.5rem' }}>Monto (Bs)</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {MONTOS.map((m) => (
              <button key={m} onClick={() => setMonto(String(m))} style={{
                flex: 1, minWidth: 64, padding: '0.6rem', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                background: monto === String(m) ? VERDE : 'rgba(255,255,255,0.05)', color: monto === String(m) ? '#000' : '#b8b3b0',
                border: monto === String(m) ? 'none' : '1px solid #3d3a39',
              }}>{m}</button>
            ))}
          </div>
          <input type="number" min={1} className="campo-entrada" style={{ marginBottom: '1.25rem' }} value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Otro monto" />
          <button className="boton" style={{ width: '100%', justifyContent: 'center', background: '#635bff', color: '#fff', border: 'none' }} onClick={() => mStripe.mutate()} disabled={mStripe.isPending || !(parseFloat(monto) > 0)}>
            <CreditCard size={16} /> {mStripe.isPending ? 'Redirigiendo a Stripe...' : `Pagar con tarjeta · Bs ${parseFloat(monto || '0').toFixed(2)}`}
          </button>
          <p style={{ fontSize: '0.72rem', color: '#8b949e', textAlign: 'center', margin: '0.75rem 0' }}>Tarjeta de prueba: 4242 4242 4242 4242 · cualquier fecha futura y CVC</p>
        </div>
      )}

      {/* ── ABONO ────────────────────────────────────────────────────────── */}
      {tab === 'abono' && (
        <div className="tarjeta" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '0.35rem' }}>Abono / pase mensual</h2>
          {abono?.activo ? (
            <div style={{ padding: '1rem', borderRadius: 10, background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.25)', marginTop: '0.75rem' }}>
              <p style={{ color: VERDE, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={15} /> Tenés un abono activo</p>
              <p style={{ color: '#8b949e', fontSize: '0.82rem', marginTop: '0.35rem' }}>Válido hasta el {abono.validoHasta ? new Date(abono.validoHasta).toLocaleDateString('es-BO') : '—'}</p>
            </div>
          ) : (
            <>
              <p style={{ color: '#8b949e', fontSize: '0.82rem', margin: '0 0 1rem' }}>Comprá un pase y viajá durante el período de validez. Se paga desde tu saldo.</p>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b8b3b0', display: 'block', marginBottom: '0.4rem' }}>Línea</label>
              <select className="campo-entrada" style={{ marginBottom: '1rem' }} value={lineaAbono} onChange={(e) => setLineaAbono(e.target.value)}>
                <option value="">Cualquier línea</option>
                {lineas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button className="boton boton-primario" style={{ width: '100%', justifyContent: 'center' }} onClick={() => mAbono.mutate()} disabled={mAbono.isPending}>
                <Ticket size={16} /> {mAbono.isPending ? 'Comprando...' : 'Comprar abono'}
              </button>
              {mAbono.isError && <p style={{ color: '#fb565b', fontSize: '0.82rem', marginTop: '0.75rem' }}>No se pudo comprar. Verificá tu saldo.</p>}
            </>
          )}
        </div>
      )}

      {/* ── HISTORIAL ────────────────────────────────────────────────────── */}
      {tab === 'historial' && (
        <div className="tarjeta" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '1rem' }}>Mis movimientos</h2>
          {movs.length === 0 ? (
            <p style={{ color: '#8b949e', fontSize: '0.85rem' }}>Todavía no tenés movimientos. Recargá saldo o pagá un pasaje para verlos acá.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {movs.map((m) => {
                const info = TIPO_INFO[m.tipo] ?? { label: m.tipo, color: '#8b949e', signo: '', icono: null };
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem', border: '1px solid #3d3a39', borderRadius: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${info.color}1a`, color: info.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{info.icono}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.86rem', color: '#f2f2f2' }}>{info.label}</p>
                      <p style={{ fontSize: '0.72rem', color: '#8b949e' }}>{fmtFecha(m.fecha)}</p>
                    </div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: info.color, whiteSpace: 'nowrap' }}>{info.signo} Bs {m.montoBs.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
