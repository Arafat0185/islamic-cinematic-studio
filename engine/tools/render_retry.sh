#!/usr/bin/env bash
# Render video 002 in chunks; if a render crashes or runs out of memory, start again with smaller chunks until it finishes.
# Run from engine/:  bash tools/render_retry.sh
set -u
for CH in 600 400 300 200 150 100; do
  echo "=== render with ${CH}-frame chunks ($(date +%T))"
  if node tools/render-chunks.mjs TheLastRequest out/The_Last_Request.mp4 --chunk $CH --audio public/audio/lastrequest_mix.wav --keep; then
    npx remotion ffmpeg -v error -y -i out/The_Last_Request.mp4 -i public/audio/lastrequest_preview_mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out/The_Last_Request_PREVIEW.mp4 && { echo "=== DONE with ${CH}-frame chunks"; exit 0; }
  fi
  echo "=== failed with ${CH}-frame chunks; retrying smaller"
  rm -rf out/chunks/TheLastRequest
done
echo "=== FAILED at every chunk size"; exit 1
