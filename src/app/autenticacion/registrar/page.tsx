'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bus, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { authServicio } from '../../../services/auth.servicio';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
  }
}

export default function PaginaRegistrar() {
  const router = useRouter();
  const [form, setForm] = useState({ nombre:'', email:'', password:'', telefono:'' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: { credential: string }) => {
          try {
            await authServicio.loginGoogle(resp.credential);
            router.push('/mapa');
          } catch {
            setError('No se pudo registrar con Google.');
          }
        },
      });
      const btn = document.getElementById('google-btn-reg');
      if (btn) {
        window.google?.accounts.id.renderButton(btn, {
          theme: 'filled_black', size: 'large', width: 368, text: 'signup_with',
        });
      }
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      await authServicio.register({ email:form.email, nombre:form.nombre, password:form.password, telefono:form.telefono||undefined });
      router.push('/autenticacion/iniciar-sesion');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al registrar. El email podría ya estar en uso.');
    } finally { setCargando(false); }
  };

  const campo = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#050507', padding:'2rem' }}>
      <div className="animar-deslizar" style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'rgba(0,217,146,0.1)', border:'1px solid rgba(0,217,146,0.3)', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem' }}>
            <Bus size={26} color="#00d992" />
          </div>
          <h1 style={{ fontWeight:800, fontSize:'1.5rem', color:'#f2f2f2', marginBottom:'0.375rem' }}>Crear Cuenta</h1>
          <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>Únete a Transit AI</p>
        </div>

        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <div style={{ marginBottom:'1.25rem' }}>
            <div id="google-btn-reg" style={{ display:'flex', justifyContent:'center' }} />
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', margin:'1.25rem 0' }}>
              <div style={{ flex:1, height:1, background:'#2a2a2f' }} />
              <span style={{ fontSize:'0.75rem', color:'#555' }}>o regístrate con email</span>
              <div style={{ flex:1, height:1, background:'#2a2a2f' }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="tarjeta" style={{ padding:'2rem' }}>
          {error && (
            <div style={{ background:'rgba(251,86,91,0.1)', border:'1px solid rgba(251,86,91,0.3)', borderRadius:10, padding:'0.75rem 1rem', marginBottom:'1.25rem', color:'#fb565b', fontSize:'0.8125rem' }}>
              {error}
            </div>
          )}
          {[
            { key:'nombre',   label:'Nombre completo',       type:'text',     placeholder:'Tu nombre',  icono:<User size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }} /> },
            { key:'email',    label:'Correo electrónico',    type:'email',    placeholder:'tu@email.com', icono:<Mail size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }} /> },
            { key:'password', label:'Contraseña',            type:'password', placeholder:'••••••••',   icono:<Lock size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }} /> },
            { key:'telefono', label:'Teléfono (opcional)',   type:'tel',      placeholder:'7XXXXXXX',   icono:null },
          ].map(({ key, label, type, placeholder, icono }) => (
            <div key={key} style={{ marginBottom:'1.125rem' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', marginBottom:'0.5rem', display:'block' }}>{label}</label>
              <div style={{ position:'relative' }}>
                {icono}
                <input type={type} className="campo-entrada" style={{ paddingLeft: icono ? '2.5rem' : '1rem' }} placeholder={placeholder} value={form[key as keyof typeof form]} onChange={campo(key as keyof typeof form)} required={key !== 'telefono'} />
              </div>
            </div>
          ))}
          <button type="submit" className="boton boton-primario" style={{ width:'100%', justifyContent:'center', padding:'0.75rem', marginTop:'0.5rem' }} disabled={cargando}>
            {cargando ? 'Creando cuenta...' : 'Registrarse'} <ArrowRight size={16} />
          </button>
          <p style={{ textAlign:'center', marginTop:'1.25rem', fontSize:'0.8125rem', color:'#8b949e' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/autenticacion/iniciar-sesion" style={{ color:'#00d992', fontWeight:600, textDecoration:'none' }}>Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
