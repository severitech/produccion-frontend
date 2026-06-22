import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../services/api';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Completa email y contraseña');
      return;
    }

    setCargando(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('rol', data.usuario?.rol || 'PASSENGER');
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    } catch (error) {
      Alert.alert('Error', 'Email o contraseña incorrectos');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>TransitAI</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholderTextColor="#8b949e"
        editable={!cargando}
      />
      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#8b949e"
        editable={!cargando}
      />
      <TouchableOpacity style={styles.boton} onPress={handleLogin} disabled={cargando}>
        <Text style={styles.botonTxt}>{cargando ? 'Iniciando...' : 'Iniciar sesión'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050507', paddingHorizontal: 20 },
  titulo: { fontSize: 28, fontWeight: '800', color: '#f2f2f2', marginBottom: 40 },
  input: { width: '100%', padding: 12, marginBottom: 12, backgroundColor: '#1e1e22', borderRadius: 8, color: '#f2f2f2', borderWidth: 1, borderColor: '#3d3a39' },
  boton: { width: '100%', padding: 14, backgroundColor: '#00d992', borderRadius: 8, alignItems: 'center' },
  botonTxt: { color: '#000', fontWeight: '700', fontSize: 16 },
});
