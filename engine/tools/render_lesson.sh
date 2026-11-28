#!/usr/bin/env bash
# Render video 007 "The Lesson" in chunks; if a render crashes or runs out of memory, start again with smaller chunks
# until it finishes. Then the PREVIEW (+ the guide talk; checking only). One render at a time.
# Run from engine/:  bash tools/render_lesson.sh
set -u
export TEMP="$PWD/.remotion-tmp" TMP="$PWD/.remotion-tmp"
for CH in 400 300 200 150 100 60; do
  echo "=== render with ${CH}-frame chunks ($(date +%T))"
  if node tools/render-chunks.mjs TheLesson out/The_Lesson.mp4 --chunk $CH --dir out/chunks/TheLesson_$CH --audio public/audio/lesson_mix.wav --keep; then
    npx remotion ffmpeg -v error -y -i out/The_Lesson.mp4 -i public/audio/lesson_preview_mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out/The_Lesson_PREVIEW.mp4 && { echo "=== DONE with ${CH}-frame chunks"; exit 0; }
  fi
  echo "=== failed with ${CH}-frame chunks; retrying smaller"
done
echo "=== FAILED at every chunk size"; exit 1
