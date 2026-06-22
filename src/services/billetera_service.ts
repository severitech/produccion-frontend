import { api } from './api';

export const billeteraServicio = {
  miBilletera: () => api.get('/billetera').then((r) => r.data),
  generarQr: () => api.get('/billetera/qr').then((r) => r.data),
  pagar: (lineaId: string) => api.post('/billetera/pagar', { lineaId }).then((r) => r.data),
  stripeCheckout: (monto: number) => api.post('/billetera/stripe/checkout', { monto }).then((r) => r.data),
  stripeConfirmar: (sessionId: string) => api.post('/billetera/stripe/confirmar', { sessionId }).then((r) => r.data),
  miHistorial: () => api.get('/billetera/historial').then((r) => r.data),
};
