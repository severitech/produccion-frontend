export function Cargando({ texto = 'Cargando...' }: { texto?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'4rem 2rem', flexDirection:'column', gap:'1rem' }}>
      <div style={{ width:36, height:36, border:'3px solid #3d3a39', borderTopColor:'#00d992', borderRadius:'50%', animation:'girar 0.8s linear infinite' }} />
      <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{texto}</p>
      <style>{`@keyframes girar { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
