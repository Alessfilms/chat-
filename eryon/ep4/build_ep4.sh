#!/usr/bin/env bash
# Episódio 4 — renderiza filmando o jogo (modo cinema) e junta com a narração original + efeitos.
set -euo pipefail
cd "$(dirname "$0")"
FPS=30; W=2; OUT="${1:-eryon_ep4.mp4}"
FR="${FRAMES:-$(mktemp -d)}"; mkdir -p "$FR"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 narration.mp3)
N=$(python3 -c "import math;print(math.ceil($DUR*$FPS))"); S=$(( (N + W - 1) / W ))
for i in $(seq 0 $((W-1))); do a=$((i*S)); b=$(( (i+1)*S )); [ $b -gt $N ] && b=$N; node render4.js range $a $b $FPS "$FR" > "$FR/log$i.txt" 2>&1 & done
wait
python3 sfx_ep4.py "$FR/sfx.wav"
ffmpeg -y -loglevel error -framerate $FPS -i "$FR/f%05d.jpg" -i narration.mp3 -i "$FR/sfx.wav" \
  -filter_complex "[1:a]aformat=channel_layouts=stereo,aresample=48000[v];[2:a]volume=0.34[b];[v][b]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 25 -tune animation -pix_fmt yuv420p -r $FPS -c:a aac -b:a 192k -ar 48000 -movflags +faststart -t "$DUR" "$OUT"
echo "OK -> $OUT ($N quadros)"
