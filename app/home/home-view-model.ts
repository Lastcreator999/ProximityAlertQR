import { Observable, CoreTypes, Dialogs, WebView } from '@nativescript/core';
import {
  enableLocationRequest,
  watchLocation,
  clearWatch,
  getCurrentLocation,
} from '@nativescript/geolocation';
import { DetectionEvent, DetectionType, MLKitView } from '@nativescript/mlkit-core';
import { BarcodeResult } from '@nativescript/mlkit-barcode-scanning';
import '@nativescript/mlkit-barcode-scanning';
import {
  NODOS,
  Nodo,
  buscarNodo,
  dijkstra,
  puntosDeRuta,
  distanciaMetros,
  nodoDesdeTexto,
} from './grafo';
import { construirMapa, proyectar } from './mapa';
import {
  tienePermisoUbicacion,
  pedirPermisoNotificaciones,
  mostrarNotificacion,
  ejecutarJS,
} from './plataforma';

const RADIO = 50;

export class HomeViewModel extends Observable {
  private watchId: number | null = null;
  private timer: any = null;
  private simTimer: any = null;
  private yaNotifico = false;
  private d0: number | null = null;
  private origenId = 'revolucion';
  private destinoId = 'zocalo';
  private rutaIds: string[] = [];
  private mapa: WebView | null = null;
  private camara: MLKitView | null = null;
  private ultimoQR = '';
  private ultimoQRHora = 0;
  private permisoNotifPedido = false;

  constructor() {
    super();
    this.onDetection = this.onDetection.bind(this);
    this.set('radio', RADIO);
    this.set('estado', 'Elige origen y destino, o escanea un QR');
    this.set('distancia', '-');
    this.set('progreso', 0);
    this.set('siguiendo', false);
    this.set('simulando', false);
    this.set('llegada', false);
    this.set('cerca', false);
    this.set('escaneando', false);
    this.actualizarRuta();
  }

  conectarMapa(wv: WebView) {
    this.mapa = wv;
    this.renderMapa();
    // Se pide una sola vez, cuando la pantalla ya está visible
    if (!this.permisoNotifPedido) {
      this.permisoNotifPedido = true;
      pedirPermisoNotificaciones();
    }
  }

  conectarCamara(cam: MLKitView) {
    this.camara = cam;
    // El plugin enciende la cámara sola en onLoaded, aunque la tarjeta esté oculta
    if (!this.get('escaneando')) this.apagarCamara();
  }

  // Se llama cuando la página se descarga: apaga cámara, GPS y timers
  liberar() {
    this.detener();
    this.set('escaneando', false);
    this.apagarCamara();
    this.camara = null;
    this.mapa = null;
  }

  private apagarCamara() {
    try {
      this.camara?.stopPreview();
    } catch (e) {
      // la vista nativa ya no existe
    }
  }

  private renderMapa() {
    if (!this.mapa) return;
    this.mapa.src = construirMapa(this.rutaIds, this.origenId, this.destinoId);
  }

  private moverPunto(lat: number, lon: number) {
    if (!this.mapa) return;
    const p = proyectar(lat, lon);
    try {
      ejecutarJS(this.mapa, `mover(${p.x.toFixed(1)},${p.y.toFixed(1)})`);
    } catch (e) {
      // el mapa aún no termina de cargar
    }
  }

  // Dijkstra: ruta del origen al destino elegidos
  private actualizarRuta() {
    const o = buscarNodo(this.origenId);
    const d = buscarNodo(this.destinoId);
    this.set('origen', o.nombre);
    this.set('destino', d.nombre);
    const ruta = dijkstra(o.id, d.id);
    if (!ruta) {
      this.rutaIds = [];
      this.set('ruta', 'Sin ruta disponible');
      this.set('rutaDetalle', '');
    } else {
      this.rutaIds = ruta.ids;
      const recta = distanciaMetros(o.lat, o.lon, d.lat, d.lon);
      this.set('ruta', ruta.ids.map((id) => buscarNodo(id).nombre).join(' → '));
      this.set(
        'rutaDetalle',
        `${ruta.ids.length - 1} tramos · ${Math.round(ruta.metros)} m por la ruta (línea recta: ${Math.round(recta)} m)`
      );
    }
    this.renderMapa();
  }

  async elegirOrigen() {
    await this.elegir('origen');
  }

  async elegirDestino() {
    await this.elegir('destino');
  }

  private async elegir(cual: string) {
    this.detener();
    const res = await Dialogs.action({
      title: cual === 'origen' ? 'Elige el origen' : 'Elige el destino',
      cancelButtonText: 'Cancelar',
      actions: NODOS.map((n) => n.nombre),
    });
    const nodo = NODOS.filter((n) => n.nombre === res)[0];
    if (!nodo) return;
    if (cual === 'origen') {
      if (nodo.id === this.destinoId) this.destinoId = this.origenId;
      this.origenId = nodo.id;
    } else {
      this.fijarDestino(nodo);
      return;
    }
    this.reiniciarEstado();
    this.set('estado', 'Ruta lista. Presiona Simular recorrido');
    this.actualizarRuta();
  }

  // Cambia el destino (lo usan la lista y el QR)
  private fijarDestino(nodo: Nodo) {
    if (nodo.id === this.origenId) this.origenId = this.destinoId;
    this.destinoId = nodo.id;
    this.reiniciarEstado();
    this.actualizarRuta();
  }

  intercambiar() {
    this.detener();
    const t = this.origenId;
    this.origenId = this.destinoId;
    this.destinoId = t;
    this.reiniciarEstado();
    this.set('estado', 'Ruta lista. Presiona Simular recorrido');
    this.actualizarRuta();
  }

  // ---------- QR ----------
  async abrirEscaner() {
    this.detener();
    this.ultimoQR = '';
    const cam = this.camara;
    if (!cam) {
      this.set('estado', 'La cámara todavía no está lista, intenta de nuevo.');
      return;
    }
    if (!cam.hasCameraPermission()) {
      this.set('estado', 'Esperando permiso de cámara...');
      try {
        await cam.requestCameraPermission();
      } catch (e) {
        console.log('Permiso de cámara:', e);
      }
      if (!cam.hasCameraPermission()) {
        this.set('estado', 'Falta permiso de cámara. Usa "Escribir código" o actívalo en Ajustes.');
        return;
      }
    }
    this.set('escaneando', true);
    this.set('estado', 'Apunta la cámara al código QR');
    // En Android el plugin no arranca la vista previa después de conceder el permiso
    cam.startPreview();
  }

  cerrarEscaner() {
    this.set('escaneando', false);
    this.apagarCamara();
    this.set('estado', 'Escaneo cancelado');
  }

  onDetection(event: DetectionEvent) {
    if (!this.get('escaneando')) return;
    if (event.type !== DetectionType.Barcode) return;
    const datos = event.data as BarcodeResult[];
    const texto = datos && datos[0] ? datos[0].rawValue : null;
    if (!texto) return;
    // Evita procesar el mismo QR muchas veces seguidas
    const ahora = Date.now();
    if (texto === this.ultimoQR && ahora - this.ultimoQRHora < 3000) return;
    this.ultimoQR = texto;
    this.ultimoQRHora = ahora;
    this.procesarQR(texto);
  }

  async escribirCodigo() {
    this.detener();
    const res = await Dialogs.prompt({
      title: 'Código del QR',
      message: 'Escribe el texto del QR. Ejemplos: destino:zocalo, destino:garibaldi, destino:torre',
      defaultText: 'destino:',
      okButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
    });
    if (res.result && res.text) this.procesarQR(res.text);
  }

  private procesarQR(texto: string) {
    const nodo = nodoDesdeTexto(texto);
    if (!nodo) {
      this.set('estado', `QR no reconocido: "${texto}"`);
      return;
    }
    this.set('escaneando', false);
    this.apagarCamara();
    this.fijarDestino(nodo);
    this.set('estado', `Destino fijado por QR: ${nodo.nombre}. Presiona Simular recorrido`);
  }

  // ---------- Alerta ----------
  async notificarLlegada() {
    const nombre = buscarNodo(this.destinoId).nombre;
    try {
      await mostrarNotificacion('¡Llegaste!', `Has llegado a ${nombre}`);
      this.set('llegada', true);
      this.set('estado', `¡Llegaste a ${nombre}!`);
    } catch (e) {
      console.log('Error al notificar:', e);
      this.set('estado', 'Error al notificar: ' + e);
    }
  }

  simular() {
    this.notificarLlegada();
  }

  // Procesa cada ubicación (real o simulada)
  private procesar(loc: any) {
    if (!loc || !this.get('siguiendo')) return;
    const dest = buscarNodo(this.destinoId);
    const d = distanciaMetros(loc.latitude, loc.longitude, dest.lat, dest.lon);
    if (this.d0 === null || d > this.d0) this.d0 = d;
    const prog = this.d0 > 0 ? Math.max(0, Math.min(100, (1 - d / this.d0) * 100)) : 100;
    this.set('distancia', String(Math.round(d)));
    this.set('progreso', Math.round(prog));
    this.moverPunto(loc.latitude, loc.longitude);
    // "cerca" pinta la tarjeta en ámbar cuando faltan menos de 3 radios
    this.set('cerca', d > RADIO && d <= RADIO * 3);
    if (d > RADIO) {
      this.set('llegada', false);
      this.set('estado', `Acercándote a ${dest.nombre}...`);
    }
    if (d <= RADIO && !this.yaNotifico) {
      this.yaNotifico = true;
      this.notificarLlegada();
    }
  }

  private reiniciarEstado() {
    this.yaNotifico = false;
    this.d0 = null;
    this.set('llegada', false);
    this.set('cerca', false);
    this.set('distancia', '-');
    this.set('progreso', 0);
  }

  // --- Simulador: recorre la ruta calculada con Dijkstra ---
  alternarSimulacion() {
    if (this.get('simulando')) {
      this.detener();
      this.set('estado', 'Simulación detenida');
      return;
    }
    this.detener();
    this.reiniciarEstado();
    this.set('escaneando', false);
    if (this.rutaIds.length < 2) {
      this.set('estado', 'No hay ruta entre esos puntos');
      return;
    }
    const puntos = puntosDeRuta(this.rutaIds, 40);
    this.set('siguiendo', true);
    this.set('simulando', true);
    this.set('estado', `Saliendo de ${buscarNodo(this.origenId).nombre}...`);
    let i = 0;
    this.simTimer = setInterval(() => {
      this.procesar(puntos[i]);
      i++;
      if (i >= puntos.length) {
        clearInterval(this.simTimer);
        this.simTimer = null;
        this.set('simulando', false);
        this.set('siguiendo', false);
      }
    }, 350);
  }

  // --- GPS real ---
  async alternarGps() {
    if (this.get('siguiendo') && !this.get('simulando')) {
      this.detener();
      this.set('estado', 'Seguimiento detenido');
    } else {
      await this.iniciar();
    }
  }

  private async iniciar() {
    this.detener();
    this.set('escaneando', false);
    if (!(await tienePermisoUbicacion())) {
      try {
        // false = solo "mientras se usa la app" (no pide ubicación en segundo plano)
        await enableLocationRequest(false);
      } catch (e) {
        console.log('Error ubicación:', e);
        this.set('estado', 'Falta permiso de ubicación (actívalo en Ajustes de la app).');
        return;
      }
    }
    this.reiniciarEstado();
    this.set('siguiendo', true);
    this.set('estado', 'Esperando primera ubicación...');
    try {
      this.watchId = await watchLocation(
        (loc) => this.procesar(loc),
        (err) => console.log('Error watch:', err),
        {
          desiredAccuracy: CoreTypes.Accuracy.high,
          updateDistance: 1,
          minimumUpdateTime: 1000,
        }
      );
    } catch (e) {
      console.log('No se pudo iniciar watch:', e);
    }
    this.timer = setInterval(async () => {
      try {
        const loc = await getCurrentLocation({
          desiredAccuracy: CoreTypes.Accuracy.high,
          maximumAge: 0,
          timeout: 4000,
        });
        this.procesar(loc);
      } catch (e) {
        // sin ubicación todavía
      }
    }, 3000);
  }

  private detener() {
    if (this.watchId !== null) {
      clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    this.set('siguiendo', false);
    this.set('simulando', false);
    // Cualquier otra acción cierra el escáner y apaga la cámara
    if (this.get('escaneando')) {
      this.set('escaneando', false);
      this.apagarCamara();
    }
  }
}
