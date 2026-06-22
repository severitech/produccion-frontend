'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bus, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authServicio } from '../../../services/auth.servicio';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function redirigirPorRol(rol: string, router: ReturnType<typeof useRouter>) {
  if (rol === 'DRIVER') return router.push('/chofer/panel');
  if (rol === 'PASSENGER' || rol === 'PASAJERO') return router.push('/mapa');
  router.push('/panel');
}

export default function PaginaIniciarSesion() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Cargar Google GSI y configurar callback
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
            const data = await authServicio.loginGoogle({ idToken: resp.credential });
            redirigirPorRol(data.usuario?.rol, router);
          } catch {
            setError('No se pudo iniciar sesión con Google.');
          }
        },
      });
      const btn = document.getElementById('google-btn');
      if (btn) {
        window.google?.accounts.id.renderButton(btn, {
          theme: 'filled_black', size: 'large', width: 352, text: 'continue_with',
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
      const data = await authServicio.login({ email, password });
      redirigirPorRol(data.usuario?.rol, router);
    } catch (err: any) {
      setError(err?.message || 'Credenciales inválidas.');
    } finally { setCargando(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#050507', padding:'2rem' }}>
      <div className="animar-deslizar" style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'rgba(0,217,146,0.1)', border:'1px solid rgba(0,217,146,0.3)', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:'1.25rem' }}>
            <Bus size={26} color="#00d992" />
          </div>
          <h1 style={{ fontWeight:800, fontSize:'1.5rem', color:'#f2f2f2', marginBottom:'0.375rem' }}>Iniciar Sesión</h1>
          <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>Accede a tu cuenta Transit AI</p>
        </div>

        <form onSubmit={handleSubmit} className="tarjeta" style={{ padding:'2rem' }}>
          {error && (
            <div style={{ background:'rgba(251,86,91,0.1)', border:'1px solid rgba(251,86,91,0.3)', borderRadius:10, padding:'0.75rem 1rem', marginBottom:'1.25rem', color:'#fb565b', fontSize:'0.8125rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom:'1.125rem' }}>
            <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', marginBottom:'0.5rem', display:'block' }}>Correo electrónico</label>
            <div style={{ position:'relative' }}>
              <Mail size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }} />
              <input type="email" className="campo-entrada" style={{ paddingLeft:'2.5rem' }} placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', marginBottom:'0.5rem', display:'block' }}>Contraseña</label>
            <div style={{ position:'relative' }}>
              <Lock size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }} />
              <input type={mostrarPassword ? 'text' : 'password'} className="campo-entrada" style={{ paddingLeft:'2.5rem', paddingRight:'2.75rem' }} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:'0.25rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {mostrarPassword ? <EyeOff size={15} color="#8b949e" /> : <Eye size={15} color="#8b949e" />}
              </button>
            </div>
          </div>

          <button type="submit" className="boton boton-primario" style={{ width:'100%', justifyContent:'center', padding:'0.75rem', fontSize:'0.9375rem' }} disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Iniciar Sesión'} <ArrowRight size={16} />
          </button>

          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', margin:'1.25rem 0' }}>
                <div style={{ flex:1, height:1, background:'#2a2a2f' }} />
                <span style={{ fontSize:'0.75rem', color:'#555' }}>o continúa con</span>
                <div style={{ flex:1, height:1, background:'#2a2a2f' }} />
              </div>
              <div id="google-btn" style={{ display:'flex', justifyContent:'center' }} />
            </>
          )}

          <p style={{ textAlign:'center', marginTop:'1.25rem', fontSize:'0.8125rem', color:'#8b949e' }}>
            ¿No tienes cuenta?{' '}
            <Link href="/autenticacion/registrar" style={{ color:'#00d992', fontWeight:600, textDecoration:'none' }}>Regístrate</Link>
          </p>
        </form>

        <p style={{ textAlign:'center', marginTop:'0.75rem', fontSize:'0.75rem', color:'#8b949e' }}>
          Demo: <span style={{ color:'#00d992' }}>admin@transit.bo</span> / <span style={{ color:'#00d992' }}>password123</span>
        </p>
      </div>
    </div>
  );
}
