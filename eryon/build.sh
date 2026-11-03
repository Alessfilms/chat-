#!/usr/bin/env bash
# Renderiza "O nascimento de Eryon" (pixel art 2D, 1080x1920, 30 fps) sincronizado com a narração.
# Uso: ./build.sh caminho/da/narracao.mp3 [saida.mp4]
set -euo pipefail
cd "$(dirname "$0")"
NARR="$1"; OUT="${2:-eryon.mp4}"
FPS=30; W=3
TMP=$(mktemp -d)
N=$(node -e "console.log(Math.ceil((53.4)*$FPS))")
S=$(( (N + W - 1) / W ))
for i in $(seq 0 $((W-1))); do
  a=$((i*S)); b=$(( (i+1)*S )); [ $b -gt $N ] && b=$N
  node render.js range $a $b $FPS "$TMP" &
done
wait
# narração original + efeitos sonoros 8-bit (sem trilha)
python3 sfx.py "$TMP/sfx.wav"
ffmpeg -y -loglevel error -framerate $FPS -i "$TMP/f%05d.jpg" -i "$NARR" -i "$TMP/sfx.wav" \
  -filter_complex "[1:a]aformat=channel_layouts=stereo[v];[2:a]volume=0.32[b];[v][b]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r $FPS \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest "$OUT"
rm -rf "$TMP"
echo "OK -> $OUT"
