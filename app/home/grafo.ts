export interface Nodo {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

// Distancia en metros entre dos coordenadas (fórmula de Haversine)
export function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Nodos del grafo (coordenadas aproximadas del Centro de CDMX)
export const NODOS: Nodo[] = [
  { id: 'revolucion', nombre: 'Monumento a la Revolución', lat: 19.4361, lon: -99.1546 },
  { id: 'alameda', nombre: 'Alameda Central', lat: 19.4351, lon: -99.1444 },
  { id: 'bellasartes', nombre: 'Bellas Artes', lat: 19.4352, lon: -99.1412 },
  { id: 'torre', nombre: 'Torre Latinoamericana', lat: 19.434, lon: -99.1405 },
  { id: 'correos', nombre: 'Palacio Postal', lat: 19.4358, lon: -99.1385 },
  { id: 'garibaldi', nombre: 'Plaza Garibaldi', lat: 19.4416, lon: -99.1395 },
  { id: 'santodomingo', nombre: 'Plaza Santo Domingo', lat: 19.4375, lon: -99.1318 },
  { id: 'templo', nombre: 'Templo Mayor', lat: 19.435, lon: -99.1319 },
  { id: 'zocalo', nombre: 'Zócalo', lat: 19.4326, lon: -99.1332 },
  { id: 'pinosuarez', nombre: 'Metro Pino Suárez', lat: 19.4252, lon: -99.1331 },
];

// Aristas (calles): el peso se calcula solo con la distancia entre nodos
export const CONEXIONES: [string, string][] = [
  ['revolucion', 'alameda'],
  ['alameda', 'bellasartes'],
  ['bellasartes', 'torre'],
  ['bellasartes', 'correos'],
  ['bellasartes', 'garibaldi'],
  ['torre', 'zocalo'],
  ['correos', 'templo'],
  ['correos', 'santodomingo'],
  ['garibaldi', 'santodomingo'],
  ['santodomingo', 'templo'],
  ['templo', 'zocalo'],
  ['zocalo', 'pinosuarez'],
];

export function buscarNodo(id: string): Nodo {
  return NODOS.filter((n) => n.id === id)[0];
}

export interface ResultadoRuta {
  ids: string[];
  metros: number;
}

// Dijkstra: ruta de menor distancia entre dos nodos
export function dijkstra(origen: string, destino: string): ResultadoRuta | null {
  const ady = new Map<string, { id: string; peso: number }[]>();
  for (const n of NODOS) ady.set(n.id, []);
  for (const [a, b] of CONEXIONES) {
    const na = buscarNodo(a);
    const nb = buscarNodo(b);
    const peso = distanciaMetros(na.lat, na.lon, nb.lat, nb.lon);
    ady.get(a)!.push({ id: b, peso });
    ady.get(b)!.push({ id: a, peso });
  }

  const dist: { [id: string]: number } = {};
  const prev: { [id: string]: string | null } = {};
  const visitado: { [id: string]: boolean } = {};
  for (const n of NODOS) {
    dist[n.id] = Infinity;
    prev[n.id] = null;
  }
  dist[origen] = 0;

  for (let i = 0; i < NODOS.length; i++) {
    let u: string | null = null;
    for (const n of NODOS) {
      if (!visitado[n.id] && (u === null || dist[n.id] < dist[u])) u = n.id;
    }
    if (u === null || dist[u] === Infinity) break;
    visitado[u] = true;
    if (u === destino) break;
    for (const v of ady.get(u)!) {
      const alt = dist[u] + v.peso;
      if (alt < dist[v.id]) {
        dist[v.id] = alt;
        prev[v.id] = u;
      }
    }
  }

  if (dist[destino] === Infinity) return null;
  const ids: string[] = [];
  let actual: string | null = destino;
  while (actual !== null) {
    ids.unshift(actual);
    actual = prev[actual];
  }
  return { ids, metros: dist[destino] };
}

// Convierte la ruta en puntos GPS cada ~40 m para simular el recorrido
export function puntosDeRuta(ids: string[], paso = 40): { latitude: number; longitude: number }[] {
  const pts: { latitude: number; longitude: number }[] = [];
  for (let i = 0; i < ids.length - 1; i++) {
    const a = buscarNodo(ids[i]);
    const b = buscarNodo(ids[i + 1]);
    const largo = distanciaMetros(a.lat, a.lon, b.lat, b.lon);
    const n = Math.max(1, Math.round(largo / paso));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push({
        latitude: a.lat + (b.lat - a.lat) * t,
        longitude: a.lon + (b.lon - a.lon) * t,
      });
    }
  }
  const ultimo = buscarNodo(ids[ids.length - 1]);
  pts.push({ latitude: ultimo.lat, longitude: ultimo.lon });
  return pts;
}

function limpiar(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Acepta "zocalo", "destino:zocalo" o el nombre completo del lugar
export function nodoDesdeTexto(texto: string): Nodo | null {
  const t = limpiar(texto).replace(/^destino\s*[:=]\s*/, '');
  for (const n of NODOS) {
    if (limpiar(n.id) === t || limpiar(n.nombre) === t) return n;
  }
  return null;
}
