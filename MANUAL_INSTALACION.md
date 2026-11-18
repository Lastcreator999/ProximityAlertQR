# Manual de instalación de ProximityAlertQR

Este manual explica cómo instalar la app en un celular o tableta Android físico desde Windows, cómo instalarla en el emulador y cómo probar las alertas cambiando la ubicación. Para iOS, ve la sección 3 del `README.md` (necesitas una Mac con Xcode).

## 1. Lo que necesitas en la computadora

| Programa | Para qué | Cómo revisarlo |
|---|---|---|
| Node.js 22 LTS o más nuevo | Ejecutar la CLI de NativeScript | `node -v` |
| JDK 21 | Compilar con Gradle (no funciona con Java 25) | `java -version` |
| Android Studio | Instala el SDK de Android, `adb` y el emulador | Ábrelo una vez y deja que descargue el SDK |
| Git | Descargar el proyecto | `git --version` |

Instala el JDK 21 con:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

El proyecto tiene que estar en una ruta sin espacios ni acentos, por ejemplo `C:\proyectos\ProximityAlertQR`. Con una ruta como `...\Apps Móviles\...` Gradle falla con *Non-ASCII characters in path*.

### Si usas WSL

No compiles desde WSL para un dispositivo físico. WSL no ve los dispositivos USB de Windows, y el SDK de Android está instalado del lado de Windows (`%LOCALAPPDATA%\Android\Sdk`). Usa PowerShell para todo lo que sigue.

## 2. Descargar el proyecto

```powershell
cd C:\proyectos
git clone https://github.com/Lastcreator999/ProximityAlertQR.git
cd ProximityAlertQR
npm install
```

`npm install` instala también la CLI de NativeScript dentro del proyecto, así que no hace falta instalarla global; los comandos se llaman con `npx ns`.

## 3. Preparar el celular o la tableta

1. Abre *Ajustes > Acerca del teléfono* (o *Acerca de la tableta*). En Samsung entra además a *Información de software*.
2. Toca siete veces *Número de compilación* hasta que aparezca el aviso de que el modo de desarrollador está activado.
3. Entra a *Ajustes > Opciones de desarrollador* y activa *Depuración por USB*.
4. Conecta el dispositivo a la computadora con un cable de datos (algunos cables solo cargan).
5. En la pantalla del dispositivo aparece "¿Permitir depuración USB?". Marca *Permitir siempre desde esta computadora* y acepta.

## 4. Instalar en el dispositivo físico

En PowerShell, dentro de la carpeta del proyecto:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:Path"

adb devices
```

Tiene que aparecer una línea con el identificador y la palabra `device`. Si dice `unauthorized`, acepta el aviso en la pantalla del dispositivo y repite `adb devices`. Si no aparece nada, cambia el cable o el puerto USB.

Busca el identificador del dispositivo y ejecuta la app:

```powershell
npx ns devices android
npx ns run android --device <IDENTIFICADOR>
```

La primera compilación tarda varios minutos porque Gradle descarga sus dependencias. Cuando termina, la app se abre sola en el dispositivo.

Mientras `ns run` está corriendo:

- Si guardas un cambio en `app/`, la app se recarga en el dispositivo.
- Los `console.log` salen en la terminal.
- Para detenerlo, presiona Ctrl+C.

Después de detenerlo puedes desconectar el cable. La app queda instalada y funciona sola; búscala en el cajón de apps como ProximityAlertQR.

Las dos líneas de `$env:` solo duran en esa ventana de PowerShell. Si abres otra, vuelve a ejecutarlas, o define `ANDROID_HOME` de forma permanente con `setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"` y abre una terminal nueva.

`npm run android` no sirve para un dispositivo físico: el script le pasa `--emulator` a NativeScript y solo busca emuladores.

### Instalar solo el APK

Si quieres generar el archivo `.apk` y pasarlo a otro dispositivo:

```powershell
npx ns build android
adb install -r platforms\android\app\build\outputs\apk\debug\app-debug.apk
```

Cada `git push` también compila el APK en GitHub Actions. Lo descargas en la pestaña *Actions* del repositorio, dentro de *Artifacts*.

## 5. Instalar en el emulador

1. En Android Studio abre *More Actions > Virtual Device Manager*, crea un dispositivo (por ejemplo, Pixel) y arráncalo con el botón de reproducir.
2. Ejecuta `npm run android`.

El emulador no tiene cámara, así que para elegir el destino usa el botón *Escribir código*.

## 6. Primer uso

Al abrir la app la primera vez, acepta los permisos:

- Notificaciones (Android 13 o más nuevo). Sin este permiso la alerta de llegada no aparece y no hay ningún error.
- Ubicación, cuando tocas *Usar GPS real*. Elige *Mientras se usa la app*.
- Cámara, cuando tocas *Escanear QR*.

Si rechazaste alguno, actívalo en *Ajustes > Apps > ProximityAlertQR > Permisos*, o desde la computadora:

```powershell
adb shell pm grant org.nativescript.ProximityAlertQR android.permission.ACCESS_FINE_LOCATION
adb shell pm grant org.nativescript.ProximityAlertQR android.permission.CAMERA
adb shell pm grant org.nativescript.ProximityAlertQR android.permission.POST_NOTIFICATIONS
```

Los códigos QR tienen el texto `destino:<id>`. En la raíz del repositorio están los de los 10 destinos (`qr_zocalo.png`, `qr_garibaldi.png`, etc.); ábrelos en otra pantalla o imprímelos y escanéalos con la app. Si necesitas otro, genéralo en cualquier generador de QR en línea. Los id válidos son `revolucion`, `alameda`, `bellasartes`, `torre`, `correos`, `garibaldi`, `santodomingo`, `templo`, `zocalo` y `pinosuarez`.

## 7. Probar con ubicación simulada

Para probar el GPS sin moverte, usa una app de ubicación simulada de Google Play, como *Fake GPS location* o *Fake GPS Location-GPS JoyStick*.

1. Instala la app y ábrela una vez.
2. En *Ajustes > Opciones de desarrollador > Seleccionar app de ubicación de prueba*, elígela.
3. En la app simulada, pon la posición en Bellas Artes (19.4352, -99.1412) e inicia la simulación.
4. En ProximityAlertQR, elige el destino Zócalo (QR `destino:zocalo`) y toca *Usar GPS real*. La distancia marca unos 887 m.
5. Acerca la posición al Zócalo (19.4326, -99.1332). A 150 m la tarjeta se pone ámbar y a 50 m llega la notificación "¡Llegaste!".
6. Al terminar, detén la app simulada. Si la dejas activa, las demás apps siguen recibiendo la ubicación falsa.

En el emulador puedes mover la ubicación con `adb emu geo fix -99.1332 19.4326` (primero longitud, después latitud) o con *Extended Controls > Location*.

## 8. Errores comunes

| Error | Solución |
|---|---|
| `Duplicate resources` en `:app:mergeDebugResources` | Hay dos archivos con el mismo nombre y distinta extensión en una carpeta de `App_Resources/Android/src/main/res` (por ejemplo `ic_launcher.png` e `ic_launcher.webp`). Borra uno y también su copia en `platforms/android/app/src/main/res`. |
| `adb` no se reconoce como comando | Ejecuta las dos líneas de `$env:` de la sección 4. |
| El dispositivo sale como `unauthorized` | Acepta el aviso de depuración USB en su pantalla. |
| `Unsupported class file major version 69` o `70` | Java 25 o 26 son demasiado nuevos para Gradle. Usa el JDK 17 o 21 y apunta `JAVA_HOME` a esa carpeta. |
| `Non-ASCII characters in path` | Mueve el proyecto a `C:\proyectos`. |
| `User denied location permission previously` | Concede el permiso con `adb shell pm grant ...` o desde los ajustes de la app. |
| No aparece la notificación | Revisa *Ajustes > Apps > ProximityAlertQR > Notificaciones*. |
| Algo se "atora" después de cambiar de dispositivo | Ejecuta `npx ns clean` y vuelve a ejecutar la app. Esto borra `node_modules` y `platforms`, así que la siguiente compilación tarda más. |
