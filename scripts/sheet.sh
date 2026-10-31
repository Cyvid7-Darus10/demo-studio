#!/usr/bin/env bash
# Contact sheet of an encoded clip: one tile every N seconds, for QA.
# Usage: sheet.sh <video.mp4> <out.png> [every-seconds=2] [cols=5]
set -euo pipefail
in="${1:?video}"; out="${2:?out.png}"; every="${3:-2}"; cols="${4:-5}"
dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")"
rows="$(python3 -c "import math; print(max(1, math.ceil(math.ceil($dur / $every) / $cols)))")"
ffmpeg -y -loglevel error -i "$in" \
  -vf "select='isnan(prev_selected_t)+gte(t-prev_selected_t\,$every)',scale=480:-1,tile=${cols}x${rows}" \
  -frames:v 1 "$out"
echo "$out (${dur}s, every ${every}s)"
