#!/usr/bin/env node
/*
 * Ejecuta la app en el emulador de Android o en el simulador de iOS sin tener
 * que configurar variables de entorno a mano.
 *
 *   npm run android        -> emulador de Android Studio
 *   npm run ios            -> simulador de iPhone (Xcode, solo en Mac)
 *   npm run ios:iphone     -> iPhone real conectado por cable (solo en Mac)
 *   npm run doctor         -> revisa que la computadora tenga todo instalado
 *   npm run limpiar        -> borra la compilación (útil si algo se "atora")
 *
 * El script busca solo el SDK de Android y el Java que trae Android Studio,
 * así que en las Macs de la escuela no hace falta instalar el JDK aparte.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const raiz = path.join(__dirname, '..');
const accion = process.argv[2] || 'android';
const esMac = process.platform === 'darwin';
const esWindows = process.platform === 'win32';
const env = { ...process.env };

function existe(p) {
  try {
    return !!p && fs.existsSync(p);
  } catch (e) {
    return false;
  }
}

function primero(lista) {
  return lista.find(existe);
}

// ---------- SDK de Android ----------
if (!existe(env.ANDROID_HOME)) {
  const sdk = primero([
    env.ANDROID_SDK_ROOT,
    esMac && path.join(os.homedir(), 'Library', 'Android', 'sdk'),
    esWindows && env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Android', 'Sdk'),
    path.join(os.homedir(), 'Android', 'Sdk'),
  ]);
  if (sdk) env.ANDROID_HOME = sdk;
}

// ---------- Java ----------
// Gradle 8.14 solo funciona con Java 17 a 21. Con Java 25 o 26 falla con
// "Unsupported class file major version 69/70", así que si JAVA_HOME apunta a
// otra versión se busca un JDK compatible.
const JAVA_MIN = 17;
const JAVA_MAX = 21;

// Lee la versión mayor del archivo "release" del JDK (0 si no se puede leer)
function versionJava(home) {
  try {
    const txt = fs.readFileSync(path.join(home, 'release'), 'utf8');
    const m = txt.match(/JAVA_VERSION="(\d+)(?:\.(\d+))?/);
    if (!m) return 0;
    const mayor = parseInt(m[1], 10);
    return mayor === 1 && m[2] ? parseInt(m[2], 10) : mayor; // "1.8" -> 8
  } catch (e) {
    return 0;
  }
}

function javaCompatible(home) {
  const v = versionJava(home);
  return v >= JAVA_MIN && v <= JAVA_MAX;
}

// En Mac, /usr/libexec/java_home -v 17 devuelve la carpeta del JDK 17 instalado
function javaHomeMac(version) {
  if (!esMac) return null;
  const r = spawnSync('/usr/libexec/java_home', ['-v', version], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

const javaUsuario = env.JAVA_HOME;
const respetarUsuario = existe(javaUsuario) && (javaCompatible(javaUsuario) || versionJava(javaUsuario) === 0);
if (!respetarUsuario) {
  if (existe(javaUsuario)) {
    console.log(
      'ℹ JAVA_HOME apunta a Java ' + versionJava(javaUsuario) +
      '; Gradle necesita Java ' + JAVA_MIN + ' a ' + JAVA_MAX + '. Buscando otro JDK...'
    );
  }
  const jdk = [
    esMac && '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
    esMac && path.join(os.homedir(), 'Applications', 'Android Studio.app', 'Contents', 'jbr', 'Contents', 'Home'),
    javaHomeMac('21'),
    javaHomeMac('17'),
    esWindows && 'C:\\Program Files\\Android\\Android Studio\\jbr',
    '/opt/android-studio/jbr',
  ].find((p) => existe(p) && javaCompatible(p));
  if (jdk) env.JAVA_HOME = jdk;
  else if (!existe(javaUsuario)) delete env.JAVA_HOME;
}

// Agrega adb, el emulador y java al PATH de este proceso
const extra = [];
if (env.ANDROID_HOME) {
  extra.push(path.join(env.ANDROID_HOME, 'platform-tools'), path.join(env.ANDROID_HOME, 'emulator'));
}
if (env.JAVA_HOME) extra.push(path.join(env.JAVA_HOME, 'bin'));
const clavePath = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
env[clavePath] = extra.concat(env[clavePath] || '').join(path.delimiter);

// ---------- MLKit (lector de QR) no tiene versión para el simulador de iOS ----------
const pkg = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
const usaMLKit = !!(pkg.dependencies && pkg.dependencies['@nativescript/mlkit-core']);

// ---------- Comando a ejecutar ----------
let args;
switch (accion) {
  case 'android':
    args = ['run', 'android', '--emulator'];
    break;
  case 'ios':
  case 'ios:iphone':
    if (!esMac) {
      console.error('\n✖ iOS solo se puede compilar en una Mac con Xcode.\n');
      process.exit(1);
    }
    if (accion === 'ios') {
      args = ['run', 'ios', '--emulator'];
      if (usaMLKit) {
        env.NSSkipMLKitFromIOSSimulator = '1';
        console.log('ℹ Simulador de iOS: el lector de QR (MLKit) se omite; el resto de la app funciona.');
        console.log('  Si antes compilaste para un iPhone real, ejecuta primero: npm run limpiar\n');
      }
    } else {
      args = ['run', 'ios'];
      delete env.NSSkipMLKitFromIOSSimulator;
      console.log('ℹ iPhone real: si antes usaste el simulador, ejecuta primero: npm run limpiar\n');
    }
    break;
  case 'doctor':
    // En Mac revisa Android e iOS; en Windows/Linux solo Android
    args = esMac ? ['doctor'] : ['doctor', 'android'];
    break;
  case 'limpiar':
    args = ['clean'];
    break;
  default:
    console.error('Uso: node scripts/ejecutar.js [android | ios | ios:iphone | doctor | limpiar]');
    process.exit(1);
}

console.log('ANDROID_HOME = ' + (env.ANDROID_HOME || '(no encontrado: abre Android Studio una vez para instalar el SDK)'));
console.log('JAVA_HOME    = ' + (env.JAVA_HOME || '(no encontrado: instala Android Studio o el JDK 21)'));
console.log('> ns ' + args.join(' ') + '\n');

// Usa la CLI de NativeScript instalada dentro del proyecto (no requiere "npm install -g")
const cli = require.resolve('nativescript/bin/nativescript.js', { paths: [raiz] });
const r = spawnSync(process.execPath, [cli].concat(args), { cwd: raiz, env, stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
