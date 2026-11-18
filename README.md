# ProximityAlertQR

Alerta de proximidad con GPS, QR, grafo y Dijkstra, hecha con NativeScript para Android e iOS.

Proyecto final de la práctica M3. Mini-práctica resuelta (Aplicaciones Móviles y Laboratorio).

La app obtiene tu posición por GPS y, cuando la distancia al destino es de 50 m o menos, lanza una notificación local. El destino se elige en una lista o leyendo un código QR (`destino:zocalo`). Los 10 lugares del Centro de la CDMX forman un grafo ponderado y Dijkstra calcula la ruta más corta, que se dibuja en un mapa SVG dentro de la app (sin internet ni claves de mapas). Tiene un simulador de recorrido para probar sin moverte.

## Contenido

- [Archivos importantes](#archivos-importantes)
- [Instalación en Mac, paso a paso](#instalación-en-mac-paso-a-paso)
- [Crear un proyecto nuevo con `ns create`](#crear-un-proyecto-nuevo-con-ns-create)
- [Instalación en Windows](#instalación-en-windows)
- [Probar la app](#probar-la-app)
- [Errores comunes](#errores-comunes)

## Archivos importantes

| Archivo | Qué hace |
|---|---|
| `app/home/grafo.ts` | Nodos, aristas, Haversine (`distanciaMetros`), `dijkstra`, `puntosDeRuta` y `nodoDesdeTexto` (lectura del QR). |
| `app/home/mapa.ts` | Genera el HTML/SVG del grafo y la ruta para el `WebView`. |
| `app/home/plataforma.ts` | Todo lo que cambia entre Android e iOS: permiso de ubicación, permiso y envío de notificaciones, ejecutar JS en el WebView. |
| `app/home/home-view-model.ts` | Lógica de la app: ruta, QR, GPS real, simulador y alerta. |
| `app/home/home-page.xml` / `.ts` / `.css` | Interfaz, conexión de la pantalla y estilos. |
| `App_Resources/Android/src/main/AndroidManifest.xml` | Permisos de ubicación, cámara y `POST_NOTIFICATIONS`. |
| `App_Resources/iOS/Info.plist` | Textos de permiso de ubicación y cámara para iOS. |
| `scripts/ejecutar.js` | Lo usan `npm run android`, `npm run ios`, etc. Busca solo el SDK de Android y un Java compatible. |
| `scripts/configurar-mac.sh` | Deja configurados Java y el SDK de Android en la terminal de la Mac. |

Plugins: `@nativescript/geolocation`, `@nativescript/local-notifications`, `@nativescript/mlkit-core`, `@nativescript/mlkit-barcode-scanning`.

## Instalación en Mac, paso a paso

Todos los comandos de esta sección van en la app Terminal de macOS (o en la terminal de VS Code), que usa `zsh`. No son comandos de PowerShell.

### Paso 1. Revisar lo que ya tiene la Mac

```bash
node -v                       # Node 20 o más nuevo
npm -v
git --version
xcodebuild -version           # Solo para iOS
pod --version                 # CocoaPods, solo para iOS
/usr/libexec/java_home -V     # Lista todos los Java instalados
ls ~/Library/Android/sdk      # SDK de Android
```

Si falta algo:

| Falta | Qué hacer |
|---|---|
| Node | Descárgalo de nodejs.org (versión LTS) o `brew install node` |
| SDK de Android | Abre Android Studio una vez y deja que descargue el SDK |
| Emulador de Android | Android Studio > More Actions > Virtual Device Manager > crear un Pixel |
| Xcode | Instálalo desde la App Store, ábrelo una vez y acepta la licencia. En Settings > Components descarga el simulador de iOS |
| CocoaPods | `brew install cocoapods` |
| Java 17 o 21 | `brew install --cask temurin@21` |

### Paso 2. Elegir la versión correcta de Java

Este es el paso que más falla. Gradle 8.14 (el que usa NativeScript 9) solo funciona con Java 17 a 21. Si la Mac tiene Java 25 o 26 como predeterminado, `ns run android` termina con:

```
BUG! exception in phase 'semantic analysis' in source unit '_BuildScript_' Unsupported class file major version 70
```

El número indica la versión de Java que se está usando: 69 es Java 25 y 70 es Java 26.

Revisa cuál tienes:

```bash
java -version
echo $JAVA_HOME
```

Para cambiar a Java 17 solo en la terminal que tienes abierta:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
java -version                 # Debe decir "17.x"
```

Si la Mac tiene Java 21 en vez de 17, cambia `-v 17` por `-v 21`.

Estos `export` se pierden al cerrar la terminal. Para que queden guardados, agrégalos a `~/.zshrc`:

```bash
cat >> ~/.zshrc <<'EOF'
# >>> NativeScript Android >>>
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
# <<< NativeScript Android <<<
EOF
source ~/.zshrc
```

Si ya clonaste el repositorio (paso 3), puedes hacer lo mismo con el script del proyecto, que busca solo un Java 17 a 21 y no duplica las líneas si lo ejecutas dos veces:

```bash
bash scripts/configurar-mac.sh
source ~/.zshrc
```

Si ya habías intentado compilar con Java 26, detén el proceso de Gradle que se quedó abierto con la versión anterior:

```bash
cd platforms/android && ./gradlew --stop && cd ../..
```

### Paso 3. Descargar el proyecto

Clónalo en una carpeta sin espacios ni acentos:

```bash
mkdir -p ~/proyectos
cd ~/proyectos
git clone https://github.com/Lastcreator999/ProximityAlertQR.git
cd ProximityAlertQR
npm install
```

`npm install` instala la CLI de NativeScript dentro del proyecto, así que no necesitas `npm install -g nativescript` para esta app. Los comandos `npm run ...` la usan sola.

### Paso 4. Revisar el entorno

```bash
java -version                 # 17.x o 21.x
echo $ANDROID_HOME            # /Users/<tu usuario>/Library/Android/sdk
adb version
npm run doctor
```

`npm run doctor` ejecuta `ns doctor`. No debe mostrar errores en rojo para la plataforma que vas a usar.

### Paso 5. Ejecutar en el emulador de Android

1. Abre Android Studio > More Actions > Virtual Device Manager y arranca el emulador con el botón de reproducir.
2. Revisa que se vea:
   ```bash
   adb devices                # Debe salir una línea "emulator-5554  device"
   ```
3. Ejecuta la app:
   ```bash
   npm run android
   ```

La primera vez tarda varios minutos porque descarga Gradle y las dependencias. Cuando termina, la app se abre en el emulador. Cada vez que guardas un archivo de `app/` se recarga sola. Para detenerla, presiona Ctrl + C en la terminal.

`npm run android` busca por su cuenta un Java 17 a 21 aunque `JAVA_HOME` apunte a Java 26, y lo avisa en la terminal. Si usas `ns run android` directamente, ese cambio no ocurre y tienes que hacer el paso 2.

### Paso 6. Ejecutar en el simulador de iPhone

```bash
npm run ios
```

Abre el simulador de iPhone que viene con Xcode. El lector de QR (MLKit) no funciona en el simulador, así que el script lo omite; el resto de la app sí funciona. Usa el botón *Escribir código* para elegir el destino.

Si prefieres llamar a la CLI directamente:

```bash
NSSkipMLKitFromIOSSimulator=1 npx ns run ios --emulator
```

### Paso 7. Ejecutar en un iPhone o un Android conectado por cable

iPhone (necesitas iniciar sesión con tu Apple ID en Xcode > Settings > Accounts para firmar la app):

```bash
npm run limpiar               # Solo si antes compilaste para el simulador
npm run ios:iphone
```

Celular Android con *Depuración USB* activada:

```bash
adb devices                   # Copia el identificador del celular
npx ns run android --device <IDENTIFICADOR>
```

### Desde VS Code

1. File > Open Folder... y elige la carpeta `ProximityAlertQR`.
2. Terminal > Run Task... > *1. Instalar dependencias (npm install)* (solo después de clonar).
3. Presiona Cmd + Shift + B y elige Android, iOS o iPhone real.

Las tareas ejecutan los mismos `npm run ...` de arriba. Si VS Code ya estaba abierto cuando editaste `~/.zshrc`, ciérralo y ábrelo otra vez para que tome el Java nuevo.

### Resumen de comandos

| Comando | Qué hace |
|---|---|
| `npm run android` | Ejecuta en el emulador de Android Studio |
| `npm run ios` | Ejecuta en el simulador de iPhone (solo Mac) |
| `npm run ios:iphone` | Ejecuta en un iPhone conectado (solo Mac) |
| `npm run doctor` | Revisa que la computadora tenga todo instalado |
| `npm run limpiar` | Borra la compilación. Úsalo si algo se atora o al cambiar entre simulador e iPhone real |
| `bash scripts/configurar-mac.sh` | Guarda Java 17/21 y el SDK de Android en `~/.zshrc` |

## Crear un proyecto nuevo con `ns create`

Para hacer un ejercicio desde cero (por ejemplo `ejercicio1m`) se usa la CLI global. Primero haz el paso 2 de arriba para que Java sea 17 o 21; sin eso falla igual con `major version 70`.

```bash
# 1. Instalar la CLI global (una vez por Mac)
npm install -g nativescript
ns --version

# 2. Revisar Java y el entorno
java -version                 # Tiene que ser 17.x o 21.x
ns doctor android

# 3. Crear el proyecto
mkdir -p ~/proyectos
cd ~/proyectos
ns create ejercicio1m --ts

# 4. Entrar a la carpeta del proyecto (si no, sale "No project found")
cd ejercicio1m

# 5. Ejecutar
ns run android                # Con el emulador ya abierto
ns run ios                    # Simulador de iPhone
```

Si `npm install -g` da `EACCES: permission denied`, usa la CLI sin instalarla global:

```bash
npx nativescript create ejercicio1m --ts
cd ejercicio1m
npx nativescript run android
```

Si ya intentaste compilar con Java 26 y después cambiaste a Java 17, borra lo que quedó a medias antes de volver a ejecutar:

```bash
ns clean
ns run android
```

## Instalación en Windows

Necesitas Node.js 22 LTS, JDK 21, Android Studio (para el SDK y el emulador) y Git. Los comandos son de PowerShell.

```powershell
# JDK 21 (Gradle no funciona con Java 25 ni 26)
winget install EclipseAdoptium.Temurin.21.JDK

# Variable del SDK de Android (cierra y abre la terminal después)
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"

# Descargar el proyecto en una ruta sin espacios ni acentos
cd C:\proyectos
git clone https://github.com/Lastcreator999/ProximityAlertQR.git
cd ProximityAlertQR
npm install

# Revisar y ejecutar (con el emulador abierto)
npm run doctor
npm run android
```

Con una ruta como `...\Apps Móviles\...` Gradle falla con *Non-ASCII characters in path*. Para instalar en un celular físico desde Windows, ve `MANUAL_INSTALACION.md`.

Para generar el APK:

```powershell
npx ns build android
adb install -r platforms\android\app\build\outputs\apk\debug\app-debug.apk
```

Windows no puede compilar para iOS. Sin Mac, el workflow de GitHub Actions (`.github/workflows/compilar.yml`) compila Android e iOS en cada `git push`. En la pestaña Actions del repositorio puedes descargar el APK y el `.zip` del simulador de iOS, que se puede subir a [Appetize.io](https://appetize.io) para ver la app en un iPhone en el navegador.

## Probar la app

- *Simular recorrido*: recorre la ruta de Dijkstra punto por punto (cada 350 ms) y dispara la alerta al llegar. Funciona en cualquier emulador o simulador.
- *Simular llegada instantánea*: lanza la notificación de inmediato.
- *Escribir código*: escribe `destino:garibaldi`, `destino:torre`, etc. Sirve en el emulador, donde no hay cámara.
- *Escanear QR*: en un celular real. En la raíz del repositorio están los QR de los 10 destinos (`qr_zocalo.png`, `qr_garibaldi.png`, etc.).
- *Usar GPS real*:
  - Emulador Android: `adb emu geo fix -99.1332 19.4326` (primero longitud, después latitud) o Extended Controls > Location.
  - Simulador iOS: Features > Location > Custom Location... o `xcrun simctl location booted set 19.4326,-99.1332`.
  - Celular Android: una app de ubicación simulada elegida en Opciones de desarrollador.

Para dar los permisos desde la terminal sin esperar el cuadro de diálogo (Android):

```bash
adb shell pm grant org.nativescript.ProximityAlertQR android.permission.ACCESS_FINE_LOCATION
adb shell pm grant org.nativescript.ProximityAlertQR android.permission.ACCESS_COARSE_LOCATION
adb shell pm grant org.nativescript.ProximityAlertQR android.permission.CAMERA
adb shell pm grant org.nativescript.ProximityAlertQR android.permission.POST_NOTIFICATIONS
```

IDs aceptados en el QR: `revolucion`, `alameda`, `bellasartes`, `torre`, `correos`, `garibaldi`, `santodomingo`, `templo`, `zocalo`, `pinosuarez`. También acepta el nombre completo, sin importar acentos o mayúsculas.

## Cambios respecto al reporte

Para que funcione en Android e iOS:

- Se creó `plataforma.ts` para aislar el código nativo:
  - Notificación: Android sigue usando `NotificationManager` + `NotificationChannel` (como en el reporte); iOS usa `@nativescript/local-notifications` con `forceShowWhenInForeground`.
  - Permiso de notificaciones: se pide al abrir la app en iOS y en Android 13+ (sin él, Android 13+ no muestra la notificación).
  - Mover el punto en el mapa: `evaluateJavascript` en Android y `evaluateJavaScriptCompletionHandler` (WKWebView) en iOS.
  - Permiso de ubicación: `checkSelfPermission` en Android, `isEnabled()` en iOS.
- `enableLocationRequest(false)` en vez de `true`, para no pedir ubicación en segundo plano (causa del error *User denied location permission previously* en Android 10+).
- `app.ts` importa `@nativescript/local-notifications` para que iOS registre a tiempo el manejador de notificaciones.

## Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `Unsupported class file major version 70` | Se está usando Java 26 | Paso 2: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` y volver a ejecutar |
| `Unsupported class file major version 69` | Se está usando Java 25 | Igual que el anterior |
| Sigue saliendo el error después de cambiar Java | Gradle dejó abierto un proceso con el Java anterior | `cd platforms/android && ./gradlew --stop && cd ../..` o `npm run limpiar` |
| `Unable to find any JVMs matching version "17"` | La Mac no tiene Java 17 | Prueba `-v 21` o instala uno con `brew install --cask temurin@21` |
| `No project found at or above '...'` | Ejecutaste `ns run` fuera de la carpeta del proyecto | `cd` a la carpeta que creó `ns create` (la que tiene `package.json`) |
| `command not found: ns` | La CLI global no está instalada | `npm install -g nativescript` o usa `npx ns` dentro de este proyecto |
| `command not found: adb` | El SDK no está en el `PATH` | Paso 2 (bloque de `~/.zshrc`) y `source ~/.zshrc` |
| `EACCES: permission denied` con `npm install -g` | La Mac de la escuela no deja instalar global | Usa `npx nativescript ...` |
| `Non-ASCII characters in path` | La ruta tiene espacios o acentos | Mueve el proyecto a `~/proyectos` o `C:\proyectos` |
| `User denied location permission previously` | Se rechazó el permiso | `adb shell pm grant ...` o Ajustes de la app |
| No aparece la notificación (Android 13+) | Falta el permiso de notificaciones | Ajustes > Apps > ProximityAlertQR > Notificaciones |
| Falla la compilación de iOS en el simulador por MLKit | MLKit no tiene versión para el simulador | Usa `npm run ios` o pon `NSSkipMLKitFromIOSSimulator=1` antes de `ns run ios`. Al cambiar a iPhone real, `npm run limpiar` |
| `pod: command not found` | Falta CocoaPods | `brew install cocoapods` |
