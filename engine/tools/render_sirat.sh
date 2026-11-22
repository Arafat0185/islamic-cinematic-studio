#!/usr/bin/env bash
# Render video 003 "The Sirat" in 300-frame chunks, each in its own Remotion process (memory is released between chunks).
# If a chunk crashes or runs out of memory, the run starts again automatically: finished chunks are kept and skipped, a
# half-written chunk is rendered again. After 6 failed runs at 300 frames it falls back to 150-frame chunks. Then the
# PREVIEW (+ the recitation, a TikTok sound: never uploaded) is made from the same picture.
# Run from engine/:  bash tools/render_sirat.sh      (safe to stop and run again: it continues where it stopped)
set -u
export TEMP="$PWD/.remotion-tmp" TMP="$PWD/.remotion-tmp"
for CH in 300 300 300 300 300 300 150 150 150 150; do
  echo "=== render with ${CH}-frame chunks ($(date +%T))"
  if node tools/render-chunks.mjs TheSirat out/The_Sirat.mp4 --chunk $CH --dir out/chunks/TheSirat_$CH --audio public/audio/sirat_mix.wav --keep; then
    npx remotion ffmpeg -v error -y -i out/The_Sirat.mp4 -i public/audio/sirat_preview_mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out/The_Sirat_PREVIEW.mp4 && { echo "=== DONE with ${CH}-frame chunks"; exit 0; }
  fi
  echo "=== failed with ${CH}-frame chunks; restarting (finished chunks kept)"
  sleep 5
done
echo "=== FAILED after every retry"; exit 1
