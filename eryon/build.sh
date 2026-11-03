#!/bin/sh
# Monta o vídeo final: quadros 30 fps + narração original (intacta) + cama sonora sutil.
set -e
cd "$(dirname "$0")"
ffmpeg -y -loglevel error -framerate 30 -i frames/f_%05d.jpg -i narration.mp3 -i ambience.wav \
  -filter_complex "[1:a]aresample=44100,pan=stereo|c0=c0|c1=c0[n];[n][2:a]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -profile:v high -r 30 \
  -c:a aac -b:a 192k -t 51.6 -movflags +faststart eryon_ep1.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact eryon_ep1.mp4
