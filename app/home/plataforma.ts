// Todo lo que es diferente entre Android y iOS vive en este archivo.
// El resto de la aplicación llama a estas funciones sin preocuparse por la plataforma.
import { Application, Utils, WebView, isAndroid, isIOS } from '@nativescript/core';
import { isEnabled } from '@nativescript/geolocation';
import { LocalNotifications } from '@nativescript/local-notifications';

// ---------- Permiso de ubicación ----------
export async function tienePermisoUbicacion(): Promise<boolean> {
  if (isAndroid) {
    // checkSelfPermission también detecta permisos concedidos con "adb shell pm grant"
    const ctx: any = Utils.android.getApplicationContext();
    return ctx.checkSelfPermission('android.permission.ACCESS_FINE_LOCATION') === 0;
  }
  try {
    return await isEnabled();
  } catch (e) {
    return false;
  }
}

// ---------- Permiso de notificaciones ----------
// Android 13+ (API 33) e iOS piden permiso para mostrar notificaciones.
export async function pedirPermisoNotificaciones(): Promise<void> {
  try {
    if (isIOS) {
      await LocalNotifications.requestPermission();
      return;
    }
    const droid: any = (globalThis as any).android;
    if (droid.os.Build.VERSION.SDK_INT < 33) return;
    const ctx: any = Utils.android.getApplicationContext();
    if (ctx.checkSelfPermission('android.permission.POST_NOTIFICATIONS') === 0) return;
    const actividad: any = Application.android.foregroundActivity || Application.android.startActivity;
    if (!actividad) return;
    const g: any = globalThis as any;
    const permisos = g.Array.create(g.java.lang.String, 1);
    permisos[0] = 'android.permission.POST_NOTIFICATIONS';
    actividad.requestPermissions(permisos, 1001);
  } catch (e) {
    console.log('Permiso de notificaciones:', e);
  }
}

// ---------- Notificación local ----------
export async function mostrarNotificacion(titulo: string, texto: string): Promise<void> {
  if (isAndroid) {
    mostrarNotificacionAndroid(titulo, texto);
  } else {
    // En iOS el plugin funciona bien; forceShowWhenInForeground la muestra con la app abierta
    await LocalNotifications.schedule([
      { id: 1, title: titulo, body: texto, forceShowWhenInForeground: true },
    ]);
  }
}

// Notificación nativa de Android (NotificationManager + NotificationChannel).
// Se usa en lugar del plugin porque éste reportaba "Permission not granted" en API 29.
function mostrarNotificacionAndroid(titulo: string, texto: string) {
  const droid: any = (globalThis as any).android;
  const ctx: any = Utils.android.getApplicationContext();
  const nm: any = ctx.getSystemService(droid.content.Context.NOTIFICATION_SERVICE);
  const canalId = 'proximidad';
  let builder: any;
  if (droid.os.Build.VERSION.SDK_INT >= 26) {
    const canal = new droid.app.NotificationChannel(
      canalId,
      'Alertas de proximidad',
      droid.app.NotificationManager.IMPORTANCE_HIGH
    );
    nm.createNotificationChannel(canal);
    builder = new droid.app.Notification.Builder(ctx, canalId);
  } else {
    builder = new droid.app.Notification.Builder(ctx);
  }
  builder.setContentTitle(titulo);
  builder.setContentText(texto);
  builder.setSmallIcon(droid.R.drawable.ic_dialog_info);
  builder.setAutoCancel(true);
  nm.notify(1, builder.build());
}

// ---------- Ejecutar JavaScript dentro del WebView del mapa ----------
export function ejecutarJS(wv: WebView, js: string) {
  const v: any = wv;
  if (isAndroid && v.android) {
    v.android.evaluateJavascript(js, null); // android.webkit.WebView
  } else if (isIOS && v.ios) {
    v.ios.evaluateJavaScriptCompletionHandler(js, null); // WKWebView
  }
}
