#!/bin/bash
# Configura la terminal de macOS para compilar apps de NativeScript para Android.
#
#   bash scripts/configurar-mac.sh
#
# Busca un JDK 17 a 21 (Gradle no funciona con Java 25 ni 26) y el SDK de
# Android, y los deja guardados en ~/.zshrc. Se puede ejecutar varias veces:
# reemplaza el bloque anterior en lugar de duplicarlo.
set -e

if [ "$(uname)" != "Darwin" ]; then
  echo "Este script es solo para macOS."
  exit 1
fi

# Versión mayor de un JDK leída de su archivo "release" (vacío si no se puede)
version_java() {
  [ -f "$1/release" ] || return 0
  sed -n 's/^JAVA_VERSION="\([0-9]*\).*/\1/p' "$1/release"
}

es_compatible() {
  local v
  v=$(version_java "$1")
  [ -n "$v" ] && [ "$v" -ge 17 ] && [ "$v" -le 21 ]
}

JDK=""
for candidato in \
  "$(/usr/libexec/java_home -v 21 2>/dev/null || true)" \
  "$(/usr/libexec/java_home -v 17 2>/dev/null || true)" \
  "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  "$HOME/Applications/Android Studio.app/Contents/jbr/Contents/Home"; do
  if [ -n "$candidato" ] && [ -d "$candidato" ] && es_compatible "$candidato"; then
    JDK="$candidato"
    break
  fi
done

if [ -z "$JDK" ]; then
  echo "No encontré un JDK 17 a 21. Instala uno con:"
  echo "  brew install --cask temurin@21"
  echo "y vuelve a ejecutar este script."
  echo
  echo "JDKs instalados en esta Mac:"
  /usr/libexec/java_home -V 2>&1 || true
  exit 1
fi

SDK="$HOME/Library/Android/sdk"
if [ ! -d "$SDK" ]; then
  echo "Aviso: no existe $SDK. Abre Android Studio una vez para que instale el SDK."
fi

ZSHRC="$HOME/.zshrc"
touch "$ZSHRC"
# Quita el bloque de una ejecución anterior
sed -i '' '/# >>> NativeScript Android >>>/,/# <<< NativeScript Android <<</d' "$ZSHRC"

cat >> "$ZSHRC" <<EOF
# >>> NativeScript Android >>>
export JAVA_HOME="$JDK"
export ANDROID_HOME="\$HOME/Library/Android/sdk"
export PATH="\$JAVA_HOME/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator:\$PATH"
# <<< NativeScript Android <<<
EOF

echo "Listo. Se guardó en $ZSHRC:"
echo "  JAVA_HOME    = $JDK (Java $(version_java "$JDK"))"
echo "  ANDROID_HOME = $SDK"
echo
echo "Ahora ejecuta esto (o cierra y abre la terminal):"
echo "  source ~/.zshrc"
