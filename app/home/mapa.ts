import { NODOS, buscarNodo, CONEXIONES } from './grafo';

const W = 360;
const H = 300;
const M = 36;

const lats = NODOS.map((n) => n.lat);
const lons = NODOS.map((n) => n.lon);
const minLat = Math.min.apply(null, lats);
const maxLat = Math.max.apply(null, lats);
const minLon = Math.min.apply(null, lons);
const maxLon = Math.max.apply(null, lons);

function limitar(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

// Convierte lat/lon a coordenadas del dibujo
export function proyectar(lat: number, lon: number): { x: number; y: number } {
  const x = M + ((lon - minLon) / (maxLon - minLon)) * (W - 2 * M);
  const y = M + ((maxLat - lat) / (maxLat - minLat)) * (H - 2 * M);
  return { x: limitar(x, 4, W - 4), y: limitar(y, 4, H - 4) };
}

// Etiqueta corta: [texto, dx, dy, anclaje]
const ETIQUETAS: { [id: string]: [string, number, number, string] } = {
  revolucion: ['Revolución', 0, -12, 'middle'],
  alameda: ['Alameda', -8, -8, 'end'],
  bellasartes: ['Bellas Artes', 0, -12, 'middle'],
  torre: ['Torre Lat.', 0, 18, 'middle'],
  correos: ['Palacio Postal', 8, 4, 'start'],
  garibaldi: ['Garibaldi', 8, 4, 'start'],
  santodomingo: ['Sto. Domingo', -8, -6, 'end'],
  templo: ['Templo Mayor', 0, 18, 'middle'],
  zocalo: ['Zócalo', -9, 4, 'end'],
  pinosuarez: ['Pino Suárez', -9, 4, 'end'],
};

// Genera una página HTML con el grafo en SVG (no necesita internet ni claves de mapas)
export function construirMapa(ruta: string[], origenId: string, destinoId: string): string {
  const enRuta: { [clave: string]: boolean } = {};
  const nodosRuta: { [id: string]: boolean } = {};
  for (let i = 0; i < ruta.length; i++) {
    nodosRuta[ruta[i]] = true;
    if (i < ruta.length - 1) {
      enRuta[ruta[i] + '|' + ruta[i + 1]] = true;
      enRuta[ruta[i + 1] + '|' + ruta[i]] = true;
    }
  }

  let calles = '';
  let tramos = '';
  for (const par of CONEXIONES) {
    const a = buscarNodo(par[0]);
    const b = buscarNodo(par[1]);
    const pa = proyectar(a.lat, a.lon);
    const pb = proyectar(b.lat, b.lon);
    const linea = `x1="${pa.x.toFixed(1)}" y1="${pa.y.toFixed(1)}" x2="${pb.x.toFixed(1)}" y2="${pb.y.toFixed(1)}"`;
    calles += `<line ${linea} stroke="#475569" stroke-width="3" stroke-linecap="round"/>`;
    if (enRuta[par[0] + '|' + par[1]]) {
      tramos += `<line ${linea} stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>`;
    }
  }

  let puntos = '';
  let textos = '';
  for (const n of NODOS) {
    const p = proyectar(n.lat, n.lon);
    let color = '#94a3b8';
    let r = 5;
    if (nodosRuta[n.id]) {
      color = '#38bdf8';
      r = 6;
    }
    if (n.id === origenId) {
      color = '#22c55e';
      r = 9;
    }
    if (n.id === destinoId) {
      color = '#ef4444';
      r = 9;
    }
    puntos += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${color}" stroke="#0f172a" stroke-width="2"/>`;
    const e = ETIQUETAS[n.id];
    textos += `<text x="${(p.x + e[1]).toFixed(1)}" y="${(p.y + e[2]).toFixed(1)}" text-anchor="${e[3]}" fill="#e2e8f0" font-size="10" font-family="sans-serif">${e[0]}</text>`;
  }

  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>html,body{margin:0;height:100%;background:#1e293b}svg{width:100%;height:100%;display:block}</style>' +
    '</head><body>' +
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">` +
    calles +
    tramos +
    puntos +
    textos +
    '<circle id="yo" cx="0" cy="0" r="7" fill="#f59e0b" stroke="#ffffff" stroke-width="2" style="display:none"/>' +
    '</svg>' +
    '<script>function mover(x,y){var c=document.getElementById("yo");c.setAttribute("cx",x);c.setAttribute("cy",y);c.style.display="block";}</script>' +
    '</body></html>'
  );
}
