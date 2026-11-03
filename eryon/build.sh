#!/usr/bin/env bash
# Renderiza "O nascimento de Eryon" (1080x1920, 30 fps) sincronizado com a narração.
# Uso: ./build.sh caminho/da/narracao.mp3 [saida.mp4]
set -euo pipefail
cd "$(dirname "$0")"
NARR="$1"; OUT="${2:-eryon.mp4}"
FPS=30; W=3
TMP=$(mktemp -d)
npm install --silent three@0.160.0 >/dev/null 2>&1 || true
N=$(node -e "console.log(Math.ceil((53.4)*$FPS))")
S=$(( (N + W - 1) / W ))
for i in $(seq 0 $((W-1))); do
  a=$((i*S)); b=$(( (i+1)*S )); [ $b -gt $N ] && b=$N
  node render.js range $a $b $FPS "$TMP" &
done
wait
# apenas a narração original, sem trilha nem efeitos
ffmpeg -y -loglevel error -framerate $FPS -i "$TMP/f%05d.jpg" -i "$NARR" \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r $FPS \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$OUT"
rm -rf "$TMP"
echo "OK -> $OUT"
