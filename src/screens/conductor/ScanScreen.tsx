import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import { useMutation } from '@tanstack/react-query';
import { billeteraServicio } from '../../services/billetera_service';

export default function ConductorScanScreen() {
  const cameraRef = useRef(null);
  const [lineaId, setLineaId] = useState('');
  const [qrDetectado, setQrDetectado] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [torch, setTorch] = useState(false);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const mPagar = useMutation({
    mutationFn: () => billeteraServicio.pagar(lineaId),
    onSuccess: (resultado: any) => {
      Alert.alert('✅ Pago realizado', `Pasajero pagó Bs ${resultado.tarifaBaseBs}`);
      setProcesando(false);
      setQrDetectado(null);
    },
    onError: (error) => {
      Alert.alert('❌ Error', 'No se pudo procesar el pago');
      setProcesando(false);
      setQrDetectado(null);
    },
  });

  useEffect(() => {
    const iniciarUbicacion = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        locationSubscriptionRef.current = Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Best, distanceInterval: 10 },
          () => {} // Ubicación en background, no interrumpe escaneo
        );
      }
    };
    iniciarUbicacion();
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, []);

  const handleBarcodeScanned = ({ data }: any) => {
    if (procesando || qrDetectado === data) return;
    setQrDetectado(data);
    setProcesando(true);
    mPagar.mutate();
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        onBarcodeScanned={procesando ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        enableTorch={torch}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
      </CameraView>

      <View style={styles.panel}>
        <Text style={styles.title}>Escanear QR</Text>
        <Text style={styles.label}>Línea</Text>
        <TextInput
          style={styles.input}
          placeholder="ID de línea"
          value={lineaId}
          onChangeText={setLineaId}
          editable={!procesando}
          placeholderTextColor="#8b949e"
        />
        <TouchableOpacity style={styles.botonFlash} onPress={() => setTorch(!torch)}>
          <Text style={styles.botonTxt}>{torch ? '💡 Flash ON' : '💡 Flash OFF'}</Text>
        </TouchableOpacity>
        <Text style={styles.status}>
          {procesando ? '⏳ Procesando pago...' : qrDetectado ? '✅ QR detectado' : '📱 Apunta el QR'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050507' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanArea: { width: 250, height: 250, borderWidth: 2, borderColor: '#00d992', borderRadius: 12 },
  panel: { backgroundColor: '#1a1a1a', paddingHorizontal: 16, paddingVertical: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#f2f2f2', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#8b949e', marginBottom: 6 },
  input: { paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#2a2a2f', borderRadius: 8, color: '#f2f2f2', marginBottom: 12, borderWidth: 1, borderColor: '#3d3a39' },
  botonFlash: { paddingVertical: 12, backgroundColor: '#00d992', borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  botonTxt: { color: '#000', fontWeight: '700' },
  status: { textAlign: 'center', color: '#8b949e', fontSize: 14, fontWeight: '600' },
});
