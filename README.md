# ProximityAlertQR · Alerta de proximidad con GPS, QR, grafo y Dijkstra (NativeScript, Android + iOS)

Proyecto final de la práctica **M3. Mini-práctica resuelta** (Aplicaciones Móviles y Laboratorio).

La app obtiene tu posición por GPS y, cuando la distancia al destino es **≤ 50 m**, lanza una **notificación local**. El destino se elige en una lista o leyendo un **código QR** (`destino:zocalo`). Los 10 lugares del Centro de la CDMX forman un **grafo ponderado** y **Dijkstra** calcula la ruta más corta, que se dibuja en un mapa SVG dentro de la app (sin internet ni claves de mapas). Incluye un simulador de recorrido para probar sin moverte.

## Archivos importantes

| Archivo | Qué hace |
|---|---|
| `app/home/grafo.ts` | Nodos, aristas, Haversine (`distanciaMetros`), `dijkstra`, `puntosDeRuta` y `nodoDesdeTexto` (lectura del QR). |
| `app/home/mapa.ts` | Genera el HTML/SVG del grafo y la ruta para el `WebView`. |
| `app/home/plataforma.ts` | **Todo lo que cambia entre Android e iOS**: permiso de ubicación, permiso y envío de notificaciones, ejecutar JS en el WebView. |
| `app/home/home-view-model.ts` | Lógica de la app: ruta, QR, GPS real, simulador y alerta. |
| `app/home/home-page.xml` / `.ts` / `.css` | Interfaz, conexión de la pantalla y estilos. |
| `App_Resources/Android/src/main/AndroidManifest.xml` | Permisos de ubicación, cámara y `POST_NOTIFICATIONS`. |
| `App_Resources/iOS/Info.plist` | Textos de permiso de ubicación y cámara para iOS. |

Plugins: `@nativescript/geolocation`, `@nativescript/local-notifications`, `@nativescript/mlkit-core`, `@nativescript/mlkit-barcode-scanning`.

## ⚡ Inicio rápido en VS Code (Macs de la escuela)

No hace falta instalar nada global ni configurar variables: el proyecto trae su propia CLI de NativeScript y el script `scripts/ejecutar.js` encuentra solo el SDK de Android y el Java que vienen con Android Studio.

**Solo la primera vez en cada Mac** (si ya está hecho, sáltalo):

1. Abre **Android Studio** una vez para que instale el SDK, y en *Device Manager* crea un emulador (por ejemplo *Pixel*).
2. Abre **Xcode** una vez, acepta la licencia y en *Settings > Components* descarga el simulador de iOS.
3. Verifica que esté **CocoaPods** (lo necesita iOS): `pod --version`. Si no está: `brew install cocoapods`.

**Cada vez:**

1. VS Code → *File > Open Folder…* → elige la carpeta del proyecto.
2. *Terminal > Run Task…* → **1. Instalar dependencias (npm install)** (solo después de clonar).
3. Presiona **⌘ ⇧ B** (Cmd + Shift + B) y elige:
   - **Android – emulador de Android Studio**
   - **iOS – simulador de iPhone (Xcode)**
   - **iPhone real conectado por cable**

El emulador o simulador se abre solo y la app se instala. Al guardar un archivo, la app se recarga. Para detenerla: clic en la terminal y **Ctrl + C**.

También funciona desde la terminal de VS Code:

| Comando | Qué hace |
|---|---|
| `npm run android` | Ejecuta en el emulador de Android Studio |
| `npm run ios` | Ejecuta en el simulador de iPhone (solo Mac) |
| `npm run ios:iphone` | Ejecuta en un iPhone conectado (solo Mac) |
| `npm run doctor` | Revisa que la computadora tenga todo instalado |
| `npm run limpiar` | Borra la compilación; úsalo si algo se "atora" o al cambiar entre simulador e iPhone real |

> Si no arranca ningún emulador de Android, ábrelo tú desde *Android Studio > Device Manager* (▶) y vuelve a ejecutar la tarea.

## 1. Preparar la computadora en Windows (opcional, en casa)

Necesitas: **Node.js 22 LTS**, **JDK 21**, **Android Studio** (solo para el SDK y el emulador) y **Git**.

```powershell
# Node y la CLI de NativeScript
node -v
npm install -g nativescript

# JDK 21 (Gradle no funciona con Java 25)
winget install EclipseAdoptium.Temurin.21.JDK

# Variable del SDK de Android (cierra y abre la terminal después)
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"

# Revisa que todo esté bien; debe salir sin errores rojos
ns doctor android
```

> ⚠️ Clona el proyecto en una ruta **sin espacios ni acentos**, por ejemplo `C:\proyectos`. Con rutas como `...\Apps Móviles\...` Gradle falla con *Non-ASCII characters in path*.

## 2. Descargar y ejecutar en Android

```powershell
cd C:\proyectos
git clone https://github.com/TU_USUARIO/ProximityAlertQR.git
cd ProximityAlertQR
npm install
```

1. Abre **Android Studio > More Actions > Virtual Device Manager** y arranca un emulador (o conecta tu celular con *Depuración USB* activada).
2. Verifica que aparezca el dispositivo: `adb devices`
3. Ejecuta: `npm run android` (o `ns run android` si instalaste la CLI global)

La primera compilación tarda varios minutos (descarga Gradle y dependencias). Después, cada vez que guardas un archivo la app se recarga sola.

Para generar el APK e instalarlo en un celular:

```powershell
ns build android
adb install -r platforms\android\app\build\outputs\apk\debug\app-debug.apk
```

## 3. iOS (iPhone)

El código ya está adaptado para iOS (permisos en `App_Resources/iOS/Info.plist`), pero **compilar para iOS requiere una Mac con Xcode**; Windows no puede hacerlo. Opciones:

- **Con una Mac** (laboratorio de la escuela, prestada o rentada en la nube): instala Xcode desde la App Store, abre Xcode una vez para aceptar la licencia, y luego:
  ```bash
  npm install -g nativescript
  ns doctor ios
  npm install
  NSSkipMLKitFromIOSSimulator=1 ns run ios   # MLKit no corre en el simulador; el resto de la app sí
  ```
  Esto abre el **Simulador de iPhone** que viene con Xcode (no necesitas un iPhone).
- **Sin Mac:** este repositorio trae un workflow de **GitHub Actions** (`.github/workflows/compilar.yml`) que compila la versión de iOS en una Mac de GitHub cada vez que haces `git push`. En la pestaña **Actions** verás si compiló bien y podrás descargar el APK de Android y el `.zip` del simulador de iOS. Ese `.zip` se puede subir a un servicio de simulador en el navegador como [Appetize.io](https://appetize.io) para ver la app corriendo como iPhone.

## 4. Probar la app

- **Simular recorrido:** recorre la ruta de Dijkstra punto por punto (cada 350 ms) y dispara la alerta al llegar. Funciona en cualquier emulador/simulador.
- **Simular llegada instantánea:** lanza la notificación de inmediato.
- **Escribir código:** escribe `destino:garibaldi`, `destino:torre`, etc. (sirve en emulador, donde no hay cámara).
- **Escanear QR:** en un celular real, genera QRs con `destino:<lugar>` en QR Code Monkey.
- **Usar GPS real:**
  - Emulador Android: `adb emu geo fix -99.1332 19.4326` o *Extended Controls > Location > Routes*.
  - Simulador iOS: *Features > Location > Custom Location…* o `xcrun simctl location booted set 19.4326,-99.1332`.
  - Celular Android: app de ubicación simulada (iMockGo) en *Opciones de desarrollador*.

Permisos por adb (opcional, para no depender del cuadro de diálogo):

```powershell
adb shell pm grant org.nativescript.ProximityAlertQR android.permission.ACCESS_FINE_LOCATION
adb shell pm grant org.nativescript.ProximityAlertQR android.permission.ACCESS_COARSE_LOCATION
adb shell pm grant org.nativescript.ProximityAlertQR android.permission.CAMERA
```

IDs aceptados en el QR: `revolucion`, `alameda`, `bellasartes`, `torre`, `correos`, `garibaldi`, `santodomingo`, `templo`, `zocalo`, `pinosuarez` (también el nombre completo, sin importar acentos o mayúsculas).

## Cambios respecto al reporte (para que funcione en Android e iOS)

- Se creó `plataforma.ts` para aislar el código nativo:
  - **Notificación:** Android sigue usando `NotificationManager` + `NotificationChannel` (como en el reporte); iOS usa `@nativescript/local-notifications` con `forceShowWhenInForeground`.
  - **Permiso de notificaciones:** se pide al abrir la app en iOS y en Android 13+ (sin él, Android 13+ no muestra la notificación).
  - **Mover el punto en el mapa:** `evaluateJavascript` en Android y `evaluateJavaScriptCompletionHandler` (WKWebView) en iOS.
  - **Permiso de ubicación:** `checkSelfPermission` en Android, `isEnabled()` en iOS.
- `enableLocationRequest(false)` en lugar de `true`, para no pedir ubicación en segundo plano (causa del error *User denied location permission previously* en Android 10+).
- `app.ts` importa `@nativescript/local-notifications` para que iOS registre a tiempo el manejador de notificaciones.

## Errores comunes

| Error | Solución |
|---|---|
| `Unsupported class file major version 69` | Usa JDK 21 y apunta `JAVA_HOME` a esa carpeta. |
| `Non-ASCII characters in path` | Mueve el proyecto a `C:\proyectos`. |
| `User denied location permission previously` | Concede el permiso con `adb shell pm grant ...` o desde Ajustes de la app. |
| No aparece la notificación (Android 13+) | Acepta el permiso de notificaciones o actívalo en *Ajustes > Apps > ProximityAlertQR > Notificaciones*. |
| Falla compilación iOS en simulador por MLKit | Usa `NSSkipMLKitFromIOSSimulator=1` antes de `ns run ios`; al cambiar a iPhone real, ejecuta `ns clean`. |
