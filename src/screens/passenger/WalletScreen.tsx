import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import * as Linking from 'expo-linking';
import { billeteraServicio } from '../../services/billetera_service';

export default function PasajeroWalletScreen() {
  const [tab, setTab] = useState<'pagar' | 'recargar' | 'historial'>('pagar');
  const [monto, setMonto] = useState('20');
  const [qr, setQr] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);

  const { data: billetera } = useQuery({
    queryKey: ['billetera'],
    queryFn: () => billeteraServicio.miBilletera(),
  });

  const { data: historial = [] } = useQuery({
    queryKey: ['historial'],
    queryFn: () => billeteraServicio.miHistorial(),
  });

  const mQr = useMutation({
    mutationFn: () => billeteraServicio.generarQr(),
    onSuccess: (d: any) => {
      setQr(d.qr);
      setSegundos(d.expiraEnSeg || 90);
    },
  });

  const mStripe = useMutation({
    mutationFn: () => billeteraServicio.stripeCheckout(parseFloat(monto)),
    onSuccess: (d: any) => {
      if (d.url) Linking.openURL(d.url);
    },
  });

  useEffect(() => {
    if (segundos <= 0) {
      setQr(null);
      return;
    }
    const timer = setInterval(() => setSegundos(s => s - 1), 1000);
    return () => clearInterval(timer);
  }, [segundos]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Mi Billetera</Text>
        <Text style={styles.saldo}>Bs {billetera?.saldoBs?.toFixed(2) || '0.00'}</Text>
        <View style={styles.categoriaBadge}>
          <Text style={styles.categoriaText}>{billetera?.categoria || 'GENERAL'}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {(['pagar', 'recargar', 'historial'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabTxt, tab === t && styles.tabTxtActive]}>{t === 'pagar' ? '💳 Pagar' : t === 'recargar' ? '➕ Recargar' : '📋 Historial'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'pagar' && (
        <View style={styles.content}>
          {qr ? (
            <>
              <View style={styles.qrContainer}>
                <QRCode value={qr} size={200} />
              </View>
              <Text style={styles.expira}>Expira en {segundos}s</Text>
              <TouchableOpacity style={styles.botonSecundario} onPress={() => mQr.mutate()}>
                <Text style={styles.botonSecundarioTxt}>🔄 Nuevo QR</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.botonPrimario} onPress={() => mQr.mutate()} disabled={mQr.isPending}>
              <Text style={styles.botonPrimarioTxt}>{mQr.isPending ? 'Generando...' : '📱 Mostrar QR'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {tab === 'recargar' && (
        <View style={styles.content}>
          <Text style={styles.label}>Monto (Bs)</Text>
          <TextInput
            style={styles.input}
            value={monto}
            onChangeText={setMonto}
            keyboardType="decimal-pad"
            placeholderTextColor="#8b949e"
          />
          <TouchableOpacity style={styles.botonStripe} onPress={() => mStripe.mutate()} disabled={mStripe.isPending}>
            <Text style={styles.botonStripeTxt}>💳 Pagar Bs {parseFloat(monto || '0').toFixed(2)}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Tarjeta prueba: 4242 4242 4242 4242</Text>
        </View>
      )}

      {tab === 'historial' && (
        <View style={styles.content}>
          {historial.length === 0 ? (
            <Text style={styles.vacio}>Sin movimientos</Text>
          ) : (
            historial.map((m: any) => (
              <View key={m.id} style={styles.itemHistorial}>
                <View>
                  <Text style={styles.tipoTx}>{m.tipo}</Text>
                  <Text style={styles.fechaTx}>{new Date(m.fecha).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.montoxTx}>Bs {m.montoBs.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050507' },
  card: { margin: 16, padding: 20, backgroundColor: '#00d992', borderRadius: 16 },
  label: { color: 'rgba(0,0,0,0.7)', fontSize: 14 },
  saldo: { fontSize: 32, fontWeight: '800', color: '#000', marginVertical: 8 },
  categoriaBadge: { backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  categoriaText: { color: '#000', fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#1e1e22', borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#00d992' },
  tabTxt: { color: '#8b949e', fontWeight: '600', fontSize: 12 },
  tabTxtActive: { color: '#000' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  qrContainer: { alignItems: 'center', padding: 20, backgroundColor: '#1e1e22', borderRadius: 12, marginVertical: 16 },
  expira: { textAlign: 'center', color: '#8b949e', fontSize: 12, marginVertical: 8 },
  botonPrimario: { paddingVertical: 14, backgroundColor: '#00d992', borderRadius: 8, alignItems: 'center', marginVertical: 12 },
  botonPrimarioTxt: { color: '#000', fontWeight: '700' },
  botonSecundario: { paddingVertical: 12, backgroundColor: '#3d3a39', borderRadius: 8, alignItems: 'center', marginVertical: 12 },
  botonSecundarioTxt: { color: '#f2f2f2', fontWeight: '600' },
  botonStripe: { paddingVertical: 14, backgroundColor: '#635bff', borderRadius: 8, alignItems: 'center', marginVertical: 16 },
  botonStripeTxt: { color: '#fff', fontWeight: '700' },
  input: { paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#1e1e22', borderRadius: 8, color: '#f2f2f2', borderWidth: 1, borderColor: '#3d3a39', marginVertical: 12 },
  hint: { fontSize: 11, color: '#8b949e', textAlign: 'center', marginTop: 8 },
  itemHistorial: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#1e1e22', borderRadius: 8, marginVertical: 6 },
  tipoTx: { color: '#f2f2f2', fontWeight: '600', fontSize: 14 },
  fechaTx: { color: '#8b949e', fontSize: 12, marginTop: 4 },
  montoxTx: { color: '#00d992', fontWeight: '700' },
  vacio: { textAlign: 'center', color: '#8b949e', paddingVertical: 40 },
});
