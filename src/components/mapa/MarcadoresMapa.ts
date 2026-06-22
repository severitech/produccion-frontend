import L from 'leaflet';

export function crearIconoOrigen(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -52],
    html: `
      <div style="position:relative;width:44px;height:52px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
        <svg width="44" height="52" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 2C12.059 2 4 10.059 4 20C4 33 22 50 22 50C22 50 40 33 40 20C40 10.059 31.941 2 22 2Z"
            fill="#00d992" stroke="white" stroke-width="2.5"/>
          <circle cx="22" cy="20" r="9" fill="white" fill-opacity="0.2"/>
          <text x="22" y="25" text-anchor="middle" fill="white" font-weight="900"
            font-size="13" font-family="Inter,system-ui,sans-serif">A</text>
        </svg>
      </div>`,
  });
}

export function crearIconoDestino(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -52],
    html: `
      <div style="position:relative;width:44px;height:52px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
        <svg width="44" height="52" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 2C12.059 2 4 10.059 4 20C4 33 22 50 22 50C22 50 40 33 40 20C40 10.059 31.941 2 22 2Z"
            fill="#fb565b" stroke="white" stroke-width="2.5"/>
          <circle cx="22" cy="20" r="9" fill="white" fill-opacity="0.2"/>
          <text x="22" y="25" text-anchor="middle" fill="white" font-weight="900"
            font-size="13" font-family="Inter,system-ui,sans-serif">B</text>
        </svg>
      </div>`,
  });
}

export function crearIconoEmbarque(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  });
}

export function crearIconoBus(color: string, rumbo: number): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);transform:rotate(${rumbo}deg);transition:transform 0.5s ease;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2L19 21L12 17L5 21L12 2Z"/></svg></div>`,
  });
}
