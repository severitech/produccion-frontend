'use client';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
  ancho?: number;
}

export function Modal({ titulo, onCerrar, children, ancho = 480 }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCerrar]);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(5,5,7,0.8)', backdropFilter:'blur(4px)' }} />
      <div className="tarjeta animar-aparecer" style={{ position:'relative', width:'100%', maxWidth:ancho, padding:'1.75rem', zIndex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <h2 style={{ fontWeight:700, fontSize:'1.0625rem', color:'#f2f2f2' }}>{titulo}</h2>
          <button onClick={onCerrar} style={{ background:'none', border:'none', cursor:'pointer', color:'#8b949e', padding:'0.25rem', borderRadius:6, transition:'color 0.15s' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
