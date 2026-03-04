#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <input.pdf> <bookmarks.ps> <output.pdf>"
  exit 1
fi

input_pdf="$1"
bookmarks_ps="$2"
output_pdf="$3"

base_tmp="${output_pdf%.pdf}.tmp.with_bookmarks.pdf"

# Ghostscript applies pdfmark entries.
gs \
  -dBATCH \
  -dNOPAUSE \
  -dQUIET \
  -sDEVICE=pdfwrite \
  -sOutputFile="$base_tmp" \
  "$input_pdf" \
  "$bookmarks_ps"

# Re-linearize final output.
qpdf --linearize "$base_tmp" "$output_pdf"
rm -f "$base_tmp"

echo "Created: $output_pdf"
